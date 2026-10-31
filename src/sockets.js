// Événements Socket.IO de l'animateur et des joueurs
const QRCode = require('qrcode');
const { AVATARS, DEFAULTS, HOST_GRACE_MS, LOBBY_GRACE_MS, MAX_GAMES, MAX_PLAYERS, REACTIONS } = require('./config');
const { lanUrl, rid } = require('./utils');
const { isBlocked } = require('./names');
const { sanitize } = require('./settings');
const { buildQuestions, cleanQuiz, missedQuiz, quizCount } = require('./quiz');
const { cleanAnswer } = require('./answers');
const { assignTeams, bonusOn, heartsOn, isTeamMode, resetPlayerStats } = require('./rules');
const { allPeople, games, newPin, toHost, toPlayer } = require('./send');
const { addTime, elapsed, qTime, setPaused } = require('./timer');
const { banLeft, banMessage, clientIp, closeGame, joinInfo, pickAvatar, removePlayer, sendHostPlayers, settingsPayload } = require('./room');
const { advance, beginRound, endQuestion, maybeEndEarly, progressPayload } = require('./round');
const { resetGame } = require('./end');
const { sendHostState, sendPlayerState } = require('./resume');

// Codes PIN faux à la chaîne (quelqu'un qui devine au hasard) : au plus 8 par connexion et 40 par adresse
// (une classe entière derrière la même box) en une minute ; ensuite, il faut attendre
const TRY_WINDOW = 60000;
const TRY_SOCKET = 8;
const TRY_IP = 40;
const MAX_GAMES_PER_IP = 10;
const ipTries = new Map();
function triesOf(rec, now) {
  return rec && now - rec.since < TRY_WINDOW ? rec : { n: 0, since: now };
}
function tooManyTries(socket) {
  const now = Date.now();
  const ip = clientIp(socket);
  return triesOf(socket.data.tries, now).n >= TRY_SOCKET || (!!ip && triesOf(ipTries.get(ip), now).n >= TRY_IP);
}
function countFail(socket) {
  const now = Date.now();
  socket.data.tries = triesOf(socket.data.tries, now);
  socket.data.tries.n++;
  const ip = clientIp(socket);
  if (!ip) return;
  if (ipTries.size > 5000) ipTries.clear(); // garde la mémoire du serveur petite
  const rec = triesOf(ipTries.get(ip), now);
  rec.n++;
  ipTries.set(ip, rec);
}

// Pseudo libre proche d'un pseudo déjà pris : « Léa 2 », « Léa 3 »… (16 caractères au plus)
function freeName(g, name) {
  const taken = new Set(allPeople(g).map((p) => p.name.toLowerCase()));
  for (let n = 2; n < 100; n++) {
    const tag = ' ' + n;
    const cand = name.slice(0, 16 - tag.length).trim() + tag;
    if (!taken.has(cand.toLowerCase())) return cand;
  }
  return '';
}

