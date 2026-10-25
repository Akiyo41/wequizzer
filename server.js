const express = require('express');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Server } = require('socket.io');
const sampleQuestions = require('./questions.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 8e6 });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/icons', express.static(path.join(__dirname, 'node_modules/@tabler/icons-webfont/dist')));
app.get('/api/sample-quiz', (req, res) => {
  res.json({ title: 'Culture générale', questions: sampleQuestions });
});

const PORT = process.env.PORT || 3000;
const COUNTDOWN = 3; // secondes avant chaque question
const MAX_PLAYERS = 200;
const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🐵', '🦄', '🐯', '🐧', '🐢', '🦉', '🐳', '🐰', '🐨', '🦖', '🐝'];
const REACTIONS = ['👏', '😂', '😮', '🔥', '😢', '❤️'];
const THEMES = ['wequizzer']; // d'autres thèmes (enfant, ados, adulte…) pourront s'ajouter ici
const TIME_CHOICES = [10, 15, 20, 25, 30, 40, 50, 60];
const AUTO_DELAYS = [5, 8, 10, 15];
const READ_DELAYS = [3, 5, 8, 10];
const MODES = ['standard', 'teams', 'elimination', 'hangman'];
const WHEEL_Q_MAX = 60; // longueur max d'une question de la roue
const WHEEL_A_MAX = 25; // longueur max d'une réponse de la roue (elles sont écrites sur la roue)
const WHEEL_MAX = 4; // réponses visibles en même temps sur la roue
const HANG_MAX = 6; // erreurs avant que le pendu soit complet
const MAX_PAIRS = 100;
const TEAMS = [
  { name: 'Rouge', icon: '🔴', color: '#ef4444' },
  { name: 'Bleu', icon: '🔵', color: '#3b82f6' },
  { name: 'Vert', icon: '🟢', color: '#22c55e' },
  { name: 'Jaune', icon: '🟡', color: '#eab308' },
];
const HOST_GRACE_MS = 15 * 60 * 1000; // une salle sans animateur est supprimée après 15 min
const LOBBY_GRACE_MS = 90 * 1000; // un joueur déconnecté dans la salle d'attente est retiré après 90 s

const DEFAULTS = {
  mode: 'standard', // standard | teams | elimination | hangman
  teamCount: 2,
  teamAssign: 'random', // 'random' = au hasard, 'manual' = choisies par l'animateur
  teamNames: ['', '', '', ''], // noms personnalisés ('' = nom par défaut)
  limitTime: false, // false = temps illimité
  time: 20, // secondes si le temps est limité
  readDelay: false,
  readSeconds: 5,
  autoNext: false,
  autoDelay: 8,
  changeAnswer: false,
  bonusQuestions: true,
  shuffleQuestions: false,
  count: 0, // 0 = toutes les questions
  showAnswers: true,
  display: 'both', // 'both' = animateur + joueurs, 'host' = écran de l'animateur seulement
  showExplain: true, // affiche l'explication (si la question en a une) après la réponse
  pairsView: 'wheel', // jeu de paires : 'wheel' = roue, 'match' = relier
  labels: 'letters', // 'letters' = A B C D, 'numbers' = 1 2 3 4
  reactions: false, // masqué pour l'instant (le code reste)
  sounds: true,
  volume: 70,
  theme: 'wequizzer',
  speedBonus: true, // points bonus de rapidité (temps limité seulement, pas avec les cœurs)
  hearts: false, // cœurs : une mauvaise réponse fait perdre un cœur (pas avec le mode élimination ni les points bonus)
  lives: 3, // nombre de cœurs
  reviewErrors: true, // les joueurs peuvent revoir leurs erreurs à la fin
};

const games = {}; // pin -> état de la partie

// ---------- Filtre de pseudos ----------
function normWord(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[@4]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');
}
let blockedWords = [];
function loadBlockedWords() {
  try {
    const txt = fs.readFileSync(path.join(__dirname, 'blocked-words.txt'), 'utf8');
    blockedWords = Array.from(
      new Set(
        txt
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map(normWord)
          .filter((w) => w.length >= 2)
      )
    );
  } catch (e) {
    blockedWords = [];
  }
}
loadBlockedWords();
function isBlocked(name) {
  const full = normWord(name);
  const tokens = String(name)
    .split(/[^\p{L}\p{N}@$!|]+/u)
    .map(normWord)
    .filter(Boolean);
  return blockedWords.some((w) => (w.length >= 6 ? full.includes(w) : full === w || tokens.includes(w)));
}

