// Mes quiz : lecture, enregistrement, choix du quiz
// ----- Bibliothèque de quiz -----
// Question enregistrée → question de l'éditeur (« Compléter la phrase » devient le type 'gap')
function normQ(q) {
  let type = ['single', 'tf', 'multi', 'text', 'poll', 'order', 'gap', 'zone'].includes(q.type) ? q.type : 'single';
  if (type === 'single' && q.gapSrc) type = 'gap';
  let choices = (q.choices || []).slice(0, type === 'order' ? 6 : 4).map(String);
  if (type === 'tf') choices = ['Vrai', 'Faux'];
  let correct = q.correct;
  if (type === 'multi') correct = Array.isArray(correct) ? correct.filter(Number.isInteger) : Number.isInteger(correct) ? [correct] : [];
  else if (Array.isArray(correct)) correct = correct.length ? correct[0] : 0;
  else if (!Number.isInteger(correct)) correct = 0;
  if (type === 'gap' && !q.gapSrc) {
    // déjà au format de l'éditeur (anciens imports) : phrase avec ___, bonne réponse en premier
    return { type, text: String(q.text || ''), image: q.image || '', choices, correct: 0, answers: [], double: q.double === true, explain: String(q.explain || '') };
  }
  if (type === 'gap') {
    // en édition : phrase avec ___, bonne réponse dans la case 1, mauvaises réponses dans les cases 2 à 4
    const src = String(q.gapSrc || '');
    const mm = src.match(/\[([^\[\]]+)\]/);
    return { type, text: mm ? src.replace(mm[0], '___') : src, image: q.image || '', choices: [mm ? mm[1].trim() : '', ...choices.filter((c, i) => i !== (Number.isInteger(q.correct) ? q.correct : 0)).slice(0, 3)], correct: 0, answers: [], double: q.double === true, explain: String(q.explain || '') };
  }
  return {
    type,
    text: String(q.text || ''),
    image: q.image || '',
    choices,
    correct,
    answers: Array.isArray(q.answers) ? q.answers.map(String) : [],
    double: q.double === true,
    explain: String(q.explain || ''),
    ...(type === 'zone' ? { zone: q.zone && typeof q.zone === 'object' ? { ...q.zone } : null } : {}),
  };
}
// Question de l'éditeur → question enregistrée : « Compléter la phrase » devient un choix unique avec gapSrc
function savedQ(n) {
  if (n.type !== 'gap') return n;
  const word = n.choices[0];
  const wrongs = n.choices.slice(1).filter((c) => c.trim());
  return { ...n, type: 'single', gapSrc: n.text.replace(/_{2,}/, '[' + word + ']'), text: n.text.replace(/_{2,}/, '_____'), choices: [word, ...wrongs], correct: 0 };
}
function validateQ(q) {
  if (!q.text.trim()) return 'le texte est vide';
  if (q.type === 'text') return q.answers.some((a) => a.trim()) ? null : 'écris au moins une réponse acceptée';
  if (q.type === 'tf') return q.correct === 0 || q.correct === 1 ? null : 'choisis Vrai ou Faux';
  if (q.type === 'zone') return !(q.image || '').trim() ? 'il faut une image pour une question « image à toucher »' : zoneValid(q.zone) ? null : 'touche l\'image pour placer la bonne zone';
  if (q.choices.length < 2 || q.choices.some((c) => !c.trim())) return 'il faut au moins 2 réponses remplies';
  if (q.type === 'single' && (q.correct < 0 || q.correct >= q.choices.length)) return 'la bonne réponse est invalide';
  if (q.type === 'multi' && (!q.correct.length || q.correct.some((c) => c < 0 || c >= q.choices.length))) return 'coche au moins une bonne réponse';
  return null;
}
async function initLibrary() {
  if (library.length === 0) {
    try {
      const r = await fetch('/api/sample-quiz');
      const q = await r.json();
      library.push({ id: uid(), title: q.title, questions: q.questions.map(normQ) });
    } catch (e) { /* pas d'exemple */ }
  }
  // Roues d'exemple, ajoutées une seule fois (si tu les supprimes, elles ne reviennent pas)
  if (!LS.get('wequizzer.wheelSeed', false)) {
    const mk = (title, category, text) => ({ id: uid(), kind: 'wheel', title, category, questions: [], pairs: text.split('\n').map((l) => { const [q, a] = l.split(';'); return { q: q.trim(), a: a.trim() }; }) });
    library.push(mk('Chiffres romains', 'Reliez les chiffres romains et arabes', '3 ; III\n4 ; IV\n10 ; X\n1 ; I\n50 ; L\n5 ; V\n9 ; IX\n40 ; XL'));
    library.push(mk('Capitales', 'Reliez chaque pays à sa capitale', 'France ; Paris\nItalie ; Rome\nEspagne ; Madrid\nAllemagne ; Berlin\nPortugal ; Lisbonne\nBelgique ; Bruxelles\nJapon ; Tokyo\nCanada ; Ottawa'));
    LS.set('wequizzer.wheelSeed', true);
  }
  if (!LS.get('wequizzer.lettersSeed', false)) {
    const mkL = (title, text) => ({ id: uid(), kind: 'letters', title, questions: [], items: text.split('\n').map((l) => { const [q, w] = l.split(';'); return { q: q.trim(), word: w.trim(), image: '' }; }) });
    library.push(mkL('Mots : Capitales', 'Quelle est la capitale de la Grèce ? ; Athènes\nQuelle est la capitale de l\'Italie ? ; Rome\nQuelle est la capitale de l\'Espagne ? ; Madrid\nQuelle est la capitale de l\'Allemagne ? ; Berlin\nQuelle est la capitale du Portugal ? ; Lisbonne\nQuelle est la capitale de la Belgique ? ; Bruxelles'));
    library.push(mkL('Mots : Animaux', 'Quel animal miaule ? ; Chat\nQuel animal aboie ? ; Chien\nQuel est le roi de la savane ? ; Lion\nQuel animal a une trompe ? ; Éléphant\nQuel animal saute avec une poche ventrale ? ; Kangourou\nQuel oiseau ne vole pas et vit en Antarctique ? ; Manchot'));
    LS.set('wequizzer.lettersSeed', true);
  }
  if (!LS.get('wequizzer.tfSeed', false)) {
    const mkT = (title, text) => ({ id: uid(), flavor: 'tfrush', title, questions: text.split('\n').map((l) => { const [t, v] = l.split(';'); return { type: 'tf', text: t.trim(), image: '', choices: ['Vrai', 'Faux'], correct: v.trim() === 'vrai' ? 0 : 1, answers: [], double: false }; }) });
    library.push(mkT('Vrai ou faux : animaux', 'Le dauphin est un poisson ; faux\nLa baleine est un mammifère ; vrai\nLes chauves-souris sont des oiseaux ; faux\nLe kangourou vit en Australie ; vrai\nLes araignées ont six pattes ; faux\nLe manchot vit au pôle Nord ; faux\nLe cœur de la crevette est dans sa tête ; vrai\nLes éléphants sont les seuls animaux qui ne savent pas sauter ; faux'));
    LS.set('wequizzer.tfSeed', true);
  }
  // Répare les « Compléter la phrase » importés avant la correction (restés au format de l'éditeur)
  library.forEach((quiz) => {
    if (!quiz.kind && quiz.questions.some((q) => q.type === 'gap')) quiz.questions = quiz.questions.map((q) => (q.type === 'gap' ? savedQ(normQ(q)) : q));
  });
  if (!currentQuiz() && library.length) selectedId = library[0].id;
  saveLibrary();
  renderQuizSelect();
  pushQuiz();
}
function renderQuizSelect() {
  [$('quizSelect'), $('quizSelect2')].forEach((sel) => {
    sel.innerHTML = '';
    quizOrder(library).forEach((q) => {
      const o = el('option', '', quizLabel(q));
      o.value = q.id;
      sel.appendChild(o);
    });
    if (selectedId) sel.value = selectedId;
  });
  // place prise dans le navigateur : affichée à partir de la moitié
  const mem = memoryInfo(JSON.stringify(library).length);
  $('memInfo').classList.toggle('hidden', !mem);
  $('memInfo').classList.toggle('error', !!(mem && mem.warn));
  if (mem) $('memInfo').textContent = '💾 ' + mem.text;
  const has = library.length > 0;
  ['editQuiz', 'testQuiz', 'copyQuiz', 'exportQuiz', 'deleteQuiz'].forEach((id) => { $(id).disabled = !has; });
  applyKind();
}
const setInfo = (t) => { $('quizInfo').textContent = t; $('quizInfo2').textContent = t; };
function quizPayload(q) {
  if (q.kind === 'wheel') return { kind: 'wheel', title: q.title, category: q.category, pairs: q.pairs };
  if (q.kind === 'letters') return { kind: 'letters', title: q.title, items: q.items };
  return {
    title: q.title,
    questions: q.questions.map((x) => ({
      type: x.type, text: x.text, image: x.image || '', choices: x.choices, correct: x.correct, answers: x.answers, double: x.double, explain: x.explain || '', zone: x.zone,
    })),
  };
}
function pushQuiz() {
  const q = currentQuiz();
  $('quizError').textContent = '';
  if (!q) { quizReady = false; setInfo('Crée ton premier quiz dans l\'onglet « Mes quiz ».'); updateStart(); return; }
  socket.emit('host:quiz', quizPayload(q));
}
socket.on('host:quiz:ok', ({ title, count, kind }) => {
  quizReady = true;
  setInfo('« ' + title + ' » : ' + count + (kind === 'wheel' ? ' paire' : kind === 'letters' ? ' mot' : ' question') + (count > 1 ? 's' : '') + '. Enregistré dans ce navigateur.');
  updateStart();
});
socket.on('host:quiz:error', (msg) => {
  quizReady = false;
  $('quizError').textContent = msg;
  updateStart();
});
const onPick = (sel) => () => {
  selectedId = sel.value; saveLibrary();
  $('quizSelect').value = selectedId; $('quizSelect2').value = selectedId;
  applyKind(); pushQuiz(); pushSettings();
};
$('quizSelect').onchange = onPick($('quizSelect'));
$('quizSelect2').onchange = onPick($('quizSelect2'));

