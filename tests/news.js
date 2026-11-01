// Test du bouton « Nouveautés et corrections » (sans navigateur). Lancer avec : npm test
const assert = require('assert');
const { News } = require('../public/news.js');

const list = [
  { id: 3, date: '2026-11-01', type: 'correction', for: 'joueur', text: 'C' },
  { id: 2, date: '2026-11-01', type: 'nouveau', for: 'tous', text: 'B' },
  { id: 1, date: '2026-10-31', type: 'nouveau', for: 'animateur', text: 'A' },
];

const tests = {
  'chaque écran voit ce qui le concerne (et ce qui concerne tout le monde)'() {
    assert.deepStrictEqual(News.forScreen(list, 'animateur').map((n) => n.text), ['B', 'A']);
    assert.deepStrictEqual(News.forScreen(list, 'joueur').map((n) => n.text), ['C', 'B']);
  },
  'pastille : nombre de nouveautés pas encore vues'() {
    assert.strictEqual(News.unseen(list, 'joueur', 0), 2);
    assert.strictEqual(News.unseen(list, 'joueur', 2), 1);
    assert.strictEqual(News.unseen(list, 'joueur', 3), 0);
    assert.strictEqual(News.unseen(list, 'animateur', 2), 0);
  },
  'groupées par jour, les plus récentes d\'abord, date en français'() {
    const g = News.byDay(News.forScreen(list, 'animateur'));
    assert.deepStrictEqual(g.map((d) => [d.label, d.items.map((n) => n.text)]), [['1er novembre 2026', ['B']], ['31 octobre 2026', ['A']]]);
  },
  'la vraie liste est correcte : numéros uniques, types et écrans connus, textes courts'() {
    const ids = News.LIST.map((n) => n.id);
    assert.ok(News.LIST.length >= 10, 'assez de nouveautés');
    assert.strictEqual(new Set(ids).size, ids.length, 'numéros uniques');
    assert.deepStrictEqual(ids, ids.slice().sort((a, b) => b - a), 'les plus récentes d\'abord');
    News.LIST.forEach((n) => {
      assert.ok(['nouveau', 'correction'].includes(n.type), n.text);
      assert.ok(['tous', 'animateur', 'joueur'].includes(n.for), n.text);
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(n.date) && n.text.length > 10 && n.text.length <= 160, n.text);
    });
    assert.ok(News.LIST.some((n) => n.type === 'correction'), 'des corrections aussi');
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
