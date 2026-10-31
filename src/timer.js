// Minuterie (compatible avec la pause) et pause de la partie
const { toAll } = require('./send');

function clearTimer(g) {
  clearTimeout(g.timer);
  g.timer = null;
  g.timerFn = null;
  g.timerDue = 0;
}
function schedule(g, ms, fn) {
  clearTimeout(g.timer);
  g.timerFn = fn;
  g.timerDue = Date.now() + ms;
  g.timer = setTimeout(() => {
    g.timer = null;
    g.timerFn = null;
    g.timerDue = 0;
    fn();
  }, ms);
}

// Temps de la question en cours, avec les secondes ajoutées par l'animateur (« +10 s »)
function qTime(g) {
  if (!g.settings.limitTime) return null;
  const q = g.questions && g.questions[g.index];
  return ((q && q.time) || g.settings.time) + (g.extraTime || 0); // temps de la question s'il en a un
}
const MORE_TIME = 10;
const MORE_TIME_MAX = 120;
// « +10 s » : seulement pendant une question chronométrée, pas en pause, 2 minutes en plus au maximum
function addTime(g) {
  if (g.state !== 'question' || g.paused || !qTime(g) || !g.timerFn) return false;
  if ((g.extraTime || 0) + MORE_TIME > MORE_TIME_MAX) return false;
  g.extraTime = (g.extraTime || 0) + MORE_TIME;
  schedule(g, g.timerDue - Date.now() + MORE_TIME * 1000, g.timerFn);
  toAll(g, 'time:more', { time: qTime(g), left: Math.max(0, qTime(g) - elapsed(g)), more: g.extraTime < MORE_TIME_MAX });
  return true;
}
function elapsed(g) {
  return ((g.paused ? g.pausedAt : Date.now()) - g.startedAt) / 1000;
}

function setPaused(g, on, reason) {
  if (!['countdown', 'reading', 'question', 'results'].includes(g.state)) return;
  const now = Date.now();
  if (on && !g.paused) {
    g.paused = true;
    g.pauseReason = reason || 'host';
    g.pausedAt = now;
    g.pauseLeft = g.timerFn ? Math.max(0, g.timerDue - now) : 0;
    clearTimeout(g.timer);
  } else if (!on && g.paused) {
    g.paused = false;
    g.pauseReason = null;
    g.startedAt += now - g.pausedAt;
    if (g.timerFn) {
      const fn = g.timerFn;
      schedule(g, g.pauseLeft, fn);
    }
  } else {
    return;
  }
  toAll(g, 'paused', pausePayload(g));
}

function pausePayload(g) {
  const time = qTime(g);
  return {
    paused: g.paused,
    reason: g.pauseReason,
    left: g.state === 'question' && time ? Math.max(0, time - elapsed(g)) : null,
  };
}

module.exports = { clearTimer, schedule, qTime, elapsed, pausePayload, setPaused, addTime };
