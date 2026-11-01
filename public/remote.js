// Télécommande de l'animateur (sur son téléphone) : 3 onglets (Question, Joueurs, Réponses) et les boutons
// pour piloter la partie. Elle ne marche qu'une fois acceptée sur l'écran de l'animateur.
const $ = (id) => document.getElementById(id);
const make = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const params = new URLSearchParams(location.search);
const socket = io({ autoConnect: false });

let state = 'lobby'; // lobby | prestart | countdown | reading | question | results | end
let players = [];
let progress = null; // { answered, total, pending }
let rq = null; // question en cours (avec la bonne réponse)
let paused = false;
let accepted = false;

// ----- Avant l'accord -----
function waitText(t, spin) {
  $('rcWaitText').textContent = t;
  $('rcSpin').classList.toggle('hidden', !spin);
  $('rcWait').classList.remove('hidden');
  $('rcMain').classList.add('hidden');
}
socket.on('connect', () => {
  if (!params.get('pin') || !params.get('t')) { waitText("Ce lien est incomplet. Scanne le QR code « Télécommande » sur l'écran de l'animateur.", false); return; }
  if (!accepted) socket.emit('remote:join', { pin: params.get('pin'), t: params.get('t') });
});
socket.on('remote:error', (m) => waitText(m, false));
socket.on('remote:waiting', () => waitText("Accepte la télécommande sur l'écran de l'animateur.", true));
socket.on('remote:refused', () => waitText("L'animateur a refusé la télécommande.", false));
socket.on('remote:replaced', () => { accepted = false; waitText("Cette télécommande n'est plus active (une autre a été acceptée, ou l'animateur l'a déconnectée).", false); });
socket.on('host:left', () => { accepted = false; waitText('La salle a été fermée.', false); });
socket.on('disconnect', () => { if (accepted) $('rcStatus').textContent = '⚠️ Connexion perdue… (recharge la page si ça dure)'; });
socket.on('remote:ok', () => {
  accepted = true;
  $('rcWait').classList.add('hidden');
  $('rcMain').classList.remove('hidden');
  render();
});

// ----- Onglets -----
document.querySelectorAll('.rc-tab').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.rc-tab').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.rc-pane').forEach((p) => p.classList.toggle('hidden', p.id !== b.dataset.tab));
  };
});

// ----- Ce que reçoit l'animateur -----
socket.on('lobby', () => { state = 'lobby'; paused = false; rq = null; progress = null; resetAnswers(); render(); });
socket.on('host:players', (list) => { players = list || []; render(); });
socket.on('prestart', () => { state = 'prestart'; render(); });
socket.on('prestart:cancel', () => { state = 'lobby'; render(); });
socket.on('countdown', () => { state = 'countdown'; render(); });
socket.on('reading', () => { state = 'reading'; render(); });
socket.on('question', () => { state = 'question'; paused = false; resetAnswers(); render(); });
socket.on('remote:question', (q) => { rq = q; render(); });
socket.on('progress', (p) => { progress = p; render(); });
socket.on('remote:live', (l) => drawAnswers(l.counts, l.texts, l.answered + ' / ' + l.total + ' ont répondu'));
socket.on('results', (r) => {
  state = 'results';
  drawAnswers(r.counts && !(r.type === 'text' || r.type === 'words' || r.match || r.order || r.type === 'zone') ? r.counts : null, r.texts, r.okCount + ' / ' + r.partCount + ' ont bien répondu');
  render();
});
socket.on('end', () => { state = 'end'; paused = false; render(); });
socket.on('paused', (d) => { paused = !!(d && d.paused); render(); });
socket.on('time:more', () => render());

