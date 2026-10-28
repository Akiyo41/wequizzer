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

function toHost(g, ev, data) {
  if (g.host) io.to(g.host).emit(ev, data);
}
function toPlayer(p, ev, data) {
  if (p.sid) io.to(p.sid).emit(ev, data);
}
function toAll(g, ev, data) {
  toHost(g, ev, data);
  allPeople(g).forEach((p) => toPlayer(p, ev, data));
}

module.exports = { init, toAll, games, allPeople, socketOf, toHost, toPlayer, newPin };
