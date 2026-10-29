// Test des phrases du Professeur et du tirage au sort (sans navigateur). Lancer avec : npm test
const assert = require('assert');
const { LINES, pickLine } = require('../public/lines.js');

const KEYS = ['attente', 'file', 'compte', 'envoye', 'elimine', 'bravo', 'serie', 'rate', 'tropTard', 'sondage', 'finGagne', 'finPodium', 'finAutre', 'animCompte', 'animTous', 'animMoitie', 'animPersonne', 'animSondage', 'animPodium'];

const tests = {
  'les 19 situations, 3 à 5 phrases chacune'() {
    assert.deepStrictEqual(Object.keys(LINES).sort(), KEYS.slice().sort());
    KEYS.forEach((k) => assert.ok(LINES[k].length >= 3 && LINES[k].length <= 5, k));
  },
  'seulement des trous connus'() {
    Object.values(LINES).flat().forEach((s) => (s.match(/\{[^}]*\}/g) || []).forEach((t) => assert.ok(['{pseudo}', '{serie}', '{gagnant}'].includes(t), s)));
  },
  'jamais deux fois de suite la même phrase'() {
    KEYS.forEach((k) => {
      let last = null;
      for (let i = 0; i < 50; i++) {
        const p = pickLine(k, {}, last);
        assert.notStrictEqual(p.raw, last, k);
        last = p.raw;
      }
    });
  },
  'les trous sont remplis'() {
    for (let i = 0; i < 20; i++) assert.ok(pickLine('animPodium', { gagnant: '🦊 Alice' }, null).text.includes('🦊 Alice'));
    for (let i = 0; i < 20; i++) assert.ok(!/\{|undefined/.test(pickLine('animPodium', {}, null).text)); // trou sans valeur → vide
  },
  'un pseudo qui ressemble à un trou reste tel quel'() {
    let p = null;
    for (let i = 0; i < 100 && (!p || p.raw !== 'Bien joué, {pseudo} !'); i++) p = pickLine('bravo', { pseudo: '{serie}', serie: 9 }, null);
    assert.strictEqual(p.text, 'Bien joué, {serie} !');
  },
  'la phrase commence toujours par une majuscule'() {
    let p = null;
    for (let i = 0; i < 100 && (!p || p.raw !== '{gagnant} remporte la partie, bravo !'); i++) p = pickLine('animPodium', { gagnant: 'l\'équipe Bleu' }, null);
    assert.strictEqual(p.text, 'L\'équipe Bleu remporte la partie, bravo !');
  },
  'clé inconnue'() {
    assert.deepStrictEqual(pickLine('nimporte', {}, null), { raw: '', text: '' });
  },
  'les phrases exactes de la conception'() {
    assert.ok(LINES.bravo.includes('Je n\'aurais pas mieux répondu !'));
    assert.ok(LINES.animPersonne.includes('Même moi, j\'ai hésité !'));
    assert.ok(LINES.sondage.includes('Ton avis compte !'));
    assert.ok(LINES.attente.includes('Installe-toi, {pseudo}, ça va bientôt commencer !'));
    assert.ok(LINES.serie.includes('Et de {serie} d\'affilée ! Rien ne t\'arrête !'));
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
