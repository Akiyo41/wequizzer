// Test de la mémoire des éditeurs : « Annuler » après une modification demande confirmation. Lancer avec : npm test
const assert = require('assert');
const { makeLeaveGuard } = require('../public/host/leave-guard.js');

const tests = {
  'rien changé : on quitte sans question'() {
    const g = makeLeaveGuard();
    const state = { title: 'Quiz', rows: [{ q: 'a' }] };
    g.arm('editor', () => state);
    assert.strictEqual(g.changed('editor'), false);
  },
  'une case modifiée, une ligne ajoutée : changé'() {
    const g = makeLeaveGuard();
    const state = { title: 'Quiz', rows: [{ q: 'a' }] };
    g.arm('editor', () => state);
    state.rows[0].q = 'b';
    assert.strictEqual(g.changed('editor'), true);
    state.rows[0].q = 'a';
    assert.strictEqual(g.changed('editor'), false, 'revenu comme avant');
    state.rows.push({ q: '' });
    assert.strictEqual(g.changed('editor'), true);
  },
  'chaque éditeur a sa propre mémoire ; jamais armé = pas changé'() {
    const g = makeLeaveGuard();
    let a = 1;
    let b = 1;
    g.arm('wheel', () => a);
    g.arm('letters', () => b);
    a = 2;
    assert.strictEqual(g.changed('wheel'), true);
    assert.strictEqual(g.changed('letters'), false);
    assert.strictEqual(g.changed('tf'), false);
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
