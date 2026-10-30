// Déroulement de la partie : joueurs, questions, résultats, fin
// ----- Joueurs -----
function updateStart() {
  $('startBtn').disabled = !(quizReady && playerCount > 0);
  $('startHint').textContent = !quizReady ? 'Choisis ou crée un quiz.' : playerCount === 0 ? 'Attends au moins un joueur.' : '';
}
let kickTarget = null;
function openKick(p) { kickTarget = p; $('kickName').textContent = p.name; $('kickDlg').classList.remove('hidden'); }
function kick(p) {
  openKick(p);
}
socket.on('host:players', (list) => {
  lastPlayers = list;
  renderTeamAssign();
  const box = $('players');
  box.innerHTML = '';
  const inRoom = list.filter((p) => !p.queued);
  if (list.length === 0) box.appendChild(el('span', 'empty', 'En attente des joueurs…'));
  list.forEach((p) => {
    const chip = el('span', 'chip' + (p.connected ? '' : ' faded'));
    chip.title = 'Exclure ' + p.name;
    chip.appendChild(el('span', 'av', p.avatar));
    chip.appendChild(document.createTextNode(p.name));
    if (!p.connected) chip.appendChild(el('small', '', 'hors ligne'));
    if (p.queued) chip.appendChild(el('small', '', 'prochaine partie'));
    chip.onclick = () => kick(p);
    box.appendChild(chip);
  });
  playerCount = inRoom.length;
  $('count').textContent = list.length + (list.length > 1 ? ' joueurs' : ' joueur');
  $('barCount').textContent = String(list.length);
  updateStart();
  renderDrawer();
});
function renderDrawer() {
  const box = $('drawerList');
  box.innerHTML = '';
  lastPlayers.forEach((p) => {
    const row = el('div', 'prow');
    row.appendChild(el('span', 'dot' + (p.connected ? '' : ' off')));
    row.appendChild(el('span', 'av', p.avatar));
    const nm = el('span', 'nm', p.name);
    row.appendChild(nm);
    const tags = [];
    if (!p.connected) tags.push('hors ligne');
    if (p.queued) tags.push('en attente');
    if (p.eliminated) tags.push('éliminé');
    if (tags.length) row.appendChild(el('small', '', tags.join(' · ')));
    const b = miniBtn('ti-user-x', () => kick(p), 'Exclure ' + p.name);
    row.appendChild(b);
    box.appendChild(row);
  });
  if (!lastPlayers.length) box.appendChild(el('span', 'empty', 'Aucun joueur'));
}
document.querySelectorAll('[data-kick]').forEach((b) => {
  b.onclick = () => { if (kickTarget) socket.emit('host:kick', { pid: kickTarget.pid, minutes: Number(b.dataset.kick) }); kickTarget = null; $('kickDlg').classList.add('hidden'); };
});
$('kickCancel').onclick = () => { kickTarget = null; $('kickDlg').classList.add('hidden'); };
$('playersBtn').onclick = () => { renderDrawer(); $('drawer').classList.toggle('hidden'); };
$('drawerClose').onclick = () => $('drawer').classList.add('hidden');

$('startBtn').onclick = () => { FX.unlock(); FX.go(); socket.emit('host:start'); };
$('skipBtn').onclick = () => socket.emit('host:skip');
$('quitBtn').onclick = async () => {
  const ok = await UI.confirm({ title: 'Quitter le quiz en cours ?', text: "Les scores seront effacés. Les joueurs restent connectés et reviennent dans la salle d'attente.", ok: 'Quitter le quiz', cancel: 'Continuer', pose: 'question' });
  if (!ok) return;
  replayPending = false;
  socket.emit('host:reset');
};
$('pauseBtn').onclick = () => socket.emit('host:pause', !isPaused);
$('resumeBtn').onclick = () => socket.emit('host:pause', false);
$('nextBtn').onclick = () => { FX.click(); socket.emit('host:next'); };
$('replayBtn').onclick = () => { replayPending = true; socket.emit('host:reset'); };
$('replayMissedBtn').onclick = () => { replayPending = true; socket.emit('host:replayMissed'); };
// Le nouveau quiz des questions ratées est gardé dans la bibliothèque
socket.on('host:replayQuiz', (q) => {
  const entry = q.kind === 'wheel'
    ? { id: uid(), kind: 'wheel', title: q.title, category: q.category, pairs: q.pairs, questions: [] }
    : q.kind === 'letters'
    ? { id: uid(), kind: 'letters', title: q.title, items: q.items, questions: [] }
    : { id: uid(), title: q.title, questions: q.questions.map(normQ) };
  library.push(entry);
  selectedId = entry.id;
  saveLibrary();
  renderQuizSelect();
});
$('otherBtn').onclick = () => { replayPending = false; socket.emit('host:reset'); };
socket.on('lobby', () => {
  setTab('jouer');
  clearInterval(timerInt);
  clearInterval(autoInt);
  clearInterval(readInt);
  isPaused = false;
  $('pauseOv').classList.add('hidden');
  $('drawer').classList.add('hidden');
  if (pv) return; // un test est en cours : on ne le coupe pas
  show('lobby');
  if (replayPending) { replayPending = false; socket.emit('host:start'); }
});

