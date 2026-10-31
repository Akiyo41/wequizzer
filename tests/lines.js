// Test des phrases du Professeur et du tirage au sort (sans navigateur). Lancer avec : npm test
const assert = require('assert');
const { LINES, pickLine } = require('../public/lines.js');

const KEYS = ['attente', 'file', 'compte', 'envoye', 'elimine', 'bravo', 'serie', 'rate', 'tropTard', 'sondage', 'finGagne', 'finPodium', 'finAutre', 'animCompte', 'animTous', 'animMoitie', 'animPersonne', 'animSondage', 'animPodium', 'dernier', 'lecture', 'animLecture', 'pause', 'pauseCoupure', 'animPause', 'animPauseCoupure', 'animAccueil', 'animFinZero'];

const tests = {
  'les 28 situations, 3 à 5 phrases chacune'() {
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
  'fin de partie : le dernier du classement n\'est jamais félicité « sur le podium »'() {
    const { endLine } = require('../public/lines.js');
    assert.strictEqual(endLine({ mode: 'elimination', alive: false, rank: 3, total: 3 }), 'finAutre');
    assert.strictEqual(endLine({ mode: 'standard', rank: 2, total: 2 }), 'finAutre');
    assert.strictEqual(endLine({ mode: 'standard', rank: 2, total: 3 }), 'finPodium');
    assert.strictEqual(endLine({ mode: 'standard', rank: 3, total: 10 }), 'finPodium');
    assert.strictEqual(endLine({ mode: 'standard', rank: 1, total: 1 }), 'finGagne'); // seul : il a gagné
    assert.strictEqual(endLine({ mode: 'teams', teamRank: 2, teamCount: 2, rank: 1 }), 'finAutre');
    assert.strictEqual(endLine({ mode: 'teams', teamRank: 2, teamCount: 3, rank: 5 }), 'finPodium');
  },
  'dernière question : phrases valables qu\'on ait répondu ou non'() {
    LINES.dernier.forEach((s) => assert.ok(!/Raté de peu/.test(s), s));
  },
  'gagnant sans aucune bonne réponse : pas de « première place » ni d\'applaudissements'() {
    const { endLine } = require('../public/lines.js');
    assert.strictEqual(endLine({ mode: 'standard', rank: 1, total: 2, correct: 0, questions: 6 }), 'finAutre');
    assert.strictEqual(endLine({ mode: 'standard', rank: 1, total: 2, correct: 1, questions: 6 }), 'finGagne');
    assert.strictEqual(endLine({ mode: 'standard', rank: 1, total: 2, correct: 0, questions: 0 }), 'finGagne'); // que des sondages
    assert.strictEqual(endLine({ mode: 'teams', teamRank: 1, teamCount: 2, rank: 2, correct: 0, questions: 6 }), 'finGagne'); // l'équipe a gagné
    assert.ok(LINES.animFinZero.length >= 3 && LINES.animFinZero.every((s) => !/\{gagnant\}/.test(s)));
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'public/host/game.js'), 'utf8');
    assert.ok(/animFinZero/.test(src), 'l\'animateur utilise animFinZero');
    const play = require('fs').readFileSync(require('path').join(__dirname, '..', 'public/play/results.js'), 'utf8');
    assert.ok(/const zero = !teamy && d\.questions > 0 && d\.correct === 0/.test(play) && /if \(!zero &&/.test(play), 'téléphone : ni coupe ni fanfare');
  },
  'nouveau QR code : l\'ancienne partie est oubliée'() {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'public/play/connection.js'), 'utf8');
    assert.ok(/urlPin && urlPin !== String\(sess\.pin\)/.test(src));
  },
  'podium de l\'animateur : « En jeu » (neutre) plutôt que « Survivant »'() {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'public/host/game.js'), 'utf8');
    assert.ok(!src.includes('\'Survivant\''));
    assert.ok(src.includes('\'❤️\'.repeat(p.hearts) : \'En jeu\''));
  },
  'écran joueur : « hors jeu » plutôt que « Tu es éliminé »'() {
    const fs = require('fs');
    ['public/play.html', 'public/play/results.js'].forEach((f) => assert.ok(!fs.readFileSync(require('path').join(__dirname, '..', f), 'utf8').includes('Tu es éliminé'), f));
  },
  'relecture : textes neutres et cohérents dans toute l\'interface'() {
    const fs = require('fs');
    const read = (f) => fs.readFileSync(require('path').join(__dirname, '..', f), 'utf8');
    const files = ['public/ui.js', 'src/room.js', 'src/rules.js', 'src/quiz.js', 'public/host.html', 'public/play.html', 'public/play/connection.js', 'public/play/results.js', 'public/play/base.js', 'public/host/base.js', 'public/host/game.js', 'public/host/ai-import.js'];
    const bad = ['Tu es sûr', 't\'a exclu', 't\'a retiré', 'en as été retiré', 'Dernier survivant !', 'Le dernier survivant', 'Le sans-faute', 'Le plus rapide\'', 'Le plus réfléchi', 'Le plus expressif', 'ta IA', 'Sur ton téléphone, choisis', 's\'additionnent', 'Choisie par l\'animateur', 'Animateur + joueurs', 'Animateur seulement', '>Seul, en équipes', 'Plus de cœur : éliminé<', '> Entrer<', 'Paire ', 'caractères maximum', 'la même que la bonne.\''];
    files.forEach((f) => { const t = read(f); bad.forEach((b) => assert.ok(!t.includes(b), f + ' contient encore « ' + b + ' »')); });
    ['Sans-faute', 'Vitesse éclair', 'Tête pensante', 'Réactions en folie', 'Inarrêtable'].forEach((t) => {
      assert.ok(read('src/rules.js').includes('\'' + t + '\''), 'titre ' + t);
      ['public/play/base.js', 'public/host/base.js'].forEach((f) => assert.ok(read(f).includes('\'' + t + '\':'), f + ' : symbole pour ' + t));
    });
  },
  'hors jeu : on ne parle des réactions que si elles sont allumées'() {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'public/play/results.js'), 'utf8');
    assert.ok(src.includes('settings.reactions ? \'💀 Tu es hors jeu… mais tu peux encore envoyer des réactions !\' : \'💀 Tu es hors jeu… regarde la suite sur le grand écran !\''));
  },
  'consignes : une par type de question qui en a besoin'() {
    const { CONSIGNES, consigneFor } = require('../public/lines.js');
    assert.deepStrictEqual(Object.keys(CONSIGNES).sort(), ['mots', 'multi', 'nuage', 'ordre', 'relier', 'roue', 'sondage', 'texte', 'zone']);
    Object.values(CONSIGNES).forEach((s) => assert.ok(typeof s === 'string' && s.length > 10, s));
    assert.strictEqual(consigneFor({ type: 'single', wheel: true }), 'roue');
    assert.strictEqual(consigneFor({ type: 'match', match: true }), 'relier');
    assert.strictEqual(consigneFor({ type: 'text', letters: true }), 'mots'); // jeu de mots avant « réponse à écrire »
    assert.strictEqual(consigneFor({ type: 'order', order: true }), 'ordre');
    assert.strictEqual(consigneFor({ type: 'multi' }), 'multi');
    assert.strictEqual(consigneFor({ type: 'poll' }), 'sondage');
    assert.strictEqual(consigneFor({ type: 'text' }), 'texte');
    assert.strictEqual(consigneFor({ type: 'zone' }), 'zone');
    assert.strictEqual(consigneFor({ type: 'words' }), 'nuage');
    assert.strictEqual(CONSIGNES.zone, 'Touche le bon endroit sur l\'image, puis valide.');
    assert.strictEqual(consigneFor({ type: 'single' }), null);
    assert.strictEqual(consigneFor({ type: 'tf' }), null);
    assert.strictEqual(CONSIGNES.texte, 'Écris ta réponse : les accents et les petites fautes sont pardonnés !');
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
    assert.ok(LINES.lecture.includes('Lis attentivement, le piège n\'est jamais loin !'));
    assert.ok(LINES.pauseCoupure.includes('Coupure chez l\'animateur ! La partie reprend dès son retour.'));
    assert.ok(LINES.animAccueil.includes('Sortez vos téléphones et scannez le QR code !'));
    assert.ok(LINES.animPauseCoupure.every((s) => !/déconnecté/.test(s)), 'pas de « déconnecté » (accord masculin)');
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
