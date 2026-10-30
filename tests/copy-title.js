// Test du nom donné à la copie d'un quiz. Lancer avec : npm test
const assert = require('assert');
const { copyTitle } = require('../public/host/copy-title.js');

const tests = {
  'première copie, puis copie 2, copie 3'() {
    assert.strictEqual(copyTitle('Capitales', ['Capitales']), 'Capitales (copie)');
    assert.strictEqual(copyTitle('Capitales', ['Capitales', 'Capitales (copie)']), 'Capitales (copie 2)');
    assert.strictEqual(copyTitle('Capitales', ['Capitales', 'Capitales (copie)', 'Capitales (copie 2)']), 'Capitales (copie 3)');
  },
  'copie d\'une copie : pas de « (copie) (copie) »'() {
    assert.strictEqual(copyTitle('Capitales (copie)', ['Capitales', 'Capitales (copie)']), 'Capitales (copie 2)');
    assert.strictEqual(copyTitle('Capitales (copie 2)', ['Capitales (copie 2)']), 'Capitales (copie)');
  },
  'titre long : coupé pour rester à 60 caractères'() {
    const long = 'x'.repeat(60);
    const t = copyTitle(long, [long]);
    assert.ok(t.length <= 60, t.length);
    assert.ok(t.endsWith(' (copie)'));
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