// ---------- Utilitaires ----------
function lanUrl() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) return `http://${n.address}:${PORT}`;
    }
  }
  return null;
}

function rid(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function sanitize(input, current) {
  const s = { ...current };
  if (!input || typeof input !== 'object') return s;
  if (MODES.includes(input.mode)) s.mode = input.mode;
  if ([2, 3, 4].includes(input.teamCount)) s.teamCount = input.teamCount;
  if (['random', 'manual'].includes(input.teamAssign)) s.teamAssign = input.teamAssign;
  if (Array.isArray(input.teamNames)) {
    s.teamNames = [0, 1, 2, 3].map((i) => {
      const n = String(input.teamNames[i] || '').trim().replace(/\s+/g, ' ').slice(0, 14);
      return n && !isBlocked(n) ? n : '';
    });
  }
  if (TIME_CHOICES.includes(input.time)) s.time = input.time;
  if (AUTO_DELAYS.includes(input.autoDelay)) s.autoDelay = input.autoDelay;
  if (READ_DELAYS.includes(input.readSeconds)) s.readSeconds = input.readSeconds;
  if (Number.isInteger(input.count) && input.count >= 0 && input.count <= 100) s.count = input.count;
  if (Number.isInteger(input.volume) && input.volume >= 0 && input.volume <= 100) s.volume = input.volume;
  if (THEMES.includes(input.theme)) s.theme = input.theme;
  if (Number.isInteger(input.lives) && input.lives >= 1 && input.lives <= 5) s.lives = input.lives;
  if (['both', 'host'].includes(input.display)) s.display = input.display;
  if (['letters', 'numbers'].includes(input.labels)) s.labels = input.labels;
  if (typeof input.showExplain === 'boolean') s.showExplain = input.showExplain;
  if (['wheel', 'match'].includes(input.pairsView)) s.pairsView = input.pairsView;
  [
    'limitTime', 'speedBonus', 'hearts', 'reviewErrors', 'readDelay', 'autoNext', 'changeAnswer', 'bonusQuestions',
    'shuffleQuestions', 'showAnswers', 'reactions', 'sounds',
  ].forEach((k) => {
    if (typeof input[k] === 'boolean') s[k] = input[k];
  });
  return s;
}

// Vérifie et nettoie un quiz envoyé par l'animateur
function cleanWheel(input) {
  const title = String(input.title || '').trim().slice(0, 60) || 'Roue sans titre';
  const category = String(input.category || '').trim().slice(0, 80);
  if (!category) return { error: 'Écris la catégorie (le texte au centre de la roue).' };
  const raw = Array.isArray(input.pairs) ? input.pairs : [];
  if (raw.length < 3) return { error: 'Il faut au moins 3 paires (question + réponse).' };
  if (raw.length > MAX_PAIRS) return { error: `Une roue peut contenir ${MAX_PAIRS} paires au maximum.` };
  const pairs = [];
  const seen = new Set();
  for (let i = 0; i < raw.length; i++) {
    const q = String((raw[i] && raw[i].q) || '').trim();
    const a = String((raw[i] && raw[i].a) || '').trim();
    if (!q || !a) return { error: `Paire ${i + 1} : la question ou la réponse est vide.` };
    if (q.length > WHEEL_Q_MAX) return { error: `Paire ${i + 1} : la question est trop longue (${WHEEL_Q_MAX} caractères maximum).` };
    if (a.length > WHEEL_A_MAX) return { error: `Paire ${i + 1} : la réponse « ${a} » est trop longue (${WHEEL_A_MAX} caractères maximum).` };
    const key = a.toLowerCase();
    if (seen.has(key)) return { error: `La réponse « ${a} » est en double : chaque réponse doit être unique.` };
    seen.add(key);
    // Mauvaises réponses facultatives (jusqu'à 3), dans le thème de la question
    const wr = Array.isArray(raw[i].w) ? raw[i].w : [];
    const w = [];
    for (const x of wr) {
      const t = String(x || '').trim();
      if (!t) continue;
      if (t.length > WHEEL_A_MAX) return { error: `Paire ${i + 1} : la mauvaise réponse « ${t} » est trop longue (${WHEEL_A_MAX} caractères maximum).` };
      if (t.toLowerCase() === key || w.some((y) => y.toLowerCase() === t.toLowerCase())) return { error: `Paire ${i + 1} : la mauvaise réponse « ${t} » est en double.` };
      w.push(t);
    }
    if (w.length > 3) return { error: `Paire ${i + 1} : 3 mauvaises réponses au maximum.` };
    pairs.push(w.length ? { q, a, w } : { q, a });
  }
  return { quiz: { title, kind: 'wheel', category, pairs, questions: [] } };
}

// Jeu de mots : une question (image facultative) + un mot à reconstituer avec des lettres mélangées
const WORD_LETTER = /[\p{L}\p{N}]/u;
const wordLetters = (w) => Array.from(String(w)).filter((c) => WORD_LETTER.test(c));
function cleanLetters(input) {
  const title = String(input.title || '').trim().slice(0, 60) || 'Jeu de mots sans titre';
  const raw = Array.isArray(input.items) ? input.items : [];
  if (raw.length < 1) return { error: 'Ajoute au moins un mot.' };
  if (raw.length > 100) return { error: 'Un jeu de mots peut contenir 100 mots au maximum.' };
  const items = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i] || {};
    const q = String(r.q || '').trim().slice(0, 200);
    const word = String(r.word || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!q) return { error: `Mot ${i + 1} : la question est vide.` };
    const n = wordLetters(word).length;
    if (n < 3 || n > 14) return { error: `Mot ${i + 1} : « ${word} » doit avoir entre 3 et 14 lettres.` };
    const image = typeof r.image === 'string' && /^https?:\/\//i.test(r.image.trim()) ? r.image.trim().slice(0, 500) : '';
    items.push({ q, word, image });
  }
  return { quiz: { title, kind: 'letters', items, questions: [] } };
}

