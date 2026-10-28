// Déroulement d'une partie et envoi des messages aux joueurs
const { AVATARS, COUNTDOWN, HANG_MAX } = require('./config');
const { correctText, isCorrect, mistakeEntry, shownAnswer } = require('./answers');
const { activePlayers, computeTitles, heartsOn, isTeamMode, rankedPlayers, resetPlayerStats, teamBoard, teamInfo } = require('./rules');

const games = {}; // pin -> état de la partie

function newPin() {
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (games[pin]);
  return pin;
}

function allPeople(g) {
  return [...Object.values(g.players), ...Object.values(g.queue)];
}

function pickAvatar(g, wanted) {
  const used = allPeople(g).map((p) => p.avatar);
  if (AVATARS.includes(wanted) && !used.includes(wanted)) return wanted;
  const free = AVATARS.filter((a) => !used.includes(a));
  const pool = free.length ? free : AVATARS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function playerList(g) {
  return allPeople(g).map((p) => ({
    pid: p.pid,
    name: p.name,
    avatar: p.avatar,
    connected: !!p.sid,
    queued: !!p.queued,
    eliminated: !!p.eliminated,
    team: g.state === 'lobby' && isTeamMode(g) && g.settings.teamAssign === 'manual' && g.teamOf && Number.isInteger(g.teamOf[p.pid]) ? g.teamOf[p.pid] : p.team,
  }));
}

function sendHostPlayers(g) {
  toHost(g, 'host:players', playerList(g));
}

// ---------- Envoi ----------
let io = null;
function init(server) {
  io = server;
}

function toHost(g, ev, data) {
  if (g.host) io.to(g.host).emit(ev, data);
}
function toPlayer(p, ev, data) {
  if (p.sid) io.to(p.sid).emit(ev, data);
}
function toAll(g, ev, data) {
  toHost(g, ev, data);
  allPeople(g).forEach((p) => toPlayer(p, ev, data));
}

// ---------- Minuterie (compatible avec la pause) ----------
function clearTimer(g) {
  clearTimeout(g.timer);
  g.timer = null;
  g.timerFn = null;
  g.timerDue = 0;
}
function schedule(g, ms, fn) {
  clearTimeout(g.timer);
  g.timerFn = fn;
  g.timerDue = Date.now() + ms;
  g.timer = setTimeout(() => {
    g.timer = null;
    g.timerFn = null;
    g.timerDue = 0;
    fn();
  }, ms);
}

function qTime(g) {
  return g.settings.limitTime ? g.settings.time : null;
}
function elapsed(g) {
  return ((g.paused ? g.pausedAt : Date.now()) - g.startedAt) / 1000;
}

function setPaused(g, on, reason) {
  if (!['countdown', 'reading', 'question', 'results'].includes(g.state)) return;
  const now = Date.now();
  if (on && !g.paused) {
    g.paused = true;
    g.pauseReason = reason || 'host';
    g.pausedAt = now;
    g.pauseLeft = g.timerFn ? Math.max(0, g.timerDue - now) : 0;
    clearTimeout(g.timer);
  } else if (!on && g.paused) {
    g.paused = false;
    g.pauseReason = null;
    g.startedAt += now - g.pausedAt;
    if (g.timerFn) {
      const fn = g.timerFn;
      schedule(g, g.pauseLeft, fn);
    }
  } else {
    return;
  }
  toAll(g, 'paused', pausePayload(g));
}

function pausePayload(g) {
  const time = qTime(g);
  return {
    paused: g.paused,
    reason: g.pauseReason,
    left: g.state === 'question' && time ? Math.max(0, time - elapsed(g)) : null,
  };
}

function beginRound(pin) {
  const g = games[pin];
  g.state = 'countdown';
  toAll(g, 'countdown', { seconds: COUNTDOWN, index: g.index, total: g.questions.length });
  schedule(g, COUNTDOWN * 1000 + 300, () => (g.settings.readDelay ? startReading(pin) : startQuestion(pin)));
}

function readingPayload(g, p) {
  const q = g.questions[g.index];
  const base = { index: g.index, total: g.questions.length, seconds: g.settings.readSeconds, double: !!q.double, type: q.type };
  if (p && g.settings.display === 'host') return { ...base, hidden: true };
  return { ...base, text: q.text, image: q.image || null };
}

function startReading(pin) {
  const g = games[pin];
  if (!g) return;
  g.state = 'reading';
  toHost(g, 'reading', readingPayload(g, null));
  allPeople(g).forEach((p) => toPlayer(p, 'reading', readingPayload(g, p)));
  schedule(g, g.settings.readSeconds * 1000, () => startQuestion(pin));
}

function questionPayload(g, p, left) {
  const q = g.questions[g.index];
  const time = qTime(g);
  const base = {
    index: g.index,
    total: g.questions.length,
    type: q.type,
    double: !!q.double,
    time,
    left: time ? (left === undefined ? time : left) : null,
    labels: g.settings.labels,
    changeAnswer: g.settings.changeAnswer,
    wheel: !!q.wheel,
    match: !!q.match,
    order: q.type === 'order',
    matchLeft: q.match ? q.left : null, // éléments à relier (`left` est le temps restant)
    category: q.wheel || q.match ? q.category : null,
    letters: !!q.letters,
    tiles: q.letters ? q.tiles : null,
    slots: q.letters ? q.slots : null,
    maxHearts: heartsOn(g) ? g.settings.lives : null,
    hangMax: g.settings.mode === 'hangman' ? HANG_MAX : null,
  };
  if (!p) return { ...base, text: q.text, image: q.image || null, choices: q.choices };
  const out =
    g.settings.display === 'host' && !q.wheel && !q.letters && !q.match && q.type !== 'order'
      ? { ...base, hidden: true, count: q.choices.length }
      : { ...base, text: q.text, image: q.image || null, choices: q.choices };
  out.eliminated = !!p.eliminated;
  out.hearts = p.hearts;
  out.hangErrors = g.settings.mode === 'hangman' && p.team !== null ? g.hang[p.team] : null;
  out.answered = !!p.answered;
  out.mine = p.answered ? p.answer : null;
  return out;
}

function progressPayload(g) {
  const act = activePlayers(g);
  return {
    answered: act.filter((p) => p.answered).length,
    total: act.length,
    pending: act.filter((p) => !p.answered).map((p) => ({ pid: p.pid, name: p.name, avatar: p.avatar, offline: !p.sid })),
  };
}

function startQuestion(pin) {
  const g = games[pin];
  if (!g) return;
  const q = g.questions[g.index];
  const time = qTime(g);
  g.state = 'question';
  g.startedAt = Date.now();
  Object.values(g.players).forEach((p) => {
    p.answered = false;
    p.answer = null;
    p.answeredAt = 0;
    p.lastPoints = 0;
    p.lastCorrect = false;
    p.activeNow = !p.eliminated;
  });
  toHost(g, 'question', questionPayload(g, null));
  Object.values(g.players).forEach((p) => toPlayer(p, 'question', questionPayload(g, p)));
  Object.values(g.queue).forEach((p) => toPlayer(p, 'queued', queuedPayload(g)));
  toHost(g, 'progress', progressPayload(g));
  if (time) schedule(g, time * 1000, () => endQuestion(pin));
  else clearTimer(g);
  void q;
}

function allAnswered(g) {
  const act = activePlayers(g).filter((p) => p.sid);
  return act.length > 0 && act.every((p) => p.answered);
}

function maybeEndEarly(pin) {
  const g = games[pin];
  if (!g || g.state !== 'question' || g.paused) return;
  if (g.settings.changeAnswer) return; // l'animateur termine lui-même, ou le temps s'écoule
  if (allAnswered(g)) endQuestion(pin);
}

function endQuestion(pin) {
  const g = games[pin];
  if (!g || g.state !== 'question') return;
  clearTimer(g);
  g.paused = false;
  g.state = 'results';
  const q = g.questions[g.index];
  const time = qTime(g);
  const pollQ = q.type === 'poll';
  const participants = Object.values(g.players).filter((p) => p.activeNow);

  // Notation
  const mult = q.double ? 2 : 1;
  participants.forEach((p) => {
    const ok = !pollQ && isCorrect(q, p.answer);
    p.lastCorrect = ok;
    if (ok) {
      const base = g.scoreMode === 'points' && time ? Math.round(500 + 500 * Math.max(0, 1 - p.answeredAt / time)) : 1;
      p.lastPoints = base * mult;
      p.score += p.lastPoints;
      p.streak += 1;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      p.correct += 1;
      p.timeSum += p.answeredAt;
    } else if (!pollQ) {
      p.streak = 0;
      p.mistakes.push(mistakeEntry(q, p.answer));
      g.missed[g.index] = (g.missed[g.index] || 0) + 1;
    }
  });
  if (!pollQ) {
    g.scored += 1;
    g.qstats[g.index] = { ok: participants.filter((p) => p.lastCorrect).length, total: participants.length };
  }

  // Élimination
  let outNow = [];
  const hearts = heartsOn(g);
  if (g.settings.mode === 'elimination' && !pollQ) {
    outNow = participants.filter((p) => !p.lastCorrect);
    if (outNow.length === participants.length) outNow = []; // tout le monde se trompe : personne n'est éliminé
  } else if (hearts && !pollQ) {
    // Cœurs : chaque mauvaise réponse (ou absence de réponse) fait perdre un cœur
    const wrong = participants.filter((p) => !p.lastCorrect);
    const wouldOut = wrong.filter((p) => p.hearts <= 1);
    const safe = wouldOut.length === participants.length; // tout le monde tomberait à zéro : personne ne sort
    wrong.forEach((p) => {
      p.hearts = safe ? Math.max(1, p.hearts - 1 || 1) : p.hearts - 1;
      p.lostHeart = true;
    });
    outNow = safe ? [] : wouldOut;
  }
  const hangman = g.settings.mode === 'hangman';
  if (hangman && !pollQ) {
    // Pendu : chaque mauvaise réponse (ou absence) ajoute une partie au pendu de l'équipe
    const aliveBefore = [];
    g.teams.forEach((t) => { if (g.hang[t] < HANG_MAX) aliveBefore.push(t); });
    participants.filter((p) => !p.lastCorrect && p.team !== null).forEach((p) => {
      g.hang[p.team] = Math.min(HANG_MAX, g.hang[p.team] + 1);
    });
    const done = aliveBefore.filter((t) => g.hang[t] >= HANG_MAX);
    if (done.length && done.length === aliveBefore.length) done.forEach((t) => (g.hang[t] = HANG_MAX - 1)); // tout le monde serait pendu : personne
    else
      done.forEach((t) => {
        g.hangOut[t] = g.index;
        Object.values(g.players).filter((p) => p.team === t && !p.eliminated).forEach((p) => outNow.push(p));
      });
  }
  participants.forEach((p) => { if (hearts && p.lastCorrect) p.lostHeart = false; });
  outNow.forEach((p) => {
    p.eliminated = true;
    p.elimRound = g.index;
  });
  const survivors = activePlayers(g).length;
  const teamsAlive = hangman ? g.teams.filter((t) => g.hang[t] < HANG_MAX).length : 0;
  const elimOver = hangman ? g.teams.length >= 2 && teamsAlive <= 1 : (g.settings.mode === 'elimination' || hearts) && g.startPlayers >= 2 && survivors <= 1;
  const last = g.index === g.questions.length - 1 || elimOver;
  g.lastFlag = last;

  // Compteurs par réponse
  let counts = null;
  if (q.type === 'text' || q.type === 'match' || q.type === 'order') counts = [participants.filter((p) => p.lastCorrect).length, participants.filter((p) => p.answered && !p.lastCorrect).length];
  else {
    counts = q.choices.map(() => 0);
    participants.forEach((p) => {
      if (p.answer === null) return;
      if (Array.isArray(p.answer)) p.answer.forEach((i) => counts[i]++);
      else counts[p.answer]++;
    });
  }

  const autoIn = g.settings.autoNext ? g.settings.autoDelay : null;
  g.hostResults = {
    index: g.index,
    type: q.type,
    wheel: !!q.wheel,
    match: !!q.match,
    order: q.type === 'order',
    explain: g.settings.showExplain ? q.explain || '' : '',
    pairs: q.match ? q.pairs : null,
    category: q.wheel || q.match ? q.category : null,
    text: q.text,
    double: !!q.double,
    correctText: correctText(g, q),
    okCount: participants.filter((p) => p.lastCorrect).length,
    partCount: participants.length,
    correct: q.correct,
    choices: q.choices,
    counts,
    players: g.settings.showAnswers
      ? participants.map((p) => ({
          pid: p.pid,
          name: p.name,
          avatar: p.avatar,
          team: p.team,
          status: pollQ ? (p.answered ? 'voted' : 'none') : p.lastCorrect ? 'correct' : p.answered ? 'wrong' : 'none',
          shown: shownAnswer(g, q, p.answer),
          out: !!p.eliminated && p.elimRound === g.index,
          hearts: hearts ? p.hearts : null,
        }))
      : null,
    outNow: outNow.map((p) => p.name),
    survivors: g.settings.mode === 'elimination' || hearts ? survivors : null,
    hang: hangman ? teamBoard(g) : null,
    hangMax: HANG_MAX,
    labels: g.settings.labels,
    last,
    autoIn,
  };
  toHost(g, 'results', g.hostResults);
  Object.values(g.players).forEach((p) => {
    p.lastResult = resultFor(g, q, p);
    toPlayer(p, 'result', p.lastResult);
  });

  if (autoIn) schedule(g, autoIn * 1000, () => advance(pin));
}

function resultFor(g, q, p) {
  return {
    type: q.type,
    wasActive: !!p.activeNow,
    hearts: p.hearts,
    maxHearts: heartsOn(g) ? g.settings.lives : null,
    lostHeart: !!p.lostHeart,
    myCorrect: p.correct,
    myTotal: g.scored,
    explain: g.settings.showExplain ? q.explain || '' : '',
    hangErrors: g.settings.mode === 'hangman' && p.team !== null ? g.hang[p.team] : null,
    hangMax: HANG_MAX,
    correct: p.lastCorrect,
    answered: p.answered,
    streak: p.streak,
    double: !!q.double,
    eliminated: !!p.eliminated,
    outNow: !!p.eliminated && p.elimRound === g.index,
    last: !!g.lastFlag,
  };
}

function advance(pin) {
  const g = games[pin];
  if (!g || g.state !== 'results' || g.paused) return;
  clearTimer(g);
  if (!g.lastFlag && g.index + 1 < g.questions.length) {
    g.index++;
    beginRound(pin);
  } else {
    endGame(pin);
  }
}

function endPayloadFor(g, p, ranked, titles, tboard) {
  const myTitle = titles.find((t) => t.pid === p.pid) || null;
  return {
    score: p.score,
    correct: p.correct,
    scoreMode: g.scoreMode,
    hasDouble: g.questions.some((q) => q.double),
    questions: g.scored,
    rank: ranked.findIndex((x) => x.pid === p.pid) + 1,
    total: ranked.length,
    avatar: p.avatar,
    name: p.name,
    title: myTitle ? { title: myTitle.title, icon: myTitle.icon } : null,
    mode: g.settings.mode,
    heartsMode: heartsOn(g),
    alive: !p.eliminated,
    hearts: heartsOn(g) ? p.hearts : null,
    mistakes: g.settings.reviewErrors ? p.mistakes : null,
    team: p.team,
    ...teamInfo(g, p.team),
    teamRank: tboard && p.team !== null ? tboard.findIndex((t) => t.team === p.team) + 1 : null,
    teamCount: tboard ? tboard.length : 0,
    quizTitle: g.quiz ? g.quiz.title : '',
  };
}

function endGame(pin) {
  const g = games[pin];
  clearTimer(g);
  g.state = 'end';
  const ranked = rankedPlayers(g);
  const titles = computeTitles(g, ranked);
  const tboard = isTeamMode(g) ? teamBoard(g) : null;
  g.endData = {
    board: ranked.slice(0, 10).map((p) => ({
      pid: p.pid, name: p.name, avatar: p.avatar, score: p.score, correct: p.correct, team: p.team, alive: !p.eliminated, hearts: heartsOn(g) ? p.hearts : null,
    })),
    total: ranked.length,
    scoreMode: g.scoreMode,
    hasDouble: g.questions.some((q) => q.double),
    questions: g.scored,
    mode: g.settings.mode,
    heartsMode: heartsOn(g),
    missedCount: Object.keys(g.missed || {}).length,
    qstats: Object.keys(g.qstats || {}).map(Number).sort((a, b) => a - b).map((i) => {
      const q = g.questions[i];
      return { label: (q.wheel ? q.category + ' : ' + q.text : q.match ? q.category + ' : ' + q.left.join(', ') : q.text).slice(0, 120), ok: g.qstats[i].ok, total: g.qstats[i].total };
    }),
    titles,
    teams: tboard,
    quizTitle: g.quiz ? g.quiz.title : '',
  };
  g.endCtx = { ranked, titles, tboard };
  toHost(g, 'end', g.endData);
  Object.values(g.players).forEach((p) => toPlayer(p, 'end', endPayloadFor(g, p, ranked, titles, tboard)));
  Object.values(g.queue).forEach((p) => toPlayer(p, 'queued', queuedPayload(g)));
}

// Retour à la salle d'attente : les joueurs restent connectés, les scores repartent à zéro
function resetGame(pin) {
  const g = games[pin];
  clearTimer(g);
  g.paused = false;
  g.pauseReason = null;
  g.state = 'lobby';
  g.index = 0;
  g.questions = [];
  g.endData = null;
  // La file d'attente rejoint la salle
  Object.values(g.queue).forEach((p) => {
    p.queued = false;
    g.players[p.pid] = p;
  });
  g.queue = {};
  Object.values(g.players).forEach((p) => resetPlayerStats(p));
  allPeople(g).forEach((p) => toPlayer(p, 'lobby', lobbyPayload(g, p)));
  toHost(g, 'lobby', {});
  sendHostPlayers(g);
}

function settingsPayload(g) {
  return { theme: g.settings.theme, sounds: g.settings.sounds, volume: g.settings.volume, reactions: g.settings.reactions, changeAnswer: g.settings.changeAnswer };
}
function lobbyPayload(g, p) {
  return { ...settingsPayload(g), name: p.name, avatar: p.avatar };
}
function queuedPayload(g) {
  return { ...settingsPayload(g), state: g.state };
}
function joinInfo(g, p) {
  return {
    name: p.name,
    avatar: p.avatar,
    team: p.team,
    ...teamInfo(g, p.team),
    ...settingsPayload(g),
  };
}

// Renvoie à un joueur l'état courant de la partie (connexion initiale ou retour après coupure)
function sendPlayerState(g, p) {
  toPlayer(p, 'join:ok', { ...joinInfo(g, p), pid: p.pid, token: p.token, pin: g.pin });
  if (p.queued) {
    toPlayer(p, 'queued', queuedPayload(g));
    return;
  }
  const left = g.state === 'question' && qTime(g) ? Math.max(0, qTime(g) - elapsed(g)) : undefined;
  switch (g.state) {
    case 'lobby':
      toPlayer(p, 'lobby', lobbyPayload(g, p));
      break;
    case 'countdown':
      toPlayer(p, 'countdown', {
        seconds: Math.max(1, Math.ceil((g.paused ? g.pauseLeft : g.timerDue - Date.now()) / 1000) - 0),
        index: g.index,
        total: g.questions.length,
        resume: true,
      });
      break;
    case 'reading':
      toPlayer(p, 'reading', readingPayload(g, p));
      break;
    case 'question':
      toPlayer(p, 'question', questionPayload(g, p, left));
      break;
    case 'results':
      if (p.lastResult) toPlayer(p, 'result', p.lastResult);
      break;
    case 'end':
      if (g.endCtx) toPlayer(p, 'end', endPayloadFor(g, p, g.endCtx.ranked, g.endCtx.titles, g.endCtx.tboard));
      break;
  }
  if (g.paused) toPlayer(p, 'paused', pausePayload(g));
}

function sendHostState(g) {
  sendHostPlayers(g);
  const left = g.state === 'question' && qTime(g) ? Math.max(0, qTime(g) - elapsed(g)) : undefined;
  switch (g.state) {
    case 'lobby':
      toHost(g, 'lobby', {});
      break;
    case 'countdown':
      toHost(g, 'countdown', {
        seconds: Math.max(1, Math.ceil((g.paused ? g.pauseLeft : g.timerDue - Date.now()) / 1000)),
        index: g.index,
        total: g.questions.length,
        resume: true,
      });
      break;
    case 'reading':
      toHost(g, 'reading', readingPayload(g, null));
      break;
    case 'question':
      toHost(g, 'question', questionPayload(g, null, left));
      toHost(g, 'progress', progressPayload(g));
      break;
    case 'results': {
      const autoIn = g.timerFn && !g.paused ? Math.max(1, Math.round((g.timerDue - Date.now()) / 1000)) : g.paused && g.timerFn ? Math.round(g.pauseLeft / 1000) : null;
      toHost(g, 'results', { ...g.hostResults, autoIn });
      break;
    }
    case 'end':
      toHost(g, 'end', g.endData);
      break;
  }
  if (g.paused) toHost(g, 'paused', pausePayload(g));
}

function clientIp(socket) {
  const xf = String(socket.handshake.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = xf || socket.handshake.address || '';
  return /^(::1|127\.|::ffff:127\.)/.test(ip) ? '' : ip; // pas de blocage par IP en local
}
function banLeft(g, socket, device) {
  const now = Date.now();
  g.bans = (g.bans || []).filter((b) => b.until === null || b.until > now);
  const ip = clientIp(socket);
  const b = g.bans.find((x) => (device && x.device === device) || (ip && x.ip === ip));
  if (!b) return 0;
  return b.until === null ? -1 : b.until - now;
}
function banMessage(left) {
  if (left < 0) return "L'animateur t'a exclu de cette partie (jusqu'à sa fermeture).";
  const min = Math.max(1, Math.ceil(left / 60000));
  return "L'animateur t'a exclu pour le moment. Tu pourras revenir dans " + min + ' min.';
}

function removePlayer(g, p, reason, minutes) {
  delete g.players[p.pid];
  delete g.queue[p.pid];
  if (reason === 'kick') toPlayer(p, 'kicked', { message: banMessage(minutes ? minutes * 60000 : -1) });
  const s = p.sid && io.sockets.sockets.get(p.sid);
  if (s) s.data.pid = null;
}

// Ferme complètement une salle : les joueurs sont prévenus
function closeGame(g) {
  clearTimer(g);
  allPeople(g).forEach((p) => toPlayer(p, 'host:left'));
  delete games[g.pin];
}

module.exports = { init, games, newPin, closeGame, allPeople, pickAvatar, sendHostPlayers, toHost, toPlayer, clearTimer, qTime, elapsed, setPaused, beginRound, progressPayload, maybeEndEarly, endQuestion, advance, resetGame, settingsPayload, joinInfo, sendPlayerState, sendHostState, clientIp, banLeft, banMessage, removePlayer };
