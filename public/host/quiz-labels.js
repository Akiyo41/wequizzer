// Liste « Quiz choisi » : nom affiché de chaque quiz et ordre alphabétique (la liste enregistrée garde son ordre)
function quizLabel(q) {
  const [icon, n, one, many] = q.kind === 'wheel' ? ['🎡 ', q.pairs.length, 'paire', 'paires']
    : q.kind === 'letters' ? ['🔤 ', q.items.length, 'mot', 'mots']
      : q.flavor === 'tfrush' ? ['⚡ ', q.questions.length, 'affirmation', 'affirmations']
        : ['', q.questions.length, 'question', 'questions'];
  return icon + q.title + ' (' + n + ' ' + (n > 1 ? many : one) + ')';
}
const QUIZ_COLLATOR = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
function quizOrder(list) {
  return list.slice().sort((a, b) => QUIZ_COLLATOR.compare(a.title, b.title));
}
// Liste « Quiz choisi » rangée par thème : les quiz ajoutés depuis la Bibliothèque gardent leur thème.
// Sans aucun thème, une seule liste (label vide) ; sinon « Mes quiz » (ceux sans thème) d'abord, puis les thèmes.
function quizGroups(list) {
  const sorted = quizOrder(list);
  if (!sorted.some((q) => q.theme)) return [{ label: '', quizzes: sorted }];
  const groups = {};
  sorted.forEach((q) => { const k = q.theme || ''; (groups[k] = groups[k] || []).push(q); });
  return Object.keys(groups).sort((a, b) => (a === '' ? -1 : b === '' ? 1 : QUIZ_COLLATOR.compare(a, b)))
    .map((k) => ({ label: k || 'Mes quiz', quizzes: groups[k] }));
}
// « Enregistrer ce quiz dans un fichier » : ce qu'on écrit (sans l'identifiant interne) et le nom du fichier
function exportPayload(q) {
  if (q.kind === 'wheel') return { kind: 'wheel', title: q.title, category: q.category, pairs: q.pairs };
  if (q.kind === 'letters') return { kind: 'letters', title: q.title, items: q.items };
  return q.flavor === 'tfrush' ? { flavor: 'tfrush', title: q.title, questions: q.questions } : { title: q.title, questions: q.questions };
}
function exportName(title) {
  const base = String(title || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  return (base || 'quiz') + '.json';
}
// Sauvegarde de TOUS les quiz dans un seul fichier (pour changer d'ordinateur ou libérer de la place)
function backupPayload(list) {
  return { wequizzer: 'sauvegarde', quizzes: list.map(exportPayload) };
}
// Fichier ouvert : la liste des quiz si c'est une sauvegarde, sinon null (c'est un quiz seul)
function backupItems(data) {
  return data && data.wequizzer === 'sauvegarde' && Array.isArray(data.quizzes) ? data.quizzes : null;
}
// Durée estimée de la partie, en minutes : par question, compte à rebours (3 s) + lecture + réponse
// (le chrono, ou 25 s sans chrono) + résultat (le délai automatique, ou 10 s quand l'animateur passe à la main)
// times : temps propres des questions (dans l'ordre, vide si aucun), comptés seulement avec le chrono
function gameMinutes(total, s, times) {
  const n = s.count > 0 ? Math.min(s.count, total) : total;
  const per = 3.3 + (s.readDelay ? s.readSeconds || 0 : 0) + (s.autoNext ? s.autoDelay || 10 : 10);
  let answer = 0;
  for (let i = 0; i < n; i++) answer += s.limitTime ? (times && times[i]) || s.time || 20 : 25;
  return Math.max(1, Math.round((n * per + answer) / 60));
}
// Recherche dans « Mes quiz » : chaque mot tapé doit se trouver dans le titre (accents et majuscules ignorés)
const QUIZ_PLAIN = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function quizMatches(q, query) {
  const t = QUIZ_PLAIN(q.title);
  return QUIZ_PLAIN(query).split(/\s+/).filter(Boolean).every((w) => t.includes(w));
}
// Réponse écrite refusée que l'animateur veut accepter la prochaine fois : ajoutée à la question du quiz enregistré
// (retrouvée par son texte). → 'added' | 'already' (déjà acceptée) | 'full' (8 au maximum) | 'missing'
const ANSWER_PLAIN = (s) => QUIZ_PLAIN(s).replace(/[^a-z0-9]+/g, ' ').trim();
function addAccepted(quiz, qText, answer) {
  const q = quiz && (quiz.questions || []).find((x) => x.type === 'text' && x.text === qText);
  if (!q) return 'missing';
  const a = String(answer || '').trim();
  q.answers = q.answers || [];
  if (q.answers.some((x) => ANSWER_PLAIN(x) === ANSWER_PLAIN(a))) return 'already';
  if (q.answers.length >= 8) return 'full';
  q.answers.push(a);
  return 'added';
}
// Questions écrites deux fois dans un quiz (même texte, même image) → [[n° de la 1re, n° du doublon], …], numéros à partir de 1
function sameQuestions(questions) {
  const first = {};
  const out = [];
  (questions || []).forEach((q, i) => {
    const t = ANSWER_PLAIN(q.text || '');
    if (!t) return;
    const key = t + '|' + (q.image || '');
    if (key in first) out.push([first[key] + 1, i + 1]); else first[key] = i;
  });
  return out;
}
// Page Stats : nouveau quiz « Révision - … » avec les questions sous 60 % de réussite (quiz classique seulement),
// dans l'ordre du quiz. null s'il n'y a rien à réviser. Les statistiques sont rangées par texte de question (120 caractères).
function revisionQuiz(quiz, st) {
  if (!quiz || quiz.kind || !st || !st.qs) return null;
  const weak = (q) => { const s = st.qs[String(q.text || '').slice(0, 120)]; return s && s.total > 0 && (100 * s.ok) / s.total < 60; };
  const questions = (quiz.questions || []).filter(weak).map((q) => JSON.parse(JSON.stringify(q)));
  if (!questions.length) return null;
  return { ...(quiz.flavor ? { flavor: quiz.flavor } : {}), title: ('Révision - ' + quiz.title).slice(0, 60), questions };
}
// Rappel « Enregistrer tous mes quiz dans un fichier » : les quiz ne vivent que dans ce navigateur.
// Affiché quand des quiz ont été modifiés depuis la dernière sauvegarde, au plus tôt une semaine après. Vide sinon.
function backupReminder({ firstEdit, lastEdit, lastBackup } = {}, now = Date.now()) {
  const WEEK = 7 * 86400000;
  if (!lastEdit || (lastBackup && lastBackup >= lastEdit)) return '';
  if (now - (lastBackup || firstEdit || lastEdit) < WEEK) return '';
  const button = '« Enregistrer tous mes quiz dans un fichier »';
  return lastBackup
    ? '💾 Dernière sauvegarde de tes quiz le ' + new Date(lastBackup).toLocaleDateString('fr-FR') + ' : pense à ' + button + '.'
    : '💾 Tes quiz ne sont gardés que dans ce navigateur : pense à ' + button + ', au cas où.';
}
// Message pour l'animateur (vide s'il n'y a pas de doublon)
function twinsMessage(twins, noun = 'questions') {
  if (!twins.length) return '';
  const more = twins.length - 1;
  return '⚠️ Les ' + noun + ' ' + twins[0][0] + ' et ' + twins[0][1] + ' sont identiques' + (more ? ' (et ' + more + ' autre' + (more > 1 ? 's' : '') + ' doublon' + (more > 1 ? 's' : '') + ')' : '');
}
if (typeof module !== 'undefined') module.exports = { quizLabel, quizOrder, exportPayload, exportName, backupPayload, backupItems, gameMinutes, quizMatches, addAccepted, sameQuestions, twinsMessage, revisionQuiz, backupReminder, quizGroups };
