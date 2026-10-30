// Connexion et reconnexion, mes réglages, pause
// ----- Connexion / reconnexion -----
function join() {
  FX.unlock();
  $('joinError').textContent = '';
  LS.set('wequizzer.name', $('name').value.trim());
  socket.emit('player:join', { pin: $('pin').value, name: $('name').value, avatar: myAvatar, device: deviceId });
}
$('joinBtn').onclick = join;
$('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
// Code PIN : seulement des chiffres (« 427 111 » collé devient 427111) ; Entrée passe au pseudo
$('pin').addEventListener('input', () => {
  const v = $('pin').value.replace(/\D/g, '').slice(0, 6);
  if (v !== $('pin').value) $('pin').value = v;
});
$('pin').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if ($('name').value.trim()) join(); else $('name').focus();
});
socket.on('join:error', (msg) => { $('joinError').textContent = msg; });

// Connexion perdue : le professeur répare le câble (affiché seulement si la coupure dure plus d'1,5 s)
let connTimer = null;
// On charge l'image du professeur « réparation » tant qu'on est en ligne : une fois coupé, il serait trop tard
let connImg = null;
setTimeout(() => { connImg = Brand.preload('reparation', 'md'); }, 1200);
function connShow() {
  clearTimeout(connTimer);
  connTimer = setTimeout(() => {
    if (!$('connMascot').firstChild) $('connMascot').appendChild(connImg || Brand.preload('reparation', 'md'));
    $('connBanner').classList.remove('hidden');
  }, 1500);
}
function connHide() { clearTimeout(connTimer); $('connBanner').classList.add('hidden'); }
socket.on('connect', () => {
  connHide();
  const sess = LS.get(SESSION, null);
  // Un lien ou un QR code avec un AUTRE code : on oublie l'ancienne partie pour rejoindre la nouvelle
  const urlPin = new URLSearchParams(location.search).get('pin');
  if (sess && urlPin && urlPin !== String(sess.pin)) { LS.del(SESSION); return; }
  if (sess && sess.pin && sess.pid && sess.token) socket.emit('player:rejoin', sess);
});
socket.on('disconnect', connShow);
socket.on('rejoin:error', () => {
  LS.del(SESSION);
  resetToJoin("La partie n'existe plus, ou ta place a été fermée. Entre un nouveau code.");
});
function resetToJoin(msg) {
  clearInterval(timerInt);
  clearInterval(readInt);
  $('pauseOv').classList.add('hidden');
  settings.reactions = false;
  $('joinError').textContent = msg || '';
  show('join');
}

socket.on('join:ok', (d) => {
  if (d.pid) LS.set(SESSION, { pin: d.pin, pid: d.pid, token: d.token });
  me = { name: d.name, avatar: d.avatar, teamName: d.teamName, teamIcon: d.teamIcon };
  $('myAvatar').textContent = d.avatar;
  $('hello').textContent = 'Salut ' + d.name + ' !';
  const tt = $('waitTeam');
  tt.classList.toggle('hidden', !d.teamName);
  if (d.teamName) tt.textContent = d.teamIcon + ' Équipe ' + d.teamName;
  applySettings(d);
});
socket.on('game:settings', applySettings);
socket.on('lobby', (d) => {
  clearInterval(timerInt);
  clearInterval(readInt);
  $('pauseOv').classList.add('hidden');
  $('waitTeam').classList.add('hidden');
  applySettings(d);
  show('wait');
});
socket.on('queued', (d) => { applySettings(d); show('queued'); });
// Salle d'attente : combien de joueurs sont là (moi compris)
socket.on('lobby:count', (n) => {
  $('waitCount').textContent = n > 1 ? '👥 Vous êtes ' + n + ' dans la salle' : '👥 Personne d\'autre pour l\'instant… ça arrive !';
  $('waitCount').classList.remove('hidden');
});
socket.on('kicked', (d) => {
  LS.del(SESSION);
  resetToJoin((d && d.message) || "L'animateur t'a fait quitter la salle.");
});
socket.on('host:left', () => {
  LS.del(SESSION);
  resetToJoin("L'animateur a fermé la partie.");
});

