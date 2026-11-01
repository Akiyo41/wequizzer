// Reprise après une coupure : renvoie l'état courant de la partie
const { toHost, toPlayer, toSocket } = require('./send');
const { elapsed, pausePayload, qTime } = require('./timer');
const { joinInfo, lobbyPayload, queuedPayload, sendHostPlayers } = require('./room');
const { liveAnswers, progressPayload, questionPayload, readingPayload, remoteQuestion } = require('./round');
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
      // décompte avant la partie en cours : il le voit aussi
      if (g.prestart) toPlayer(p, 'prestart', { seconds: Math.max(1, Math.ceil((g.prestartEnd - Date.now()) / 1000)) });
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

// onlySid : envoyer seulement à ce socket (la télécommande qui vient d'être acceptée)
function sendHostState(g, onlySid) {
  const send = onlySid ? (ev, data) => toSocket(onlySid, ev, data) : (ev, data) => toHost(g, ev, data);
  sendHostPlayers(g);
  send('host:lock', !!g.locked); // salle fermée ou non (bouton de l'animateur)
  const left = g.state === 'question' && qTime(g) ? Math.max(0, qTime(g) - elapsed(g)) : undefined;
  switch (g.state) {
    case 'lobby':
      send('lobby', {});
      break;
    case 'countdown':
      send('countdown', {
        seconds: Math.max(1, Math.ceil((g.paused ? g.pauseLeft : g.timerDue - Date.now()) / 1000)),
        index: g.index,
        total: g.questions.length,
        resume: true,
      });
      break;
    case 'reading':
      send('reading', readingPayload(g, null));
      break;
    case 'question':
      send('question', questionPayload(g, null, left));
      send('progress', progressPayload(g));
      break;
    case 'results': {
      const autoIn = g.timerFn && !g.paused ? Math.max(1, Math.round((g.timerDue - Date.now()) / 1000)) : g.paused && g.timerFn ? Math.round(g.pauseLeft / 1000) : null;
      send('results', { ...g.hostResults, autoIn });
      break;
    }
    case 'end':
      send('end', g.endData);
      break;
  }
  if (g.paused) send('paused', pausePayload(g));
  if (onlySid && ['question', 'results'].includes(g.state)) {
    toSocket(onlySid, 'remote:question', remoteQuestion(g));
    if (g.state === 'question') toSocket(onlySid, 'remote:live', liveAnswers(g));
  }
}

module.exports = { sendPlayerState, sendHostState };
