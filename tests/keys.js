// Test des raccourcis clavier de l'animateur (sans navigateur). Lancer avec : npm test
const assert = require('assert');
const { hostKey } = require('../public/host/keys.js');

const tests = {
  'Espace ou Entrée : voir le résultat pendant la question, question suivante au résultat'() {
    assert.strictEqual(hostKey(' ', 'question', 'BODY'), 'skip');
    assert.strictEqual(hostKey('Enter', 'question', 'BODY'), 'skip');
    assert.strictEqual(hostKey(' ', 'results', 'BODY'), 'next');
    assert.strictEqual(hostKey('Enter', 'results', 'BODY'), 'next');
  },
  'P : pause ou reprise pendant la partie'() {
    ['countdown', 'reading', 'question', 'results'].forEach((s) => assert.strictEqual(hostKey('p', s, 'BODY'), 'pause', s));
    assert.strictEqual(hostKey('P', 'question', 'BODY'), 'pause');
  },
  'rien hors de la partie'() {
    ['lobby', 'editor', 'end', 'preview'].forEach((s) => {
      assert.strictEqual(hostKey(' ', s, 'BODY'), null, s);
      assert.strictEqual(hostKey('p', s, 'BODY'), null, s);
    });
  },
  'pas de raccourci pendant qu\'on écrit, ni en double sur un bouton'() {
    ['INPUT', 'TEXTAREA', 'SELECT'].forEach((t) => {
      assert.strictEqual(hostKey('p', 'question', t), null, t);
      assert.strictEqual(hostKey(' ', 'results', t), null, t);
    });
    // Espace / Entrée sur un bouton qui a le focus : le navigateur clique déjà dessus
    assert.strictEqual(hostKey(' ', 'results', 'BUTTON'), null);
    assert.strictEqual(hostKey('Enter', 'question', 'BUTTON'), null);
    assert.strictEqual(hostKey('p', 'question', 'BUTTON'), 'pause');
  },
  'F : plein écran, pendant la partie et dans la salle d\'attente'() {
    ['lobby', 'countdown', 'reading', 'question', 'results', 'end'].forEach((s) => assert.strictEqual(hostKey('f', s, 'BODY'), 'fullscreen', s));
    assert.strictEqual(hostKey('F', 'question', 'BUTTON'), 'fullscreen');
    assert.strictEqual(hostKey('f', 'lobby', 'INPUT'), null);
    assert.strictEqual(hostKey('f', 'editor', 'BODY'), null);
  },
  'autres touches : rien'() {
    assert.strictEqual(hostKey('a', 'question', 'BODY'), null);
    assert.strictEqual(hostKey('Escape', 'results', 'BODY'), null);
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
