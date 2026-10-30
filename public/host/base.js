// Écran animateur : outils communs, stockage dans le navigateur, paramètres
// Connexion ouverte seulement à la fin de host/game.js, quand tous les fichiers sont chargés
const socket = io({ autoConnect: false });
const $ = (id) => document.getElementById(id);
const screens = ['lobby', 'editor', 'wheelEditor', 'lettersEditor', 'tfEditor', 'createPage', 'advPage', 'faqPage', 'aiPage', 'libPage', 'statsPage', 'preview', 'countdown', 'reading', 'question', 'results', 'end'];
const LETTERS = ['A', 'B', 'C', 'D'];
const TYPE_LABEL = {
  single: 'Choix unique',
  gap: 'Compléter la phrase',
  order: 'Remettre dans l\'ordre',
  tf: 'Vrai / Faux',
  multi: 'Plusieurs bonnes réponses',
  text: 'Réponse à écrire',
  poll: 'Sondage (pas de bonne réponse)',
  zone: '📍 Image à toucher',
};
const TITLE_EMOJI = {
  'Vitesse éclair': '⚡', 'La meilleure série': '🔥', 'Sans-faute': '🎯',
  'Tête pensante': '💡', 'Réactions en folie': '😄', 'Inarrêtable': '🛡️',
};
let currentQ = null;
let timerInt = null;
let autoInt = null;
let readInt = null;
let playerCount = 0;
let lastPlayers = [];
let quizReady = false;
let replayPending = false;
let isPaused = false;
let autoLeft = null;
let autoBase = '';
let lastEnd = null;
let labelMode = 'letters';
const lab = (i) => (labelMode === 'numbers' ? String(i + 1) : LETTERS[i]);

// Accueil : le Professeur, à côté du QR code, invite les joueurs à rejoindre (nouvelle phrase à chaque retour à l'accueil)
function hostWelcome() {
  Brand.speak($('sayHostJoin'), $('hostJoinMascot'), 'animAccueil', 'accueil');
}
function show(id) {
  if (id !== 'lobby' && typeof Tour !== 'undefined' && Tour.active()) Tour.close(); // la visite guidée ne concerne que l'accueil
  const entering = $(id).classList.contains('hidden');
  screens.forEach((s) => $(s).classList.toggle('hidden', s !== id));
  if (id === 'lobby' && entering) hostWelcome();
  const inGame = ['countdown', 'reading', 'question', 'results'].includes(id);
  $('hostBar').classList.toggle('hidden', !inGame);
  $('tabbar').classList.toggle('hidden', id !== 'lobby');
  document.body.classList.toggle('with-tabs', id === 'lobby');
  document.body.classList.toggle('with-bar', inGame);
  window.scrollTo(0, 0);
}
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const uid = () => 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

FX.keepAwake();

// ----- Stockage dans le navigateur (quiz + paramètres) -----
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { let s = null; try { s = localStorage; } catch (e) { /* stockage indisponible */ } return trySet(s, k, v); },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* rien */ } },
};
let library = LS.get('wequizzer.quizzes', []);
let selectedId = LS.get('wequizzer.lastQuiz', null);
// Renvoie faux si le navigateur n'a pas pu enregistrer (mémoire pleine, souvent à cause des images)
const saveLibrary = () => {
  if (LS.set('wequizzer.quizzes', library)) { LS.set('wequizzer.lastQuiz', selectedId); return true; }
  // Mémoire pleine (le stockage marche pour une petite valeur) : on revient à ce qui est vraiment enregistré,
  // pour ne pas croire garder un quiz qui disparaîtrait au rechargement
  if (LS.set('wequizzer.probe', 1)) {
    library = LS.get('wequizzer.quizzes', []);
    selectedId = LS.get('wequizzer.lastQuiz', null);
    if (typeof renderQuizSelect === 'function') renderQuizSelect();
  }
  UI.confirm({ title: 'Mémoire pleine', text: 'Ce changement n\'est pas enregistré : ce navigateur n\'a plus de place pour tes quiz (les images en prennent beaucoup). Enlève des images, ou supprime un vieux quiz après l\'avoir enregistré dans un fichier (menu ⋯), puis réessaie.', ok: 'Compris', cancel: false, danger: false, pose: 'desole' });
  return false;
};
const currentQuiz = () => library.find((q) => q.id === selectedId) || null;

