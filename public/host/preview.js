// Test du quiz sans joueurs
// ----- Test du quiz (aperçu, sans joueurs) -----
let pv = null;
function mixList(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Questions du test, comme dans une vraie partie : réponses et lettres mélangées
function previewQuestions(quiz) {
  if (quiz.kind === 'wheel') {
    // une question par paire : la bonne réponse + les fausses, complétées avec les réponses des autres paires
    return quiz.pairs.map((p, i) => {
      const wrongs = (p.w || []).slice(0, 3);
      const filler = mixList(quiz.pairs.filter((x, j) => j !== i).map((x) => x.a).filter((t) => !wrongs.includes(t)));
      while (wrongs.length < 3 && filler.length) wrongs.push(filler.shift());
      const choices = mixList([p.a, ...wrongs]);
      return { type: 'single', category: quiz.category, text: p.q, image: '', choices, correct: choices.indexOf(p.a) };
    });
  }
  if (quiz.kind === 'letters') {
    return quiz.items.map((it) => ({
      type: 'letters', text: it.q, image: it.image || '', word: it.word,
      tiles: mixList(Array.from(it.word).filter((c) => /[\p{L}\p{N}]/u.test(c)).map((c) => c.toLocaleUpperCase('fr'))),
    }));
  }
  return quiz.questions.map((q) => {
    if (!['single', 'multi', 'poll'].includes(q.type)) return q;
    const order = mixList(q.choices.map((_, i) => i));
    const out = { ...q, choices: order.map((i) => q.choices[i]) };
    if (q.type === 'single') out.correct = order.indexOf(q.correct);
    if (q.type === 'multi') out.correct = q.correct.map((c) => order.indexOf(c)).sort((a, b) => a - b);
    return out;
  });
}
function startPreview(quiz, back) {
  pv = { quiz: { ...quiz, questions: previewQuestions(quiz) }, i: 0, back, shown: false };
  renderPreview();
  show('preview');
}
function renderPreview() {
  const q = pv.quiz.questions[pv.i];
  const n = pv.quiz.questions.length;
  $('pvInfo').textContent = 'question ' + (pv.i + 1) + ' / ' + n;
  $('pvText').textContent = (q.category ? q.category + ' : ' : '') + q.text + (q.double ? '  ⚡ ×2' : '');
  if (q.image) { $('pvImg').src = q.image; $('pvImg').classList.remove('hidden'); } else $('pvImg').classList.add('hidden');
  const box = $('pvChoices');
  box.innerHTML = '';
  const correctSet = q.type === 'multi' ? q.correct : q.type === 'single' || q.type === 'tf' ? [q.correct] : [];
  if (q.type === 'letters') {
    const row = el('div', 'lt-row');
    q.tiles.forEach((c) => row.appendChild(el('span', 'lt-tile', c)));
    box.appendChild(row);
    if (pv.shown) box.appendChild(el('div', 'textbox', 'Le mot : ' + q.word));
  } else if (q.type === 'order') {
    const d = el('div', 'textbox');
    d.textContent = pv.shown ? 'Bon ordre : ' + q.choices.join(' → ') : 'Les joueurs remettent ces ' + q.choices.length + ' éléments dans l\'ordre';
    box.appendChild(d);
  } else if (q.type === 'zone') {
    // image à toucher : on touche l'image pour essayer, « Voir la réponse » montre le cercle
    $('pvImg').classList.add('hidden');
    const v = zoneView(q.image, q.text);
    const res = el('div', 'textbox', pv.try ? (pv.try.ok ? '✅ Juste !' : '❌ À côté') : 'Touche l\'image pour essayer');
    const paint = () => zoneDraw(v.layer, pv.shown ? q.zone : null, pv.try ? [pv.try] : []);
    v.wrap.onclick = (e) => {
      const p = zonePoint(e, v.img);
      pv.try = { ...p, ok: zoneHit(q.zone, p) };
      res.textContent = pv.try.ok ? '✅ Juste !' : '❌ À côté';
      paint();
    };
    paint();
    box.appendChild(v.wrap);
    box.appendChild(res);
  } else if (q.type === 'text') {
    const d = el('div', 'textbox');
    d.appendChild(el('i', 'ti ti-pencil'));
    d.appendChild(document.createTextNode(pv.shown ? ' Réponses acceptées : ' + q.answers.join(' / ') : ' Les joueurs écrivent leur réponse'));
    box.appendChild(d);
  } else {
    q.choices.forEach((c, k) => {
      const d = el('div', 'choice c' + (q.type === 'tf' ? (k === 0 ? 1 : 0) : k % 4));
      d.appendChild(el('span', 'badge', lab(k)));
      d.appendChild(el('span', 'ct', c));
      if (pv.shown && q.type !== 'poll') {
        if (correctSet.includes(k)) { d.classList.add('ok'); d.appendChild(el('i', 'ti ti-check')); } else d.classList.add('dim');
      }
      box.appendChild(d);
    });
  }
  $('pvHint').textContent = pv.shown && q.explain ? '💡 ' + q.explain : q.type === 'multi' ? 'Plusieurs bonnes réponses : le joueur doit toutes les cocher.' : q.type === 'poll' ? 'Sondage : pas de bonne réponse, pas de points.' : '';
  $('pvPrev').disabled = pv.i === 0;
  $('pvNext').disabled = pv.i === n - 1;
  $('pvReveal').classList.toggle('hidden', q.type === 'poll');
  $('pvReveal').innerHTML = pv.shown ? '<i class="ti ti-eye-off"></i> Masquer la réponse' : '<i class="ti ti-eye"></i> Voir la réponse';
}
$('pvReveal').onclick = () => { pv.shown = !pv.shown; renderPreview(); };
$('pvPrev').onclick = () => { pv.i--; pv.shown = false; pv.try = null; renderPreview(); };
$('pvNext').onclick = () => { pv.i++; pv.shown = false; pv.try = null; renderPreview(); };
$('pvQuit').onclick = () => { const back = pv.back; pv = null; show(back); };
