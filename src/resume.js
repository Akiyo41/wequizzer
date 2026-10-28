// Reprise après une coupure : renvoie l'état courant de la partie
const { toHost, toPlayer } = require('./send');
const { elapsed, pausePayload, qTime } = require('./timer');
const { joinInfo, lobbyPayload, queuedPayload, sendHostPlayers } = require('./room');
const { progressPayload, questionPayload, readingPayload } = require('./round');
const { endPayloadFor } = require('./end');

// Renvoie à un joueur l'état courant de la partie (connexion initiale ou retour après coupure)
function sendPlayerState(g, p) {
  toPlayer(p, 'join:ok', { ...joinInfo(g, p), pid: p.pid, token: p.token, pin: g.pin });
  if (p.queued) {
    toPlayer(p, 'queued', queuedPayload(g));
    return;
  }
  const left = g.state === 'question' && qTime(g) ? Math.max(0, qTime(g) - elapsed(g)) : undefined;
  switch (g.state) {
    case 'lobby':
      toPlayer(p, 'lobby', lobbyPayload(g, p));
      break;
    case 'countdown':
      toPlayer(p, 'countdown', {
        seconds: Math.max(1, Math.ceil((g.paused ? g.pauseLeft : g.timerDue - Date.now()) / 1000) - 0),
        index: g.index,
        total: g.questions.length,
        resume: true,
      });
      break;
    case 'reading':
      toPlayer(p, 'reading', readingPayload(g, p));
      break;
    case 'question':
      toPlayer(p, 'question', questionPayload(g, p, left));
      break;
    case 'results':
      if (p.lastResult) toPlayer(p, 'result', p.lastResult);
      break;
    case 'end':
      if (g.endCtx) toPlayer(p, 'end', endPayloadFor(g, p, g.endCtx.ranked, g.endCtx.titles, g.endCtx.tboard));
      break;
  }
  if (g.paused) toPlayer(p, 'paused', pausePayload(g));
}

function sendHostState(g) {
  sendHostPlayers(g);
  const left = g.state === 'question' && qTime(g) ? Math.max(0, qTime(g) - elapsed(g)) : undefined;
  switch (g.state) {
    case 'lobby':
      toHost(g, 'lobby', {});
      break;
    case 'countdown':
      toHost(g, 'countdown', {
        seconds: Math.max(1, Math.ceil((g.paused ? g.pauseLeft : g.timerDue - Date.now()) / 1000)),
        index: g.index,
        total: g.questions.length,
        resume: true,
      });
      break;
    case 'reading':
      toHost(g, 'reading', readingPayload(g, null));
      break;
    case 'question':
      toHost(g, 'question', questionPayload(g, null, left));
      toHost(g, 'progress', progressPayload(g));
      break;
    case 'results': {
      const autoIn = g.timerFn && !g.paused ? Math.max(1, Math.round((g.timerDue - Date.now()) / 1000)) : g.paused && g.timerFn ? Math.round(g.pauseLeft / 1000) : null;
      toHost(g, 'results', { ...g.hostResults, autoIn });
      break;
    }
    case 'end':
      toHost(g, 'end', g.endData);
      break;
  }
  if (g.paused) toHost(g, 'paused', pausePayload(g));
}

module.exports = { sendPlayerState, sendHostState };
