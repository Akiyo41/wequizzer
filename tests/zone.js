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
  'serveur : question « image à toucher » acceptée ou refusée avec un message clair'() {
    const { cleanQuiz } = require('../src/quiz.js');
    const zone = { x: 0.5, y: 0.5, r: 0.08, ar: 1 };
    const ok = cleanQuiz({ title: 'T', questions: [{ type: 'zone', text: 'Où ?', image: 'https://a.b/c.png', zone }] });
    assert.ok(!ok.error, ok.error);
    assert.strictEqual(ok.quiz.questions[0].type, 'zone');
    assert.deepStrictEqual(ok.quiz.questions[0].zone, zone);
    const noImg = cleanQuiz({ title: 'T', questions: [{ type: 'zone', text: 'Où ?', zone }] });
    assert.strictEqual(noImg.error, 'Question 1 : il faut une image pour une question « image à toucher ».');
    const msg = 'Question 1 : touche l\'image pour placer la bonne zone.';
    assert.strictEqual(cleanQuiz({ title: 'T', questions: [{ type: 'zone', text: 'Où ?', image: 'https://a.b/c.png' }] }).error, msg);
    assert.strictEqual(cleanQuiz({ title: 'T', questions: [{ type: 'zone', text: 'Où ?', image: 'https://a.b/c.png', zone: { ...zone, r: 0.5 } }] }).error, msg);
  },
  'serveur : réponse nettoyée et corrigée'() {
    const { cleanAnswer, isCorrect } = require('../src/answers.js');
    const q = { type: 'zone', zone: { x: 0.5, y: 0.5, r: 0.08, ar: 1 } };
    assert.deepStrictEqual(cleanAnswer(q, { point: { x: 0.2, y: 0.3 } }), { x: 0.2, y: 0.3 });
    [{ point: { x: 1.2, y: 0.3 } }, { point: 'a' }, { point: { x: NaN, y: 0.3 } }, { index: 0 }, null].forEach((d) => assert.strictEqual(cleanAnswer(q, d), null, JSON.stringify(d)));
    assert.strictEqual(isCorrect(q, { x: 0.5, y: 0.5 }), true);
    assert.strictEqual(isCorrect(q, { x: 0.9, y: 0.9 }), false);
  },
  'serveur : textes de la réponse (statistiques, revoir mes erreurs)'() {
    const { mistakeEntry, shownAnswer, correctText } = require('../src/answers.js');
    const g = { settings: { labels: 'letters' } };
    const q = { type: 'zone', text: 'Où ?', choices: [], zone: { x: 0.5, y: 0.5, r: 0.08, ar: 1 } };
    assert.strictEqual(shownAnswer(g, q, { x: 0.5, y: 0.5 }), '📍 Dans la bonne zone');
    assert.strictEqual(shownAnswer(g, q, { x: 0.9, y: 0.9 }), '📍 À côté de la bonne zone');
    assert.strictEqual(correctText(g, q), '📍 La zone entourée sur l\'image');
    assert.deepStrictEqual(mistakeEntry(q, { x: 0.9, y: 0.9 }), { text: 'Où ?', yours: '📍 À côté de la bonne zone', correct: '📍 La zone entourée sur l\'image' });
  },
  'serveur : « Rejouer les questions ratées » garde la zone'() {
    const { missedQuiz } = require('../src/quiz.js');
    const zone = { x: 0.5, y: 0.5, r: 0.08, ar: 1 };
    const g = { quiz: { title: 'T' }, missed: { 0: 1 }, questions: [{ type: 'zone', text: 'Où ?', image: 'https://a.b/c.png', zone, choices: [], correct: null, answers: [], double: false, explain: '' }] };
    assert.deepStrictEqual(missedQuiz(g).questions[0].zone, zone);
  },
  'éditeur : type proposé, zone gardée, vérifiée et envoyée'() {
    assert.ok(/zone: '📍 Image à toucher'/.test(read('public/host/base.js')), 'TYPE_LABEL');
    const ql = read('public/host/quiz-list.js');
    assert.ok(/'zone'\]\.includes\(q\.type\)/.test(ql), 'normQ accepte zone');
    assert.ok(/zone: x\.zone/.test(ql), 'quizPayload envoie zone');
    const chk = read('public/host/editor-check.js');
    assert.ok(chk.includes('il faut une image pour une question « image à toucher ».') && chk.includes('touche l\\\'image pour placer la bonne zone.'), 'messages');
    assert.ok(/zoneDraw\(/.test(read('public/host/editor.js')) && /ZONE_SIZES/.test(read('public/host/editor.js')), 'éditeur');
    assert.ok(/zoneHit\(/.test(read('public/host/preview.js')), 'aperçu');
    ['public/host.html', 'public/play.html'].forEach((f) => {
      const h = read(f);
      assert.ok(h.indexOf('src="zone.js"') > 0 && h.indexOf('src="zone.js"') < h.indexOf('src="' + (f.includes('host') ? 'host' : 'play') + '/base.js"'), f + ' charge zone.js avant ses scripts');
    });
  },
  'import d\'un fichier : une question « image à toucher » est acceptée'() {
    const src = read('public/host/quiz-list.js');
    const fn = src.slice(src.indexOf('function validateQ('), src.indexOf('async function initLibrary'));
    const validateQ = new Function('zoneValid', fn + '; return validateQ;')(zoneValid);
    const q = { type: 'zone', text: 'Où ?', image: 'https://a.b/c.png', choices: [], correct: 0, answers: [], zone: { x: 0.5, y: 0.5, r: 0.08, ar: 1 } };
    assert.strictEqual(validateQ(q), null);
    assert.ok(validateQ({ ...q, image: '' }));
    assert.ok(validateQ({ ...q, zone: null }));
  },
  'résultat après rechargement de l\'animateur : l\'image vient du résultat'() {
    assert.ok(/zoneView\(r\.image/.test(read('public/host/game.js')));
  },
  'images : trop lourde, cassée, et note « changer sa réponse »'() {
    const ed = read('public/host/editor.js');
    assert.ok(ed.includes('Cette image est trop lourde, même réduite : choisis-en une plus simple ou plus petite.'), 'image trop lourde');
    assert.ok(/v\.img\.onerror = \(\) => \{ q\.zone = null;/.test(ed), 'image cassée : zone effacée (on ne peut pas enregistrer)');
    assert.ok(read('public/play/question.js').includes('L\\\'image ne s\\\'affiche pas : regarde l\\\'écran de l\\\'animateur.'), 'téléphone : image cassée');
    assert.ok(/q\.type === 'zone' \? 'Sur leur téléphone, les joueurs touchent le bon endroit sur l\\'image\.' \+ \(q\.changeAnswer/.test(read('public/host/game.js')), 'note changer sa réponse');
  },
  'écran de partie, IA, Aide'() {
    const game = read('public/host/game.js');
    assert.ok(game.includes('Sur leur téléphone, les joueurs touchent le bon endroit sur l\\\'image.'), 'note de la question');
    assert.ok(/zoneDraw\([^)]*r\.zone, r\.points\)/.test(game), 'résultat : cercle et points');
    assert.ok(read('public/host.html').indexOf('id="faq-zone"') > read('public/host.html').indexOf('id="faq-roue"'), 'Aide');
    assert.ok(read('public/host/ai-import.js').includes('les questions « image à toucher » se créent dans l\\\'éditeur, pas avec une IA.'), 'IA');
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
