// Éditeur Vrai/Faux en rafale
// ----- Éditeur Vrai/Faux en rafale (c'est un quiz normal, fait de questions Vrai/Faux) -----
let tfEditing = null;
function openTfEditor(q) {
  tfEditing = q;
  $('tfHead').textContent = q ? 'Modifier le Vrai/Faux en rafale' : 'Nouveau Vrai/Faux en rafale';
  $('tfTitle').value = q ? q.title : '';
  $('tfItems').value = q ? q.questions.map((x) => x.text + ' ; ' + (x.correct === 0 ? 'vrai' : 'faux')).join('\n') : '';
  $('tfError').textContent = '';
  show('tfEditor');
}
$('tfCancel').onclick = () => show('lobby');
$('tfSave').onclick = () => {
  const title = $('tfTitle').value.trim() || 'Vrai/Faux sans titre';
  const questions = [];
  for (const line of $('tfItems').value.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.lastIndexOf(';');
    const text = i < 0 ? '' : line.slice(0, i).trim();
    const v = i < 0 ? '' : line.slice(i + 1).trim().toLowerCase();
    if (!text || !['vrai', 'faux', 'v', 'f', 'true', 'false'].includes(v)) { $('tfError').textContent = 'Ligne incorrecte : « ' + line.trim() + ' » (écris : affirmation ; vrai  ou  affirmation ; faux).'; return; }
    questions.push({ type: 'tf', text, image: '', choices: ['Vrai', 'Faux'], correct: ['vrai', 'v', 'true'].includes(v) ? 0 : 1, answers: [], double: false });
  }
  if (questions.length < 2) { $('tfError').textContent = 'Ajoute au moins 2 affirmations.'; return; }
  if (questions.length > 100) { $('tfError').textContent = '100 affirmations au maximum.'; return; }
  if (tfEditing) Object.assign(tfEditing, { title, questions });
  else {
    const w = { id: uid(), flavor: 'tfrush', title, questions };
    library.push(w);
    selectedId = w.id;
  }
  saveLibrary();
  renderQuizSelect();
  pushQuiz();
  show('lobby');
};
