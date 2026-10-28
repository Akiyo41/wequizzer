// Filtre de pseudos (blocked-words.txt)
const fs = require('fs');
const path = require('path');

function normWord(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[@4]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');
}
let blockedWords = [];
function loadBlockedWords() {
  try {
    const txt = fs.readFileSync(path.join(__dirname, '..', 'blocked-words.txt'), 'utf8');
    blockedWords = Array.from(
      new Set(
        txt
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map(normWord)
          .filter((w) => w.length >= 2)
      )
    );
  } catch (e) {
    blockedWords = [];
  }
}
loadBlockedWords();
function isBlocked(name) {
  const full = normWord(name);
  const tokens = String(name)
    .split(/[^\p{L}\p{N}@$!|]+/u)
    .map(normWord)
    .filter(Boolean);
  return blockedWords.some((w) => (w.length >= 6 ? full.includes(w) : full === w || tokens.includes(w)));
}

module.exports = { isBlocked };
