// Test de la logique de la visite guidée (sans navigateur). Lancer avec : npm test
const assert = require('assert');
const T = require('../public/host/tour-logic.js');

const tests = {
  'les 6 étapes, dans l\'ordre'() {
    assert.strictEqual(T.STEPS.length, 6);
    assert.deepStrictEqual(T.STEPS.map((s) => s.sel), ['.join-box', '#quizSelect', '#paneJouer .card.settings', '#startBtn', '#tabQuiz', '#openFaq']);
    assert.deepStrictEqual(T.STEPS.map((s) => !!s.card), [false, true, false, true, false, false]);
  },
  'les textes du Professeur'() {
    assert.ok(T.STEPS[0].text.startsWith('Tes joueurs scannent ce QR code'));
    assert.ok(T.STEPS[5].text.endsWith('À toi de jouer !'));
    assert.strictEqual(T.INVITE, 'Salut ! Je suis le Professeur Quizzo. Je te fais visiter en 1 minute ?');
  },
  'proposée seulement la première fois, sur l\'accueil'() {
    assert.strictEqual(T.shouldOffer({ seen: false, screen: 'lobby', rejoined: false }), true);
    assert.strictEqual(T.shouldOffer({ seen: true, screen: 'lobby', rejoined: false }), false);
    assert.strictEqual(T.shouldOffer({ seen: false, screen: 'question', rejoined: false }), false);
    assert.strictEqual(T.shouldOffer({ seen: false, screen: 'lobby', rejoined: true }), false);
  },
  'la bulle ne cache jamais la zone éclairée'() {
    assert.strictEqual(T.bubbleSide({ top: 760, bottom: 812 }, 812), 'top'); // onglet « Mes quiz » en bas
    assert.strictEqual(T.bubbleSide({ top: 100, bottom: 300 }, 812), 'bottom'); // carte QR en haut
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
