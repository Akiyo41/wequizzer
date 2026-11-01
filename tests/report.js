// Test du bouton « Signaler un problème » (sans navigateur, sans vrai envoi : Web3Forms est simulé).
// Lancer avec : npm test
const assert = require('assert');
const { Report } = require('../public/report.js');
const { reportConfig } = require('../src/report.js');

const base = { key: 'cle-de-test', category: 'bug', message: '  Le bouton ne marche pas  ', screen: 'animateur', ua: 'Navigateur/1.0', width: 1280 };

const tests = {
  'message envoyé : catégorie, texte, écran, navigateur, largeur ; rien de personnel'() {
    const r = Report.buildPayload(base);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.body.access_key, 'cle-de-test');
    assert.strictEqual(r.body.subject, "WeQuizzer – C'est un bug");
    const m = r.body.message;
    assert.ok(m.includes('Le bouton ne marche pas'), m);
    assert.ok(m.includes('Écran : animateur') && m.includes('Navigateur : Navigateur/1.0') && m.includes("Largeur de l'écran : 1280 px"), m);
    assert.ok(!('email' in r.body) && !('name' in r.body) && !/pin|pseudo/i.test(m), 'aucune donnée personnelle');
  },
  'les trois choix : bug, je ne comprends pas, une idée'() {
    assert.strictEqual(Report.buildPayload({ ...base, category: 'question' }).body.subject, 'WeQuizzer – Je ne comprends pas quelque chose');
    assert.strictEqual(Report.buildPayload({ ...base, category: 'idee' }).body.subject, "WeQuizzer – J'ai une idée");
    assert.strictEqual(Report.buildPayload({ ...base, category: 'autre' }).ok, false);
  },
  'message de 5 à 1000 caractères'() {
    assert.strictEqual(Report.buildPayload({ ...base, message: '  abc  ' }).ok, false);
    assert.strictEqual(Report.buildPayload({ ...base, message: 'abcde' }).ok, true);
    assert.strictEqual(Report.buildPayload({ ...base, message: 'a'.repeat(1001) }).ok, false);
    assert.strictEqual(Report.buildPayload({ ...base, message: 'a'.repeat(1000) }).ok, true);
  },
  'aucun HTML : les chevrons sont retirés'() {
    const m = Report.buildPayload({ ...base, message: '<b>gras</b> <script>x</script>' }).body.message;
    assert.ok(!/[<>]/.test(m), m);
  },
  'champ piège rempli : rien n\'est envoyé (robot)'() {
    assert.strictEqual(Report.buildPayload({ ...base, trap: 'http://spam' }).robot, true);
  },
  '3 messages au plus par 10 minutes'() {
    const now = 1000000000;
    assert.strictEqual(Report.allowed([], now), true);
    assert.strictEqual(Report.allowed([now - 1000, now - 2000], now), true);
    assert.strictEqual(Report.allowed([now - 1000, now - 2000, now - 3000], now), false);
    assert.strictEqual(Report.allowed([now - 11 * 60000, now - 12 * 60000, now - 13 * 60000], now), true, 'les vieux ne comptent plus');
  },
  async 'envoi à Web3Forms (simulé) : réussi, refusé, réseau coupé'() {
    let seen = null;
    const okFetch = async (url, opt) => { seen = { url, body: JSON.parse(opt.body) }; return { json: async () => ({ success: true }) }; };
    assert.strictEqual(await Report.send(Report.buildPayload(base).body, okFetch), true);
    assert.strictEqual(seen.url, 'https://api.web3forms.com/submit');
    assert.strictEqual(seen.body.access_key, 'cle-de-test');
    assert.strictEqual(await Report.send({}, async () => ({ json: async () => ({ success: false }) })), false);
    assert.strictEqual(await Report.send({}, async () => { throw new Error('réseau'); }), false);
  },
  'serveur : sans la variable WEB3FORMS_KEY, le bouton est caché'() {
    assert.deepStrictEqual(reportConfig({}), { enabled: false });
    assert.deepStrictEqual(reportConfig({ WEB3FORMS_KEY: '  ' }), { enabled: false });
    assert.deepStrictEqual(reportConfig({ WEB3FORMS_KEY: 'cle-de-test' }), { enabled: true, key: 'cle-de-test' });
  },
};

(async () => {
  let failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try {
      await fn();
      console.log('  ok   ' + name);
    } catch (e) {
      failed++;
      console.log('  ÉCHEC ' + name + ' : ' + e.message);
    }
  }
  process.exit(failed ? 1 : 0);
})();