// ----- Pause -----
socket.on('paused', ({ paused, reason, left }) => {
  isPaused = paused;
  $('pauseOv').classList.toggle('hidden', !paused);
  $('pauseBtn').innerHTML = paused ? '<i class="ti ti-player-play"></i> <span class="lbl">Reprendre</span>' : '<i class="ti ti-player-pause"></i> <span class="lbl">Pause</span>';
  // Le Professeur dit pourquoi la partie est en pause (une phrase par pause, pas à chaque rappel du serveur)
  const why = reason === 'hostLost' ? 'animPauseCoupure' : 'animPause';
  if (!paused) $('pauseMsg').dataset.key = '';
  else if ($('pauseMsg').dataset.key !== why) {
    Brand.speak($('pauseMsg'), null, why, reason === 'hostLost' ? 'reparation' : 'reflexion');
    $('pauseMsg').dataset.key = why;
  }
  if (paused) {
    clearInterval(timerInt);
    clearInterval(autoInt);
    clearTimeout(cdTimer);
  } else {
    if (currentQ && currentQ.time && left !== null && left !== undefined && !$('question').classList.contains('hidden')) startTimer(currentQ.time, left);
    if (autoLeft !== null && !$('results').classList.contains('hidden')) startAuto(autoLeft);
    if (cdLeft >= 0 && !$('countdown').classList.contains('hidden')) cdTimer = setTimeout(cdTick, 1000);
  }
});

// ----- Compte à rebours (s'arrête pendant une pause et reprend au même chiffre) -----
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
// Le même écran qui revient pour la même question (retour après une coupure) garde la phrase du Professeur
const hostAgain = (() => { const last = {}; return (screen, sig) => { const again = !$(screen).classList.contains('hidden') && last[screen] === sig; last[screen] = sig; return again; }; })();
socket.on('countdown', ({ seconds, index, total }) => {
  clearInterval(autoInt);
  clearInterval(readInt);
  $('cdLabel').textContent = 'Question ' + (index + 1) + ' sur ' + total;
  if (!hostAgain('countdown', 'q' + index)) Brand.speak($('sayHostCount'), $('hostCdMascot'), 'animCompte', 'chrono');
  show('countdown');
  clearTimeout(cdTimer);
  cdLeft = seconds;
  cdTick();
});

