// Éditeurs de roue et de jeu de mots
// ----- Éditeur de roue -----
let wheelEditing = null;
const weBlank = () => ({ q: '', a: '', w1: '', w2: '', w3: '' });
let weRows = [];
const weDefs = [
  { k: 'q', label: 'La question :', ph: 'Ex : Quelle est la capitale de l\'Italie ?', max: 60 },
  { k: 'a', label: 'La BONNE réponse :', ph: 'Ex : Rome', max: 25, badge: ['c3', '✔'] },
  { k: 'w1', label: 'Une FAUSSE réponse :', ph: 'Ex : Milan', max: 25, badge: ['c0', '✖'] },
  { k: 'w2', label: 'Une autre fausse réponse (facultatif) :', ph: 'Ex : Naples', max: 25, badge: ['c0', '✖'] },
  { k: 'w3', label: 'Une dernière fausse réponse (facultatif) :', ph: 'Ex : Venise', max: 25, badge: ['c0', '✖'] },
];
const weUsed = () => weRows.filter((r) => r.q.trim() || r.a.trim() || r.w1.trim() || r.w2.trim() || r.w3.trim());
const weCount = () => { const n = weUsed().length; $('weCount').textContent = '(' + n + ' question' + (n > 1 ? 's' : '') + ' sur 100)'; $('weCount').style.color = n > 100 ? '#ff6b6b' : ''; };
const weDraw = () => { buildRows($('weRows'), weRows, weDefs, 'Question', weCount, weBlank); weCount(); };
function openWheelEditor(q) {
  wheelEditing = q;
  $('weHead').textContent = q ? 'Modifier la roue' : 'Nouvelle roue';
  $('weTitle').value = q ? q.title : '';
  $('weCategory').value = q ? q.category : '';
  weRows = q ? q.pairs.map((p) => ({ q: p.q, a: p.a, w1: (p.w || [])[0] || '', w2: (p.w || [])[1] || '', w3: (p.w || [])[2] || '' })) : [weBlank(), weBlank(), weBlank()];
  $('wePaste').value = '';
  $('weError').textContent = '';
  weDraw();
  show('wheelEditor');
}
$('newWheel').onclick = () => openWheelEditor(null);
$('weCancel').onclick = () => show('lobby');
$('weAdd').onclick = () => { if (weRows.length >= 100) { $('weError').textContent = '100 questions au maximum.'; return; } weRows.push(weBlank()); weDraw(); };
$('weExample').onclick = () => {
  if (weUsed().length) { $('weError').textContent = "Il y a déjà des questions : supprime-les d'abord si tu veux mettre l'exemple."; return; }
  $('weError').textContent = '';
  weRows = [
    { q: "Quelle est la capitale de l'Italie ?", a: 'Rome', w1: 'Milan', w2: 'Naples', w3: 'Venise' },
    { q: "Quelle est la capitale de l'Espagne ?", a: 'Madrid', w1: 'Barcelone', w2: 'Séville', w3: 'Valence' },
    { q: 'Quelle est la capitale du Portugal ?', a: 'Lisbonne', w1: 'Porto', w2: 'Faro', w3: 'Braga' },
  ];
  if (!$('weCategory').value.trim()) $('weCategory').value = 'Capitales';
  if (!$('weTitle').value.trim()) $('weTitle').value = "Capitales d'Europe";
  weDraw();
};
$('wePasteGo').onclick = () => {
  const add = [];
  for (const line of $('wePaste').value.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = splitLine(line);
    if (m.length < 2 || !m[0] || !m[1]) { $('weError').textContent = 'Ligne incorrecte : « ' + line.trim().slice(0, 60) + ' » (il faut au moins : question ; bonne réponse).'; return; }
    if (m.length > 5) { $('weError').textContent = 'Trop de morceaux : « ' + line.trim().slice(0, 50) + '… » (une question, une bonne réponse et 3 fausses réponses au maximum).'; return; }
    add.push({ q: m[0], a: m[1], w1: m[2] || '', w2: m[3] || '', w3: m[4] || '' });
  }
  if (!add.length) { $('weError').textContent = 'Il n\'y a rien à ajouter : colle d\'abord tes lignes.'; return; }
  weRows = weUsed().concat(add);
  $('wePaste').value = '';
  $('weError').textContent = weRows.length > 100 ? '100 questions au maximum : enlève-en.' : 'Lignes ajoutées en bas de ta liste. Vérifie-les, puis enregistre.';
  weDraw();
};
// Vérifie le formulaire de la roue : renvoie { title, category, pairs }, ou null (avec un message d'erreur)
function weBuild() {
  const err = (m) => { $('weError').textContent = m; return null; };
  const title = $('weTitle').value.trim() || 'Roue sans titre';
  const category = $('weCategory').value.trim();
  const pairs = [];
  const used = weUsed();
  for (let i = 0; i < used.length; i++) {
    const r = used[i];
    const n = i + 1;
    const q = r.q.trim(); const a = r.a.trim();
    if (!q) return err('Question ' + n + ' : écris la question.');
    if (!a) return err('Question ' + n + ' : écris la bonne réponse.');
    if (q.length > 60) return err('Question ' + n + ' : la question est trop longue (60 lettres au maximum). Raccourcis-la.');
    const w = [r.w1, r.w2, r.w3].map((x) => x.trim()).filter(Boolean);
    if ([a, ...w].some((x) => x.length > 25)) return err('Question ' + n + ' : une réponse est trop longue (25 lettres au maximum). Raccourcis-la.');
    if (w.some((x) => x.toLowerCase() === a.toLowerCase())) return err('Question ' + n + ' : une fausse réponse est la même que la bonne réponse.');
    if (new Set(w.map((x) => x.toLowerCase())).size !== w.length) return err('Question ' + n + ' : deux fausses réponses sont identiques.');
    pairs.push(w.length ? { q, a, w } : { q, a });
  }
  if (!category) return err('Écris le mot du centre (étape 2).');
  if (pairs.length < 3) return err('Il faut au moins 3 questions.');
  if (pairs.length > 100) return err('100 questions au maximum.');
  const seen = new Set();
  for (const p of pairs) {
    if (seen.has(p.a.toLowerCase())) return err('La bonne réponse « ' + p.a + ' » est écrite deux fois : chaque bonne réponse doit être différente.');
    seen.add(p.a.toLowerCase());
  }
  $('weError').textContent = '';
  return { title, category, pairs };
}
$('weTest').onclick = () => {
  const w = weBuild();
  if (w) startPreview({ kind: 'wheel', ...w }, 'wheelEditor');
};
$('weSave').onclick = () => {
  const built = weBuild();
  if (!built) return;
  const { title, category, pairs } = built;
  if (wheelEditing) Object.assign(wheelEditing, { title, category, pairs });
  else {
    const w = { id: uid(), kind: 'wheel', title, category, pairs, questions: [] };
    library.push(w);
    selectedId = w.id;
  }
  saveLibrary();
  renderQuizSelect();
  pushQuiz();
  show('lobby');
};

