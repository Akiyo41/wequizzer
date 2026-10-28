// Test du quiz sans joueurs
// ----- Test du quiz (aperçu, sans joueurs) -----
let pv = null;
function startPreview(quiz, back) {
  // comme dans une vraie partie : les réponses sont mélangées
  const mixed = { ...quiz, questions: quiz.questions.map((q) => {
    if (!['single', 'multi', 'poll'].includes(q.type)) return q;
    const order = q.choices.map((_, i) => i).sort(() => Math.random() - 0.5);
    const out = { ...q, choices: order.map((i) => q.choices[i]) };
    if (q.type === 'single') out.correct = order.indexOf(q.correct);
    if (q.type === 'multi') out.correct = q.correct.map((c) => order.indexOf(c)).sort((a, b) => a - b);
    return out;
  }) };
  pv = { quiz: mixed, i: 0, back, shown: false };
  renderPreview();
  show('preview');
}
function renderPreview() {
  const q = pv.quiz.questions[pv.i];
  const n = pv.quiz.questions.length;
  $('pvInfo').textContent = 'question ' + (pv.i + 1) + ' / ' + n;
  $('pvText').textContent = q.text + (q.double ? '  ⚡ ×2' : '');
  if (q.image) { $('pvImg').src = q.image; $('pvImg').classList.remove('hidden'); } else $('pvImg').classList.add('hidden');
  const box = $('pvChoices');
  box.innerHTML = '';
  const correctSet = q.type === 'multi' ? q.correct : q.type === 'single' || q.type === 'tf' ? [q.correct] : [];
  if (q.type === 'order') {
    const d = el('div', 'textbox');
    d.textContent = pv.shown ? 'Bon ordre : ' + q.choices.join(' → ') : 'Les joueurs remettent ces ' + q.choices.length + ' éléments dans l\'ordre';
    box.appendChild(d);
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
$('pvPrev').onclick = () => { pv.i--; pv.shown = false; renderPreview(); };
$('pvNext').onclick = () => { pv.i++; pv.shown = false; renderPreview(); };
$('pvQuit').onclick = () => { const back = pv.back; pv = null; show(back); };
