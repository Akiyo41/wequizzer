// Test de l'adresse d'un appareil (pour les exclusions et la limite de codes PIN). Lancer avec : npm test
const assert = require('assert');
const { clientIp } = require('../src/room.js');

const sock = (xff, address) => ({ handshake: { headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, address } });

const tests = {
  'derrière Render : la dernière adresse (ajoutée par Render), pas celle inventée par le client'() {
    assert.strictEqual(clientIp(sock('6.6.6.6, 81.2.3.4', '10.0.0.1')), '81.2.3.4');
    assert.strictEqual(clientIp(sock('81.2.3.4', '10.0.0.1')), '81.2.3.4');
  },
  'sans en-tête : l\'adresse de la connexion'() {
    assert.strictEqual(clientIp(sock(undefined, '81.2.3.4')), '81.2.3.4');
  },
  'en local : pas d\'adresse (pas de blocage)'() {
    assert.strictEqual(clientIp(sock(undefined, '127.0.0.1')), '');
    assert.strictEqual(clientIp(sock(undefined, '::1')), '');
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
