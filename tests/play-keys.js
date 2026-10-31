// Test des touches du joueur (A B C D ou 1 2 3 4). Lancer avec : npm test
const assert = require('assert');
const { playerKey } = require('../public/play/keys.js');

const tests = {
  'lettres et chiffres choisissent la réponse'() {
    assert.strictEqual(playerKey('a', 4, 'BODY'), 0);
    assert.strictEqual(playerKey('D', 4, 'BODY'), 3);
    assert.strictEqual(playerKey('1', 4, 'BODY'), 0);
    assert.strictEqual(playerKey('4', 4, 'BODY'), 3);
  },
  'au-delà du nombre de réponses : rien'() {
    assert.strictEqual(playerKey('c', 2, 'BODY'), null);
    assert.strictEqual(playerKey('3', 2, 'BODY'), null);
    assert.strictEqual(playerKey('9', 8, 'BODY'), null);
    assert.strictEqual(playerKey('e', 4, 'BODY'), null);
  },
  'pas pendant qu\'on écrit'() {
    assert.strictEqual(playerKey('a', 4, 'INPUT'), null);
    assert.strictEqual(playerKey('1', 4, 'TEXTAREA'), null);
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
