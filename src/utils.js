// Petits outils
const os = require('os');
const crypto = require('crypto');
const { PORT } = require('./config');

function lanUrl() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) return `http://${n.address}:${PORT}`;
    }
  }
  return null;
}

function rid(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { shuffle, lanUrl, rid };
