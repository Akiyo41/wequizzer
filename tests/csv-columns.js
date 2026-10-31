// Test de la lecture des tableurs venus d'ailleurs (colonnes dans un autre ordre, sans « Type »). Lancer avec : npm test
const assert = require('assert');
const { csvRemap } = require('../public/host/csv-columns.js');

const tests = {
  'colonnes question, reponse_a…d, bonne_reponse (sans Type)'() {
    const o = csvRemap([
      ['question', 'reponse_a', 'reponse_b', 'reponse_c', 'reponse_d', 'bonne_reponse'],
      ['Capitale de la France ?', 'Lyon', 'Paris', 'Nice', 'Lille', 'B'],
    ]);
    assert.ok(o);
    assert.strictEqual(o.hasHead, true);
    assert.deepStrictEqual(o.rows[1], ['', 'Capitale de la France ?', 'Lyon', 'Paris', 'Nice', 'Lille', 'B', '', '']);
  },
  'en-têtes anglais façon Kahoot, lignes de consignes au-dessus, bonnes réponses en chiffres'() {
    const o = csvRemap([
      ['Quiz template'],
      ['Add questions below', '', ''],
      ['Question - max 120 characters', 'Answer 1 - max 75 characters', 'Answer 2', 'Answer 3', 'Answer 4', 'Time limit (sec)', 'Correct answer(s) - choose at least one'],
      ['2 + 2 ?', '3', '4', '5', '22', '20', '2'],
      ['Nombres pairs ?', '1', '2', '3', '4', '20', '2,4'],
    ]);
    assert.ok(o);
    assert.strictEqual(o.rows.length, 3);
    assert.deepStrictEqual(o.rows[1], ['', '2 + 2 ?', '3', '4', '5', '22', '2', '', '', '20']);
    // plusieurs bonnes réponses sans colonne Type : c'est un choix multiple
    assert.deepStrictEqual(o.rows[2], ['multiple', 'Nombres pairs ?', '1', '2', '3', '4', '2,4', '', '', '20']);
  },
  'la bonne réponse écrite en toutes lettres devient la lettre'() {
    const o = csvRemap([
      ['Question', 'Choix 1', 'Choix 2', 'Choix 3', 'Bonne réponse', 'Explication'],
      ['Plus grand océan ?', 'Atlantique', 'Pacifique', 'Indien', 'pacifique', 'Il couvre un tiers du globe.'],
    ]);
    assert.deepStrictEqual(o.rows[1], ['', 'Plus grand océan ?', 'Atlantique', 'Pacifique', 'Indien', '', 'B', '', 'Il couvre un tiers du globe.']);
  },
  'colonnes Type, Bonus et Explication reprises, dans n\'importe quel ordre'() {
    const o = csvRemap([
      ['Explication', 'Correct', 'Option A', 'Option B', 'Énoncé', 'Points doubles', 'Type'],
      ['Car 1+1=2', 'A', '2', '3', '1 + 1 ?', 'oui', 'choix'],
    ]);
    assert.deepStrictEqual(o.rows[1], ['choix', '1 + 1 ?', '2', '3', '', '', 'A', 'oui', 'Car 1+1=2']);
  },
  'colonne de temps (Kahoot « Time limit ») : ajoutée en 10e colonne'() {
    const o = csvRemap([
      ['Question', 'Answer 1', 'Answer 2', 'Time limit (sec)', 'Correct answer(s)'],
      ['2 + 2 ?', '4', '5', '30', '1'],
      ['3 + 3 ?', '6', '7', '', '1'],
    ]);
    assert.deepStrictEqual(o.rows[1], ['', '2 + 2 ?', '4', '5', '', '', '1', '', '', '30']);
    assert.strictEqual(o.rows[2][9], '');
  },
  'pas d\'en-tête reconnu : rien ne change'() {
    assert.strictEqual(csvRemap([['choix', 'Capitale ?', 'Paris', 'Lyon', '', '', 'A']]), null);
    assert.strictEqual(csvRemap([]), null);
    // une question sans aucune colonne de réponse n'est pas un en-tête
    assert.strictEqual(csvRemap([['Question', 'Auteur'], ['x', 'y']]), null);
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
