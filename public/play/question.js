// Compte à rebours, question et mini-jeux (roue, jeu de mots, ordre, relier)
// ----- Compte à rebours, lecture -----
// Le compte à rebours s'arrête pendant une pause (voir « paused ») et reprend au même chiffre
let cdTimer = null;
let cdLeft = -1;
function cdTick() {
  $('cdNum').textContent = cdLeft;
  $('cdNum').style.animation = 'none';
  void $('cdNum').offsetWidth;
  $('cdNum').style.animation = '';
  FX.count();
  cdLeft--;
  if (cdLeft >= 0) cdTimer = setTimeout(cdTick, 1000);
}
socket.on('countdown', ({ seconds, index, total }) => {
  $('cdLabel').textContent = 'Question ' + (index + 1) + ' sur ' + total;
  show('countdown');
  clearTimeout(cdTimer);
  cdLeft = seconds;
  cdTick();
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
      mt.left = q.matchLeft.slice();
      mt.choices = q.choices.slice();
      mt.links = q.matchLeft.map(() => null);
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
