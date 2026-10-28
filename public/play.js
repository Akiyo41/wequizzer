const socket = io();
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

function show(id) {
  curScreen = id;
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

// ----- Connexion / reconnexion -----
function join() {
  FX.unlock();
  $('joinError').textContent = '';
  LS.set('wequizzer.name', $('name').value.trim());
  socket.emit('player:join', { pin: $('pin').value, name: $('name').value, avatar: myAvatar, device: deviceId });
}
$('joinBtn').onclick = join;
$('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
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
  if (sess && sess.pin && sess.pid && sess.token) socket.emit('player:rejoin', sess);
});
socket.on('disconnect', connShow);
socket.on('rejoin:error', () => {
  LS.del(SESSION);
  resetToJoin("La partie n'existe plus ou tu en as été retiré. Entre un nouveau code.");
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
  $('waitMsg').textContent = "En attente du prochain quiz… Tu restes connecté !";
  applySettings(d);
  show('wait');
});
socket.on('queued', (d) => { applySettings(d); show('queued'); });
socket.on('kicked', (d) => {
  LS.del(SESSION);
  resetToJoin((d && d.message) || "L'animateur t'a retiré de la salle.");
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
});

$('leaveBtn').onclick = async () => {
  const ok = await UI.confirm({ title: 'Quitter la partie ?', text: 'Tu pourras la rejoindre à nouveau avec le code.', ok: 'Quitter', cancel: 'Rester', pose: 'desole' });
  if (!ok) return;
  socket.emit('player:leave');
  LS.del(SESSION);
  resetToJoin('');
};

// ----- Pause -----
socket.on('paused', ({ paused, reason, left }) => {
  $('pauseOv').classList.toggle('hidden', !paused);
  $('pauseMsg').textContent = reason === 'hostLost' ? "L'animateur a perdu la connexion. La partie reprendra bientôt." : "L'animateur a mis la partie en pause.";
  if (paused) clearInterval(timerInt);
  else if (curQ && curQ.time && left !== null && left !== undefined && curScreen === 'question') startTimer(curQ.time, left);
});

// ----- Compte à rebours, lecture -----
socket.on('countdown', ({ seconds, index, total }) => {
  $('cdLabel').textContent = 'Question ' + (index + 1) + ' sur ' + total;
  show('countdown');
  let n = seconds;
  const tick = () => {
    $('cdNum').textContent = n;
    $('cdNum').style.animation = 'none';
    void $('cdNum').offsetWidth;
    $('cdNum').style.animation = '';
    FX.count();
    n--;
    if (n >= 0) setTimeout(tick, 1000);
  };
  tick();
});
socket.on('reading', (q) => {
  $('rdInfo').textContent = (q.index + 1) + ' / ' + q.total;
  $('rdBonus').classList.toggle('hidden', !q.double);
  $('rdText').textContent = q.hidden ? "Regarde l'écran de l'animateur" : q.text;
  if (!q.hidden && q.image) { $('rdImg').src = q.image; $('rdImg').classList.remove('hidden'); } else $('rdImg').classList.add('hidden');
  show('reading');
  FX.go();
  clearInterval(readInt);
  const start = Date.now();
  const upd = () => {
    const left = Math.max(0, q.seconds - (Date.now() - start) / 1000);
    $('rdBar').style.width = (left / q.seconds) * 100 + '%';
    if (left <= 0) clearInterval(readInt);
  };
  upd();
  readInt = setInterval(upd, 100);
});

// ----- Question -----
function startTimer(total, left) {
  clearInterval(timerInt);
  $('timePill').innerHTML = '<i class="ti ti-clock"></i> <span id="timeLeft"></span> s';
  const start = Date.now();
  let last = null;
  const update = () => {
    const l = Math.max(0, left - (Date.now() - start) / 1000);
    $('bar').style.width = (l / total) * 100 + '%';
    const sec = Math.ceil(l);
    $('timeLeft').textContent = sec;
    $('timer').classList.toggle('low', l <= 5);
    if (sec !== last && sec <= 5 && sec > 0) FX.tick();
    last = sec;
    if (l <= 0) clearInterval(timerInt);
  };
  update();
  timerInt = setInterval(update, 250);
}
const lab = (q, i) => (q.labels === 'numbers' ? String(i + 1) : LETTERS[i]);

