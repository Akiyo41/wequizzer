// Réglages selon le quiz choisi et vérification de l'éditeur
// Affiche seulement les réglages utiles au quiz choisi
function applyKind() {
  const q = currentQuiz();
  const wheel = !!(q && q.kind);
  const rowOf = (k) => document.querySelector('[data-key="' + k + '"]').closest('.row');
  $('rowPairsView').classList.toggle('hidden', !(q && q.kind === 'wheel'));
  ['readDelay', 'readSeconds', 'changeAnswer', 'bonusQuestions', 'display', 'labels'].forEach((k) => rowOf(k).classList.toggle('nokind', wheel));
  // l'explication et les points doubles n'ont de sens que si le quiz en contient
  const qs = q && !q.kind ? q.questions : [];
  $('rowExplain').classList.toggle('hidden', !qs.some((x) => (x.explain || '').trim()));
  $('rowBonusQ').classList.toggle('hidden', !qs.some((x) => x.double));
  // « Nombre de questions » : les choix s'adaptent à la taille du quiz
  const n = q ? (q.kind === 'wheel' ? q.pairs.length : q.kind === 'letters' ? q.items.length : q.questions.length) : 0;
  const sel = document.querySelector('[data-key="count"]');
  sel.innerHTML = '';
  sel.appendChild(new Option('Toutes' + (n ? ' (' + n + ')' : ''), '0'));
  [3, 5, 10, 15, 20, 30, 40, 50, 75].filter((v) => v < n).forEach((v) => sel.appendChild(new Option(String(v), String(v))));
  sel.value = wantCount > 0 && wantCount < n ? String(wantCount) : '0';
}
// Score : la vitesse a besoin du chrono ; les cœurs n'existent pas en élimination / pendu. On cache ce qui ne s'applique pas.
function applyScoring() {
  const g = (k) => document.querySelector('[data-key="' + k + '"]');
  const limit = g('limitTime').checked;
  const elim = g('mode').value === 'elimination' || g('mode').value === 'hangman';
  if (!limit) g('speedBonus').checked = false;
  if (elim) g('hearts').checked = false;
  $('rowBonus').classList.toggle('hidden', !limit);
  $('rowHearts').classList.toggle('hidden', elim);
}
$('edCancel').onclick = () => leaveEditor('editor');

// Vérifie l'éditeur et renvoie le quiz propre, ou null (avec un message d'erreur)
function buildFromEditor() {
  const fail = (m) => { $('edError').textContent = m; return null; };
  const title = $('edTitle').value.trim();
  if (!title) return fail('Donne un titre à ton quiz.');
  const out = [];
  for (let i = 0; i < editing.questions.length; i++) {
    const q = editing.questions[i];
    const pre = 'Question ' + (i + 1) + ' : ';
    const text = q.text.trim();
    if (!text) return fail(pre + (q.type === 'gap' ? 'écris ta phrase (avec ___ à la place du mot manquant). Ex : Le ___ miaule.' : 'écris la question.'));
    const image = (q.image || '').trim();
    if (image && !/^https?:\/\//i.test(image) && !image.startsWith('data:image/')) return fail(pre + "l'adresse de l'image doit commencer par http.");
    const clean = { type: q.type, text, image, choices: [], correct: 0, answers: [], double: q.type === 'poll' ? false : q.double, explain: (q.explain || '').trim() };
    if (q.type === 'gap') {
      if (/[\[\]]/.test(text)) return fail(pre + 'enlève les crochets [ ] de ta phrase : tape ___ à la place du mot manquant, et écris le mot dans la case « bonne réponse ».');
      const blanks = text.match(/_{2,}/g) || [];
      if (blanks.length !== 1) return fail(pre + 'il faut écrire ___ (trois tirets du bas) une seule fois dans ta phrase, à la place du mot manquant. Ex : Le ___ miaule.');
      const word = (q.choices[0] || '').trim();
      if (!word) return fail(pre + 'écris la bonne réponse (le mot qui va à la place du ___).');
      const wrongs = q.choices.slice(1).map((c) => c.trim()).filter(Boolean);
      if (!wrongs.length) return fail(pre + 'ajoute au moins une mauvaise réponse.');
      if (wrongs.some((w) => w.toLowerCase() === word.toLowerCase())) return fail(pre + 'une mauvaise réponse est identique à la bonne réponse.');
      clean.type = 'single';
      clean.gapSrc = text.replace(blanks[0], '[' + word + ']');
      clean.text = text.replace(blanks[0], '_____');
      clean.choices = [word, ...wrongs];
      clean.correct = 0;
    } else if (q.type === 'order') {
      const items = q.choices.map((c) => c.trim()).filter(Boolean);
      if (items.length < 2) return fail(pre + 'mets au moins 2 éléments à remettre dans l\'ordre.');
      if (new Set(items.map((c) => c.toLowerCase())).size !== items.length) return fail(pre + 'deux éléments sont identiques.');
      clean.choices = items;
      clean.correct = 0;
    } else if (q.type === 'zone') {
      // image à toucher : une image et la bonne zone (mêmes messages que le serveur)
      if (!image) return fail(pre + 'il faut une image pour une question « image à toucher ».');
      if (!zoneValid(q.zone)) return fail(pre + 'touche l\'image pour placer la bonne zone.');
      clean.zone = { ...q.zone };
    } else if (q.type === 'tf') {
      clean.choices = ['Vrai', 'Faux'];
      clean.correct = q.correct === 1 ? 1 : 0;
    } else if (q.type === 'text') {
      clean.answers = q.answers.map((a) => a.trim()).filter(Boolean);
      if (!clean.answers.length) return fail(pre + 'écris au moins une réponse acceptée.');
    } else {
      const filled = q.choices.map((c, k) => ({ c: c.trim(), k })).filter((x) => x.c);
      if (filled.length < 2) return fail(pre + 'mets au moins 2 réponses.');
      clean.choices = filled.map((x) => x.c);
      if (q.type === 'single') {
        const ci = filled.findIndex((x) => x.k === q.correct);
        if (ci === -1) return fail(pre + 'coche la bonne réponse (elle doit être remplie).');
        clean.correct = ci;
      } else if (q.type === 'multi') {
        const list = filled.map((x, ci) => (q.correct.includes(x.k) ? ci : -1)).filter((x) => x !== -1);
        if (!list.length) return fail(pre + 'coche au moins une bonne réponse (remplie).');
        clean.correct = list;
      }
    }
    out.push(clean);
  }
  $('edError').textContent = '';
  return { id: editing.id, title, questions: out };
}
$('edSave').onclick = () => {
  const quiz = buildFromEditor();
  if (!quiz) return;
  const idx = library.findIndex((x) => x.id === quiz.id);
  if (idx === -1) library.push(quiz); else library[idx] = quiz;
  selectedId = quiz.id;
  if (!saveLibrary()) return; // mémoire pleine : on reste dans l'éditeur, rien n'est perdu
  renderQuizSelect();
  pushQuiz();
  show('lobby');
};
$('edTest').onclick = () => {
  const quiz = buildFromEditor();
  if (quiz) startPreview(quiz, 'editor');
};
$('testQuiz').onclick = () => { const q = currentQuiz(); if (q) startPreview(q, 'lobby'); };
