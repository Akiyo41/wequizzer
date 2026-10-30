// Test du tableur des résultats de fin de partie (sans navigateur). Lancer avec : npm test
const assert = require('assert');
const { resultsCsv } = require('../public/host/results-csv.js');

const lines = (csv) => csv.replace(/^﻿/, '').split('\r\n');

const tests = {
  'classement de tous les joueurs puis réussite par question'() {
    const csv = resultsCsv({
      quizTitle: 'Capitales',
      questions: 3,
      results: [
        { rank: 1, name: 'Alice', score: 2500, correct: 3, team: null, alive: true, hearts: null },
        { rank: 2, name: 'Bob "le grand"', score: 900, correct: 1, team: null, alive: true, hearts: null },
      ],
      qstats: [{ label: 'Capitale de la France ?', ok: 2, total: 2 }, { label: 'Capitale du Pérou ; facile ?', ok: 0, total: 2 }],
    }, '30/10/2026');
    assert.ok(csv.startsWith('﻿'), 'BOM pour Excel');
    assert.deepStrictEqual(lines(csv), [
      'Quiz;"Capitales"',
      'Date;30/10/2026',
      '',
      'Rang;Pseudo;Points;Bonnes réponses',
      '1;"Alice";2500;3 / 3',
      '2;"Bob ""le grand""";900;1 / 3',
      '',
      'Question;Bonnes réponses;Réussite',
      '"Capitale de la France ?";2 / 2;100 %',
      '"Capitale du Pérou ; facile ?";0 / 2;0 %',
    ]);
  },
  'équipes et cœurs : colonnes en plus'() {
    const csv = resultsCsv({
      quizTitle: 'Q', questions: 2, heartsMode: true,
      results: [
        { rank: 1, name: 'A', score: 2, correct: 2, team: 'Les Lions', alive: true, hearts: 2 },
        { rank: 2, name: 'B', score: 0, correct: 0, team: 'Les Aigles', alive: false, hearts: 0 },
      ],
      qstats: [],
    }, '1/1/2026');
    const l = lines(csv);
    assert.strictEqual(l[3], 'Rang;Pseudo;Équipe;Points;Bonnes réponses;Cœurs');
    assert.strictEqual(l[4], '1;"A";"Les Lions";2;2 / 2;2');
    assert.strictEqual(l[5], '2;"B";"Les Aigles";0;0 / 2;Éliminé');
    assert.strictEqual(l.length, 6, 'pas de bloc questions vide');
  },
  'élimination sans cœurs : colonne En jeu'() {
    const l = lines(resultsCsv({ quizTitle: 'Q', questions: 1, mode: 'elimination', results: [{ rank: 1, name: 'A', score: 1, correct: 1, team: null, alive: true }], qstats: [] }, 'x'));
    assert.strictEqual(l[3], 'Rang;Pseudo;Points;Bonnes réponses;En jeu');
    assert.strictEqual(l[4], '1;"A";1;1 / 1;Oui');
  },
  'formules de tableur neutralisées dans les pseudos'() {
    const l = lines(resultsCsv({ quizTitle: '=1+1', questions: 1, results: [{ rank: 1, name: '=HYPERLINK("x")', score: 0, correct: 0, team: null }], qstats: [] }, 'x'));
    assert.strictEqual(l[0], 'Quiz;"\'=1+1"');
    assert.strictEqual(l[4], '1;"\'=HYPERLINK(""x"")";0;0 / 1');
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