// Image : lien internet ou petite image envoyée depuis l'ordinateur de l'animateur
function cleanImage(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (/^https?:\/\//i.test(t)) return t.slice(0, 500);
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(t) && t.length <= 150000) return t;
  return null;
}

function quizCount(quiz) {
  if (quiz.kind === 'wheel') return quiz.pairs.length;
  if (quiz.kind === 'letters') return quiz.items.length;
  return quiz.questions.length;
}

function cleanQuiz(input) {
  if (input && input.kind === 'wheel') return cleanWheel(input);
  if (input && input.kind === 'letters') return cleanLetters(input);
  if (!input || typeof input !== 'object' || !Array.isArray(input.questions)) {
    return { error: 'Quiz invalide.' };
  }
  const title = String(input.title || '').trim().slice(0, 60) || 'Quiz sans titre';
  if (input.questions.length === 0) return { error: 'Ce quiz ne contient aucune question.' };
  if (input.questions.length > 100) return { error: 'Un quiz peut contenir 100 questions au maximum.' };
  const questions = [];
  for (let i = 0; i < input.questions.length; i++) {
    const raw = input.questions[i];
    const n = i + 1;
    if (!raw || typeof raw !== 'object') return { error: `Question ${n} invalide.` };
    const text = String(raw.text || '').trim().slice(0, 200);
    if (!text) return { error: `Question ${n} : le texte est vide.` };
    const type = ['single', 'tf', 'multi', 'text', 'poll', 'order'].includes(raw.type) ? raw.type : 'single';
    const image = cleanImage(raw.image);
    const double = raw.double === true && type !== 'poll';
    const q = { type, text, image, double, choices: [], correct: null, answers: [], explain: String(raw.explain || '').trim().slice(0, 300) };

    if (type === 'tf') {
      q.choices = ['Vrai', 'Faux'];
      if (raw.correct !== 0 && raw.correct !== 1) return { error: `Question ${n} : choisis Vrai ou Faux.` };
      q.correct = raw.correct;
    } else if (type === 'text') {
      const answers = (Array.isArray(raw.answers) ? raw.answers : [])
        .map((a) => String(a).trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 8);
      if (answers.length === 0) return { error: `Question ${n} : écris au moins une réponse acceptée.` };
      q.answers = answers;
    } else if (type === 'order') {
      // Les éléments sont donnés dans le BON ordre
      if (!Array.isArray(raw.choices) || raw.choices.length < 2 || raw.choices.length > 6) return { error: `Question ${n} : il faut 2 à 6 éléments à remettre dans l'ordre.` };
      q.choices = raw.choices.map((c) => String(c).trim().slice(0, 80));
      if (q.choices.some((c) => !c)) return { error: `Question ${n} : un élément est vide.` };
      if (new Set(q.choices.map((c) => c.toLowerCase())).size !== q.choices.length) return { error: `Question ${n} : deux éléments sont identiques.` };
    } else {
      if (!Array.isArray(raw.choices) || raw.choices.length < 2 || raw.choices.length > 4) {
        return { error: `Question ${n} : il faut 2 à 4 réponses.` };
      }
      q.choices = raw.choices.map((c) => String(c).trim().slice(0, 100));
      if (q.choices.some((c) => !c)) return { error: `Question ${n} : une réponse est vide.` };
      if (type === 'single') {
        if (!Number.isInteger(raw.correct) || raw.correct < 0 || raw.correct >= q.choices.length) {
          return { error: `Question ${n} : la bonne réponse est invalide.` };
        }
        q.correct = raw.correct;
      } else if (type === 'multi') {
        const list = Array.isArray(raw.correct) ? raw.correct : [];
        const uniq = Array.from(new Set(list.filter((x) => Number.isInteger(x) && x >= 0 && x < q.choices.length)));
        if (uniq.length === 0) return { error: `Question ${n} : coche au moins une bonne réponse.` };
        q.correct = uniq.sort((a, b) => a - b);
      }
    }
    questions.push(q);
  }
  return { quiz: { title, questions } };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Roue : choisit les paires de la partie (mélange / nombre limité)
function wheelPairs(g) {
  let pairs = g.quiz.pairs.map((p, i) => ({ id: i, q: p.q, a: p.a, w: p.w || [] }));
  if (g.settings.shuffleQuestions) pairs = shuffle(pairs);
  if (g.settings.count > 0) pairs = pairs.slice(0, g.settings.count);
  return pairs;
}

function buildQuestions(g) {
  if (g.quiz.kind === 'letters') {
    let items = g.quiz.items.slice();
    if (g.settings.shuffleQuestions) items = shuffle(items);
    if (g.settings.count > 0) items = items.slice(0, g.settings.count);
    return items.map((it) => {
      const chars = Array.from(it.word);
      const letters = wordLetters(it.word).map((c) => c.toLocaleUpperCase('fr'));
      let tiles = shuffle(letters);
      for (let k = 0; k < 6 && tiles.join('') === letters.join(''); k++) tiles = shuffle(letters);
      return {
        type: 'text', letters: true, text: it.q, image: it.image || null, double: false,
        choices: [], correct: null, answers: [it.word], tiles,
        slots: chars.map((c) => (WORD_LETTER.test(c) ? '' : c)), item: it,
      };
    });
  }
  if (g.quiz.kind === 'wheel') {
    // Roue : une question par paire
    const pairs = wheelPairs(g);
    if (g.settings.pairsView === 'match') {
      // Relier : des groupes de 2 à 4 paires, on relie chaque élément à sa réponse
      const perGroup = pairs.some((p) => p.q.length > 40) ? 3 : WHEEL_MAX; // textes longs : moins d'éléments par écran, pour que tout tienne
      const nb = Math.ceil(pairs.length / perGroup);
      const out = [];
      let at = 0;
      for (let b = 0; b < nb; b++) {
        const size = Math.floor(pairs.length / nb) + (b < pairs.length % nb ? 1 : 0);
        const grp = pairs.slice(at, at + size);
        at += size;
        const choices = shuffle(grp.map((p) => p.a));
        out.push({
          type: 'match', match: true, category: g.quiz.category, text: g.quiz.category, image: null, double: false,
          left: grp.map((p) => p.q), pairs: grp.map((p) => ({ q: p.q, a: p.a })),
          choices, correct: grp.map((p) => choices.indexOf(p.a)), answers: [],
        });
      }
      return out;
    }
    // Une question par paire : 4 réponses possibles (la bonne + 3 autres paires tirées au hasard)
    return pairs.map((p) => {
      // mauvaises réponses données par l'animateur ; s'il en manque, on complète avec les réponses d'autres paires
      const wrongs = p.w.slice(0, WHEEL_MAX - 1);
      const filler = shuffle(pairs.filter((x) => x.id !== p.id).map((x) => x.a).filter((t) => !wrongs.includes(t)));
      while (wrongs.length < WHEEL_MAX - 1 && filler.length) wrongs.push(filler.shift());
      const choices = shuffle([p.a, ...wrongs]);
      return {
        type: 'single', wheel: true, category: g.quiz.category, text: p.q, image: null, double: false, pair: { q: p.q, a: p.a, w: p.w },
        choices, correct: choices.indexOf(p.a), answers: [],
      };
    });
  }
  let qs = g.quiz.questions.map((q) => ({ ...q }));
  if (g.settings.shuffleQuestions) qs = shuffle(qs);
  if (g.settings.count > 0) qs = qs.slice(0, g.settings.count);
  qs = qs.map((q) => ({ ...q, double: g.settings.bonusQuestions ? q.double : false }));
  qs = qs.map((q) => {
    if (q.type !== 'order') return q;
    const n = q.choices.length;
    let order = shuffle(q.choices.map((_, i) => i));
    for (let k = 0; k < 8 && order.every((v, i) => v === i); k++) order = shuffle(order);
    // order[j] = élément (dans le bon ordre) affiché à la place j ; la bonne réponse liste, dans l'ordre, la place de chaque élément
    const shown = order.map((i) => q.choices[i]);
    return { ...q, choices: shown, items: q.choices, correct: q.choices.map((_, i) => order.indexOf(i)), answers: [] , n };
  });
  // Les réponses sont toujours mélangées (la bonne réponse ne reste jamais à la même place)
  qs = qs.map((q) => {
    if (!['single', 'multi', 'poll'].includes(q.type)) return q;
    const order = shuffle(q.choices.map((_, i) => i));
    const out = { ...q, choices: order.map((i) => q.choices[i]) };
    if (q.type === 'single') out.correct = order.indexOf(q.correct);
    if (q.type === 'multi') out.correct = q.correct.map((c) => order.indexOf(c)).sort((a, b) => a - b);
    return out;
  });
  return qs;
}

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

// ---------- Déroulement ----------
const isTeamMode = (g) => g.settings.mode === 'teams' || g.settings.mode === 'hangman';
const tName = (g, i) => (g.settings.teamNames && g.settings.teamNames[i]) || TEAMS[i].name;
const teamInfo = (g, t) => (t === null || t === undefined ? {} : { teamName: tName(g, t), teamIcon: TEAMS[t].icon, teamColor: TEAMS[t].color });

// Règles de score : cœurs (pas avec l'élimination) et/ou points selon la vitesse (seulement si le temps est limité) : les deux marchent ensemble
function heartsOn(g) {
  return !!g.settings.hearts && g.settings.mode !== 'elimination' && g.settings.mode !== 'hangman';
}
function bonusOn(g) {
  return !!g.settings.limitTime && !!g.settings.speedBonus;
}

function activePlayers(g) {
  return Object.values(g.players).filter((p) => !p.eliminated);
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
    left: q.match ? q.left : null,
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

// ---------- Erreurs (revoir / rejouer) ----------
function mistakeEntry(q, answer) {
  const c = q.choices;
  let yours = 'Pas de réponse';
  if (answer !== null && answer !== undefined) {
    if (q.type === 'match') yours = answer.map((x, i) => q.left[i] + ' → ' + c[x]).join(' · ');
    else if (q.type === 'order') yours = answer.map((x) => c[x]).join(' → ');
    else if (q.type === 'text') yours = String(answer);
    else if (q.type === 'multi') yours = answer.map((i) => c[i]).join(' + ');
    else yours = c[answer];
  }
  let correct = '';
  if (q.type === 'match') correct = q.pairs.map((p) => p.q + ' → ' + p.a).join(' · ');
  else if (q.type === 'order') correct = q.items.join(' → ');
  else if (q.type === 'text') correct = q.answers.join(' / ');
  else if (q.type === 'multi') correct = q.correct.map((i) => c[i]).join(' + ');
  else correct = c[q.correct];
  return { text: q.wheel ? q.category + ' : ' + q.text : q.match ? q.category + ' : relier ' + q.left.join(', ') : q.text, yours, correct };
}

// Nouveau quiz fait des questions ratées par au moins un joueur
function missedQuiz(g) {
  const idx = Object.keys(g.missed).map(Number).sort((a, b) => a - b);
  if (!idx.length) return null;
  const title = ('Questions ratées - ' + (g.quiz.title || '')).slice(0, 60);
  if (g.quiz.kind === 'letters') {
    return { kind: 'letters', title, items: idx.map((i) => ({ q: g.questions[i].item.q, word: g.questions[i].item.word, image: g.questions[i].item.image || '' })) };
  }
  if (g.quiz.kind === 'wheel') {
    const pairs = idx.flatMap((i) => (g.questions[i].match ? g.questions[i].pairs : [g.questions[i].pair]));
    const have = new Set(pairs.map((p) => p.a));
    shuffle(g.quiz.pairs).forEach((p) => { if (pairs.length < 3 && !have.has(p.a)) { pairs.push(p); have.add(p.a); } });
    return { kind: 'wheel', title, category: g.quiz.category, pairs: pairs.map((p) => (p.w && p.w.length ? { q: p.q, a: p.a, w: p.w } : { q: p.q, a: p.a })) };
  }
  const questions = idx.map((i) => {
    const q = g.questions[i];
    if (q.type === 'order') return { type: 'order', text: q.text, image: q.image || '', double: false, choices: q.items, correct: null, answers: [], explain: q.explain || '' };
    return { type: q.type, text: q.text, image: q.image || '', double: !!q.double, choices: q.choices, correct: q.correct, answers: q.answers, explain: q.explain || '' };
  });
  return { title, questions };
}

// ---------- Réponses ----------
function normAnswer(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function lev(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}
function textMatches(q, text) {
  const t = normAnswer(text);
  if (!t) return false;
  return q.answers.some((a) => {
    const w = normAnswer(a);
    if (t === w) return true;
    const tol = w.length >= 10 ? 2 : w.length >= 5 ? 1 : 0;
    return tol > 0 && lev(t, w) <= tol;
  });
}

function isCorrect(q, answer) {
  if (answer === null || answer === undefined) return false;
  if (q.type === 'match' || q.type === 'order') return Array.isArray(answer) && answer.length === q.correct.length && q.correct.every((c, i) => answer[i] === c);
  if (q.type === 'single' || q.type === 'tf') return answer === q.correct;
  if (q.type === 'multi') {
    return Array.isArray(answer) && answer.length === q.correct.length && q.correct.every((c) => answer.includes(c));
  }
  if (q.type === 'text' && q.letters) {
    const norm = (w) => wordLetters(w).join('').toLocaleLowerCase('fr');
    return typeof answer === 'string' && norm(answer) === norm(q.answers[0]);
  }
  if (q.type === 'text') return typeof answer === 'string' && textMatches(q, answer);
  return false;
}

function lab(g, i) {
  return g.settings.labels === 'numbers' ? String(i + 1) : 'ABCD'[i];
}
function shownAnswer(g, q, answer) {
  if (answer === null || answer === undefined) return null;
  if (q.wheel) return q.choices[answer];
  if (q.type === 'match') return answer.map((c, i) => q.left[i] + ' → ' + q.choices[c]).join(' · ');
  if (q.type === 'order') return answer.map((c) => q.choices[c]).join(' → ');
  if (q.type === 'text') return String(answer);
  if (q.type === 'multi') return answer.slice().sort((a, b) => a - b).map((i) => lab(g, i)).join(' + ');
  return lab(g, answer);
}
function correctText(g, q) {
  if (q.wheel) return q.choices[q.correct];
  if (q.type === 'match') return q.pairs.map((p) => p.q + ' → ' + p.a).join(' · ');
  if (q.type === 'order') return q.items.join(' → ');
  if (q.type === 'text') return q.answers.join(' / ');
  if (q.type === 'multi') return q.correct.map((i) => lab(g, i)).join(' + ');
  if (q.type === 'poll') return null;
  return lab(g, q.correct);
}

function cleanAnswer(q, data) {
  data = data || {};
  if (q.type === 'text') {
    const t = String(data.text || '').trim().slice(0, 100);
    return t ? t : null;
  }
  if (q.type === 'order') {
    const l = data.order;
    if (!Array.isArray(l) || l.length !== q.choices.length) return null;
    if (!l.every((x) => Number.isInteger(x) && x >= 0 && x < q.choices.length) || new Set(l).size !== l.length) return null;
    return l.slice();
  }
  if (q.type === 'match') {
    const l = data.links;
    if (!Array.isArray(l) || l.length !== q.left.length) return null;
    if (!l.every((x) => Number.isInteger(x) && x >= 0 && x < q.choices.length) || new Set(l).size !== l.length) return null;
    return l.slice();
  }
  if (q.type === 'multi') {
    if (!Array.isArray(data.indexes)) return null;
    const list = Array.from(new Set(data.indexes.filter((x) => Number.isInteger(x) && x >= 0 && x < q.choices.length)));
    return list.length ? list.sort((a, b) => a - b) : null;
  }
  if (Number.isInteger(data.index) && data.index >= 0 && data.index < q.choices.length) return data.index;
  return null;
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
    for (let t = 0; t < g.teamCount; t++) if (g.hang[t] < HANG_MAX) aliveBefore.push(t);
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
  const teamsAlive = hangman ? g.hang.slice(0, g.teamCount).filter((e) => e < HANG_MAX).length : 0;
  const elimOver = hangman ? g.teamCount >= 2 && teamsAlive <= 1 : (g.settings.mode === 'elimination' || hearts) && g.startPlayers >= 2 && survivors <= 1;
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


// ---------- Fin de partie ----------
function rankedPlayers(g) {
  const arr = Object.values(g.players);
  if (g.settings.mode === 'hangman') {
    const order = teamBoard(g).map((t) => t.team);
    return arr.sort((a, b) => order.indexOf(a.team) - order.indexOf(b.team) || b.score - a.score || a.timeSum - b.timeSum);
  }
  if (heartsOn(g)) {
    return arr.sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (a.eliminated && a.elimRound !== b.elimRound) return b.elimRound - a.elimRound;
      return (b.hearts || 0) - (a.hearts || 0) || b.score - a.score || a.timeSum - b.timeSum;
    });
  }
  if (g.settings.mode === 'elimination') {
    return arr.sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (a.eliminated && a.elimRound !== b.elimRound) return b.elimRound - a.elimRound;
      return b.score - a.score || a.timeSum - b.timeSum;
    });
  }
  return arr.sort((a, b) => b.score - a.score || a.timeSum - b.timeSum);
}

