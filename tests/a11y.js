// Test d'accessibilité (sans navigateur) : contrastes des couleurs principales, cadre clavier, noms pour les lecteurs d'écran.
// Lancer avec : npm test
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const css = read('style.css');

// Contraste entre deux couleurs « #rrggbb » (règle WCAG : 4,5 pour un texte normal, 3 pour un gros texte)
function lum(hex) {
  const v = hex.replace('#', '').match(/../g).map((x) => {
    const c = parseInt(x, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
const mix = (a, b) => '#' + [0, 2, 4].map((i) => Math.round((parseInt(a.slice(1 + i, 3 + i), 16) + parseInt(b.slice(1 + i, 3 + i), 16)) / 2).toString(16).padStart(2, '0')).join('');
const token = (name) => { const m = css.match(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})')); assert.ok(m, 'jeton --' + name); return m[1]; };
const gradient = (sel) => { const m = css.match(new RegExp(sel.replace(/[.]/g, '\\.') + '\\s*\\{\\s*background:\\s*linear-gradient\\(180deg,\\s*(#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)')); assert.ok(m, sel); return [m[1], m[2]]; };

const tests = {
  'bouton orange : texte lisible sur tout le dégradé'() {
    const on = token('on-accent');
    const m = css.match(/--btn-orange: linear-gradient\(180deg, (#[0-9a-f]{6}) 0%, (#[0-9a-f]{6}) 100%\)/);
    assert.ok(m);
    [m[1], m[2]].forEach((c) => assert.ok(contrast(on, c) >= 4.5, on + ' sur ' + c + ' : ' + contrast(on, c).toFixed(2)));
  },
  'bouton vert : texte lisible sur tout le dégradé'() {
    const on = css.match(/\.btn\.green \{[^}]*color: (#[0-9a-f]{6})/);
    assert.ok(on, 'couleur du texte des boutons verts');
    const m = css.match(/--btn-green: linear-gradient\(180deg, (#[0-9a-f]{6}) 0%, (#[0-9a-f]{6}) 100%\)/);
    [m[1], m[2]].forEach((c) => assert.ok(contrast(on[1], c) >= 4.5, on[1] + ' sur ' + c));
  },
  'réponses du téléphone : texte blanc lisible (gros texte, 3 minimum au milieu du dégradé)'() {
    ['.c0', '.c1', '.c2'].forEach((sel) => {
      const [a, b] = gradient(sel);
      assert.ok(contrast('#ffffff', mix(a, b)) >= 3, sel + ' : ' + contrast('#ffffff', mix(a, b)).toFixed(2));
    });
  },
  'pastilles vertes et jaunes (éditeur, résultats, podium) : lettre lisible'() {
    assert.ok(contrast('#ffffff', token('c1-dark')) >= 3, 'vert foncé des pastilles');
    assert.ok(/\.ans \.badge\.c1 \{ background: var\(--c1-dark\)/.test(css), 'pastille verte de l\'éditeur');
    assert.ok(/\.ansbadge\.c1 \{ background: var\(--c1-dark\)/.test(css), 'pastille verte des résultats');
    assert.ok(/\.ans \.badge\.c3, \.ansbadge\.c3, \.pod\.p1 \.blk \{ color: #3a2600/.test(css), 'lettre foncée sur le jaune');
  },
  'cadre clavier bien visible partout'() {
    assert.ok(/:focus-visible \{[^}]*outline: 3px solid #fff[^}]*box-shadow: 0 0 0 6px #14213d/.test(css), 'règle :focus-visible');
    assert.ok(!/input:focus, select:focus \{ outline: none/.test(css), 'le cadre des champs n\'est plus retiré');
    assert.ok(/\.sw:focus-within \.knob \{[^}]*outline/.test(css), 'interrupteurs');
  },
  'boutons assez grands pour un doigt'() {
    assert.ok(/\.btn\.mini \{[^}]*min-height: 36px/.test(css), 'petits boutons');
    assert.ok(/\.faq-q \{[^}]*flex: none[^}]*min-width: 22px/.test(css), 'le « ? » ne rétrécit jamais');
    assert.ok(/\.avpick button \{ min-height: 40px/.test(css), 'avatars');
    assert.ok(/\.ans input\[type="radio"\] \{ width: 28px; height: 28px/.test(css), 'cases « bonne réponse » de l\'éditeur');
  },
  'champs nommés pour les lecteurs d\'écran'() {
    const play = read('play.html');
    [['pin', 'Code PIN'], ['name', 'Ton pseudo'], ['textInput', 'Ta réponse']].forEach(([id, l]) => assert.ok(play.includes('id="' + id + '" aria-label="' + l + '"'), id));
    const host = read('host.html');
    ['quizSelect', 'quizSelect2', 'statsSelect', 'edTitle', 'weTitle', 'weCategory', 'wePaste', 'leTitle', 'lePaste', 'aiTheme', 'aiTitle', 'aiPrompt', 'aiReply', 'tfTitle', 'tfItems']
      .forEach((id) => assert.ok(new RegExp('id="' + id + '" aria-label="[^"]+"').test(host), id));
    assert.ok(/function nameRows/.test(read('ui.js')), 'réglages reliés à leur titre');
    assert.ok(read('ui.js').includes('.replace(/\\s+/g, \' \')'), 'espaces du titre regroupés (sans toucher aux « s »)');
    assert.ok(/aria-label', 'Bonne réponse/.test(read('host/editor.js')), 'cases « bonne réponse » de l\'éditeur');
    assert.ok(/aria-label', 'Nom de l\\'équipe/.test(read('host/base.js')), 'noms des équipes');
  },
  'annonces : bulles du Professeur, résultat, avatar choisi'() {
    assert.ok(/aria-live', 'polite'/.test(read('ui.js')) && /function announce/.test(read('ui.js')), 'zone d\'annonce');
    assert.ok(/UI\.announce\(text\)/.test(read('brand.js')), 'bulle du Professeur');
    assert.ok(/UI\.announce\(t\.textContent/.test(read('play/results.js')), 'écran de résultat');
    ['play/base.js', 'play/connection.js'].forEach((f) => assert.ok(/aria-pressed/.test(read(f)), f));
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
