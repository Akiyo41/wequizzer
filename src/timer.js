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

function qTime(g) {
  return g.settings.limitTime ? g.settings.time : null;
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

module.exports = { clearTimer, schedule, qTime, elapsed, pausePayload, setPaused };