function computeTitles(g, ranked) {
  const titles = [];
  const given = new Set();
  const n = ranked.length;
  const give = (title, icon, cand) => {
    const p = cand.find((x) => !given.has(x.pid));
    if (!p) return;
    given.add(p.pid);
    titles.push({ title, icon, pid: p.pid, name: p.name, avatar: p.avatar });
  };
  if (g.settings.mode === 'elimination' || heartsOn(g)) {
    give('Le dernier survivant', 'ti-shield-check', ranked.filter((p) => !p.eliminated));
  }
  if (n >= 2) {
    if (g.scored >= 3) give('Le sans-faute', 'ti-target', ranked.filter((p) => p.correct === g.scored));
    const withCorrect = ranked.filter((p) => p.correct > 0);
    const byAvg = withCorrect.slice().sort((a, b) => a.timeSum / a.correct - b.timeSum / b.correct);
    give('Le plus rapide', 'ti-bolt', byAvg);
    give('La meilleure série', 'ti-flame', ranked.filter((p) => p.bestStreak >= 3).sort((a, b) => b.bestStreak - a.bestStreak));
    give('Le plus réfléchi', 'ti-bulb', byAvg.slice().reverse());
    if (g.settings.reactions) give('Le plus expressif', 'ti-mood-happy', ranked.filter((p) => p.reactions >= 3).sort((a, b) => b.reactions - a.reactions));
  }
  return titles;
}

