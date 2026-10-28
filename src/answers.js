// Réponses : vérification, correction, affichage
const { wordLetters } = require('./quiz');

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

module.exports = { mistakeEntry, isCorrect, shownAnswer, correctText, cleanAnswer };