// Une copie à modifier sans toucher à l'original (ex. : une version plus facile pour une autre classe)
$('copyQuiz').onclick = () => {
  const q = currentQuiz();
  if (!q) return;
  const copy = JSON.parse(JSON.stringify(q));
  copy.id = uid();
  copy.title = copyTitle(q.title, library.map((x) => x.title));
  library.splice(library.indexOf(q) + 1, 0, copy);
  selectedId = copy.id;
  saveLibrary();
  renderQuizSelect();
  pushQuiz();
};
$('deleteQuiz').onclick = async () => {
  const q = currentQuiz();
  if (!q) return;
  const ok = await UI.confirm({ title: 'Supprimer ce quiz ?', name: '« ' + q.title + ' »', text: 'Tu ne pourras pas le récupérer.', ok: 'Supprimer', cancel: 'Annuler', pose: 'desole' });
  if (!ok) return;
  library = library.filter((x) => x.id !== q.id);
  selectedId = library.length ? library[0].id : null;
  saveLibrary();
  renderQuizSelect();
  pushQuiz();
};
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
$('exportQuiz').onclick = () => {
  const q = currentQuiz();
  if (!q) return;
  download(exportName(q.title), JSON.stringify(exportPayload(q), null, 2), 'application/json');
};
function addImported(title, qs, flavor) {
  const bad = qs.findIndex((q) => validateQ(q));
  if (bad !== -1) throw new Error('Question ' + (bad + 1) + ' : ' + validateQ(qs[bad]));
  const quiz = { id: uid(), title: freeTitle(String(title || 'Quiz importé').slice(0, 60), library.map((x) => x.title)), questions: qs.map(savedQ) };
  // Vrai/Faux en rafale : seulement si toutes les questions sont des Vrai/Faux (sinon son éditeur les perdrait)
  if (flavor === 'tfrush' && quiz.questions.every((q) => q.type === 'tf')) quiz.flavor = 'tfrush';
  library.push(quiz);
  selectedId = quiz.id;
  saveLibrary();
  renderQuizSelect();
  pushQuiz();
}
$('importQuiz').onclick = () => $('importFile').click();
$('importFile').onchange = () => {
  const f = $('importFile').files[0];
  $('importFile').value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      let data = JSON.parse(r.result);
      if (data && data.kind === 'wheel' && Array.isArray(data.pairs) && data.pairs.length) {
        const w = { id: uid(), kind: 'wheel', title: freeTitle(String(data.title || 'Roue importée').slice(0, 60), library.map((x) => x.title)), category: String(data.category || '').slice(0, 80), pairs: data.pairs.map((p) => (Array.isArray(p.w) && p.w.length ? { q: String(p.q || ''), a: String(p.a || ''), w: p.w.map(String).slice(0, 3) } : { q: String(p.q || ''), a: String(p.a || '') })), questions: [] };
        library.push(w); selectedId = w.id; saveLibrary(); renderQuizSelect(); pushQuiz();
        return;
      }
      if (data && data.kind === 'letters' && Array.isArray(data.items) && data.items.length) {
        const w = { id: uid(), kind: 'letters', title: freeTitle(String(data.title || 'Jeu de mots importé').slice(0, 60), library.map((x) => x.title)), items: data.items.map((p) => ({ q: String(p.q || ''), word: String(p.word || ''), image: String(p.image || '') })), questions: [] };
        library.push(w); selectedId = w.id; saveLibrary(); renderQuizSelect(); pushQuiz();
        return;
      }
      if (Array.isArray(data)) data = { title: f.name.replace(/\.json$/i, ''), questions: data };
      if (!data || !Array.isArray(data.questions) || data.questions.length === 0) throw new Error('Fichier vide.');
      addImported(data.title, data.questions.map(normQ), data.flavor);
    } catch (e) {
      $('quizError').textContent = e.message && e.message.startsWith('Question') ? e.message : "Ce fichier n'est pas un quiz valide.";
    }
  };
  r.readAsText(f);
};