// ----- Éditeur de jeu de mots -----
let lettersEditing = null;
const leBlank = () => ({ q: '', word: '', image: '' });
let leRows = [];
const leDefs = [
  { k: 'q', label: 'La question :', ph: 'Ex : Quel animal miaule ?', max: 200 },
  { k: 'word', label: 'Le mot à trouver (3 à 14 lettres) :', ph: 'Ex : Chat', max: 30, badge: ['c3', '✔'] },
  { k: 'image', label: 'Une image (facultatif, lien internet) :', ph: 'Ex : https://…', max: 500 },
];
const leUsed = () => leRows.filter((r) => r.q.trim() || r.word.trim() || r.image.trim());
const leCount = () => { const n = leUsed().length; $('leCount').textContent = '(' + n + ' mot' + (n > 1 ? 's' : '') + ' sur 100)'; $('leCount').style.color = n > 100 ? '#ff6b6b' : ''; };
const leDraw = () => { buildRows($('leRows'), leRows, leDefs, 'Mot', leCount, leBlank); leCount(); };
function openLettersEditor(q) {
  lettersEditing = q;
  $('leHead').textContent = q ? 'Modifier le jeu de mots' : 'Nouveau jeu de mots';
  $('leTitle').value = q ? q.title : '';
  leRows = q ? q.items.map((it) => ({ q: it.q, word: it.word, image: it.image || '' })) : [leBlank(), leBlank(), leBlank()];
  $('lePaste').value = '';
  $('leError').textContent = '';
  leDraw();
  show('lettersEditor');
}
$('newLetters').onclick = () => openLettersEditor(null);
$('leCancel').onclick = () => show('lobby');
$('leAdd').onclick = () => { if (leRows.length >= 100) { $('leError').textContent = '100 mots au maximum.'; return; } leRows.push(leBlank()); leDraw(); };
$('leFile').onclick = () => $('leFileInput').click();
$('leFileInput').onchange = () => {
  const f = $('leFileInput').files[0];
  $('leFileInput').value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const t = String(r.result).replace(/^﻿/, '').replace(/"/g, '');
    const lines = t.split(/\r?\n/);
    if (lines.length && /^question\b/i.test(lines[0].trim())) lines.shift();
    $('lePaste').value = lines.filter((l) => l.trim()).join('\n');
    $('lePasteGo').click();
  };
  r.readAsText(f);
};
$('lePasteGo').onclick = () => {
  const add = [];
  for (const line of $('lePaste').value.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = splitLine(line);
    if (m.length < 2 || !m[0] || !m[1]) { $('leError').textContent = 'Ligne incorrecte : « ' + line.trim().slice(0, 60) + ' » (il faut : question ; mot).'; return; }
    add.push({ q: m[0], word: m[1], image: m[2] && /^https?:\/\//i.test(m[2]) ? m[2] : '' });
  }
  if (!add.length) { $('leError').textContent = "Il n'y a rien à ajouter : colle d'abord tes lignes."; return; }
  leRows = leUsed().concat(add);
  $('lePaste').value = '';
  $('leError').textContent = leRows.length > 100 ? '100 mots au maximum : enlève-en.' : 'Lignes ajoutées en bas de ta liste. Vérifie-les, puis enregistre.';
  leDraw();
};
$('leExample').onclick = () => {
  if (leUsed().length) { $('leError').textContent = "Il y a déjà des mots : supprime-les d'abord si tu veux mettre l'exemple."; return; }
  $('leError').textContent = '';
  leRows = [{ q: 'Quel animal miaule ?', word: 'Chat', image: '' }, { q: 'Quel animal aboie ?', word: 'Chien', image: '' }, { q: 'Quelle est la capitale de la Grèce ?', word: 'Athènes', image: '' }];
  if (!$('leTitle').value.trim()) $('leTitle').value = 'Mon premier jeu de mots';
  leDraw();
};
// Vérifie le formulaire du jeu de mots : renvoie { title, items }, ou null (avec un message d'erreur)
function leBuild() {
  const err = (m) => { $('leError').textContent = m; return null; };
  const title = $('leTitle').value.trim() || 'Jeu de mots sans titre';
  const items = [];
  const used = leUsed();
  for (let i = 0; i < used.length; i++) {
    const r = used[i];
    const n = i + 1;
    const q = r.q.trim(); const word = r.word.trim(); const image = r.image.trim();
    if (!q) return err('Mot ' + n + ' : écris la question.');
    if (!word) return err('Mot ' + n + ' : écris le mot à trouver.');
    const letters = Array.from(word).filter((c) => /[\p{L}\p{N}]/u.test(c)).length;
    if (letters < 3 || letters > 14) return err('Mot ' + n + ' : « ' + word + ' » doit avoir entre 3 et 14 lettres.');
    if (image && !/^https?:\/\//i.test(image)) return err('Mot ' + n + ' : le lien de l\'image doit commencer par http (ou laisse la case vide).');
    items.push({ q, word, image });
  }
  if (!items.length) return err('Ajoute au moins un mot.');
  if (items.length > 100) return err('100 mots au maximum.');
  $('leError').textContent = '';
  return { title, items };
}
$('leTest').onclick = () => {
  const l = leBuild();
  if (l) startPreview({ kind: 'letters', ...l }, 'lettersEditor');
};
$('leSave').onclick = () => {
  const l = leBuild();
  if (!l) return;
  const { title, items } = l;
  if (lettersEditing) Object.assign(lettersEditing, { title, items });
  else {
    const w = { id: uid(), kind: 'letters', title, items, questions: [] };
    library.push(w);
    selectedId = w.id;
  }
  saveLibrary();
  renderQuizSelect();
  pushQuiz();
  show('lobby');
};
