// Test des réponses écrites regroupées pour l'écran de l'animateur. Lancer avec : npm test
const assert = require('assert');
const { answerGroups } = require('../src/answers.js');

const tests = {
  'mêmes réponses regroupées (accents, majuscules), les plus fréquentes d\'abord'() {
    const g = answerGroups([
      { text: 'Picasso', ok: false }, { text: 'Vinci', ok: true }, { text: 'picasso ', ok: false },
      { text: 'Léonard de Vinci', ok: true }, { text: 'PICASSO', ok: false }, { text: 'Monet', ok: false },
    ]);
    assert.deepStrictEqual(g, [
      { text: 'Picasso', count: 3, ok: false },
      { text: 'Vinci', count: 1, ok: true },
      { text: 'Léonard de Vinci', count: 1, ok: true },
      { text: 'Monet', count: 1, ok: false },
    ]);
  },
  'au plus 8 réponses, les réponses vides ignorées'() {
    const many = Array.from({ length: 12 }, (_, i) => ({ text: 'r' + i, ok: false })).concat([{ text: '   ', ok: false }, { text: null, ok: false }]);
    const g = answerGroups(many);
    assert.strictEqual(g.length, 8);
    assert.ok(g.every((x) => x.text.trim()));
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