function setupSockets(io) {
  io.on('connection', (socket) => {
    // ---------- Animateur ----------
    const hostGame = () => {
      const g = games[socket.data.hostPin];
      return g && g.host === socket.id ? g : null;
    };

    socket.on('host:create', async (data) => {
      const origin = data && typeof data.origin === 'string' ? data.origin : '';
      const isLocal = !origin || /localhost|127\.0\.0\.1|\[::1\]/.test(origin);
      const lan = lanUrl();
      const base = isLocal && lan ? lan : origin || lan || '';
      // Une connexion n'anime qu'une salle à la fois : l'ancienne est fermée
      const old = hostGame();
      if (old) closeGame(old);
      if (Object.keys(games).length >= MAX_GAMES) {
        return socket.emit('host:create:error', 'Le serveur est plein pour le moment. Réessaie dans quelques minutes.');
      }
      // Une même adresse (une école, une maison) : 10 salles ouvertes en même temps au plus, pour qu'on ne puisse pas remplir le serveur
      const hostIp = clientIp(socket);
      if (hostIp && Object.values(games).filter((x) => x.hostIp === hostIp).length >= MAX_GAMES_PER_IP) {
        return socket.emit('host:create:error', 'Déjà 10 salles ouvertes depuis cette connexion : ferme une ancienne partie avant d\'en créer une autre.');
      }
      const pin = newPin();
      const g = {
        pin,
        hostIp,
        hostKey: rid(12),
        host: socket.id,
        hostGoneAt: 0,
        players: {},
        queue: {},
        state: 'lobby',
        paused: false,
        pauseReason: null,
        settings: { ...DEFAULTS },
        quiz: null,
        questions: [],
        scoreMode: 'count',
        scored: 0,
        index: 0,
        startedAt: 0,
        timer: null,
        timerFn: null,
        timerDue: 0,
        lastFlag: false,
        teamCount: 2,
        teamOf: {},
        hang: [0, 0, 0, 0],
        hangOut: [-1, -1, -1, -1],
        startPlayers: 0,
        info: null,
      };
      games[pin] = g;
      socket.data.hostPin = pin;
      let qr = null;
      try {
        qr = await QRCode.toDataURL(`${base}/play.html?pin=${pin}`, {
          margin: 1,
          width: 240,
          color: { dark: '#14213d', light: '#ffffff' },
        });
      } catch (e) {
        qr = null;
      }
      g.info = { pin, joinUrl: `${base}/play.html`, qr, lanOnly: isLocal };
      socket.emit('host:created', { ...g.info, key: g.hostKey, settings: g.settings, quiz: null });
    });

    // Retour de l'animateur après une coupure
    socket.on('host:rejoin', ({ pin, key } = {}) => {
      const g = games[String(pin || '')];
      if (!g || !key || key !== g.hostKey) return socket.emit('host:rejoin:error');
      g.host = socket.id;
      g.hostGoneAt = 0;
      socket.data.hostPin = g.pin;
      socket.emit('host:created', {
        ...g.info,
        key: g.hostKey,
        settings: g.settings,
        quiz: g.quiz ? { title: g.quiz.title, count: quizCount(g.quiz), kind: g.quiz.kind || 'quiz' } : null,
        rejoined: true,
      });
      sendHostState(g);
    });

    socket.on('host:quiz', (input) => {
      const g = hostGame();
      if (!g || g.state !== 'lobby') return;
      const res = cleanQuiz(input);
      if (res.error) {
        g.quiz = null;
        return socket.emit('host:quiz:error', res.error);
      }
      g.quiz = res.quiz;
      socket.emit('host:quiz:ok', { title: res.quiz.title, count: quizCount(res.quiz), kind: res.quiz.kind || 'quiz' });
      allPeople(g).forEach((p) => toPlayer(p, 'game:settings', settingsPayload(g))); // le nom du quiz sur les téléphones
    });

    socket.on('host:settings', (input) => {
      const g = hostGame();
      if (!g || g.state !== 'lobby') return;
      g.settings = sanitize(input, g.settings);
      socket.emit('host:settings', g.settings);
      allPeople(g).forEach((p) => toPlayer(p, 'game:settings', settingsPayload(g)));
    });

    socket.on('host:team', ({ pid, team } = {}) => {
      const g = hostGame();
      if (!g || g.state !== 'lobby') return;
      if (!g.players[pid]) return;
      if (Number.isInteger(team) && team >= 0 && team < g.settings.teamCount) g.teamOf[pid] = team;
      else delete g.teamOf[pid];
      sendHostPlayers(g);
    });

    socket.on('host:kick', ({ pid, minutes } = {}) => {
      const g = hostGame();
      if (!g) return;
      const p = g.players[pid] || g.queue[pid];
      if (!p) return;
      const mins = [5, 15, 60].includes(minutes) ? minutes : 0; // 0 = jusqu'à la fermeture de la salle
      g.bans = g.bans || [];
      g.bans.push({ device: p.device || null, ip: p.ip || '', until: mins ? Date.now() + mins * 60000 : null });
      removePlayer(g, p, 'kick', mins);
      sendHostPlayers(g);
      if (g.state === 'question') {
        toHost(g, 'progress', progressPayload(g));
        maybeEndEarly(g.pin);
      }
    });

    socket.on('host:start', () => {
      const g = hostGame();
      if (!g || g.state !== 'lobby' || !g.quiz || Object.keys(g.players).length === 0) return;
      if (g.quiz.kind === 'wheel' || g.quiz.kind === 'letters') g.settings = { ...g.settings, changeAnswer: false, display: 'both' };
      g.questions = buildQuestions(g);
      if (g.questions.length === 0) return;
      g.scoreMode = bonusOn(g) ? 'points' : 'count';
      g.index = 0;
      g.scored = 0;
      g.lastFlag = false;
      g.paused = false;
      g.missed = {};
      g.qstats = {};
      Object.values(g.players).forEach(resetPlayerStats);
      if (heartsOn(g)) Object.values(g.players).forEach((p) => (p.hearts = g.settings.lives));
      g.startPlayers = Object.keys(g.players).length;
      if (isTeamMode(g)) assignTeams(g);
      Object.values(g.players).forEach((p) => toPlayer(p, 'game:settings', { ...settingsPayload(g), team: p.team }));
      Object.values(g.players).forEach((p) => toPlayer(p, 'join:ok', { ...joinInfo(g, p), pid: p.pid, token: p.token, pin: g.pin }));
      beginRound(g.pin);
    });

    socket.on('host:pause', (on) => {
      const g = hostGame();
      if (!g) return;
      setPaused(g, !!on, 'host');
    });
    socket.on('host:skip', () => {
      const g = hostGame();
      if (g && !g.paused) endQuestion(g.pin);
    });
    socket.on('host:moreTime', () => {
      const g = hostGame();
      if (g) addTime(g);
    });
    socket.on('host:next', () => {
      const g = hostGame();
      if (g) advance(g.pin);
    });
    // Rejouer seulement les questions ratées : crée un nouveau quiz et relance la salle
    socket.on('host:replayMissed', () => {
      const g = hostGame();
      if (!g || g.state !== 'end') return;
      const mq = missedQuiz(g);
      if (!mq) return;
      const res = cleanQuiz(mq);
      if (res.error) return;
      g.quiz = res.quiz;
      socket.emit('host:replayQuiz', mq);
      resetGame(g.pin);
    });
    socket.on('host:reset', () => {
      const g = hostGame();
      if (g) resetGame(g.pin);
    });
    // Ferme complètement la salle
    socket.on('host:close', () => {
      const g = hostGame();
      if (g) closeGame(g);
    });

    // ---------- Joueurs ----------
    socket.on('player:join', ({ pin, name, avatar, device } = {}) => {
      pin = String(pin || '').replace(/\D/g, ''); // « 427 111 », « 427-111 » collés : on garde les chiffres
      name = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
      if (tooManyTries(socket)) return socket.emit('join:error', 'Trop d\'essais de code : attends une minute avant de réessayer.');
      const g = games[pin];
      if (!g) { countFail(socket); return socket.emit('join:error', 'Code PIN introuvable.'); }
      device = typeof device === 'string' ? device.slice(0, 40) : '';
      const left = banLeft(g, socket, device);
      if (left) return socket.emit('join:error', banMessage(left));
      if (!name) return socket.emit('join:error', 'Choisis un pseudo.');
      if (isBlocked(name)) return socket.emit('join:error', 'Ce pseudo n\'est pas autorisé. Choisis-en un autre.');
      if (allPeople(g).length >= MAX_PLAYERS) return socket.emit('join:error', 'La partie est complète.');
      const same = allPeople(g).find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (same) {
        // on propose un pseudo libre (« Léa 2 ») que le téléphone met dans la case
        const free = freeName(g, same.name);
        if (free) socket.emit('join:suggest', free);
        return socket.emit('join:error', free ? 'Ce pseudo est déjà pris. Essaie « ' + free + ' » !' : 'Ce pseudo est déjà pris.');
      }
      const p = {
        pid: rid(6),
        token: rid(12),
        sid: socket.id,
        name,
        avatar: pickAvatar(g, avatar),
        queued: g.state !== 'lobby',
        goneAt: 0,
        lastReact: 0,
        device,
        ip: clientIp(socket),
      };
      resetPlayerStats(p);
      if (p.queued) g.queue[p.pid] = p;
      else g.players[p.pid] = p;
      socket.data.pin = pin;
      socket.data.pid = p.pid;
      sendPlayerState(g, p);
      sendHostPlayers(g);
    });

    // Un joueur change son pseudo ou son avatar (salle d'attente et entre deux questions seulement)
    socket.on('player:profile', ({ name, avatar } = {}) => {
      const g = games[socket.data.pin];
      if (!g) return;
      const p = g.players[socket.data.pid] || g.queue[socket.data.pid];
      if (!p) return;
      const err = (m) => socket.emit('profile:error', m);
      if (['countdown', 'reading', 'question'].includes(g.state)) return err('Tu pourras changer ça entre deux questions.');
      name = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
      if (!name) return err('Choisis un pseudo.');
      const others = allPeople(g).filter((x) => x.pid !== p.pid);
      if (name.toLowerCase() !== p.name.toLowerCase()) {
        if (isBlocked(name)) return err("Ce pseudo n'est pas autorisé. Choisis-en un autre.");
        const same = others.find((x) => x.name.toLowerCase() === name.toLowerCase());
        if (same) {
          const free = freeName(g, same.name);
          if (free) socket.emit('profile:suggest', free);
          return err(free ? 'Ce pseudo est déjà pris. Essaie « ' + free + ' » !' : 'Ce pseudo est déjà pris.');
        }
      }
      if (avatar !== p.avatar) {
        if (!AVATARS.includes(avatar)) return err('Cet avatar n\'existe pas.');
        if (others.some((x) => x.avatar === avatar)) return err('Cet avatar est déjà pris.');
      } else avatar = p.avatar;
      p.name = name;
      p.avatar = avatar;
      socket.emit('profile:ok', { name, avatar });
      sendHostPlayers(g);
    });

    // Retour d'un joueur après une coupure
    socket.on('player:rejoin', ({ pin, pid, token } = {}) => {
      const g = games[String(pin || '')];
      const p = g && (g.players[pid] || g.queue[pid]);
      if (!p || p.token !== token) return socket.emit('rejoin:error');
      p.sid = socket.id;
      p.goneAt = 0;
      socket.data.pin = g.pin;
      socket.data.pid = p.pid;
      sendPlayerState(g, p);
      sendHostPlayers(g);
      if (g.state === 'question') toHost(g, 'progress', progressPayload(g));
    });

    socket.on('player:answer', (data) => {
      const g = games[socket.data.pin];
      if (!g || g.state !== 'question' || g.paused) return;
      const p = g.players[socket.data.pid];
      if (!p || p.eliminated) return;
      if (p.answered && !g.settings.changeAnswer) return;
      const q = g.questions[g.index];
      const time = qTime(g);
      const el = elapsed(g);
      if (time && el > time + 0.5) return;
      const answer = cleanAnswer(q, data);
      if (answer === null) return;
      p.answered = true;
      p.answer = answer;
      p.answeredAt = Math.min(el, time || el);
      socket.emit('answer:ack', { changeable: g.settings.changeAnswer });
      toHost(g, 'progress', progressPayload(g));
      maybeEndEarly(g.pin);
    });

    socket.on('player:react', (emoji) => {
      const g = games[socket.data.pin];
      if (!g || !g.settings.reactions || !REACTIONS.includes(emoji)) return;
      const p = g.players[socket.data.pid] || g.queue[socket.data.pid];
      if (!p) return;
      const now = Date.now();
      if (now - p.lastReact < 1200) return;
      p.lastReact = now;
      p.reactions = (p.reactions || 0) + 1;
      toHost(g, 'reaction', { emoji, name: p.name, avatar: p.avatar });
    });

    socket.on('player:leave', () => {
      const g = games[socket.data.pin];
      const p = g && (g.players[socket.data.pid] || g.queue[socket.data.pid]);
      if (!p) return;
      removePlayer(g, p, 'leave');
      sendHostPlayers(g);
      if (g.state === 'question') {
        toHost(g, 'progress', progressPayload(g));
        maybeEndEarly(g.pin);
      }
    });

    socket.on('disconnect', () => {
      const hostPin = socket.data.hostPin;
      const hg = games[hostPin];
      if (hg && hg.host === socket.id) {
        hg.host = null;
        hg.hostGoneAt = Date.now();
        // Sans animateur, la partie se met en pause automatiquement
        if (['countdown', 'reading', 'question', 'results'].includes(hg.state)) setPaused(hg, true, 'hostLost');
        return;
      }
      const g = games[socket.data.pin];
      const p = g && (g.players[socket.data.pid] || g.queue[socket.data.pid]);
      if (p && p.sid === socket.id) {
        p.sid = null;
        p.goneAt = Date.now();
        sendHostPlayers(g);
        if (g.state === 'question') {
          toHost(g, 'progress', progressPayload(g));
          maybeEndEarly(g.pin);
        }
      }
    });
  });

  // Nettoyage : salles abandonnées et joueurs partis de la salle d'attente
  setInterval(() => {
    const now = Date.now();
    Object.values(games).forEach((g) => {
      if (!g.host && g.hostGoneAt && now - g.hostGoneAt > HOST_GRACE_MS) {
        closeGame(g);
        return;
      }
      if (g.state === 'lobby') {
        let changed = false;
        allPeople(g).forEach((p) => {
          if (!p.sid && p.goneAt && now - p.goneAt > LOBBY_GRACE_MS) {
            removePlayer(g, p, 'gone');
            changed = true;
          }
        });
        if (changed) sendHostPlayers(g);
      }
    });
  }, 15000).unref();
}

module.exports = setupSockets;
