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
  'défilement : l\'élément tient dans la place laissée par la bulle'() {
    // téléphone 812 px de haut, bulle de 220 px en bas : place libre de 12 à 812-244=568
    const big = T.scrollDelta({ top: 130, bottom: 680, height: 550 }, 812, 220, 'bottom'); // carte QR de 550 px
    assert.strictEqual(130 - big + 550 <= 568, true, 'le bas de la carte QR doit rester au-dessus de la bulle');
    assert.strictEqual(130 - big, 15, 'centrée dans la place libre (12 à 568)');
    // élément plus grand que la place libre : aligné en haut de la place libre
    assert.strictEqual(T.scrollDelta({ top: 50, bottom: 950, height: 900 }, 812, 220, 'bottom'), 50 - 12);
    // étape 1 (align 'end') trop grande : on montre son BAS (code + boutons) au-dessus de la bulle
    assert.strictEqual(T.STEPS[0].align, 'end');
    const qr = T.scrollDelta({ top: 50, bottom: 761, height: 711 }, 812, 216, 'bottom', 'end');
    assert.strictEqual(761 - qr, 812 - 12 - 216 - 12, 'le bas de la carte QR juste au-dessus de la bulle');
    // bulle en haut : l'élément va sous la bulle
    const d = T.scrollDelta({ top: 300, bottom: 400, height: 100 }, 812, 220, 'top');
    assert.ok(300 - d >= 244 && 400 - d <= 800, 'sous la bulle et dans l\'écran');
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