function paintSelection() {
  document.querySelectorAll('#choices button').forEach((b, i) => b.classList.toggle('sel', selected.includes(i)));
  $('multiSend').disabled = selected.length === 0;
}
function submitChoices() {
  FX.click();
  if (curQ.type === 'multi') socket.emit('player:answer', { indexes: selected });
  else socket.emit('player:answer', { index: selected[0] });
}

// ----- Roue (brouillon) -----
let wheelObj = null;
const getWheel = () => wheelObj || (wheelObj = createWheel($('wheelBox')));
function wheelTimer(total, left) {
  clearInterval(timerInt);
  $('wTimer').classList.remove('hidden');
  $('wTime').classList.remove('hidden');
  const start = Date.now();
  const update = () => {
    const l = Math.max(0, left - (Date.now() - start) / 1000);
    $('wBar').style.width = (l / total) * 100 + '%';
    $('wTime').innerHTML = '<i class="ti ti-clock"></i> ' + Math.floor(l / 60) + ':' + String(Math.floor(l % 60)).padStart(2, '0');
    $('wTimer').classList.toggle('low', l <= 5);
    if (l <= 0) clearInterval(timerInt);
  };
  update();
  timerInt = setInterval(update, 250);
}
function hearts(h, max) {
  const p = $('wHearts');
  p.classList.toggle('hidden', h === null || h === undefined);
  if (h !== null && h !== undefined) p.textContent = h > 0 ? '❤️'.repeat(h) + '🖤'.repeat(Math.max(0, max - h)) : '💀';
}
$('wGo').onclick = () => {
  const w = getWheel();
  FX.click();
  if (curQ && curQ.order) {
    if (ot.picked.length < ot.choices.length) return;
    socket.emit('player:answer', { order: ot.picked.slice() });
  } else if (curQ && curQ.match) {
    if (mt.links.some((v) => v === null)) return;
    socket.emit('player:answer', { links: mt.links.slice() });
  } else if (curQ && curQ.letters) {
    if (lt.slots.some((v, i) => lt.fixed[i] === '' && v === null)) return;
    socket.emit('player:answer', { text: lt.word() });
  } else socket.emit('player:answer', { index: w.index() });
};

// ----- Jeu de mots : on place les lettres mélangées dans les cases -----
const lt = { tiles: [], slots: [], fixed: [], word() { return this.slots.map((v, i) => (this.fixed[i] === '' ? this.tiles[v] : '')).join(''); } };
function paintLetters() {
  const sbox = $('ltSlots');
  const tbox = $('ltTiles');
  sbox.innerHTML = '';
  tbox.innerHTML = '';
  lt.slots.forEach((v, i) => {
    if (lt.fixed[i] !== '') { sbox.appendChild(el('span', 'lt-fixed', lt.fixed[i])); return; }
    const b = el('button', 'lt-slot' + (v === null ? '' : ' full'), v === null ? '' : lt.tiles[v]);
    b.type = 'button';
    b.onclick = () => { if (lt.slots[i] !== null) { FX.click(); lt.slots[i] = null; paintLetters(); } };
    sbox.appendChild(b);
  });
  const used = new Set(lt.slots.filter((v) => v !== null));
  lt.tiles.forEach((ch, i) => {
    const b = el('button', 'lt-tile' + (used.has(i) ? ' used' : ''), ch);
    b.type = 'button';
    b.disabled = used.has(i);
    b.onclick = () => {
      const k = lt.slots.findIndex((v, j) => lt.fixed[j] === '' && v === null);
      if (k === -1) return;
      FX.click();
      lt.slots[k] = i;
      paintLetters();
    };
    tbox.appendChild(b);
  });
  $('wGo').disabled = lt.slots.some((v, i) => lt.fixed[i] === '' && v === null);
}
function startLetters(q) {
  lt.tiles = q.tiles.slice();
  lt.fixed = q.slots.slice();
  lt.slots = q.slots.map(() => null);
  paintLetters();
}
// ----- Remettre dans l'ordre : on touche les éléments dans l'ordre voulu -----
const ot = { choices: [], picked: [] };
function paintOrder() {
  const sl = $('oSlots');
  const ch = $('oChoices');
  sl.innerHTML = '';
  ch.innerHTML = '';
  ot.choices.forEach((_, k) => {
    const r = el('div', 'mrow');
    r.appendChild(el('span', '', String(k + 1)));
    const v = ot.picked[k];
    const b = el('button', 'mslot' + (v === undefined ? '' : ' full'), v === undefined ? '?' : ot.choices[v]);
    b.type = 'button';
    b.onclick = () => { if (v !== undefined) { FX.click(); ot.picked.splice(k, 1); paintOrder(); } };
    r.appendChild(b);
    sl.appendChild(r);
  });
  ot.choices.forEach((t, j) => {
    const used = ot.picked.includes(j);
    const b = el('button', 'mchoice' + (used ? ' used' : ''), t);
    b.type = 'button';
    b.disabled = used;
    b.onclick = () => { FX.click(); ot.picked.push(j); paintOrder(); };
    ch.appendChild(b);
  });
  $('wGo').disabled = ot.picked.length < ot.choices.length;
}
$('oClear').onclick = () => { ot.picked = []; paintOrder(); };