// ----- Paramètres -----
function readSettings() {
  const s = {};
  document.querySelectorAll('[data-key]').forEach((input) => {
    const k = input.dataset.key;
    if (input.type === 'checkbox') s[k] = input.checked;
    else s[k] = input.value !== '' && !isNaN(input.value) ? Number(input.value) : input.value;
  });
  s.theme = 'wequizzer';
  s.reactions = false; // masqué pour l'instant
  s.sounds = true; // le son est un réglage personnel (bouton 🔊), plus un réglage de partie
  s.teamNames = [0, 1, 2, 3].map((i) => (teamNameInputs[i] ? teamNameInputs[i].value : ''));
  return s;
}
const teamNameInputs = [];
const TEAM_DEF = ['Rouge', 'Bleu', 'Vert', 'Jaune'];
function buildTeamNames() {
  const box = $('teamNames');
  for (let i = 0; i < 4; i++) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.maxLength = 14;
    inp.placeholder = TEAM_DEF[i];
    inp.setAttribute('aria-label', 'Nom de l\'équipe ' + (i + 1));
    inp.style.cssText = 'flex:1 1 90px;min-width:80px';
    inp.addEventListener('change', () => { pushSettings(); renderTeamAssign(); });
    teamNameInputs.push(inp);
    box.appendChild(inp);
  }
}
buildTeamNames();
function renderTeamAssign() {
  const box = $('teamAssignBox');
  if (!box) return;
  const cur = readSettings();
  const n = cur.teamCount;
  box.innerHTML = '';
  (lastPlayers || []).filter((p) => !p.queued).forEach((p) => {
    const r = el('div', 'prow');
    r.appendChild(el('span', 'av', p.avatar));
    r.appendChild(el('span', 'nm', p.name));
    const sel = document.createElement('select');
    sel.style.marginLeft = 'auto';
    sel.setAttribute('aria-label', 'Équipe de ' + p.name);
    sel.appendChild(new Option('— au hasard —', ''));
    for (let t = 0; t < n; t++) sel.appendChild(new Option(teamNameInputs[t].value.trim() || TEAM_DEF[t], String(t)));
    sel.value = Number.isInteger(p.team) && p.team < n ? String(p.team) : '';
    sel.onchange = () => socket.emit('host:team', { pid: p.pid, team: sel.value === '' ? null : Number(sel.value) });
    r.appendChild(sel);
    box.appendChild(r);
  });
  if (!box.children.length) box.appendChild(el('span', 'empty', 'Les joueurs apparaîtront ici.'));
}
let wantCount = 0;
function applySettings(s) {
  if (s && 'count' in s) wantCount = Number(s.count) || 0;
  if (s && Array.isArray(s.teamNames)) s.teamNames.forEach((v, i) => { if (teamNameInputs[i]) teamNameInputs[i].value = v || ''; });
  document.querySelectorAll('[data-key]').forEach((input) => {
    const k = input.dataset.key;
    if (!(k in s)) return;
    if (input.type === 'checkbox') input.checked = !!s[k];
    else input.value = s[k];
  });
  applyScoring();
  const cur = readSettings();
  cur.teamish = cur.mode === 'teams' || cur.mode === 'hangman';
  cur.teamManual = cur.teamish && cur.teamAssign === 'manual';
  teamNameInputs.forEach((inp, i) => inp.classList.toggle('hidden', i >= cur.teamCount));
  $('teamNote').textContent = cur.mode === 'hangman' ? 'Pendu : chaque mauvaise réponse ajoute une partie au pendu de l\'équipe. 6 erreurs : pendu complet, l\'équipe est éliminée' : 'Le score d\'une équipe est la moyenne de ses joueurs';
  renderTeamAssign();
  document.querySelectorAll('[data-if]').forEach((row) => {
    const [k, v] = row.dataset.if.split(':');
    const ok = v === undefined ? !!cur[k] : String(cur[k]) === v;
    row.classList.toggle('hidden', !ok);
  });
  labelMode = cur.labels || 'letters';
  if (typeof applyKind === 'function' && typeof library !== 'undefined') applyKind();
}
function pushSettings() {
  const s = readSettings();
  LS.set('wequizzer.settings', s);
  socket.emit('host:settings', s);
}
document.querySelectorAll('[data-key]').forEach((input) => {
  const evt = input.type === 'range' ? 'input' : 'change';
  input.addEventListener(evt, () => {
    if (input.dataset.key === 'limitTime' && input.checked) document.querySelector('[data-key="speedBonus"]').checked = true;
    if (input.dataset.key === 'count') wantCount = Number(input.value) || 0;
    const now = readSettings();
    applySettings(now);
    pushSettings();
  });
  if (input.type === 'range') input.addEventListener('change', () => FX.click());
  else input.addEventListener('change', () => FX.click());
});
socket.on('host:settings', applySettings);