// ----- Affichage -----
const LETTERS = 'ABCDEFGH';
const label = (i) => (rq && rq.labels === 'numbers' ? String(i + 1) : LETTERS[i]);
function resetAnswers() { $('rcAnswersHead').textContent = 'Pas encore de réponses.'; $('rcAnswersList').innerHTML = ''; }
function drawAnswers(counts, texts, head) {
  $('rcAnswersHead').textContent = head;
  const box = $('rcAnswersList');
  box.innerHTML = '';
  if (counts && rq && rq.choices) {
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    rq.choices.forEach((c, i) => {
      const row = make('div', 'rc-bar');
      const good = rq.answer && rq.answer.split(' + ').some((a) => a.startsWith(label(i) + ' – '));
      row.appendChild(make('span', 'rc-bar-lab', label(i) + ' – ' + c + (good ? ' ✅' : '')));
      const bar = make('div', 'sbar');
      const fill = make('div', 'sfill');
      fill.style.width = Math.round((100 * (counts[i] || 0)) / total) + '%';
      fill.style.background = good ? '#2fbf71' : '#5b8def';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(make('span', 'rc-bar-n', String(counts[i] || 0)));
      box.appendChild(row);
    });
  } else if (texts && texts.length) {
    texts.forEach((t) => box.appendChild(make('div', 'rc-line', t.text + (t.count > 1 ? ' × ' + t.count : ''))));
  }
}
const STATUS = {
  lobby: "Salle d'attente", prestart: 'La partie démarre…', countdown: 'Question suivante dans un instant…',
  reading: 'Lecture de la question', question: 'Question en cours', results: 'Résultat de la question', end: 'Partie terminée',
};
function btn(text, icon, fn, cls) {
  const b = make('button', 'btn big ' + (cls || ''));
  b.type = 'button';
  b.innerHTML = '<i class="ti ' + icon + '"></i> ';
  b.appendChild(document.createTextNode(text));
  b.onclick = fn;
  return b;
}
function render() {
  if (!accepted) return;
  const inRoom = players.filter((p) => !p.queued);
  const num = rq ? ' · ' + (rq.index + 1) + ' / ' + rq.total : '';
  $('rcStatus').textContent = (paused ? '⏸️ En pause · ' : '') + STATUS[state] + (['question', 'results', 'reading', 'countdown'].includes(state) ? num : '');
  // Question
  const showQ = rq && ['question', 'results', 'reading'].includes(state);
  $('rcQText').textContent = showQ ? rq.text : state === 'end' ? 'Le podium est affiché.' : 'Pas encore de question.';
  $('rcGood').classList.toggle('hidden', !(showQ && rq.answer));
  if (showQ && rq.answer) $('rcGood').textContent = '✅ Bonne réponse : ' + rq.answer;
  $('rcExplain').classList.toggle('hidden', !(showQ && rq.explain));
  if (showQ && rq.explain) $('rcExplain').textContent = '💡 ' + rq.explain;
  const bx = $('rcBtns');
  bx.innerHTML = '';
  if (state === 'lobby') bx.appendChild(btn('Lancer le quiz', 'ti-player-play', startQuiz, 'green'));
  if (state === 'prestart') bx.appendChild(btn('Annuler', 'ti-x', () => socket.emit('host:cancelStart')));
  if (state === 'question') {
    bx.appendChild(btn('Voir le résultat', 'ti-player-skip-forward', () => socket.emit('host:skip'), 'green'));
    bx.appendChild(btn('+ 10 s', 'ti-plus', () => socket.emit('host:moreTime')));
  }
  if (state === 'results') bx.appendChild(btn('Question suivante', 'ti-arrow-right', () => socket.emit('host:next'), 'green'));
  if (['countdown', 'reading', 'question', 'results'].includes(state)) {
    bx.appendChild(btn(paused ? 'Reprendre' : 'Pause', paused ? 'ti-player-play' : 'ti-player-pause', () => socket.emit('host:pause', !paused)));
    bx.appendChild(btn('Terminer', 'ti-flag-3', finish, 'danger'));
  }
  // Joueurs
  const list = $('rcPlayersList');
  list.innerHTML = '';
  if (state === 'question' && progress) {
    $('rcCount').textContent = progress.answered + '/' + progress.total;
    $('rcPlayersHead').textContent = progress.answered + ' / ' + progress.total + ' ont répondu';
    const waiting = new Set(progress.pending.map((p) => p.pid));
    inRoom.filter((p) => !p.eliminated).forEach((p) => list.appendChild(make('div', 'rc-line', (waiting.has(p.pid) ? '⏳ ' : '✅ ') + p.avatar + ' ' + p.name + (waiting.has(p.pid) ? ' — pas encore répondu' : ''))));
  } else {
    const ready = inRoom.filter((p) => p.ready).length;
    $('rcCount').textContent = String(inRoom.length);
    $('rcPlayersHead').textContent = state === 'lobby' || state === 'prestart' ? inRoom.length + ' joueur' + (inRoom.length > 1 ? 's' : '') + ' · ' + ready + ' prêt' + (ready > 1 ? 's' : '') : inRoom.length + ' joueur' + (inRoom.length > 1 ? 's' : '');
    inRoom.forEach((p) => list.appendChild(make('div', 'rc-line', ((state === 'lobby' || state === 'prestart') ? (p.ready ? '✅ ' : '⏳ ') : '') + p.avatar + ' ' + p.name + (p.connected ? '' : ' (hors ligne)'))));
  }
  if (!inRoom.length) list.appendChild(make('div', 'hint', "Personne dans la salle pour l'instant."));
}
async function startQuiz() {
  const late = players.filter((p) => !p.queued && !p.ready);
  if (late.length) {
    const ok = await UI.confirm({ title: late.length + (late.length > 1 ? ' joueurs ne sont pas prêts' : " joueur n'est pas prêt"), text: late.slice(0, 8).map((p) => p.name).join(', '), ok: 'Lancer', cancel: 'Fermer', danger: false, pose: 'question' });
    if (!ok) return;
  }
  socket.emit('host:start');
}
async function finish() {
  const ok = await UI.confirm({ title: 'Terminer la partie maintenant ?', text: "Les questions restantes ne seront pas posées. Le podium s'affiche avec les scores actuels.", ok: 'Voir le podium', cancel: 'Continuer', pose: 'question' });
  if (ok) socket.emit('host:finish');
}
socket.connect();