// ----- Relier : on choisit un élément à gauche, puis sa réponse -----
const mt = { left: [], choices: [], links: [], sel: 0 };
function paintMatch() {
  const lk = $('mLinks');
  const ch = $('mChoices');
  lk.innerHTML = '';
  ch.innerHTML = '';
  mt.left.forEach((t, i) => {
    const r = el('div', 'mrow' + (mt.sel === i ? ' sel' : ''));
    r.appendChild(el('div', 'mitem', t));
    r.appendChild(el('span', '', '→'));
    const b = el('button', 'mslot' + (mt.links[i] === null ? '' : ' full'), mt.links[i] === null ? '?' : mt.choices[mt.links[i]]);
    b.type = 'button';
    b.onclick = () => { FX.click(); if (mt.links[i] !== null && mt.sel === i) mt.links[i] = null; mt.sel = i; paintMatch(); };
    r.appendChild(b);
    lk.appendChild(r);
  });
  const used = new Set(mt.links.filter((v) => v !== null));
  mt.choices.forEach((t, j) => {
    const b = el('button', 'mchoice' + (used.has(j) ? ' used' : ''), t);
    b.type = 'button';
    b.disabled = used.has(j);
    b.onclick = () => {
      FX.click();
      mt.links[mt.sel] = j;
      const nx = mt.links.findIndex((v) => v === null);
      mt.sel = nx === -1 ? mt.sel : nx;
      paintMatch();
    };
    ch.appendChild(b);
  });
  $('wGo').disabled = mt.links.some((v) => v === null);
}
$('mClear').onclick = () => { mt.links = mt.links.map(() => null); mt.sel = 0; paintMatch(); };
$('ltClear').onclick = () => { lt.slots = lt.slots.map(() => null); paintLetters(); };

