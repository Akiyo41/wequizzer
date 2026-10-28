// Vérification des réglages envoyés par l'animateur
const { AUTO_DELAYS, MODES, READ_DELAYS, THEMES, TIME_CHOICES } = require('./config');
const { isBlocked } = require('./names');

function sanitize(input, current) {
  const s = { ...current };
  if (!input || typeof input !== 'object') return s;
  if (MODES.includes(input.mode)) s.mode = input.mode;
  if ([2, 3, 4].includes(input.teamCount)) s.teamCount = input.teamCount;
  if (['random', 'manual'].includes(input.teamAssign)) s.teamAssign = input.teamAssign;
  if (Array.isArray(input.teamNames)) {
    s.teamNames = [0, 1, 2, 3].map((i) => {
      const n = String(input.teamNames[i] || '').trim().replace(/\s+/g, ' ').slice(0, 14);
      return n && !isBlocked(n) ? n : '';
    });
  }
  if (TIME_CHOICES.includes(input.time)) s.time = input.time;
  if (AUTO_DELAYS.includes(input.autoDelay)) s.autoDelay = input.autoDelay;
  if (READ_DELAYS.includes(input.readSeconds)) s.readSeconds = input.readSeconds;
  if (Number.isInteger(input.count) && input.count >= 0 && input.count <= 100) s.count = input.count;
  if (Number.isInteger(input.volume) && input.volume >= 0 && input.volume <= 100) s.volume = input.volume;
  if (THEMES.includes(input.theme)) s.theme = input.theme;
  if (Number.isInteger(input.lives) && input.lives >= 1 && input.lives <= 5) s.lives = input.lives;
  if (['both', 'host'].includes(input.display)) s.display = input.display;
  if (['letters', 'numbers'].includes(input.labels)) s.labels = input.labels;
  if (typeof input.showExplain === 'boolean') s.showExplain = input.showExplain;
  if (['wheel', 'match'].includes(input.pairsView)) s.pairsView = input.pairsView;
  [
    'limitTime', 'speedBonus', 'hearts', 'reviewErrors', 'readDelay', 'autoNext', 'changeAnswer', 'bonusQuestions',
    'shuffleQuestions', 'showAnswers', 'reactions', 'sounds',
  ].forEach((k) => {
    if (typeof input[k] === 'boolean') s[k] = input[k];
  });
  return s;
}

module.exports = { sanitize };