// ----- Mes réglages (pseudo, avatar, vibration, son) -----
const VIB_KEY = 'wequizzer.vibrate';
const vibOn = () => LS.get(VIB_KEY, false) === true;
const rawEmit = socket.emit.bind(socket);
socket.emit = (ev, ...args) => {
  if (ev === 'player:answer' && vibOn() && navigator.vibrate) { try { navigator.vibrate(35); } catch (e) { /* ignoré */ } }
  return rawEmit(ev, ...args);
};
let setAvatar = null;
const locked = () => ['countdown', 'reading', 'question'].includes(curScreen);
function drawSetAvatars() {
  const box = $('setAv');
  box.innerHTML = '';
  AVATARS.forEach((a) => {
    const b = el('button', a === setAvatar ? 'on' : '', a);
    b.type = 'button';
    b.disabled = locked();
    b.setAttribute('aria-label', 'Avatar ' + a);
    b.setAttribute('aria-pressed', a === setAvatar ? 'true' : 'false');
    b.onclick = () => { setAvatar = a; FX.click(); drawSetAvatars(); };
    box.appendChild(b);
  });
}
$('setBtn').onclick = () => {
  setAvatar = me.avatar;
  $('setName').value = me.name || '';
  $('setName').disabled = locked();
  $('setLock').classList.toggle('hidden', !locked());
  $('setVib').checked = vibOn();
  $('setErr').textContent = '';
  $('setSound').innerHTML = '';
  $('setSound').appendChild(UI.soundSlider());
  drawSetAvatars();
  $('setPanel').classList.remove('hidden');
};
$('setCancel').onclick = () => $('setPanel').classList.add('hidden');
$('setPanel').addEventListener('click', (e) => { if (e.target === $('setPanel')) $('setPanel').classList.add('hidden'); });
$('setVib').onchange = () => { LS.set(VIB_KEY, $('setVib').checked); if ($('setVib').checked && navigator.vibrate) navigator.vibrate(35); };
$('setSave').onclick = () => {
  $('setErr').textContent = '';
  if (locked()) { $('setPanel').classList.add('hidden'); return; }
  const name = $('setName').value.trim();
  if (name === me.name && setAvatar === me.avatar) { $('setPanel').classList.add('hidden'); return; }
  socket.emit('player:profile', { name, avatar: setAvatar });
};
socket.on('profile:error', (m) => { $('setErr').textContent = m; });
socket.on('profile:ok', (d) => {
  me.name = d.name; me.avatar = d.avatar;
  LS.set('wequizzer.name', d.name); LS.set('wequizzer.avatar', d.avatar);
  $('myAvatar').textContent = d.avatar;
  $('hello').textContent = 'Salut ' + d.name + ' !';
  $('setPanel').classList.add('hidden');
  // en salle d'attente, le Professeur reprend la parole avec le nouveau pseudo
  if (curScreen === 'wait') profSay('sayWait', 'waitMascot', 'attente', 'danse', { pseudo: d.name });
});

$('leaveBtn').onclick = async () => {
  const ok = await UI.confirm({ title: 'Quitter la partie ?', text: 'Tu pourras la rejoindre à nouveau avec le code.', ok: 'Quitter', cancel: 'Rester', pose: 'desole' });
  if (!ok) return;
  socket.emit('player:leave');
  LS.del(SESSION);
  resetToJoin('');
};

// ----- Pause -----
// L'animateur donne 10 secondes de plus
socket.on('time:more', ({ time, left }) => {
  if (!curQ || !curQ.time) return;
  curQ.time = time;
  if (curScreen === 'question') startTimer(time, left);
  else if (curScreen === 'wheel') wheelTimer(time, left);
  UI.announce('10 secondes de plus');
});
socket.on('paused', ({ paused, reason, left }) => {
  $('pauseOv').classList.toggle('hidden', !paused);
  // Le Professeur dit pourquoi la partie est en pause (une phrase par pause, pas à chaque rappel du serveur)
  const why = reason === 'hostLost' ? 'pauseCoupure' : 'pause';
  if (!paused) $('pauseMsg').dataset.key = '';
  else if ($('pauseMsg').dataset.key !== why) {
    Brand.speak($('pauseMsg'), null, why, reason === 'hostLost' ? 'reparation' : 'reflexion');
    $('pauseMsg').dataset.key = why;
  }
  if (paused) {
    clearInterval(timerInt);
    clearTimeout(cdTimer);
  } else {
    if (curQ && curQ.time && left !== null && left !== undefined) {
      if (curScreen === 'question') startTimer(curQ.time, left);
      else if (curScreen === 'wheel') wheelTimer(curQ.time, left); // roue, relier, jeu de mots, ordre
    }
    if (curScreen === 'countdown' && cdLeft >= 0) cdTimer = setTimeout(cdTick, 1000);
  }
});