socket.on('question', (q) => {
  curQ = q;
  clearInterval(readInt);
  if ((q.wheel || q.letters || q.match || q.order) && !q.eliminated && !(q.answered && !settings.changeAnswer)) {
    $('wheelBox').classList.toggle('hidden', !!q.letters || !!q.match || !!q.order);
    $('orderBox').classList.toggle('hidden', !q.order);
    $('matchBox').classList.toggle('hidden', !q.match);
    $('lettersBox').classList.toggle('hidden', !q.letters);
    $('wQ').classList.toggle('hidden', !q.letters && !q.match && !q.order && !q.wheel);
    if (q.order) {
      $('wQ').textContent = q.text;
      if (q.image) { $('wImg').src = q.image; $('wImg').classList.remove('hidden'); } else $('wImg').classList.add('hidden');
      ot.choices = q.choices.slice();
      ot.picked = [];
      paintOrder();
    } else if (q.match) {
      $('wQ').textContent = q.category;
      $('wImg').classList.add('hidden');
      mt.left = q.left.slice();
      mt.choices = q.choices.slice();
      mt.links = q.left.map(() => null);
      mt.sel = 0;
      paintMatch();
    } else if (q.letters) {
      $('wQ').textContent = q.text;
      if (q.image) { $('wImg').src = q.image; $('wImg').classList.remove('hidden'); } else $('wImg').classList.add('hidden');
      startLetters(q);
    } else { $('wImg').classList.add('hidden'); if (q.wheel) $('wQ').textContent = q.text; }
    $('wInfo').textContent = (q.index + 1) + ' / ' + q.total;
    hearts(q.hearts, q.maxHearts);
    $('wGo').innerHTML = q.letters || q.match || q.order ? '<i class="ti ti-check"></i> Valider' : '<i class="ti ti-check"></i> Répondre';
    $('wTimer').classList.toggle('hidden', !q.time);
    $('wTime').classList.add('hidden');
    if (q.order) {
      $('wMsg').textContent = 'Touche les éléments dans le bon ordre : du premier au dernier.';
    } else if (q.match) {
      $('wMsg').textContent = 'Touche un élément, puis sa réponse. Il faut tout relier, et tout doit être juste !';
    } else if (q.letters) {
      $('wMsg').textContent = 'Tape les lettres dans le bon ordre, puis valide.';
    } else {
      const w = getWheel();
      w.set({ category: q.category, questions: ['? La question'], answers: q.choices.map((c, i) => ({ id: i, text: c })) });
      w.enable(true);
      $('wGo').disabled = false;
      $('wMsg').textContent = 'Touche une réponse ou tourne la roue pour la mettre face à la question verte.';
    }
    show('wheel');
    FX.go();
    clearInterval(timerInt);
    if (q.time) wheelTimer(q.time, q.left === null || q.left === undefined ? q.time : q.left);
    return;
  }
  if (q.eliminated) {
    clearInterval(timerInt);
    show('spectate');
    return;
  }
  if (q.answered && !settings.changeAnswer) { clearInterval(timerInt); show('sent'); return; }
  $('qInfo').textContent = (q.index + 1) + ' / ' + q.total;
  $('qBonus').classList.toggle('hidden', !q.double);
  $('qHang').classList.toggle('hidden', q.hangErrors === null || q.hangErrors === undefined);
  if (q.hangErrors !== null && q.hangErrors !== undefined) $('qHang').textContent = '🪢 Pendu de ton équipe : ' + q.hangErrors + ' / ' + q.hangMax;
  $('qHearts').classList.toggle('hidden', q.hearts === null || q.hearts === undefined);
  if (q.hearts !== null && q.hearts !== undefined) $('qHearts').textContent = '❤️'.repeat(q.hearts) + '🖤'.repeat(Math.max(0, q.maxHearts - q.hearts));
  const hidden = !!q.hidden;
  $('qText').textContent = hidden ? "Regarde l'écran de l'animateur" : q.text;
  if (!hidden && q.image) { $('qImg').src = q.image; $('qImg').classList.remove('hidden'); } else $('qImg').classList.add('hidden');
  const hint = q.type === 'multi' ? 'Plusieurs bonnes réponses : sélectionne-les toutes, puis valide.' : q.type === 'poll' ? 'Sondage : pas de bonne réponse.' : '';
  $('qHint').textContent = hint;
  $('savedNote').classList.add('hidden');

  const box = $('choices');
  box.innerHTML = '';
  const isText = q.type === 'text';
  box.classList.toggle('hidden', isText);
  $('textAns').classList.toggle('hidden', !isText);
  $('multiSend').classList.toggle('hidden', q.type !== 'multi');
  selected = [];
  if (isText) {
    $('textInput').value = typeof q.mine === 'string' ? q.mine : '';
    $('textInput').disabled = false;
    $('textSend').disabled = false;
  } else {
    const choices = hidden ? Array.from({ length: q.count }, () => '') : q.choices;
    box.classList.toggle('compact', hidden);
    if (q.mine !== null && q.mine !== undefined) selected = Array.isArray(q.mine) ? q.mine.slice() : [q.mine];
    choices.forEach((c, i) => {
      const b = el('button', 'choice c' + (q.type === 'tf' ? (i === 0 ? 1 : 0) : i % 4));
      b.appendChild(el('span', 'badge', lab(q, i)));
      b.appendChild(el('span', 'ct', c));
      b.onclick = () => {
        FX.click();
        if (q.type === 'multi') {
          selected = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i];
          paintSelection();
        } else {
          selected = [i];
          paintSelection();
          submitChoices();
          if (!q.changeAnswer && !settings.changeAnswer) box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        }
      };
      box.appendChild(b);
    });
    paintSelection();
  }
  if (q.answered && settings.changeAnswer) $('savedNote').classList.remove('hidden');
  show('question');
  FX.go();
  clearInterval(timerInt);
  const unlimited = !q.time;
  $('timer').classList.toggle('hidden', unlimited);
  if (unlimited) $('timePill').innerHTML = '<i class="ti ti-infinity"></i> Sans limite';
  else startTimer(q.time, q.left === null || q.left === undefined ? q.time : q.left);
});
$('multiSend').onclick = submitChoices;
function sendText() {
  const t = $('textInput').value.trim();
  if (!t) return;
  FX.click();
  socket.emit('player:answer', { text: t });
}
$('textSend').onclick = sendText;
$('textInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendText(); });

socket.on('answer:ack', ({ changeable }) => {
  if (changeable) {
    $('savedNote').classList.remove('hidden');
    return;
  }
  clearInterval(timerInt);
  show('sent');
});

// ----- Résultat (jamais de points ni de rang pendant le quiz) -----
socket.on('result', (r) => {
  clearInterval(timerInt);
  const icon = $('resIcon');
  Brand.setPose($('resMascot'), r.correct ? 'bravo' : (r.type === 'poll' ? 'question' : 'desole'));
  const t = $('resTitle');
  const sub = $('resSub');
  sub.textContent = '';
  if (!r.wasActive) {
    show('spectate');
    return;
  }
  if (r.type === 'poll') {
    icon.textContent = r.answered ? '🗳️' : '⏱️';
    t.textContent = r.answered ? 'Merci pour ton vote !' : 'Pas de vote';
    t.className = 'big-num';
    t.style.fontSize = '2rem';
  } else if (r.correct) {
    icon.textContent = '🎉';
    t.textContent = 'Bravo !';
    t.className = 'big-num good';
    t.style.fontSize = '';
    sub.textContent = r.double ? '⚡ Question bonus réussie !' : 'Bonne réponse';
    FX.good();
  } else if (!r.answered) {
    icon.textContent = '⏱️';
    t.textContent = 'Pas de réponse';
    t.className = 'big-num bad';
    t.style.fontSize = '';
    FX.bad();
  } else {
    icon.textContent = '😅';
    t.textContent = 'Raté !';
    t.className = 'big-num bad';
    t.style.fontSize = '';
    sub.textContent = 'Mauvaise réponse';
    FX.bad();
  }
  if (r.lostHeart && !r.outNow) sub.textContent = '💔 Tu perds un cœur… il t\'en reste ' + r.hearts + ' !';
  if (r.outNow) {
    sub.textContent = '💀 Tu es éliminé… mais tu peux encore envoyer des réactions !';
    sub.style.fontSize = '1.2rem';
  } else sub.style.fontSize = '1.5rem';
  const hm = $('resHang');
  hm.classList.toggle('hidden', r.hangErrors === null || r.hangErrors === undefined);
  if (r.hangErrors !== null && r.hangErrors !== undefined) {
    hm.innerHTML = Hangman.svg(r.hangErrors, '#14213d', 110);
    hm.appendChild(el('span', '', r.hangErrors >= r.hangMax ? '💀 Le pendu de ton équipe est complet…' : 'Pendu de ton équipe : ' + r.hangErrors + ' / ' + r.hangMax));
  }
  $('resExplain').classList.toggle('hidden', !r.explain);
  $('resExplain').textContent = r.explain ? '💡 ' + r.explain : '';
  if (r.explain) Brand.setPose($('resMascot'), 'explication');
  const stats = $('resStats');
  stats.innerHTML = '';
  if (r.type !== 'poll' && r.myTotal) stats.appendChild(stat('Tes bonnes réponses', r.myCorrect + ' / ' + r.myTotal));
  if (r.streak >= 2) stats.appendChild(stat('Série', '🔥 ' + r.streak));
  $('resNext').textContent = r.last ? 'Les résultats arrivent…' : 'Prochaine question bientôt…';
  show('result');
});

// ----- Fin -----
function scoreLine(d) {
  if (d.scoreMode === 'points') return ['Score final', d.score];
  if (d.hasDouble) return ['Score', d.score];
  return ['Bonnes réponses', d.score + ' / ' + d.questions];
}
socket.on('end', (d) => {
  lastEnd = d;
  clearInterval(timerInt);
  const teamy = d.mode === 'teams' || d.mode === 'hangman';
  const elim = d.mode === 'elimination' || (d.heartsMode && !teamy);
  let medal;
  let head;
  if (teamy && d.teamRank) {
    medal = d.teamRank === 1 ? '🏆' : d.teamRank === 2 ? '🥈' : d.teamRank === 3 ? '🥉' : '🎮';
    head = d.teamRank === 1 ? 'Ton équipe a gagné !' : 'Ton équipe : ' + d.teamRank + 'e sur ' + d.teamCount;
  } else if (elim) {
    medal = d.alive ? '🏆' : '💀';
    head = d.alive ? 'Dernier survivant !' : d.rank + 'e sur ' + d.total;
  } else {
    medal = d.rank === 1 ? '🏆' : d.rank === 2 ? '🥈' : d.rank === 3 ? '🥉' : '🎮';
    head = d.rank === 1 ? 'Tu as gagné !' : d.rank + 'e sur ' + d.total;
  }
  $('endIcon').textContent = medal;
  $('endTitle').textContent = head;
  const stats = $('endStats');
  stats.innerHTML = '';
  const [l, v] = scoreLine(d);
  stats.appendChild(stat(l, v));
  stats.appendChild(stat('Rang', d.rank + ' / ' + d.total));
  if (d.teamName) stats.appendChild(stat('Équipe', d.teamIcon + ' ' + d.teamName));
  const badge = $('endBadge');
  badge.innerHTML = '';
  badge.classList.toggle('hidden', !d.title);
  if (d.title) {
    badge.appendChild(el('i', 'ti ' + d.title.icon));
    badge.appendChild(el('b', '', d.title.title));
  }
  const nm = d.mistakes ? d.mistakes.length : 0;
  $('reviewBtn').classList.toggle('hidden', !nm);
  $('reviewLabel').textContent = 'Revoir mes erreurs (' + nm + ')';
  $('noMistakes').classList.toggle('hidden', !(d.mistakes && nm === 0));
  show('end');
  if ((teamy ? d.teamRank : d.rank) <= 3) { FX.fanfare(); FX.confetti((teamy ? d.teamRank : d.rank) === 1 ? 100 : 50); }
});
$('reviewBtn').onclick = () => {
  const box = $('reviewList');
  box.innerHTML = '';
  ((lastEnd && lastEnd.mistakes) || []).forEach((m) => {
    const card = el('div', 'card');
    card.style.marginBottom = '12px';
    card.appendChild(el('div', 'qtext', m.text));
    const a = el('div', 'note bad', '❌ Ta réponse : ' + m.yours);
    const b = el('div', 'note ok', '✅ Bonne réponse : ' + m.correct);
    card.appendChild(a);
    card.appendChild(b);
    box.appendChild(card);
  });
  show('review');
};
$('reviewBack').onclick = () => show('end');
$('shareBtn').onclick = () => {
  const d = lastEnd;
  if (!d) return;
  const [l, v] = scoreLine(d);
  const badges = [];
  if (d.title) badges.push((TITLE_EMOJI[d.title.title] || '🏅') + ' ' + d.title.title);
  if (d.teamName) badges.push(d.teamIcon + ' Équipe ' + d.teamName);
  Share.share({
    quiz: d.quizTitle,
    emoji: d.avatar,
    headline: d.name,
    sub: d.rank + 'e sur ' + d.total,
    rows: [{ left: '★', mid: l, right: String(v) }, { left: '#', mid: 'Rang', right: d.rank + ' / ' + d.total }],
    badges,
  }, 'mon-resultat-wequizzer.png');
};
