// Test de bout en bout : lance le serveur, crée une partie, fait jouer deux joueurs.
// Lancer avec : npm test
const { spawn } = require('child_process');
const path = require('path');
const assert = require('assert');
const { io } = require('socket.io-client');

const PORT = 3999;
const URL = `http://localhost:${PORT}`;

function startServer() {
  return new Promise((resolve, reject) => {
    const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    srv.stdout.on('data', (d) => {
      if (String(d).includes('lancé')) resolve(srv);
    });
    srv.on('exit', (code) => reject(new Error('Le serveur s\'est arrêté (code ' + code + ')')));
  });
}

const connect = () => io(URL, { transports: ['websocket'], forceNew: true });
function once(sock, ev, ms = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Rien reçu pour « ' + ev + ' »')), ms);
    sock.once(ev, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

async function setupGame(settings, quiz) {
  const host = connect();
  const created = once(host, 'host:created');
  host.emit('host:create', { origin: URL });
  const { pin, key } = await created;
  const sOk = once(host, 'host:settings');
  host.emit('host:settings', settings);
  await sOk;
  const qOk = Promise.race([once(host, 'host:quiz:ok'), once(host, 'host:quiz:error').then((e) => { throw new Error(e); })]);
  host.emit('host:quiz', quiz);
  const info = await qOk;
  const players = [];
  for (const name of ['Alice', 'Bob']) {
    const s = connect();
    const ok = once(s, 'join:ok');
    s.emit('player:join', { pin, name, device: 'test-' + name });
    s.info = await ok;
    players.push(s);
  }
  return { host, players, pin, info, hostKey: key };
}

// Joue toutes les questions : answerFor(question, joueur) renvoie la réponse à envoyer (ou null)
async function play(game, answerFor) {
  const { host, players } = game;
  const end = once(host, 'end', 60000);
  const endPlayers = players.map((p) => once(p, 'end', 60000));
  host.emit('host:start');
  const results = [];
  for (;;) {
    const q = await once(host, 'question');
    const res = once(host, 'results');
    players.forEach((p, i) => {
      const a = answerFor(q, i);
      if (a) p.emit('player:answer', a);
    });
    results.push(await res);
    if (results[results.length - 1].last) {
      host.emit('host:next');
      break;
    }
    host.emit('host:next');
  }
  return { results, end: await end, endPlayers: await Promise.all(endPlayers) };
}

function close(game) {
  game.host.emit('host:close');
  game.players.forEach((p) => p.close());
  setTimeout(() => game.host.close(), 100);
}

const QUIZ = {
  title: 'Test',
  questions: [
    { type: 'single', text: 'Capitale de la France ?', choices: ['Paris', 'Lyon', 'Nice'], correct: 0 },
    { type: 'multi', text: 'Mammifères ?', choices: ['Chat', 'Truite', 'Chien'], correct: [0, 2] },
    { type: 'text', text: 'Peintre de la Joconde ?', answers: ['Vinci'] },
    { type: 'order', text: 'Du plus petit au plus grand', choices: ['1', '2', '3'] },
    { type: 'poll', text: 'Tu aimes ?', choices: ['Oui', 'Non'] },
  ],
};

// Alice répond toujours juste, Bob toujours faux
function quizAnswer(q, i) {
  const good = i === 0;
  if (q.type === 'single') return { index: good ? q.choices.indexOf('Paris') : q.choices.indexOf('Lyon') };
  if (q.type === 'multi') return { indexes: good ? [q.choices.indexOf('Chat'), q.choices.indexOf('Chien')] : [q.choices.indexOf('Truite')] };
  if (q.type === 'text') return { text: good ? 'vinci' : 'Picasso' };
  if (q.type === 'order') return { order: good ? ['1', '2', '3'].map((c) => q.choices.indexOf(c)) : ['3', '2', '1'].map((c) => q.choices.indexOf(c)) };
  if (q.type === 'poll') return { index: 0 };
  return null;
}

const tests = {
  async 'quiz classique (5 types de questions)'() {
    const game = await setupGame({ mode: 'standard', limitTime: false }, QUIZ);
    assert.strictEqual(game.info.count, 5);
    const { results, end, endPlayers } = await play(game, quizAnswer);
    assert.deepStrictEqual(results.map((r) => r.okCount), [1, 1, 1, 1, 0]);
    // réponses écrites regroupées pour l'animateur (sans les noms)
    assert.deepStrictEqual(results[2].texts, [{ text: 'vinci', count: 1, ok: true }, { text: 'Picasso', count: 1, ok: false }]);
    assert.strictEqual(results[0].texts, null);
    assert.strictEqual(end.questions, 4);
    assert.deepStrictEqual(end.board.map((b) => [b.name, b.score]), [['Alice', 4], ['Bob', 0]]);
    assert.strictEqual(end.missedCount, 4);
    // tous les joueurs, pour le tableur des résultats
    assert.deepStrictEqual(end.results.map((r) => [r.rank, r.name, r.score, r.correct, r.team]), [[1, 'Alice', 4, 4, null], [2, 'Bob', 0, 0, null]]);
    // une case par question notée (le sondage ne compte pas), dans l'ordre des statistiques
    assert.deepStrictEqual(end.results.map((r) => r.answers), [[true, true, true, true], [false, false, false, false]]);
    assert.strictEqual(endPlayers[0].rank, 1);
    // récap question par question sur le téléphone (le sondage ne compte pas)
    assert.deepStrictEqual(endPlayers.map((p) => p.answers), [[true, true, true, true], [false, false, false, false]]);
    assert.strictEqual(endPlayers[1].mistakes.length, 4);
    const replay = once(game.host, 'host:replayQuiz');
    game.host.emit('host:replayMissed');
    assert.strictEqual((await replay).questions.length, 4);
    close(game);
  },

  async 'élimination'() {
    const game = await setupGame({ mode: 'elimination' }, QUIZ);
    const { results, end } = await play(game, quizAnswer);
    assert.deepStrictEqual(results[0].outNow, ['Bob']);
    assert.strictEqual(results[0].last, true); // un seul survivant : fin de partie
    assert.deepStrictEqual(end.board.map((b) => [b.name, b.alive]), [['Alice', true], ['Bob', false]]);
    close(game);
  },

  async 'cœurs et temps limité'() {
    const game = await setupGame({ limitTime: true, time: 20, speedBonus: false, hearts: true, lives: 2 }, QUIZ);
    const { results, endPlayers } = await play(game, quizAnswer);
    assert.strictEqual(results.length, 2); // Bob perd ses 2 cœurs en 2 questions
    assert.strictEqual(endPlayers[1].alive, false);
    assert.strictEqual(endPlayers[0].hearts, 2);
    close(game);
  },

  async 'bonus de rapidité'() {
    const game = await setupGame({ limitTime: true, time: 20, speedBonus: true }, QUIZ);
    const { end } = await play(game, quizAnswer);
    assert.strictEqual(end.scoreMode, 'points');
    assert.ok(end.board[0].score > 3500 && end.board[0].score <= 4000, 'score Alice : ' + end.board[0].score);
    close(game);
  },

  async 'roue'() {
    const pairs = [['I', 'un'], ['II', 'deux'], ['III', 'trois'], ['IV', 'quatre']].map(([q, a]) => ({ q, a }));
    const game = await setupGame({ pairsView: 'wheel' }, { kind: 'wheel', title: 'Romains', category: 'Chiffres', pairs });
    assert.strictEqual(game.info.kind, 'wheel');
    const ans = (q, i) => {
      const good = pairs.find((p) => p.q === q.text).a;
      return { index: i === 0 ? q.choices.indexOf(good) : q.choices.findIndex((c) => c !== good) };
    };
    const { results, end } = await play(game, ans);
    assert.strictEqual(results.length, 4);
    assert.ok(results.every((r) => r.wheel && r.okCount === 1));
    assert.deepStrictEqual(end.board.map((b) => b.score), [4, 0]);
    close(game);
  },

  async 'relier'() {
    const pairs = [['I', 'un'], ['II', 'deux'], ['III', 'trois']].map(([q, a]) => ({ q, a }));
    const game = await setupGame({ pairsView: 'match' }, { kind: 'wheel', title: 'Romains', category: 'Chiffres', pairs });
    const ans = (q, i) => {
      const links = q.matchLeft.map((l) => q.choices.indexOf(pairs.find((p) => p.q === l).a));
      return { links: i === 0 ? links : links.slice().reverse() };
    };
    const { results } = await play(game, ans);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].okCount, 1);
    close(game);
  },

  async 'jeu de mots'() {
    const game = await setupGame({}, { kind: 'letters', title: 'Mots', items: [{ q: 'Capitale ?', word: 'Paris' }, { q: 'Animal ?', word: 'Chat' }] });
    const words = { 'Capitale ?': 'PARIS', 'Animal ?': 'CHAT' };
    const { results, end } = await play(game, (q, i) => ({ text: i === 0 ? words[q.text] : 'zzzz' }));
    assert.deepStrictEqual(results.map((r) => r.okCount), [1, 1]);
    assert.deepStrictEqual(end.board.map((b) => b.score), [2, 0]);
    close(game);
  },

  async 'équipes'() {
    const game = await setupGame({ mode: 'teams', teamCount: 2 }, QUIZ);
    const { end, endPlayers } = await play(game, quizAnswer);
    assert.strictEqual(end.teams.length, 2);
    assert.notStrictEqual(endPlayers[0].team, endPlayers[1].team);
    assert.deepStrictEqual(end.teams.map((t) => t.score), [4, 0]);
    assert.ok(end.results.every((r) => typeof r.team === 'string' && r.team), 'nom d\'équipe dans les résultats');
    close(game);
  },

  async 'reconnexion d\'un joueur'() {
    const game = await setupGame({}, QUIZ);
    const { host, players } = game;
    host.emit('host:start');
    await once(host, 'question');
    const { pin, pid, token } = players[1].info;
    players[1].close();
    const again = connect();
    const back = once(again, 'question');
    again.emit('player:rejoin', { pin, pid, token });
    const q = await back;
    assert.strictEqual(q.index, 0);
    assert.strictEqual(q.text, 'Capitale de la France ?');
    players[1] = again;
    close(game);
  },

  async 'profil, pause, retour de l\'animateur, exclusion, salle d\'attente'() {
    const game = await setupGame({}, QUIZ);
    const { players } = game;
    const prof = once(players[0], 'profile:ok');
    players[0].emit('player:profile', { name: 'Alicia', avatar: players[0].info.avatar });
    assert.strictEqual((await prof).name, 'Alicia');

    game.host.emit('host:start');
    await once(game.host, 'question');
    const paused = once(players[0], 'paused');
    game.host.emit('host:pause', true);
    assert.strictEqual((await paused).paused, true);

    // L'animateur perd la connexion puis revient avec sa clé
    const { pin } = game;
    const key = await new Promise((resolve) => {
      const h = connect();
      h.emit('host:rejoin', { pin, key: 'mauvaise' });
      h.once('host:rejoin:error', () => { h.close(); resolve(null); });
    });
    assert.strictEqual(key, null);
    game.host.close();
    const host2 = connect();
    const created = once(host2, 'host:created');
    const back = once(host2, 'question');
    host2.emit('host:rejoin', { pin, key: game.hostKey });
    assert.strictEqual((await created).rejoined, true);
    assert.strictEqual((await back).index, 0);
    game.host = host2;

    const kicked = once(players[1], 'kicked');
    host2.emit('host:kick', { pid: players[1].info.pid, minutes: 5 });
    assert.ok((await kicked).message.includes('5 min'));

    const lobby = once(players[0], 'lobby');
    host2.emit('host:reset');
    assert.strictEqual((await lobby).name, 'Alicia');
    close(game);
  },

  async 'chrono gardé après reconnexion (quiz et relier)'() {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const pairs = [['I', 'un'], ['II', 'deux'], ['III', 'trois']].map(([q, a]) => ({ q, a }));
    for (const quiz of [QUIZ, { kind: 'wheel', title: 'Romains', category: 'Chiffres', pairs }]) {
      const game = await setupGame({ limitTime: true, time: 20, pairsView: 'match' }, quiz);
      game.host.emit('host:start');
      const first = await once(game.host, 'question');
      assert.strictEqual(first.left, 20);
      await wait(1500);
      const { pin, pid, token } = game.players[1].info;
      game.players[1].close();
      const again = connect();
      const back = once(again, 'question');
      again.emit('player:rejoin', { pin, pid, token });
      const q = await back;
      assert.ok(typeof q.left === 'number' && q.left < 19 && q.left > 15, 'temps restant reçu : ' + JSON.stringify(q.left));
      if (quiz.kind) assert.strictEqual(q.matchLeft.length, 3);
      game.players[1] = again;
      close(game);
    }
  },

  async '+10 s pendant une question chronométrée'() {
    const game = await setupGame({ mode: 'standard', limitTime: true, time: 20, readDelay: false }, QUIZ);
    const q = once(game.host, 'question', 15000);
    game.host.emit('host:start');
    assert.strictEqual((await q).time, 20);
    const more = Promise.all([once(game.host, 'time:more'), once(game.players[0], 'time:more')]);
    game.host.emit('host:moreTime');
    const [h, p] = await more;
    assert.strictEqual(h.time, 30);
    assert.strictEqual(p.time, 30);
    assert.ok(p.left > 25 && p.left <= 30, 'temps restant : ' + p.left);
    close(game);
  },

  async 'salle d\'attente : les téléphones voient le nom du quiz, et le suivent'() {
    const game = await setupGame({ mode: 'standard' }, QUIZ);
    assert.strictEqual(game.players[0].info.quizTitle, 'Test');
    const upd = once(game.players[1], 'game:settings');
    game.host.emit('host:quiz', { ...QUIZ, title: 'Autre quiz' });
    assert.strictEqual((await upd).quizTitle, 'Autre quiz');
    close(game);
  },

  async 'salle d\'attente : les téléphones voient combien de joueurs sont là'() {
    const game = await setupGame({ mode: 'standard' }, QUIZ);
    const count = once(game.players[0], 'lobby:count');
    const s = connect();
    s.emit('player:join', { pin: game.pin, name: 'Chloé', device: 'test-Chloe' });
    assert.deepStrictEqual(await Promise.all([once(s, 'lobby:count'), count]), [3, 3]);
    s.close();
    close(game);
  },

  async 'en-têtes de protection du site'() {
    const res = await fetch(URL + '/host.html');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(res.headers.get('referrer-policy'), 'same-origin');
    assert.strictEqual(res.headers.get('x-powered-by'), null);
  },

  async 'pas plus de 10 salles ouvertes en même temps depuis une même adresse'() {
    const socks = [];
    const errors = [];
    for (let i = 0; i < 11; i++) {
      const h = io(URL, { transports: ['websocket'], forceNew: true, extraHeaders: { 'x-forwarded-for': '203.0.113.7' } });
      socks.push(h);
      const done = Promise.race([once(h, 'host:created').then(() => null), once(h, 'host:create:error')]);
      h.emit('host:create', { origin: URL });
      const e = await done;
      if (e) errors.push(e);
    }
    assert.strictEqual(errors.length, 1, errors.join(' | '));
    assert.ok(/10 salles/.test(errors[0]), errors[0]);
    socks.forEach((h) => { h.emit('host:close'); h.close(); });
  },

  async 'codes PIN faux à la chaîne : il faut attendre'() {
    const s = connect();
    const errors = [];
    s.on('join:error', (m) => errors.push(m));
    for (let i = 0; i < 9; i++) s.emit('player:join', { pin: '00000' + i, name: 'Robot', device: 'test-robot' });
    await new Promise((r) => setTimeout(r, 500));
    assert.strictEqual(errors.length, 9);
    assert.ok(errors.slice(0, 8).every((m) => m === 'Code PIN introuvable.'), errors.join(' | '));
    assert.ok(/Trop d.essais/.test(errors[8]), errors[8]);
    s.close();
  },

  async 'pseudo déjà pris : un pseudo libre est proposé'() {
    const game = await setupGame({ mode: 'standard' }, QUIZ);
    const s = connect();
    const sug = once(s, 'join:suggest');
    const err = once(s, 'join:error');
    s.emit('player:join', { pin: game.pin, name: 'alice', device: 'test-alice2' });
    assert.ok(/Alice 2/.test(await err), 'message');
    assert.strictEqual(await sug, 'Alice 2');
    s.close();
    close(game);
  },

  async 'changer de pseudo pour un pseudo pris : un pseudo libre est proposé'() {
    const game = await setupGame({ mode: 'standard' }, QUIZ);
    const sug = once(game.players[1], 'profile:suggest');
    const err = once(game.players[1], 'profile:error');
    game.players[1].emit('player:profile', { name: 'ALICE', avatar: game.players[1].info.avatar });
    assert.ok(/Alice 2/.test(await err));
    assert.strictEqual(await sug, 'Alice 2');
    close(game);
  },

  async 'code PIN collé avec des espaces ou des tirets'() {
    const game = await setupGame({ mode: 'standard' }, QUIZ);
    const s = connect();
    const ok = once(s, 'join:ok');
    s.emit('player:join', { pin: ' ' + game.pin.slice(0, 3) + ' - ' + game.pin.slice(3) + ' ', name: 'Chloé', device: 'test-Chloe' });
    await ok;
    s.close();
    close(game);
  },

  async 'une connexion qui recrée une salle ferme l\'ancienne'() {
    const host = connect();
    const pins = [];
    for (let i = 0; i < 2; i++) {
      const created = once(host, 'host:created');
      host.emit('host:create', { origin: URL });
      pins.push((await created).pin);
    }
    const s = connect();
    const err = once(s, 'join:error');
    s.emit('player:join', { pin: pins[0], name: 'Zoe' });
    assert.strictEqual(await err, 'Code PIN introuvable.');
    s.close();
    host.close();
  },

  async 'réponses écrites avec œ et æ'() {
    const { isCorrect } = require('../src/answers');
    const ok = (ans, typed) => isCorrect({ type: 'text', answers: [ans] }, typed);
    assert.ok(ok('cœur', 'coeur'));
    assert.ok(ok('cœur', 'cœur'));
    assert.ok(ok('coeur', 'cœur'));
    assert.ok(ok('Œdipe', 'oedipe'));
    assert.ok(ok('Lætitia', 'laetitia'));
    assert.ok(!ok('Œdipe', 'Ulysse'));
  },

  async 'pendu avec des équipes choisies : pas d\'équipe vide'() {
    const game = await setupGame({ mode: 'hangman', teamCount: 3, teamAssign: 'manual' }, {
      title: 'Pendu',
      questions: Array.from({ length: 10 }, (_, i) => ({ type: 'tf', text: 'Q' + i, correct: 0 })),
    });
    game.players.forEach((p, i) => game.host.emit('host:team', { pid: p.info.pid, team: i }));
    const { results, end } = await play(game, (q, i) => ({ index: i }));
    assert.strictEqual(results.length, 6); // l'équipe de Bob est pendue à la 6e erreur : fin
    assert.deepStrictEqual(end.teams.map((t) => t.members), [1, 1]);
    close(game);
  },

  async 'cœur perdu oublié à la partie suivante'() {
    const quiz = { title: 'TF', questions: [{ type: 'tf', text: 'Vrai ?', correct: 0 }] };
    const game = await setupGame({ hearts: true, speedBonus: false, lives: 3 }, quiz);
    const { host, players } = game;
    await play(game, (q, i) => ({ index: i })); // Bob se trompe et perd un cœur
    const lobby = once(host, 'lobby');
    host.emit('host:reset');
    await lobby;
    const sOk = once(host, 'host:settings');
    host.emit('host:settings', { hearts: false });
    await sOk;
    const qOk = once(host, 'host:quiz:ok');
    host.emit('host:quiz', quiz);
    await qOk;
    const res = once(players[1], 'result');
    host.emit('host:start');
    await once(host, 'question');
    players.forEach((p) => p.emit('player:answer', { index: 0 })); // tout le monde a juste
    const r = await res;
    assert.strictEqual(r.correct, true);
    assert.strictEqual(r.lostHeart, false);
    close(game);
  },

  async 'tout le monde se trompe avec son dernier cœur : personne ne le perd, et on ne dit pas « tu perds un cœur »'() {
    const quiz = { title: 'TF', questions: [{ type: 'tf', text: 'Vrai ?', correct: 0 }, { type: 'tf', text: 'Encore ?', correct: 0 }] };
    const game = await setupGame({ hearts: true, speedBonus: false, lives: 1 }, quiz);
    const { host, players } = game;
    const res = once(players[0], 'result');
    host.emit('host:start');
    await once(host, 'question');
    players.forEach((p) => p.emit('player:answer', { index: 1 })); // tout le monde a faux
    const r = await res;
    assert.strictEqual(r.hearts, 1);
    assert.strictEqual(r.lostHeart, false);
    assert.strictEqual(r.keptHeart, true);
    close(game);
  },

  async 'image à toucher : image toujours sur le téléphone, zone cachée jusqu\'au résultat, points pour l\'animateur'() {
    const zone = { x: 0.5, y: 0.5, r: 0.08, ar: 1 };
    const quiz = { title: 'Carte', questions: [{ type: 'zone', text: 'Touche le centre', image: 'https://example.com/a.png', zone }] };
    const game = await setupGame({ display: 'host', speedBonus: false }, quiz);
    const { host, players } = game;
    const pq = once(players[0], 'question');
    const hq = once(host, 'question');
    const res = once(host, 'results');
    host.emit('host:start');
    const [p, h] = await Promise.all([pq, hq]);
    assert.strictEqual(p.image, 'https://example.com/a.png');
    assert.strictEqual(p.hidden, undefined);
    assert.strictEqual(p.zone, undefined);
    assert.strictEqual(h.zone, undefined);
    players[0].emit('player:answer', { point: { x: 0.5, y: 0.5 } });
    players[1].emit('player:answer', { point: { x: 0.95, y: 0.95 } });
    const r = await res;
    assert.deepStrictEqual(r.zone, zone);
    assert.strictEqual(r.image, 'https://example.com/a.png'); // pour redessiner après un rechargement de l'animateur
    assert.strictEqual(r.points.length, 2);
    assert.deepStrictEqual(r.points.map((x) => x.ok).sort(), [false, true]);
    assert.deepStrictEqual(r.counts, [1, 1]);
    close(game);
  },

  async 'PIN inconnu'() {
    const s = connect();
    const e1 = once(s, 'join:error');
    s.emit('player:join', { pin: '000000', name: 'Test' });
    assert.strictEqual(await e1, 'Code PIN introuvable.');
    s.close();
  },
};

(async () => {
  const srv = await startServer();
  let failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try {
      await fn();
      console.log('  ok   ' + name);
    } catch (e) {
      failed++;
      console.log('  ÉCHEC ' + name + ' : ' + e.message);
    }
  }
  srv.kill();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
