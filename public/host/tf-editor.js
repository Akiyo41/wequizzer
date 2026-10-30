// Éditeur Vrai/Faux en rafale
// ----- Éditeur Vrai/Faux en rafale (c'est un quiz normal, fait de questions Vrai/Faux) -----
let tfEditing = null;
function openTfEditor(q) {
  tfEditing = q;
  $('tfHead').textContent = q ? 'Modifier le Vrai/Faux en rafale' : 'Nouveau Vrai/Faux en rafale';
  $('tfTitle').value = q ? q.title : '';
  // une ligne par affirmation : « affirmation ; vrai ou faux » puis « ; explication » si elle en a une
  $('tfItems').value = q ? q.questions.map((x) => x.text + ' ; ' + (x.correct === 0 ? 'vrai' : 'faux') + ((x.explain || '').trim() ? ' ; ' + x.explain.trim() : '')).join('\n') : '';
  $('tfError').textContent = '';
  leaveGuard.arm('tf', () => [$('tfTitle').value, $('tfItems').value]);
  show('tfEditor');
}
$('tfCancel').onclick = () => leaveEditor('tf');
$('tfSave').onclick = () => {
  const title = $('tfTitle').value.trim() || 'Vrai/Faux sans titre';
  const questions = [];
  const VERDICTS = ['vrai', 'faux', 'v', 'f', 'true', 'false'];
  for (const line of $('tfItems').value.split(/\r?\n/)) {
    if (!line.trim()) continue;
    // affirmation ; vrai/faux ; explication (facultative) — la première case « vrai/faux » sépare les deux
    const parts = line.split(';');
    const k = parts.findIndex((p, j) => j > 0 && VERDICTS.includes(p.trim().toLowerCase()));
    const text = k < 0 ? '' : parts.slice(0, k).join(';').trim();
    if (!text) { $('tfError').textContent = 'Ligne incorrecte : « ' + line.trim() + ' » (écris : affirmation ; vrai  ou  affirmation ; faux, puis si tu veux ; explication).'; return; }
    const v = parts[k].trim().toLowerCase();
    const explain = parts.slice(k + 1).join(';').trim().slice(0, 300);
    questions.push({ type: 'tf', text, image: '', choices: ['Vrai', 'Faux'], correct: ['vrai', 'v', 'true'].includes(v) ? 0 : 1, answers: [], double: false, explain });
  }
  if (questions.length < 2) { $('tfError').textContent = 'Ajoute au moins 2 affirmations.'; return; }
  if (questions.length > 100) { $('tfError').textContent = '100 affirmations au maximum.'; return; }
  if (tfEditing) Object.assign(tfEditing, { title, questions });
  else {
    const w = { id: uid(), flavor: 'tfrush', title, questions };
    library.push(w);
    selectedId = w.id;
  }
  if (!saveLibrary()) return; // mémoire pleine : on reste dans l'éditeur, rien n'est perdu
  renderQuizSelect();
  pushQuiz();
  show('lobby');
};
