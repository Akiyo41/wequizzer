// Test de la Bibliothèque : chaque quiz prêt à jouer doit être accepté par le serveur. Lancer avec : npm test
const assert = require('assert');
const { cleanQuiz } = require('../src/quiz.js');
const packs = require('../public/library.json');

const tests = {
  'chaque quiz de la Bibliothèque est valide'() {
    packs.forEach((p) => {
      const copy = JSON.parse(JSON.stringify(p));
      if (copy.kind === 'quiz') delete copy.kind;
      const res = cleanQuiz(copy);
      assert.ok(!res.error, p.title + ' : ' + res.error);
    });
  },
  'identifiants uniques, thème et niveau remplis'() {
    const ids = packs.map((p) => p.pid);
    assert.strictEqual(new Set(ids).size, ids.length, 'deux quiz ont le même identifiant');
    packs.forEach((p) => assert.ok(p.pid && p.theme && p.level && p.title, JSON.stringify(p.title)));
  },
  'FIMO : un quiz sur la signalisation'() {
    assert.ok(packs.some((p) => p.pid === 'fimo-signalisation' && p.questions.length >= 10), 'signalisation');
  },
  'FIMO : un Vrai/Faux express'() {
    const p = packs.find((x) => x.pid === 'fimo-vrai-faux');
    assert.ok(p && p.flavor === 'tfrush' && p.questions.length >= 10 && p.questions.every((q) => q.type === 'tf'), 'Vrai/Faux FIMO');
  },
  "FIMO : une roue des numéros d'urgence"() {
    const p = packs.find((x) => x.pid === 'fimo-urgences');
    assert.ok(p && p.kind === 'wheel' && p.pairs.length >= 6, 'roue des numéros');
  },
  'il y a des quiz de maths et d\'anglais'() {
    assert.ok(packs.some((p) => p.theme === 'Maths' && p.kind === 'quiz'), 'quiz de maths');
    assert.ok(packs.some((p) => p.theme === 'Anglais'), 'anglais');
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
