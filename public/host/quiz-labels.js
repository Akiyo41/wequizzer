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
if (typeof module !== 'undefined') module.exports = { quizLabel, quizOrder };
