// Test de la liste « Quiz choisi » : ordre alphabétique et noms affichés. Lancer avec : npm test
const assert = require('assert');
const { quizLabel, quizOrder } = require('../public/host/quiz-labels.js');

const tests = {
  'nom affiché selon le genre de quiz'() {
    assert.strictEqual(quizLabel({ title: 'Capitales', questions: [1, 2] }), 'Capitales (2 questions)');
    assert.strictEqual(quizLabel({ title: 'Un', questions: [1] }), 'Un (1 question)');
    assert.strictEqual(quizLabel({ kind: 'wheel', title: 'Roue', pairs: [1, 2, 3] }), '🎡 Roue (3 paires)');
    assert.strictEqual(quizLabel({ kind: 'letters', title: 'Mots', items: [1] }), '🔤 Mots (1 mot)');
    assert.strictEqual(quizLabel({ flavor: 'tfrush', title: 'Rafale', questions: [1, 2] }), '⚡ Rafale (2 affirmations)');
  },
  'ordre alphabétique, sans tenir compte des accents ni des majuscules, nombres dans l\'ordre'() {
    const list = [{ title: 'zoo' }, { title: 'Étoiles' }, { title: 'abeilles' }, { title: 'Quiz 10' }, { title: 'Quiz 2' }, { title: 'eau' }];
    assert.deepStrictEqual(quizOrder(list).map((q) => q.title), ['abeilles', 'eau', 'Étoiles', 'Quiz 2', 'Quiz 10', 'zoo']);
    assert.strictEqual(list[0].title, 'zoo', 'la liste enregistrée ne change pas d\'ordre');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log('  ok   ' + name);
  } catch (e) {
    failed++;
    console.log('  ÉCHEC ' + name + ' : ' + e.message);
  }
}
process.exit(failed ? 1 : 0);