function teamBoard(g) {
  const count = g.teamCount;
  const rows = [];
  const hang = g.settings.mode === 'hangman';
  for (let t = 0; t < count; t++) {
    const members = Object.values(g.players).filter((p) => p.team === t);
    const total = members.reduce((s, p) => s + p.score, 0);
    rows.push({
      team: t,
      name: tName(g, t),
      icon: TEAMS[t].icon,
      color: TEAMS[t].color,
      members: members.length,
      score: members.length ? Math.round(total / members.length) : 0,
      errors: hang ? g.hang[t] : null,
      out: hang ? g.hang[t] >= HANG_MAX : false,
      outRound: hang ? g.hangOut[t] : null,
    });
  }
  if (hang) {
    return rows.sort((a, b) => {
      if (a.out !== b.out) return a.out ? 1 : -1;
      if (a.out && a.outRound !== b.outRound) return b.outRound - a.outRound;
      return a.errors - b.errors || b.score - a.score;
    });
  }
  return rows.sort((a, b) => b.score - a.score);
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

function resetPlayerStats(p) {
  p.score = 0;
  p.streak = 0;
  p.bestStreak = 0;
  p.correct = 0;
  p.timeSum = 0;
  p.reactions = 0;
  p.answered = false;
  p.answer = null;
  p.answeredAt = 0;
  p.lastPoints = 0;
  p.lastCorrect = false;
  p.eliminated = false;
  p.elimRound = -1;
  p.activeNow = false;
  p.team = null;
  p.lastResult = null;
  p.hearts = null;
  p.mistakes = [];
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

function assignTeams(g) {
  const all = Object.values(g.players);
  g.teamCount = Math.max(1, Math.min(g.settings.teamCount, all.length));
  g.hang = Array.from({ length: 4 }, () => 0);
  g.hangOut = Array.from({ length: 4 }, () => -1);
  if (g.settings.teamAssign === 'manual') {
    // L'animateur a choisi : les joueurs sans équipe rejoignent la plus petite
    g.teamCount = g.settings.teamCount;
    const size = Array.from({ length: g.teamCount }, () => 0);
    all.forEach((p) => {
      const t = g.teamOf && g.teamOf[p.pid];
      if (Number.isInteger(t) && t >= 0 && t < g.teamCount) { p.team = t; size[t]++; } else p.team = null;
    });
    shuffle(all.filter((p) => p.team === null)).forEach((p) => {
      const t = size.indexOf(Math.min(...size));
      p.team = t;
      size[t]++;
    });
    return;
  }
  shuffle(all).forEach((p, i) => {
    p.team = i % g.teamCount;
  });
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
    const pin = newPin();
    const g = {
      pin,
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
    if (!g) return;
    clearTimer(g);
    allPeople(g).forEach((p) => toPlayer(p, 'host:left'));
    delete games[g.pin];
  });

  // ---------- Joueurs ----------
  socket.on('player:join', ({ pin, name, avatar, device } = {}) => {
    pin = String(pin || '').trim();
    name = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
    const g = games[pin];
    if (!g) return socket.emit('join:error', 'Code PIN introuvable.');
    device = typeof device === 'string' ? device.slice(0, 40) : '';
    const left = banLeft(g, socket, device);
    if (left) return socket.emit('join:error', banMessage(left));
    if (!name) return socket.emit('join:error', 'Choisis un pseudo.');
    if (isBlocked(name)) return socket.emit('join:error', 'Ce pseudo n\'est pas autorisé. Choisis-en un autre.');
    if (allPeople(g).length >= MAX_PLAYERS) return socket.emit('join:error', 'La partie est complète.');
    if (allPeople(g).some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return socket.emit('join:error', 'Ce pseudo est déjà pris.');
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
      if (others.some((x) => x.name.toLowerCase() === name.toLowerCase())) return err('Ce pseudo est déjà pris.');
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
      clearTimer(g);
      allPeople(g).forEach((p) => toPlayer(p, 'host:left'));
      delete games[g.pin];
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

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`WeQuizzer lancé : http://localhost:${PORT}`);
    console.log(`Animateur : http://localhost:${PORT}/host.html`);
    const lan = lanUrl();
    if (lan) console.log(`Joueurs (même Wi-Fi) : ${lan}/play.html`);
  });
}
