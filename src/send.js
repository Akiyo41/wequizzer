// Salles en mémoire et envoi des messages (animateur, joueurs)


const games = {}; // pin -> état de la partie

function newPin() {
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (games[pin]);
  return pin;
}

function allPeople(g) {
  return [...Object.values(g.players), ...Object.values(g.queue)];
}

// ---------- Envoi ----------
let io = null;
function init(server) {
  io = server;
}

// Connexion Socket.IO d'un joueur (ou null s'il est déconnecté)
function socketOf(p) {
  return p.sid ? io.sockets.sockets.get(p.sid) : null;
}

// L'animateur reçoit ses messages sur son écran ET sur sa télécommande (si elle a été acceptée)
let liveHook = null; // réponses en direct pour la télécommande (fourni par round.js)
function setLiveHook(fn) { liveHook = fn; }
function toHost(g, ev, data) {
  if (g.host) io.to(g.host).emit(ev, data);
  if (g.remote) {
    io.to(g.remote).emit(ev, data);
    if (ev === 'progress' && liveHook) io.to(g.remote).emit('remote:live', liveHook(g));
  }
}
function toSocket(sid, ev, data) {
  if (sid) io.to(sid).emit(ev, data);
}
// Seulement la télécommande (ce que la classe ne doit pas voir : bonne réponse, réponses en direct)
function toRemote(g, ev, data) {
  if (g.remote) io.to(g.remote).emit(ev, data);
}
function toPlayer(p, ev, data) {
  if (p.sid) io.to(p.sid).emit(ev, data);
}
function toAll(g, ev, data) {
  toHost(g, ev, data);
  allPeople(g).forEach((p) => toPlayer(p, ev, data));
}

module.exports = { init, toAll, games, allPeople, socketOf, toHost, toRemote, toSocket, setLiveHook, toPlayer, newPin };