// ----- Lecture -----
socket.on('reading', (q) => {
  $('rdInfo').textContent = 'Question ' + (q.index + 1) + ' / ' + q.total;
  $('rdBonus').classList.toggle('hidden', !q.double);
  $('rdText').textContent = q.text;
  if (q.image) { $('rdImg').src = q.image; $('rdImg').classList.remove('hidden'); } else $('rdImg').classList.add('hidden');
  if (!hostAgain('reading', 'q' + q.index)) Brand.speak($('sayHostRead'), null, 'animLecture', 'reflexion');
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
function renderChoices(box, q, opts) {
  box.innerHTML = '';
  if (q.type === 'text') {
    const d = el('div', 'textbox');
    d.appendChild(el('i', 'ti ti-pencil'));
    d.appendChild(document.createTextNode(' Les joueurs écrivent leur réponse sur leur téléphone'));
    box.appendChild(d);
    return;
  }
  const correctSet = q.type === 'multi' ? q.correct : q.type === 'single' || q.type === 'tf' ? [q.correct] : [];
  q.choices.forEach((c, i) => {
    const d = el('div', 'choice c' + (q.type === 'tf' ? (i === 0 ? 1 : 0) : i % 4));
    d.appendChild(el('span', 'badge', lab(i)));
    d.appendChild(el('span', 'ct', c));
    if (opts && opts.counts) {
      const total = opts.counts.reduce((a, b) => a + b, 0) || 1;
      d.style.setProperty('--pct', Math.round((opts.counts[i] / total) * 100));
      d.appendChild(el('span', 'bar'));
      d.appendChild(el('span', 'n', String(opts.counts[i])));
      if (q.type !== 'poll') {
        if (correctSet.includes(i)) { d.classList.add('ok'); d.appendChild(el('i', 'ti ti-check')); }
        else d.classList.add('dim');
      }
    }
    box.appendChild(d);
  });
}

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

socket.on('question', (q) => {
  currentQ = q;
  labelMode = q.labels || 'letters';
  clearInterval(readInt);
  $('qInfo').textContent = 'Question ' + (q.index + 1) + ' / ' + q.total;
  $('qBonus').classList.toggle('hidden', !q.double);
  $('qText').textContent = q.wheel ? q.category + ' : ' + q.text : q.text;
  $('qMatch').classList.toggle('hidden', !q.match && !q.order);
  if (q.image) { $('qImg').src = q.image; $('qImg').classList.remove('hidden'); }
  else $('qImg').classList.add('hidden');
  const note = q.type === 'zone' ? 'Sur leur téléphone, les joueurs touchent le bon endroit sur l\'image.' + (q.changeAnswer ? ' Ils peuvent déplacer leur épingle jusqu\'à la fin.' : '') : q.order ? 'Sur leur téléphone, les joueurs touchent les éléments dans le bon ordre (tout est bon ou rien).' : q.match ? 'Sur leur téléphone, les joueurs relient chaque élément à sa réponse (tout est bon ou rien).' : q.letters ? 'Les joueurs reconstituent le mot de ' + q.slots.filter((x) => x === '').length + ' lettres avec les lettres mélangées.' : q.wheel ? 'Sur leur téléphone, les joueurs choisissent parmi les ' + q.choices.length + ' réponses de la roue, puis appuient sur « Répondre ».' : q.type === 'multi' ? 'Plusieurs bonnes réponses : il faut toutes les trouver.' : q.type === 'poll' ? 'Sondage : pas de bonne réponse.' : q.changeAnswer ? 'Les joueurs peuvent changer leur réponse jusqu\'à la fin.' : '';
  $('qNote').textContent = note;
  $('qNote').classList.toggle('hidden', !note);
  $('answered').textContent = '0 / 0';
  $('pendingBox').classList.add('hidden');
  if (q.order) {
    $('choices').innerHTML = '';
    const box = $('qMatch');
    box.innerHTML = '';
    const c = el('div', 'mcol');
    q.choices.forEach((t) => c.appendChild(el('div', 'mitem alt', t)));
    box.appendChild(c);
  } else if (q.match) {
    $('choices').innerHTML = '';
    const box = $('qMatch');
    box.innerHTML = '';
    const l = el('div', 'mcol'), r = el('div', 'mcol');
    q.matchLeft.forEach((t) => l.appendChild(el('div', 'mitem', t)));
    q.choices.forEach((t) => r.appendChild(el('div', 'mitem alt', t)));
    box.appendChild(l); box.appendChild(el('div', 'marrow', '⇄')); box.appendChild(r);
  } else if (q.wheel || q.letters) $('choices').innerHTML = '';
  else renderChoices($('choices'), q);
  if (q.letters) {
    const row = el('div', 'lt-row');
    q.slots.forEach((c) => row.appendChild(el('span', c ? 'lt-fixed' : 'lt-slot', c || '')));
    $('choices').appendChild(row);
  }
  show('question');
  FX.go();
  clearInterval(timerInt);
  const unlimited = !q.time;
  $('timer').classList.toggle('hidden', unlimited);
  if (unlimited) {
    $('timePill').innerHTML = '<i class="ti ti-infinity"></i> Sans limite';
    return;
  }
  startTimer(q.time, q.left === null || q.left === undefined ? q.time : q.left);
});

socket.on('progress', ({ answered, total, pending }) => {
  $('answered').textContent = answered + ' / ' + total;
  const box = $('pendingList');
  box.innerHTML = '';
  pending.forEach((p) => {
    const chip = el('span', 'chip static small' + (p.offline ? ' faded' : ''));
    chip.appendChild(el('span', 'av', p.avatar));
    chip.appendChild(document.createTextNode(p.name));
    if (p.offline) chip.appendChild(el('small', '', 'hors ligne'));
    box.appendChild(chip);
  });
  $('pendingBox').classList.toggle('hidden', pending.length === 0);
});

// ----- Résultats -----
function renderStatus(r) {
  const good = $('goodList');
  const bad = $('badList');
  good.innerHTML = '';
  bad.innerHTML = '';
  const poll = r.type === 'poll';
  $('badCol').classList.toggle('hidden', poll);
  $('colsBox').classList.toggle('one', poll);
  $('goodHead').innerHTML = poll ? '<i class="ti ti-chart-bar"></i> Ont voté' : '<i class="ti ti-circle-check"></i> Bonne réponse';
  $('goodHead').className = poll ? '' : 'good';
  r.players.forEach((p) => {
    const chip = el('span', 'chip static' + (p.status === 'none' ? ' faded' : ''));
    chip.appendChild(el('span', 'av', p.avatar));
    chip.appendChild(document.createTextNode(p.name));
    if (p.shown !== null && p.shown !== undefined) {
      const first = (r.type === 'text' || r.wheel) ? -1 : (r.labels === 'numbers' ? Number(p.shown[0]) - 1 : LETTERS.indexOf(p.shown[0]));
      chip.appendChild(el('span', 'ansbadge' + (first >= 0 ? ' c' + (r.type === 'tf' ? (first === 0 ? 1 : 0) : first % 4) : ' txt'), p.shown));
    }
    if (p.status === 'none') chip.appendChild(el('small', '', 'pas de réponse'));
    if (p.out) chip.appendChild(el('small', '', '💀 éliminé'));
    else if (p.hearts !== null && p.hearts !== undefined) chip.appendChild(el('small', '', '❤️' + p.hearts));
    ((p.status === 'correct' || p.status === 'voted') ? good : bad).appendChild(chip);
  });
  const nOk = r.players.filter((p) => p.status === 'correct' || p.status === 'voted').length;
  Brand.setPose($('resMascot'), nOk * 2 >= r.players.length ? 'bravo' : 'desole');
  if (!good.children.length) good.appendChild(el('span', 'empty', 'Personne'));
  if (!bad.children.length) bad.appendChild(el('span', 'empty', 'Personne'));
}
function startAuto(n) {
  clearInterval(autoInt);
  autoLeft = n;
  $('nextLabel').textContent = autoBase + ' (' + n + ')';
  autoInt = setInterval(() => {
    autoLeft--;
    if (autoLeft >= 0) $('nextLabel').textContent = autoBase + ' (' + autoLeft + ')';
    else clearInterval(autoInt);
  }, 1000);
}

socket.on('results', (r) => {
  const again = hostAgain('results', 'q' + r.index);
  clearInterval(timerInt);
  clearInterval(autoInt);
  labelMode = r.labels || labelMode;
  const q = { type: r.type, choices: r.choices, correct: r.correct };
  $('rText').textContent = r.text || (currentQ ? currentQ.text : '');
  const ct = r.order ? 'Bon ordre : ' + r.correctText : r.match ? 'Bonnes liaisons : ' + r.correctText : r.type === 'text' ? 'Réponse(s) acceptée(s) : ' + r.correctText : r.correctText ? 'Bonne réponse : ' + r.correctText : 'Voici les votes';
  $('rCorrect').textContent = ct;
  // Le petit Professeur parle dans la carte (la mascotte du coin garde bravo / désolé) : l'explication s'il y en a une,
  // sinon une réaction selon la part de bonnes réponses ; rien si personne n'a participé
  if (r.explain) {
    Brand.say($('rExplain'), r.explain);
    $('rExplain').classList.remove('hidden');
  } else if (!r.partCount) {
    $('rExplain').classList.add('hidden');
  } else {
    const share = r.okCount / r.partCount;
    const [key, pose] = r.type === 'poll' ? ['animSondage', 'question'] : share >= 0.8 ? ['animTous', 'bravo'] : share >= 0.3 ? ['animMoitie', 'question'] : ['animPersonne', 'desole'];
    if (!again) Brand.speak($('rExplain'), null, key, pose);
  }
  $('rScore').classList.toggle('hidden', r.type === 'poll' || !r.partCount);
  $('rScore').innerHTML = '<i class="ti ti-circle-check"></i> ' + r.okCount + ' / ' + r.partCount + ' ont bien répondu';
  if (r.wheel || r.match || r.order) $('rChoices').innerHTML = '';
  else renderChoices($('rChoices'), q, r.type === 'text' ? null : { counts: r.counts });
  if (r.type === 'text' || r.type === 'match' || r.type === 'order' || r.type === 'zone') {
    const box = $('rChoices');
    box.innerHTML = '';
    if (r.type === 'zone' && r.image) {
      // image à toucher : la bonne zone et un point par joueur (vert dans la zone, rouge à côté), sans nom ;
      // l'image vient du résultat lui-même (après un rechargement de la page, on n'a plus la question)
      const v = zoneView(r.image, r.text);
      zoneDraw(v.layer, r.zone, r.points);
      box.appendChild(v.wrap);
    }
    const d = el('div', 'textbox');
    d.textContent = '✅ ' + r.counts[0] + ' bonne(s) réponse(s)   ·   ❌ ' + r.counts[1] + ' mauvaise(s)';
    box.appendChild(d);
  }
  const out = r.outNow && r.outNow.length;
  $('rOut').classList.toggle('hidden', !out && r.survivors === null);
  if (out || r.survivors !== null) {
    // au pendu, le serveur n'envoie pas de nombre de survivants (ce sont les équipes qui comptent)
    const left = r.survivors === null ? '' : 'Il reste ' + r.survivors + ' joueur' + (r.survivors > 1 ? 's' : '') + ' en jeu.';
    $('rOut').textContent = (out ? '💀 Éliminé(s) : ' + r.outNow.join(', ') + '.  ' : 'Personne n\'est éliminé.  ') + left;
  }
  const rh = $('rHang');
  rh.innerHTML = '';
  rh.classList.toggle('hidden', !r.hang);
  if (r.hang) r.hang.forEach((t) => {
    const c = el('div', 'hangcell' + (t.out ? ' out' : ''));
    c.style.setProperty('--tc', t.color);
    c.innerHTML = Hangman.svg(t.errors, t.color, 84);
    c.appendChild(el('b', '', t.icon + ' ' + t.name));
    c.appendChild(el('small', '', t.out ? 'Pendu complet !' : t.errors + ' / ' + r.hangMax + ' erreurs'));
    rh.appendChild(c);
  });
  $('answersCard').classList.toggle('hidden', !r.players);
  if (r.players) renderStatus(r);
  autoBase = r.last ? 'Voir le podium' : 'Question suivante';
  $('nextLabel').textContent = autoBase;
  autoLeft = null;
  show('results');
  if (r.autoIn && !isPaused) startAuto(r.autoIn);
  else if (r.autoIn) autoLeft = r.autoIn;
});

// ----- Réactions -----
socket.on('reaction', ({ emoji, name }) => {
  const d = el('div', 'react');
  d.style.left = 6 + Math.random() * 84 + '%';
  d.appendChild(document.createTextNode(emoji));
  d.appendChild(el('small', '', name));
  $('reactLayer').appendChild(d);
  setTimeout(() => d.remove(), 3400);
});

// ----- Fin -----
function scoreText(p, d) {
  if (d.scoreMode === 'points' || d.hasDouble) return p.score + ' pts';
  return p.score + ' / ' + d.questions;
}
const aliveText = (p) => (p.hearts ? '❤️'.repeat(p.hearts) : 'En jeu');
socket.on('end', (d) => {
  const again = hostAgain('end', JSON.stringify(d));
  recordStats(d);
  $('replayMissedBtn').classList.toggle('hidden', !(d.missedCount > 0));
  $('missedLabel').textContent = 'Rejouer les questions ratées (' + d.missedCount + ')';
  lastEnd = d;
  clearInterval(autoInt);
  clearInterval(timerInt);
  const board = d.board;
  const teamy = d.mode === 'teams' || d.mode === 'hangman';
  const elim = d.mode === 'elimination' || (d.heartsMode && !teamy);
  $('endHead').textContent = teamy ? 'Les équipes' : elim ? 'Les survivants' : 'Podium final';
  // équipes
  const tb = $('teamBoard');
  tb.innerHTML = '';
  tb.classList.toggle('hidden', !d.teams);
  if (d.teams) {
    d.teams.forEach((t, i) => {
      const row = el('div', 'trow' + (i === 0 ? ' win' : ''));
      row.style.setProperty('--tc', t.color);
      row.appendChild(el('span', 'rk', String(i + 1)));
      row.appendChild(el('span', 'ti-ic', t.icon));
      row.appendChild(el('span', 'nm', 'Équipe ' + t.name + ' (' + t.members + ')'));
      if (d.mode === 'hangman') {
        const hv = el('span', 'hangmini');
        hv.innerHTML = Hangman.svg(t.errors, t.color, 56);
        row.appendChild(hv);
        row.appendChild(el('span', '', t.out ? '💀 pendue (' + t.errors + ')' : '✅ en vie (' + t.errors + ' erreur' + (t.errors > 1 ? 's' : '') + ')'));
      } else row.appendChild(el('span', '', 'moyenne : ' + t.score + (d.scoreMode === 'points' || d.hasDouble ? ' pts' : '')));
      tb.appendChild(row);
    });
  }
  const pod = $('podium');
  pod.innerHTML = '';
  [1, 0, 2].forEach((idx) => {
    const p = board[idx];
    if (!p) return;
    const dd = el('div', 'pod p' + (idx + 1));
    if (idx === 0) dd.appendChild(el('i', 'ti ti-crown crown'));
    dd.appendChild(el('div', 'av', p.avatar));
    dd.appendChild(el('div', 'who', p.name));
    dd.appendChild(el('div', 'sc', elim ? (p.alive ? aliveText(p) : scoreText(p, d)) : scoreText(p, d)));
    dd.appendChild(el('div', 'blk', String(idx + 1)));
    pod.appendChild(dd);
  });
  const rest = $('rest');
  rest.innerHTML = '';
  board.slice(3).forEach((p, i) => {
    const li = el('li');
    li.style.animationDelay = i * 0.08 + 's';
    li.appendChild(el('span', 'rk', String(i + 4)));
    li.appendChild(el('span', 'av', p.avatar));
    li.appendChild(el('span', 'nm', p.name));
    li.appendChild(el('span', '', elim && p.alive ? aliveText(p) : scoreText(p, d)));
    rest.appendChild(li);
  });
  const tbox = $('titles');
  tbox.innerHTML = '';
  $('titlesBox').classList.toggle('hidden', !d.titles.length);
  d.titles.forEach((t) => {
    const c = el('div', 'title-card');
    c.appendChild(el('i', 'ti ' + t.icon));
    c.appendChild(el('b', '', t.title));
    c.appendChild(el('span', '', t.avatar + ' ' + t.name));
    tbox.appendChild(c);
  });
  $('drawer').classList.add('hidden');
  // Le Professeur salue le gagnant (l'équipe gagnante en mode équipes / pendu) ; pas de joueur : pas de bulle
  const winner = teamy && d.teams && d.teams[0] ? 'l\'équipe ' + d.teams[0].name : board[0] ? board[0].avatar + ' ' + board[0].name : '';
  if (!again) {
    // personne n'a eu une seule bonne réponse : le Professeur remercie tout le monde au lieu d'applaudir un « gagnant » à 0
    const zero = !teamy && d.questions > 0 && board[0] && board[0].correct === 0;
    if (winner && zero) Brand.speak($('sayHostEnd'), $('hostEndMascot'), 'animFinZero', 'desole');
    else if (winner) Brand.speak($('sayHostEnd'), $('hostEndMascot'), 'animPodium', 'bravo', { gagnant: winner });
    else { $('sayHostEnd').classList.add('hidden'); $('hostEndMascot').classList.remove('hidden'); }
  }
  show('end');
  setTimeout(() => { FX.fanfare(); FX.confetti(90); }, 1500);
});
$('shareBtn').onclick = () => {
  if (!lastEnd) return;
  const d = lastEnd;
  const top = d.board[0];
  const elim = d.mode === 'elimination' || (d.heartsMode && d.mode !== 'teams' && d.mode !== 'hangman');
  const rows = d.board.slice(0, 5).map((p, i) => ({ left: String(i + 1), mid: p.avatar + ' ' + p.name, right: elim && p.alive ? aliveText(p) : scoreText(p, d) }));
  const badges = d.titles.map((t) => (TITLE_EMOJI[t.title] || '🏅') + ' ' + t.title + ' : ' + t.name);
  let headline = top ? top.avatar + ' ' + top.name : 'Résultats';
  let sub = 'a gagné la partie !';
  if (d.teams && d.teams[0]) { headline = d.teams[0].icon + ' Équipe ' + d.teams[0].name; sub = 'remporte la partie !'; }
  Share.share({ quiz: d.quizTitle, emoji: '🏆', headline, sub, rows, badges }, 'wequizzer-resultats.png');
};
$('csvResultsBtn').onclick = () => {
  if (!lastEnd || !lastEnd.results) return;
  const now = new Date();
  const slug = String(lastEnd.quizTitle || 'quiz').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'quiz';
  download('resultats-' + slug + '-' + now.toISOString().slice(0, 10) + '.csv', resultsCsv(lastEnd, now.toLocaleDateString('fr-FR')), 'text/csv');
};

// Tous les fichiers de l'écran animateur sont chargés : on peut se connecter
socket.connect();
