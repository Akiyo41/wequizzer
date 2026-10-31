// Tableurs venus d'ailleurs (autre IA, Kahoot, tableur fait à la main) : on reconnaît les colonnes
// à leur nom, dans n'importe quel ordre, et on les remet dans l'ordre de WeQuizzer :
// Type ; Question ; Réponse A ; B ; C ; D ; Bonne(s) réponse(s) ; Bonus ; Explication
// csvRemap(lignes) → { rows, hasHead: true } (la 1re ligne est l'en-tête) ou null si aucun en-tête reconnu
const CSV_COL_NAME = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const CSV_LETTER = /^[a-d1-4]$/i;
const CSV_LIST = /^[a-d1-4](\s*[,;+&|/ ]\s*[a-d1-4])+$/i;

function csvColumns(row) {
  const col = {};
  const answers = [];
  row.forEach((c, k) => {
    const n = CSV_COL_NAME(c);
    let m;
    if (!n) return;
    if (/\b(bonnes?|corrects?|correctes?|juste|solution|right)\b/.test(n)) { if (col.correct === undefined) col.correct = k; }
    else if ((m = n.match(/^(reponse|answer|choix|choice|option|proposition)s? ?([a-d1-4])\b/))) {
      const i = /[a-d]/.test(m[2]) ? m[2].charCodeAt(0) - 97 : Number(m[2]) - 1;
      if (answers[i] === undefined) answers[i] = k;
    } else if (/^(question|enonce|intitule|libelle)\b/.test(n)) { if (col.question === undefined) col.question = k; }
    else if (/^type\b/.test(n)) col.type = k;
    else if (/^(bonus|points? doubles?|double)\b/.test(n)) col.bonus = k;
    else if (/^(explication|explanation|commentaire|feedback)\b/.test(n)) col.explain = k;
    else if (/^(temps|time|duree|chrono)\b/.test(n)) col.time = k; // Kahoot : « Time limit (sec) »
  });
  if (col.question === undefined || !answers.some((a) => a !== undefined)) return null;
  col.answers = answers;
  return col;
}

function csvRemap(rows) {
  let at = -1;
  let col = null;
  for (let i = 0; i < Math.min(rows.length, 15) && !col; i++) { col = csvColumns(rows[i]); at = i; }
  if (!col) return null;
  const get = (r, k) => (k === undefined || r[k] === undefined ? '' : String(r[k]).trim());
  const out = [rows[at]];
  rows.slice(at + 1).forEach((r) => {
    const ans = [0, 1, 2, 3].map((i) => get(r, col.answers[i]));
    let type = get(r, col.type);
    let corr = get(r, col.correct);
    if (corr && !CSV_LETTER.test(corr) && !CSV_LIST.test(corr)) {
      const k = ans.findIndex((a) => a && CSV_COL_NAME(a) === CSV_COL_NAME(corr));
      if (k !== -1) corr = 'ABCD'[k];
    }
    if (!type && CSV_LIST.test(corr)) type = 'multiple';
    const line = [type, get(r, col.question), ...ans, corr, get(r, col.bonus), get(r, col.explain)];
    if (col.time !== undefined) line.push(get(r, col.time)); // 10e colonne : temps de la question, en secondes
    if (line.some(Boolean)) out.push(line);
  });
  return { rows: out, hasHead: true };
}
if (typeof module !== 'undefined') module.exports = { csvRemap };
