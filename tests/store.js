// Test de l'enregistrement dans le navigateur : une mémoire pleine doit se voir. Lancer avec : npm test
const assert = require('assert');
const { trySet } = require('../public/host/store.js');

const memory = (limit) => {
  const data = {};
  return {
    data,
    setItem(k, v) {
      const size = Object.keys(data).filter((x) => x !== k).reduce((n, x) => n + data[x].length, 0) + v.length;
      if (size > limit) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
      data[k] = v;
    },
  };
};

const tests = {
  'enregistré : vrai'() {
    const s = memory(1000);
    assert.strictEqual(trySet(s, 'k', { a: 1 }), true);
    assert.strictEqual(s.data.k, '{"a":1}');
  },
  'mémoire pleine : faux, et l\'ancienne version reste'() {
    const s = memory(20);
    trySet(s, 'k', 'court');
    assert.strictEqual(trySet(s, 'k', 'x'.repeat(50)), false);
    assert.strictEqual(s.data.k, '"court"');
  },
  'pas de stockage du tout (navigation privée bloquée) : faux'() {
    assert.strictEqual(trySet(null, 'k', 1), false);
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
