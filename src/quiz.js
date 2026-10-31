// Vérification des quiz et préparation des questions d'une partie
const { MAX_PAIRS, TIME_CHOICES, WHEEL_A_MAX, WHEEL_MAX, WHEEL_Q_MAX } = require('./config');
const { shuffle } = require('./utils');
const { zoneValid } = require('../public/zone.js');

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
    if (!q || !a) return { error: `Question ${i + 1} : la question ou la réponse est vide.` };
    if (q.length > WHEEL_Q_MAX) return { error: `Question ${i + 1} : la question est trop longue (${WHEEL_Q_MAX} lettres maximum).` };
    if (a.length > WHEEL_A_MAX) return { error: `Question ${i + 1} : la réponse « ${a} » est trop longue (${WHEEL_A_MAX} lettres maximum).` };
    const key = a.toLowerCase();
    if (seen.has(key)) return { error: `La réponse « ${a} » est en double : chaque réponse doit être unique.` };
    seen.add(key);
    // Mauvaises réponses facultatives (jusqu'à 3), dans le thème de la question
    const wr = Array.isArray(raw[i].w) ? raw[i].w : [];
    const w = [];
    for (const x of wr) {
      const t = String(x || '').trim();
      if (!t) continue;
      if (t.length > WHEEL_A_MAX) return { error: `Question ${i + 1} : la mauvaise réponse « ${t} » est trop longue (${WHEEL_A_MAX} lettres maximum).` };
      if (t.toLowerCase() === key || w.some((y) => y.toLowerCase() === t.toLowerCase())) return { error: `Question ${i + 1} : la mauvaise réponse « ${t} » est en double.` };
      w.push(t);
    }
    if (w.length > 3) return { error: `Question ${i + 1} : 3 mauvaises réponses au maximum.` };
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
    const type = ['single', 'tf', 'multi', 'text', 'poll', 'order', 'zone'].includes(raw.type) ? raw.type : 'single';
    const image = cleanImage(raw.image);
    const double = raw.double === true && type !== 'poll';
    const q = { type, text, image, double, choices: [], correct: null, answers: [], explain: String(raw.explain || '').trim().slice(0, 300) };
    // temps propre à la question (sinon celui des réglages de la partie)
    if (TIME_CHOICES.includes(raw.time)) q.time = raw.time;

    if (type === 'zone') {
      // Image à toucher : une image et la bonne zone (cercle), voir public/zone.js
      if (!image) return { error: `Question ${n} : il faut une image pour une question « image à toucher ».` };
      if (!zoneValid(raw.zone)) return { error: `Question ${n} : touche l'image pour placer la bonne zone.` };
      q.zone = { x: raw.zone.x, y: raw.zone.y, r: raw.zone.r, ar: raw.zone.ar };
    } else if (type === 'tf') {
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
    const time = q.time ? { time: q.time } : {};
    if (q.type === 'order') return { type: 'order', text: q.text, image: q.image || '', double: false, choices: q.items, correct: null, answers: [], explain: q.explain || '', ...time };
    if (q.type === 'zone') return { type: 'zone', text: q.text, image: q.image || '', double: !!q.double, zone: q.zone, explain: q.explain || '', ...time };
    return { type: q.type, text: q.text, image: q.image || '', double: !!q.double, choices: q.choices, correct: q.correct, answers: q.answers, explain: q.explain || '', ...time };
  });
  return { title, questions };
}

module.exports = { wordLetters, quizCount, cleanQuiz, buildQuestions, missedQuiz };
