// Test du récap partagé en image. Lancer avec : npm test
const assert = require('assert');
const { Share } = require('../public/share.js');

const tests = {
  'récap : une marque par question'() {
    assert.strictEqual(Share.recapLine([true, false, null, true]), '✅❌➖✅');
    assert.strictEqual(Share.recapLine([]), '');
    assert.strictEqual(Share.recapLine(undefined), '');
  },
  'récap long : 20 marques puis « … »'() {
    const line = Share.recapLine(Array.from({ length: 25 }, () => true));
    assert.strictEqual(line, '✅'.repeat(20) + '…');
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
