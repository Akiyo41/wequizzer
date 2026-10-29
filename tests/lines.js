// Test des phrases du Professeur et du tirage au sort (sans navigateur). Lancer avec : npm test
const assert = require('assert');
const { LINES, pickLine } = require('../public/lines.js');

const KEYS = ['attente', 'file', 'compte', 'envoye', 'elimine', 'bravo', 'serie', 'rate', 'tropTard', 'sondage', 'finGagne', 'finPodium', 'finAutre', 'animCompte', 'animTous', 'animMoitie', 'animPersonne', 'animSondage', 'animPodium', 'dernier'];

const tests = {
  'les 20 situations, 3 à 5 phrases chacune'() {
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
  'situation du résultat : éliminé avant tout'() {
    const { resultLine } = require('../public/lines.js');
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: false, answered: true, outNow: true }), { key: 'elimine', pose: 'desole' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: false, answered: false, outNow: true }), { key: 'elimine', pose: 'desole' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: false, answered: true, hangErrors: 6, hangMax: 6 }), { key: 'elimine', pose: 'desole' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: false, answered: true, hangErrors: 5, hangMax: 6 }), { key: 'rate', pose: 'desole' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: false, answered: false }), { key: 'tropTard', pose: 'desole' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: true, streak: 2 }), { key: 'bravo', pose: 'bravo' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: true, streak: 3 }), { key: 'serie', pose: 'bravo' });
    assert.deepStrictEqual(resultLine({ type: 'poll', answered: true }), { key: 'sondage', pose: 'question' });
  },
  'phrases neutres (aucun accord masculin ou féminin avec le joueur)'() {
    const all = Object.values(LINES).flat();
    ['Éliminé, mais pas oublié', 'Reste prêt pour'].forEach((bad) => assert.ok(!all.some((s) => s.includes(bad)), bad));
  },
  'dernière question ratée : on ne parle plus de « la suivante »'() {
    const { resultLine } = require('../public/lines.js');
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: false, answered: true, last: true }), { key: 'dernier', pose: 'desole' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: false, answered: false, last: true }), { key: 'dernier', pose: 'desole' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: true, streak: 1, last: true }), { key: 'bravo', pose: 'bravo' });
    assert.deepStrictEqual(resultLine({ type: 'tf', correct: false, answered: true, last: true, outNow: true }), { key: 'elimine', pose: 'desole' });
    LINES.dernier.forEach((s) => assert.ok(!/suivante|prochaine/i.test(s), s));
  },
  'fin de partie : une seule « première place »'() {
    const { endLine } = require('../public/lines.js');
    assert.strictEqual(endLine({ mode: 'standard', rank: 1 }), 'finGagne');
    assert.strictEqual(endLine({ mode: 'standard', rank: 3 }), 'finPodium');
    assert.strictEqual(endLine({ mode: 'standard', rank: 5 }), 'finAutre');
    assert.strictEqual(endLine({ mode: 'elimination', alive: true, rank: 1 }), 'finGagne');
    assert.strictEqual(endLine({ mode: 'elimination', alive: true, rank: 2 }), 'finPodium'); // plusieurs survivants
    assert.strictEqual(endLine({ mode: 'elimination', alive: false, rank: 2 }), 'finPodium');
    assert.strictEqual(endLine({ mode: 'standard', heartsMode: true, alive: true, rank: 2 }), 'finPodium');
    assert.strictEqual(endLine({ mode: 'teams', teamRank: 1, rank: 4 }), 'finGagne');
    assert.strictEqual(endLine({ mode: 'hangman', teamRank: 2, rank: 1 }), 'finPodium');
  },
  'écran joueur : « hors jeu » plutôt que « Tu es éliminé »'() {
    const fs = require('fs');
    ['public/play.html', 'public/play/results.js'].forEach((f) => assert.ok(!fs.readFileSync(require('path').join(__dirname, '..', f), 'utf8').includes('Tu es éliminé'), f));
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
