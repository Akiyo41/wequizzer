// Onglets de l'accueil et éditeur de quiz
// ----- Onglets (Jouer / Mes quiz) et pages de l'accueil -----
let tab = 'jouer';
function setTab(t) {
  tab = t;
  $('paneJouer').classList.toggle('hidden', t !== 'jouer');
  $('paneQuiz').classList.toggle('hidden', t !== 'quiz');
  $('tabJouer').classList.toggle('on', t === 'jouer');
  $('tabQuiz').classList.toggle('on', t === 'quiz');
  $('moreMenu').classList.add('hidden');
  window.scrollTo(0, 0);
}
$('tabJouer').onclick = () => setTab('jouer');
$('tabQuiz').onclick = () => setTab('quiz');
$('openCreate').onclick = () => show('createPage');
$('createBack').onclick = () => show('lobby');
$('openAdv').onclick = () => show('advPage');
$('advBack').onclick = () => show('lobby');
$('moreBtn').onclick = (e) => { e.stopPropagation(); $('moreMenu').classList.toggle('hidden'); };
$('moreMenu').addEventListener('click', () => $('moreMenu').classList.add('hidden'));
document.addEventListener('click', (e) => { if (!$('moreMenu').contains(e.target) && e.target !== $('moreBtn')) $('moreMenu').classList.add('hidden'); });
UI.soundButton();
UI.fullscreenButton();

