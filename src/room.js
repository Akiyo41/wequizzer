// Salle d'attente, joueurs, exclusions, fermeture d'une salle
const { AVATARS } = require('./config');
const { isTeamMode, teamInfo } = require('./rules');
const { allPeople, games, socketOf, toHost, toPlayer } = require('./send');
const { clearTimer } = require('./timer');

function pickAvatar(g, wanted) {
  const used = allPeople(g).map((p) => p.avatar);
  if (AVATARS.includes(wanted) && !used.includes(wanted)) return wanted;
  const free = AVATARS.filter((a) => !used.includes(a));
  const pool = free.length ? free : AVATARS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function playerList(g) {
  return allPeople(g).map((p) => ({
    pid: p.pid,
    name: p.name,
    avatar: p.avatar,
    connected: !!p.sid,
    queued: !!p.queued,
    eliminated: !!p.eliminated,
    team: g.state === 'lobby' && isTeamMode(g) && g.settings.teamAssign === 'manual' && g.teamOf && Number.isInteger(g.teamOf[p.pid]) ? g.teamOf[p.pid] : p.team,
  }));
}

function sendHostPlayers(g) {
  toHost(g, 'host:players', playerList(g));
  sendLobbyCount(g);
}
// Téléphones en salle d'attente : combien de joueurs sont là (au plus une fois toutes les 0,7 s, pour ne pas inonder une grande salle)
function sendLobbyCount(g) {
  if (g.countTimer) return;
  g.countTimer = setTimeout(() => {
    g.countTimer = null;
    if (games[g.pin] !== g || g.state !== 'lobby') return;
    const n = Object.keys(g.players).length;
    Object.values(g.players).forEach((p) => toPlayer(p, 'lobby:count', n));
  }, 700);
}

function settingsPayload(g) {
  return { theme: g.settings.theme, sounds: g.settings.sounds, volume: g.settings.volume, reactions: g.settings.reactions, changeAnswer: g.settings.changeAnswer };
}
function lobbyPayload(g, p) {
  return { ...settingsPayload(g), name: p.name, avatar: p.avatar };
}
function queuedPayload(g) {
  return { ...settingsPayload(g), state: g.state };
}
function joinInfo(g, p) {
  return {
    name: p.name,
    avatar: p.avatar,
    team: p.team,
    ...teamInfo(g, p.team),
    ...settingsPayload(g),
  };
}

function clientIp(socket) {
  // La DERNIÈRE adresse est celle ajoutée par le proxy de Render ; les premières peuvent être inventées par le client
  const xf = String(socket.handshake.headers['x-forwarded-for'] || '').split(',').pop().trim();
  const ip = xf || socket.handshake.address || '';
  return /^(::1|127\.|::ffff:127\.)/.test(ip) ? '' : ip; // pas de blocage par IP en local
}
function banLeft(g, socket, device) {
  const now = Date.now();
  g.bans = (g.bans || []).filter((b) => b.until === null || b.until > now);
  const ip = clientIp(socket);
  const b = g.bans.find((x) => (device && x.device === device) || (ip && x.ip === ip));
  if (!b) return 0;
  return b.until === null ? -1 : b.until - now;
}
function banMessage(left) {
  if (left < 0) return "L'animateur a fermé ta place dans cette partie (jusqu'à sa fermeture).";
  const min = Math.max(1, Math.ceil(left / 60000));
  return "L'animateur a mis ta place en pause : tu pourras revenir dans " + min + ' min.';
}

function removePlayer(g, p, reason, minutes) {
  delete g.players[p.pid];
  delete g.queue[p.pid];
  if (reason === 'kick') toPlayer(p, 'kicked', { message: banMessage(minutes ? minutes * 60000 : -1) });
  const s = socketOf(p);
  if (s) s.data.pid = null;
}

// Ferme complètement une salle : les joueurs sont prévenus
function closeGame(g) {
  clearTimer(g);
  allPeople(g).forEach((p) => toPlayer(p, 'host:left'));
  delete games[g.pin];
}

module.exports = { queuedPayload, sendHostPlayers, lobbyPayload, joinInfo, pickAvatar, settingsPayload, clientIp, banLeft, banMessage, removePlayer, closeGame };
