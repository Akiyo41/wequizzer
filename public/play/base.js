// Écran joueur : outils communs, avatar et pseudo, réactions
// Connexion ouverte seulement à la fin de play/results.js, quand tous les fichiers sont chargés
const socket = io({ autoConnect: false });
const $ = (id) => document.getElementById(id);
const screens = ['join', 'wait', 'queued', 'countdown', 'reading', 'question', 'wheel', 'review', 'sent', 'spectate', 'result', 'end'];
const LETTERS = ['A', 'B', 'C', 'D'];
const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🐵', '🦄', '🐯', '🐧', '🐢', '🦉', '🐳', '🐰', '🐨', '🦖', '🐝'];
const REACTIONS = ['👏', '😂', '😮', '🔥', '😢', '❤️'];
const TITLE_EMOJI = {
  'Le plus rapide': '⚡', 'La meilleure série': '🔥', 'Le sans-faute': '🎯',
  'Le plus réfléchi': '💡', 'Le plus expressif': '😄', 'Le dernier survivant': '🛡️',
};
let timerInt = null;
let readInt = null;
let curQ = null;
let curScreen = 'join';
let selected = []; // choix en cours (question à choix)
let settings = { reactions: false, changeAnswer: false };
let me = { name: '', avatar: '', teamName: null, teamIcon: null };
let lastEnd = null;
let myAvatar = null;

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* rien */ } },
};
const SESSION = 'wequizzer.player';
if (!new URLSearchParams(location.search).get('pin') && !LS.get(SESSION, null)) Brand.intro();
let deviceId = LS.get('wequizzer.device', null);
if (!deviceId) { deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36); LS.set('wequizzer.device', deviceId); }

// Le Professeur parle dans la bulle `boxId` (sa mascotte `mascotId` est cachée pendant ce temps) — voir Brand.speak
const profSay = (boxId, mascotId, key, pose, vars) => Brand.speak($(boxId), mascotId ? $(mascotId) : null, key, pose, vars);
// Écrans sans données : une nouvelle phrase à chaque fois qu'on y entre
const SCREEN_LINES = {
  wait: ['sayWait', 'waitMascot', 'attente', 'danse'],
  queued: ['sayQueued', 'queuedMascot', 'file', 'recherche'],
  countdown: ['sayCount', 'cdMascot', 'compte', 'chrono'],
  sent: ['saySent', 'sentMascot', 'envoye', 'reflexion'],
  spectate: ['saySpec', 'specMascot', 'elimine', 'desole'],
};
function show(id) {
  const entering = id !== curScreen;
  curScreen = id;
  if (entering && SCREEN_LINES[id]) {
    const [box, mascot, key, pose] = SCREEN_LINES[id];
    profSay(box, mascot, key, pose, { pseudo: me.name });
  }
  screens.forEach((s) => $(s).classList.toggle('hidden', s !== id));
  document.body.classList.toggle('center', !['question', 'reading'].includes(id));
  const inGame = id !== 'join';
  $('leaveBtn').classList.toggle('hidden', !inGame);
  $('setBtn').classList.toggle('hidden', !inGame);
  document.body.classList.toggle('in-game', inGame);
  const showReact = inGame && settings.reactions && id !== 'queued';
  $('reactBar').classList.toggle('hidden', !showReact);
  document.body.style.paddingBottom = showReact ? '76px' : '';
  window.scrollTo(0, 0);
}
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function stat(label, value) {
  const s = el('div', 'stat');
  s.appendChild(document.createTextNode(String(value)));
  s.appendChild(el('small', '', label));
  return s;
}
function applySettings(s) {
  if (!s) return;
  if (typeof s.reactions === 'boolean') settings.reactions = s.reactions;
  if (typeof s.changeAnswer === 'boolean') settings.changeAnswer = s.changeAnswer;
  show(curScreen);
}

FX.keepAwake();
UI.soundInit();

// ----- Avatar, pseudo -----
myAvatar = LS.get('wequizzer.avatar', null) || AVATARS[Math.floor(Math.random() * AVATARS.length)];
function renderAvatars() {
  const box = $('avpick');
  box.innerHTML = '';
  AVATARS.forEach((a) => {
    const b = el('button', a === myAvatar ? 'on' : '', a);
    b.type = 'button';
    b.setAttribute('aria-label', 'Avatar ' + a);
    b.onclick = () => { myAvatar = a; LS.set('wequizzer.avatar', a); FX.click(); renderAvatars(); };
    box.appendChild(b);
  });
}
renderAvatars();
const params = new URLSearchParams(location.search);
if (params.get('pin')) $('pin').value = params.get('pin');
const savedName = LS.get('wequizzer.name', '');
if (savedName) $('name').value = savedName;

// ----- Réactions -----
REACTIONS.forEach((e) => {
  const b = el('button', '', e);
  b.type = 'button';
  b.onclick = () => {
    socket.emit('player:react', e);
    b.disabled = true;
    setTimeout(() => { b.disabled = false; }, 1200);
  };
  $('reactBar').appendChild(b);
});