// ----- Éditeur de quiz -----
let editing = null;
const blankQ = () => ({ type: 'single', text: '', image: '', choices: ['', '', '', ''], correct: 0, answers: [], double: false, explain: '' });
// Question enregistrée → question de l'éditeur (cases de réponse complétées)
function editorQ(q) {
  const n = normQ(q);
  if (n.type === 'tf') n.choices = ['', '', '', ''];
  while (n.choices.length < (n.type === 'order' ? 6 : 4)) n.choices.push('');
  return n;
}
function openEditor(quiz) {
  editing = quiz
    ? {
        id: quiz.id,
        title: quiz.title,
        questions: quiz.questions.map(editorQ),
      }
    : { id: uid(), title: '', questions: [blankQ()] };
  $('edHead').textContent = quiz ? 'Modifier le quiz' : 'Nouveau quiz';
  $('edTitle').value = editing.title;
  $('edError').textContent = '';
  renderEditor();
  leaveGuard.arm('editor', () => [$('edTitle').value, editing.questions]);
  show('editor');
}
function miniBtn(icon, fn, label) {
  const b = el('button', 'btn ghost mini');
  b.type = 'button';
  b.title = label;
  b.setAttribute('aria-label', label);
  b.appendChild(el('i', 'ti ' + icon));
  b.onclick = fn;
  return b;
}
function textField(value, placeholder, onInput) {
  const i = el('input');
  i.type = 'text';
  i.value = value;
  i.placeholder = placeholder;
  i.maxLength = 200;
  i.oninput = () => onInput(i.value);
  return i;
}
function switchType(q, type) {
  q.type = type;
  if (type === 'multi') q.correct = Array.isArray(q.correct) ? q.correct : [Number.isInteger(q.correct) ? q.correct : 0];
  else if (type === 'tf') q.correct = Array.isArray(q.correct) ? 0 : q.correct === 1 ? 1 : 0;
  else q.correct = Array.isArray(q.correct) ? (q.correct[0] || 0) : (Number.isInteger(q.correct) ? q.correct : 0);
  if (type === 'poll') q.double = false;
  if (type === 'order') { q.correct = 0; while (q.choices.length < 6) q.choices.push(''); }
  else if (q.choices.length > 4) q.choices = q.choices.slice(0, 4);
  if (type === 'gap') { q.choices = ['', q.choices[1] || '', q.choices[2] || '', q.choices[3] || '']; q.correct = 0; }
}
// Image envoyée depuis l'ordinateur : réduite et compressée avant d'être gardée
function pickImage(q, done) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = () => { if (inp.files[0]) loadImageFile(q, inp.files[0], done); };
  inp.click();
}
// Image collée (Ctrl+V) ou glissée dans la case image : comme « Depuis mon ordinateur »
function imageFrom(dt) {
  return dt ? [...(dt.files || [])].find((f) => /^image\//.test(f.type)) || null : null;
}
function acceptImages(field, q) {
  field.addEventListener('paste', (e) => { const f = imageFrom(e.clipboardData); if (f) { e.preventDefault(); loadImageFile(q, f, renderEditor); } });
  field.addEventListener('dragover', (e) => e.preventDefault());
  field.addEventListener('drop', (e) => { const f = imageFrom(e.dataTransfer); if (f) { e.preventDefault(); loadImageFile(q, f, renderEditor); } });
}
// Réduit l'image et la garde dans la question
function loadImageFile(q, f, done) {
  const img = new Image();
  const url = URL.createObjectURL(f);
  img.onload = () => {
    // image à toucher : plus grande (on doit voir les détails d'une carte), en restant sous la limite du serveur (150 000 caractères)
    const tries = q.type === 'zone' ? [[800, 0.72], [800, 0.55], [640, 0.6], [520, 0.6]] : [[520, 0.72]];
    for (const [max, quality] of tries) {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      q.image = c.toDataURL('image/jpeg', quality);
      if (q.image.length <= 145000) break;
    }
    URL.revokeObjectURL(url);
    if (q.image.length > 145000) {
      // le serveur la refuserait (et dirait seulement « il faut une image ») : on prévient tout de suite
      q.image = '';
      $('edError').textContent = 'Cette image est trop lourde, même réduite : choisis-en une plus simple ou plus petite.';
    }
    if (q.type === 'zone') q.zone = null; // nouvelle image : la zone est à replacer
    done();
  };
  img.onerror = () => { URL.revokeObjectURL(url); $('edError').textContent = "Cette image n'a pas pu être lue."; };
  img.src = url;
}
// Image à toucher : l'animateur touche l'image pour placer le cercle de la bonne zone et règle sa taille
function zoneEditor(card, q) {
  const image = (q.image || '').trim();
  if (!image) { card.appendChild(el('p', 'hint', '📍 Ajoute d\'abord une image (carte, schéma…), puis touche-la à l\'endroit de la bonne réponse.')); return; }
  card.appendChild(el('p', 'hint', 'Touche l\'image à l\'endroit de la bonne réponse :'));
  const v = zoneView(image, q.text);
  v.wrap.classList.add('zone-pick');
  let none = null;
  const paint = () => { zoneDraw(v.layer, q.zone, []); if (none) none.classList.toggle('hidden', !!q.zone); };
  const ar = () => (v.img.naturalWidth ? Math.min(10, Math.max(0.1, v.img.naturalHeight / v.img.naturalWidth)) : 1);
  v.img.onload = () => { if (q.zone) q.zone.ar = ar(); paint(); };
  v.img.onerror = () => { q.zone = null; v.wrap.replaceWith(el('p', 'error', 'Cette image ne s\'affiche pas : vérifie l\'adresse.')); };
  v.wrap.onclick = (e) => {
    const p = zonePoint(e, v.img);
    q.zone = { x: p.x, y: p.y, r: q.zone ? q.zone.r : ZONE_SIZES.moyenne, ar: ar() };
    paint();
  };
  card.appendChild(v.wrap);
  const row = el('div', 'ans zone-size');
  row.appendChild(el('span', '', 'Taille de la zone :'));
  const range = el('input');
  range.type = 'range';
  range.min = '0.03';
  range.max = '0.2';
  range.step = '0.01';
  range.value = String(q.zone ? q.zone.r : ZONE_SIZES.moyenne);
  range.setAttribute('aria-label', 'Taille de la zone');
  const setR = (r) => { range.value = String(r); if (q.zone) { q.zone.r = r; paint(); } };
  range.oninput = () => setR(Number(range.value));
  row.appendChild(range);
  [['Petite', 'petite'], ['Moyenne', 'moyenne'], ['Grande', 'grande']].forEach(([label, k]) => {
    const b = el('button', 'btn ghost mini', label);
    b.type = 'button';
    b.onclick = () => setR(ZONE_SIZES[k]);
    row.appendChild(b);
  });
  card.appendChild(row);
  none = el('p', 'hint', '👆 Pas encore de zone : touche l\'image.');
  none.classList.toggle('hidden', !!q.zone);
  card.appendChild(none);
}
function renderEditor() {
  const box = $('edQuestions');
  box.innerHTML = '';
  editing.questions.forEach((q, i) => {
    const card = el('div', 'qcard');
    const head = el('div', 'qhead');
    head.appendChild(el('span', '', 'Question ' + (i + 1)));
    const tools = el('span');
    tools.appendChild(miniBtn('ti-arrow-up', () => moveQ(i, -1), 'Monter'));
    tools.appendChild(miniBtn('ti-arrow-down', () => moveQ(i, 1), 'Descendre'));
    tools.appendChild(miniBtn('ti-copy', () => copyQ(i), 'Dupliquer la question'));
    tools.appendChild(miniBtn('ti-trash', () => removeQ(i), 'Supprimer la question'));
    head.appendChild(tools);
    card.appendChild(head);

    const typeRow = el('div', 'ans');
    typeRow.appendChild(el('i', 'ti ti-category'));
    typeRow.appendChild(el('span', '', 'Type :'));
    const sel = el('select');
    Object.keys(TYPE_LABEL).forEach((k) => {
      const o = el('option', '', TYPE_LABEL[k]);
      o.value = k;
      sel.appendChild(o);
    });
    sel.value = q.type;
    sel.onchange = () => { switchType(q, sel.value); renderEditor(); };
    typeRow.appendChild(sel);
    card.appendChild(typeRow);

    let gapPreview = null;
    const gapRefresh = () => {
      if (!gapPreview) return;
      const parts = (q.text || '').split(/_{2,}/);
      const answers = q.choices.map((c) => (c || '').trim()).filter(Boolean);
      gapPreview.textContent = '👀 Les joueurs verront : « ' + (q.text ? q.text.replace(/_{2,}/, '_____') : '…') + ' »' + (answers.length ? '  avec ces choix mélangés : ' + answers.join(' / ') : '') + (parts.length === 2 ? '' : '  (il manque le ___ dans ta phrase)');
    };
    if (q.type === 'gap') card.appendChild(el('p', 'hint', '1. Écris ta phrase. À la place du mot qui manque, tape ___ (trois fois le tiret du bas). Exemple : Le ___ miaule'));
    card.appendChild(textField(q.text, q.type === 'gap' ? 'Ex : Le ___ miaule' : 'Écris ta question', (v) => { q.text = v; gapRefresh(); }));
    const imRow = el('div', 'ans');
    if ((q.image || '').startsWith('data:')) {
      const th = el('img');
      th.src = q.image;
      th.style.cssText = 'height:48px;border-radius:8px';
      imRow.appendChild(th);
      imRow.appendChild(el('span', '', 'Image envoyée'));
      imRow.appendChild(miniBtn('ti-x', () => { q.image = ''; renderEditor(); }, "Retirer l'image"));
    } else {
      const imField = textField(q.image, q.type === 'zone' ? 'Image : adresse internet, ou colle une image ici' : 'Image : adresse internet ou image collée (facultatif)', (v) => { q.image = v; });
      acceptImages(imField, q);
      if (q.type === 'zone') imField.onchange = () => { q.zone = null; renderEditor(); }; // affiche la nouvelle image pour placer la zone
      imRow.appendChild(imField);
      const up = el('button', 'btn ghost mini');
      up.type = 'button';
      up.innerHTML = '<i class="ti ti-photo-up"></i> Depuis mon ordinateur';
      up.onclick = () => pickImage(q, renderEditor);
      imRow.appendChild(up);
    }
    card.appendChild(imRow);
    if (q.type === 'zone') zoneEditor(card, q);

    if (q.type === 'tf') {
      card.appendChild(el('p', 'hint', 'Coche la bonne réponse :'));
      ['Vrai', 'Faux'].forEach((label, k) => {
        const row = el('div', 'ans');
        const radio = el('input');
        radio.type = 'radio';
        radio.name = 'correct' + i;
        radio.checked = q.correct === k;
        radio.setAttribute('aria-label', 'Bonne réponse : ' + label);
        radio.onchange = () => { q.correct = k; };
        row.appendChild(radio);
        row.appendChild(el('span', 'badge c' + (k === 0 ? 3 : 0), k === 0 ? '✔' : '✖'));
        row.appendChild(el('span', '', label));
        card.appendChild(row);
      });
    } else if (q.type === 'gap') {
      card.appendChild(el('p', 'hint', '2. Écris la BONNE réponse, celle qui va à la place du ___ (un seul mot ou quelques mots) :'));
      const good = el('div', 'ans');
      good.appendChild(el('span', 'badge c3', '✔'));
      good.appendChild(textField(q.choices[0], 'Ex : chat', (v) => { q.choices[0] = v; gapRefresh(); }));
      card.appendChild(good);
      card.appendChild(el('p', 'hint', '3. Écris 1 à 3 MAUVAISES réponses (un seul mot par case, pas de phrase) :'));
      for (let k = 1; k < 4; k++) {
        const row = el('div', 'ans');
        row.appendChild(el('span', 'badge c0', '✖'));
        row.appendChild(textField(q.choices[k], k === 1 ? 'Ex : chien' : k === 2 ? 'Ex : cheval (facultatif)' : 'Ex : lion (facultatif)', (v) => { q.choices[k] = v; gapRefresh(); }));
        card.appendChild(row);
      }
      gapPreview = el('p', 'hint');
      gapPreview.style.fontWeight = '800';
      card.appendChild(gapPreview);
      gapRefresh();
    } else if (q.type === 'order') {
      card.appendChild(el('p', 'hint', 'Écris les éléments dans le BON ordre, du premier au dernier (2 à 6). Les joueurs les verront mélangés et devront les remettre dans l\'ordre. Ex : 1. Lever, 2. Petit-déjeuner, 3. Travail :'));
      for (let k = 0; k < 6; k++) {
        const row = el('div', 'ans');
        row.appendChild(el('span', 'badge c' + (k % 4), String(k + 1)));
        row.appendChild(textField(q.choices[k], 'Élément ' + (k + 1) + (k >= 2 ? ' (facultatif)' : ''), (v) => { q.choices[k] = v; }));
        card.appendChild(row);
      }
    } else if (q.type === 'zone') {
      // la bonne réponse est la zone placée sur l'image, plus haut
    } else if (q.type === 'text') {
      card.appendChild(el('p', 'hint', 'Écris la bonne réponse. Si plusieurs réponses sont acceptées, sépare-les par un point-virgule « ; ». Les accents, majuscules et petites fautes sont tolérés :'));
      card.appendChild(textField(q.answers.join('; '), 'Ex : Pacifique; Océan Pacifique', (v) => { q.answers = v.split(';'); }));
    } else {
      const hintTxt = q.type === 'single' ? 'Coche la bonne réponse (2 réponses minimum) :'
        : q.type === 'multi' ? 'Coche toutes les bonnes réponses (2 réponses minimum) :'
          : '2 réponses minimum :';
      card.appendChild(el('p', 'hint', hintTxt));
      for (let k = 0; k < 4; k++) {
        const row = el('div', 'ans');
        if (q.type === 'single') {
          const radio = el('input');
          radio.type = 'radio';
          radio.name = 'correct' + i;
          radio.checked = q.correct === k;
          radio.setAttribute('aria-label', 'Bonne réponse ' + LETTERS[k]);
          radio.onchange = () => { q.correct = k; };
          row.appendChild(radio);
        } else if (q.type === 'multi') {
          const cb = el('input');
          cb.type = 'checkbox';
          cb.checked = q.correct.includes(k);
          cb.setAttribute('aria-label', 'Bonne réponse ' + LETTERS[k]);
          cb.onchange = () => {
            q.correct = cb.checked ? Array.from(new Set([...q.correct, k])) : q.correct.filter((x) => x !== k);
          };
          row.appendChild(cb);
        }
        row.appendChild(el('span', 'badge c' + k, LETTERS[k]));
        row.appendChild(textField(q.choices[k], 'Réponse ' + LETTERS[k] + (k >= 2 ? ' (facultatif)' : ''), (v) => { q.choices[k] = v; }));
        card.appendChild(row);
      }
    }
    const ex = textField(q.explain || '', 'Explication après la réponse (facultatif)', (v) => { q.explain = v; });
    ex.maxLength = 300;
    card.appendChild(ex);
    if (q.type !== 'poll') {
      const bonus = el('label', 'ans bonus');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = q.double;
      cb.onchange = () => { q.double = cb.checked; };
      bonus.appendChild(cb);
      bonus.appendChild(el('i', 'ti ti-star'));
      bonus.appendChild(el('span', '', 'Question bonus (points doublés)'));
      card.appendChild(bonus);
    }
    // Temps propre à la question (utilisé quand « Limiter le temps » est activé)
    const tRow = el('label', 'ans');
    tRow.appendChild(el('i', 'ti ti-clock'));
    tRow.appendChild(el('span', '', 'Temps :'));
    const tSel = el('select');
    tSel.setAttribute('aria-label', 'Temps pour la question ' + (i + 1));
    tSel.appendChild(new Option('comme les réglages de la partie', ''));
    Q_TIMES.forEach((s) => tSel.appendChild(new Option(s + ' secondes', String(s))));
    tSel.value = q.time ? String(q.time) : '';
    tSel.onchange = () => { if (tSel.value) q.time = Number(tSel.value); else delete q.time; };
    tRow.appendChild(tSel);
    card.appendChild(tRow);
    box.appendChild(card);
  });
}
function moveQ(i, d) {
  const j = i + d;
  if (j < 0 || j >= editing.questions.length) return;
  [editing.questions[i], editing.questions[j]] = [editing.questions[j], editing.questions[i]];
  renderEditor();
}
// La copie arrive juste en dessous, prête à être modifiée
function copyQ(i) {
  editing.questions.splice(i + 1, 0, JSON.parse(JSON.stringify(editing.questions[i])));
  renderEditor();
  const card = $('edQuestions').children[i + 1];
  if (card) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
async function removeQ(i) {
  if (editing.questions.length === 1) { $('edError').textContent = 'Un quiz doit avoir au moins une question.'; return; }
  if (!questionEmpty(editing.questions[i])) {
    const ok = await UI.confirm({ title: 'Supprimer cette question ?', name: 'Question ' + (i + 1), text: 'Elle sera effacée de ce quiz.', ok: 'Supprimer', cancel: 'Garder', pose: 'desole' });
    if (!ok) return;
  }
  editing.questions.splice(i, 1);
  renderEditor();
}
// Exemple prêt à modifier : un type de question par carte (seulement si le quiz est encore vide)
const EDITOR_EXAMPLE = [
  { type: 'single', text: 'Quelle est la capitale de la France ?', choices: ['Paris', 'Lyon', 'Marseille', 'Lille'], correct: 0, explain: 'Paris est la capitale depuis plus de mille ans.' },
  { type: 'tf', text: 'Le Soleil est une étoile.', correct: 0 },
  { type: 'multi', text: 'Lesquels sont des mammifères ?', choices: ['Le chat', 'La truite', 'La baleine', 'Le moineau'], correct: [0, 2] },
  { type: 'text', text: 'Qui a peint la Joconde ?', answers: ['Vinci', 'Léonard de Vinci'] },
];
$('edExample').onclick = () => {
  if (!editing.questions.every(questionEmpty)) { $('edError').textContent = 'Il y a déjà des questions : enlève-les d\'abord si tu veux mettre l\'exemple.'; return; }
  $('edError').textContent = '';
  if (!$('edTitle').value.trim()) $('edTitle').value = 'Mon premier quiz';
  editing.questions = EDITOR_EXAMPLE.map(editorQ);
  renderEditor();
};
$('addQ').onclick = () => { editing.questions.push(blankQ()); renderEditor(); window.scrollTo(0, document.body.scrollHeight); };
$('newQuiz').onclick = () => openEditor(null);
$('editQuiz').onclick = () => { const q = currentQuiz(); if (q) (q.kind === 'wheel' ? openWheelEditor(q) : q.kind === 'letters' ? openLettersEditor(q) : q.flavor === 'tfrush' ? openTfEditor(q) : openEditor(q)); };

// ----- Formulaire à lignes (roue et jeu de mots) : une carte par question, une case par information -----
function buildRows(box, rows, defs, what, onChange, blank) {
  box.innerHTML = '';
  rows.forEach((r, i) => {
    const card = el('div', 'card');
    card.style.marginTop = '10px';
    const head = el('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center';
    head.appendChild(el('b', '', what + ' ' + (i + 1)));
    head.appendChild(miniBtn('ti-trash', async () => {
      if (!rowEmpty(r)) {
        const ok = await UI.confirm({ title: 'Supprimer cette ligne ?', name: what + ' ' + (i + 1), text: 'Elle sera effacée de la liste.', ok: 'Supprimer', cancel: 'Garder', pose: 'desole' });
        if (!ok) return;
      }
      rows.splice(i, 1); if (!rows.length) rows.push(blank()); buildRows(box, rows, defs, what, onChange, blank); onChange(); }, 'Supprimer'));
    card.appendChild(head);
    defs.forEach((d) => {
      card.appendChild(el('p', 'hint', d.label));
      const row = el('div', 'ans');
      if (d.badge) row.appendChild(el('span', 'badge ' + d.badge[0], d.badge[1]));
      const inp = textField(r[d.k], d.ph, (v) => { r[d.k] = v; onChange(); });
      inp.maxLength = d.max;
      row.appendChild(inp);
      card.appendChild(row);
    });
    box.appendChild(card);
  });
}
const splitLine = (line) => line.split(/\t|;/).map((x) => x.trim());
