// Test de la liste « Quiz choisi » : ordre alphabétique et noms affichés. Lancer avec : npm test
const assert = require('assert');
const { quizLabel, quizOrder, exportPayload, exportName, backupPayload, backupItems } = require('../public/host/quiz-labels.js');

const tests = {
  'fichier enregistré : le Vrai/Faux en rafale garde son genre'() {
    const qs = [{ type: 'tf', text: 'Le chat miaule', correct: 0 }];
    assert.deepStrictEqual(exportPayload({ id: 'x', flavor: 'tfrush', title: 'Rafale', questions: qs }), { flavor: 'tfrush', title: 'Rafale', questions: qs });
    assert.deepStrictEqual(exportPayload({ id: 'x', title: 'Quiz', questions: qs }), { title: 'Quiz', questions: qs });
    assert.deepStrictEqual(exportPayload({ id: 'x', kind: 'wheel', title: 'R', category: 'C', pairs: [{ q: 'a', a: 'b' }] }), { kind: 'wheel', title: 'R', category: 'C', pairs: [{ q: 'a', a: 'b' }] });
    assert.deepStrictEqual(exportPayload({ id: 'x', kind: 'letters', title: 'M', items: [{ q: 'a', word: 'b' }] }), { kind: 'letters', title: 'M', items: [{ q: 'a', word: 'b' }] });
  },
  'sauvegarde de tous les quiz, puis relecture'() {
    const lib = [
      { id: 'a', title: 'Quiz', questions: [{ type: 'single', text: 'x', choices: ['a', 'b'], correct: 0 }] },
      { id: 'b', kind: 'wheel', title: 'Roue', category: 'C', pairs: [{ q: 'a', a: 'b' }], questions: [] },
      { id: 'c', flavor: 'tfrush', title: 'Rafale', questions: [{ type: 'tf', text: 'y', correct: 1 }] },
    ];
    const b = backupPayload(lib);
    assert.strictEqual(b.wequizzer, 'sauvegarde');
    assert.deepStrictEqual(b.quizzes, lib.map(exportPayload));
    assert.deepStrictEqual(backupItems(JSON.parse(JSON.stringify(b))), b.quizzes);
    // un quiz seul (ancien format) n'est pas une sauvegarde
    assert.strictEqual(backupItems({ title: 'Quiz', questions: [] }), null);
    assert.strictEqual(backupItems({ wequizzer: 'sauvegarde', quizzes: 'non' }), null);
  },
  'nom du fichier : accents gardés lisibles'() {
    assert.strictEqual(exportName('Étoiles et planètes'), 'Etoiles_et_planetes.json');
    assert.strictEqual(exportName('Vrai ou faux : animaux !'), 'Vrai_ou_faux_animaux.json');
    assert.strictEqual(exportName('???'), 'quiz.json');
  },
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
