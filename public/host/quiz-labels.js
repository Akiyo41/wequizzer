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
if (typeof module !== 'undefined') module.exports = { quizLabel, quizOrder, exportPayload, exportName, backupPayload, backupItems };
