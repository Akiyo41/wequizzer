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
function gameMinutes(total, s) {
  const n = s.count > 0 ? Math.min(s.count, total) : total;
  const per = 3.3 + (s.readDelay ? s.readSeconds || 0 : 0) + (s.limitTime ? s.time || 20 : 25) + (s.autoNext ? s.autoDelay || 10 : 10);
  return Math.max(1, Math.round((n * per) / 60));
}
// Recherche dans « Mes quiz » : chaque mot tapé doit se trouver dans le titre (accents et majuscules ignorés)
const QUIZ_PLAIN = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function quizMatches(q, query) {
  const t = QUIZ_PLAIN(q.title);
  return QUIZ_PLAIN(query).split(/\s+/).filter(Boolean).every((w) => t.includes(w));
}
if (typeof module !== 'undefined') module.exports = { quizLabel, quizOrder, exportPayload, exportName, backupPayload, backupItems, gameMinutes, quizMatches };
