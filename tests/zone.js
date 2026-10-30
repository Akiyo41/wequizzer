// Test de la question « image à toucher » (sans navigateur). Lancer avec : npm test
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { ZONE_SIZES, zoneValid, zoneHit } = require('../public/zone.js');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const tests = {
  'tailles du curseur'() {
    assert.deepStrictEqual(ZONE_SIZES, { petite: 0.05, moyenne: 0.08, grande: 0.12 });
  },
  'dans le cercle, dans la marge, à côté'() {
    const z = { x: 0.5, y: 0.5, r: 0.1, ar: 1 };
    assert.strictEqual(zoneHit(z, { x: 0.5, y: 0.5 }), true);
    assert.strictEqual(zoneHit(z, { x: 0.61, y: 0.5 }), true); // dans la marge (gros doigts)
    assert.strictEqual(zoneHit(z, { x: 0.63, y: 0.5 }), false);
  },
  'image en hauteur : le cercle reste rond'() {
    const z = { x: 0.5, y: 0.5, r: 0.1, ar: 2 };
    assert.strictEqual(zoneHit(z, { x: 0.5, y: 0.56 }), true); // 0,06 × 2 = 0,12 ≤ 0,12
    assert.strictEqual(zoneHit(z, { x: 0.5, y: 0.57 }), false);
  },
  'point invalide : faux, sans erreur'() {
    const z = { x: 0.5, y: 0.5, r: 0.1, ar: 1 };
    assert.strictEqual(zoneHit(z, { x: 'a', y: 0.5 }), false);
    assert.strictEqual(zoneHit(z, null), false);
    assert.strictEqual(zoneHit(null, { x: 0.5, y: 0.5 }), false);
  },
  'zone valide seulement dans les bornes'() {
    assert.strictEqual(zoneValid({ x: 0, y: 1, r: 0.03, ar: 0.2 }), true);
    assert.strictEqual(zoneValid({ x: 0.5, y: 0.5, r: 0.25, ar: 5 }), true);
    [{ x: -0.1, y: 0.5, r: 0.1, ar: 1 }, { x: 0.5, y: 0.5, r: 0.3, ar: 1 }, { x: 0.5, y: 0.5, r: 0.1, ar: 6 }, { x: 0.5, y: 0.5, r: 0.02, ar: 1 }, { x: '0.5', y: 0.5, r: 0.1, ar: 1 }, null]
      .forEach((b) => assert.strictEqual(zoneValid(b), false, JSON.stringify(b)));
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
