// Créer avec une IA / importer un tableur CSV
// ----- Créer avec une IA (tableur CSV) -----
const CSV_HEAD = ['Type', 'Question', 'Réponse A', 'Réponse B', 'Réponse C', 'Réponse D', 'Bonne(s) réponse(s)', 'Bonus', 'Explication'];
const AI_TYPES = [
  { id: 'choix', label: 'Choix unique : 1 bonne réponse parmi 4', on: true,
    rule: 'choix : une question, 4 réponses (colonnes A à D), et la lettre de la bonne réponse (A, B, C ou D).',
    ex: ['choix', 'Quelle est la capitale de la France ?', 'Lyon', 'Paris', 'Marseille', 'Nice', 'B', '', 'Paris est la capitale de la France depuis des siècles.'] },
  { id: 'vrai/faux', label: 'Vrai ou faux', on: true,
    rule: 'vrai/faux : une affirmation (pas une question), colonnes A à D vides, et « vrai » ou « faux » dans la colonne des bonnes réponses.',
    ex: ['vrai/faux', 'Le Soleil est une étoile.', '', '', '', '', 'vrai', '', 'Le Soleil est bien une étoile, la plus proche de la Terre.'] },
  { id: 'multiple', label: 'Plusieurs bonnes réponses', on: false,
    rule: 'multiple : une question, 4 réponses, et les lettres des bonnes réponses séparées par une virgule (ex : A,C). Il y a 2 ou 3 bonnes réponses.',
    ex: ['multiple', 'Quels animaux sont des mammifères ?', 'Dauphin', 'Requin', 'Chauve-souris', 'Pingouin', 'A,C', '', 'Le dauphin et la chauve-souris allaitent leurs petits.'] },
  { id: 'texte', label: 'Réponse à écrire', on: false,
    rule: 'texte : une question dont la réponse est un mot ou un nombre. Colonnes A à D vides. Dans la colonne des bonnes réponses, écris toutes les façons acceptées de répondre, séparées par le signe | (ex : Pacifique|Océan Pacifique).',
    ex: ['texte', 'Quel est le plus grand océan ?', '', '', '', '', 'Pacifique|Océan Pacifique', '', 'Le Pacifique couvre presque un tiers de la planète.'] },
  { id: 'ordre', label: 'Remettre dans l\'ordre', on: false,
    rule: 'ordre : une consigne, colonnes A à D vides, et dans la colonne des bonnes réponses les 2 à 6 éléments DANS LE BON ORDRE, séparés par le signe | (ex : Lever|Déjeuner|Travailler). Chaque élément fait 80 lettres au maximum.',
    ex: ['ordre', 'Range ces planètes de la plus proche à la plus lointaine du Soleil.', '', '', '', '', 'Mercure|Vénus|Terre|Mars', '', 'Mercure est la plus proche du Soleil.'] },
  { id: 'completer', label: 'Compléter la phrase', on: false,
    rule: 'completer : une phrase avec trois tirets du bas ___ à la place du mot manquant (une seule fois). Dans la colonne des bonnes réponses, écris le mot qui manque. Dans les colonnes Réponse A, B et C, écris 1 à 3 MAUVAIS mots (colonne D vide).',
    ex: ['completer', 'Le ___ miaule dans le jardin.', 'chien', 'cheval', '', '', 'chat', '', 'C\'est le chat qui miaule.'] },
  { id: 'roue', label: 'Roue : question courte, réponse courte', on: false,
    rule: 'roue : une question COURTE (60 lettres au maximum). Colonne Réponse A = la BONNE réponse (25 lettres au maximum), colonnes B, C, D = 1 à 3 fausses réponses du même genre (25 lettres au maximum). Colonne des bonnes réponses vide. Chaque bonne réponse doit être différente des autres.',
    ex: ['roue', 'Capitale de l\'Italie ?', 'Rome', 'Milan', 'Naples', 'Venise', '', '', ''] },
  { id: 'mot', label: 'Jeu de mots : deviner un mot', on: false,
    rule: 'mot : Question = une définition ou une devinette. Colonne Réponse A = le mot à trouver (un seul mot, de 3 à 14 lettres, sans espace). Les autres colonnes restent vides.',
    ex: ['mot', 'Animal qui miaule et chasse les souris', 'chat', '', '', '', '', '', ''] },
];
// exemple complet pour le modèle de tableur (une ligne par type)
const CSV_SAMPLE = AI_TYPES.map((t) => t.ex).concat([['sondage', 'Ton fruit préféré ?', 'Pomme', 'Banane', 'Fraise', 'Mangue', '', '', '']]);

function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  // séparateur le plus fréquent sur les premières lignes (des lignes de consignes peuvent précéder le tableau)
  const counts = { ';': 0, ',': 0, '\t': 0 };
  let inQ = false;
  text.split(/\r?\n/).slice(0, 15).forEach((l) => { inQ = false; for (const ch of l) { if (ch === '"') inQ = !inQ; else if (!inQ && ch in counts) counts[ch]++; } });
  const delim = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const rows = [];
  let row = [];
  let cell = '';
  inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}
const plain = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Garde seulement le tableau dans la réponse de l'IA (enlève les phrases autour et les ```)
function aiExtract(text) {
  let t = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const fence = t.match(/```[^\n]*\n([\s\S]*?)```/);
  t = fence ? fence[1] : t.replace(/```[^\n]*/g, '');
  const lines = t.split('\n');
  const isHead = (l) => /^["']?type["']?\s*[;,\t]\s*["']?question/.test(plain(l));
  let start = lines.findIndex(isHead);
  const hasHead = start !== -1;
  if (!hasHead) start = lines.findIndex((l) => l.trim() !== '');
  if (start === -1) return { rows: [], hasHead: false };
  let kept = lines.slice(start);
  const hasDelim = (l) => /[;\t]/.test(l) || (l.match(/,/g) || []).length >= 3;
  while (kept.length && !hasDelim(kept[kept.length - 1])) kept.pop();
  const rows = parseCsv(kept.join('\n'));
  return (!hasHead && csvRemap(rows)) || { rows, hasHead };
}

const AI_TYPE_NAMES = 'choix, multiple, vrai/faux, texte, ordre, completer, roue, mot ou sondage';
// Transforme les lignes en quiz. Tout ou rien : s'il y a une seule erreur, rien n'est créé.
function aiBuild(rows, hasHead) {
  const out = { normal: [], pairs: [], items: [], errors: [] };
  if (hasHead) rows = rows.slice(1);
  if (!rows.length) { out.errors.push('Je ne trouve aucune question dans ce que tu as collé.'); return out; }
  const first = hasHead ? 2 : 1;
  const answersSeen = {};
  rows.forEach((r, i) => {
    const line = i + first;
    const err = (m) => out.errors.push('Ligne ' + line + ' : ' + m);
    const cell = (k) => String(r[k] === undefined ? '' : r[k]).trim();
    const choices = [cell(2), cell(3), cell(4), cell(5)];
    const filled = choices.filter(Boolean);
    const corr = cell(6);
    const pc = plain(corr);
    const t = plain(cell(0));
    const text = cell(1);
    const explain = cell(8).slice(0, 300);
    let type;
    if (/^(vrai|tf|v\/f)/.test(t)) type = 'tf';
    else if (/^(multi|plusieurs)/.test(t)) type = 'multi';
    else if (/^(compl|trou|phrase|texte a trou)/.test(t)) type = 'gap';
    else if (/^(text|ecri|libre|saisie)/.test(t)) type = 'text';
    else if (/^(sond|poll|avis)/.test(t)) type = 'poll';
    else if (/^(ordre|order|class|remett|chrono)/.test(t)) type = 'order';
    else if (/^(roue|wheel|relier|paire)/.test(t)) type = 'wheel';
    else if (/^(mot|lettre|pendu|jeu)/.test(t)) type = 'word';
    else if (/^(choix|single|unique|qcm|simple)/.test(t)) type = 'single';
    else if (/^(zone|image|carte|touch)/.test(t)) return err('les questions « image à toucher » se créent dans l\'éditeur, pas avec une IA.');
    else if (!t) type = filled.length >= 2 ? 'single' : 'text';
    else return err('je ne connais pas le type « ' + cell(0) + ' ». Les types possibles : ' + AI_TYPE_NAMES + '.');
    if (!text) return err('la question est vide.');
    const idx = (s) => {
      const v = plain(s);
      if (/^[a-d]$/.test(v)) return v.charCodeAt(0) - 97;
      if (/^[1-4]$/.test(v)) return Number(v) - 1;
      return -1;
    };
    const tooLong = (arr, max) => arr.some((x) => Array.from(x).length > max);

    if (type === 'wheel') {
      const w = [cell(3), cell(4), cell(5)].filter(Boolean);
      if (!cell(2)) return err('il manque la bonne réponse (colonne « Réponse A »).');
      if (Array.from(text).length > 60) return err('la question est trop longue (60 lettres au maximum) : « ' + text.slice(0, 40) + '… »');
      if (tooLong([cell(2), ...w], 25)) return err('une réponse est trop longue (25 lettres au maximum).');
      if (w.some((x) => plain(x) === plain(cell(2)))) return err('une fausse réponse est la même que la bonne réponse.');
      if (new Set(w.map(plain)).size !== w.length) return err('deux fausses réponses sont identiques.');
      const key = plain(cell(2));
      if (answersSeen[key]) return err('la bonne réponse « ' + cell(2) + ' » existe déjà à la ligne ' + answersSeen[key] + ' : chaque bonne réponse de la roue doit être différente.');
      answersSeen[key] = line;
      out.pairs.push(w.length ? { q: text, a: cell(2), w } : { q: text, a: cell(2) });
      return;
    }
    if (type === 'word') {
      const word = cell(2);
      const image = cell(3);
      const letters = Array.from(word).filter((c) => /[\p{L}\p{N}]/u.test(c)).length;
      if (!word) return err('il manque le mot à trouver (colonne « Réponse A »).');
      if (letters < 3 || letters > 14) return err('le mot « ' + word + ' » doit avoir entre 3 et 14 lettres.');
      if (image && !/^https?:\/\//i.test(image)) return err('le lien de l\'image doit commencer par http (ou laisser la case vide).');
      out.items.push({ q: text, word, image });
      return;
    }
    if (Array.from(text).length > 200) return err('la question est trop longue (200 lettres au maximum).');
    const q = { type, text, image: '', choices: [], correct: 0, answers: [], double: /^(oui|yes|x|1|vrai|bonus)$/.test(plain(cell(7))), explain };
    if (type === 'tf') {
      q.choices = ['Vrai', 'Faux'];
      if (/^(vrai|v|true|oui|1)$/.test(pc)) q.correct = 0;
      else if (/^(faux|f|false|non|0)$/.test(pc)) q.correct = 1;
      else return err('écris « vrai » ou « faux » dans la colonne des bonnes réponses.');
    } else if (type === 'text') {
      q.answers = corr.split('|').map((x) => x.trim()).filter(Boolean).slice(0, 8);
      if (!q.answers.length) return err('écris la ou les réponses acceptées (séparées par « | »).');
    } else if (type === 'order') {
      let items = corr.split(/\s*(?:\||→)\s*/).map((x) => x.trim()).filter(Boolean);
      if (items.length < 2 && !corr && filled.length >= 2) items = filled;
      if (items.length < 2 || items.length > 6) return err('il faut 2 à 6 éléments dans le bon ordre, séparés par « | ».');
      if (tooLong(items, 80)) return err('un élément est trop long (80 lettres au maximum).');
      if (new Set(items.map(plain)).size !== items.length) return err('deux éléments sont identiques.');
      q.choices = items;
      q.double = false;
    } else if (type === 'gap') {
      let sentence = text;
      let word = corr;
      let wrongs = filled;
      const br = sentence.match(/\[([^\[\]]+)\]/);
      if (br && !/_{2,}/.test(sentence)) { sentence = sentence.replace(br[0], '___'); if (!word) word = br[1].trim(); }
      const k = idx(corr);
      if (k !== -1 && choices[k] && corr.length === 1) { word = choices[k]; wrongs = choices.filter((c, j) => c && j !== k); }
      wrongs = wrongs.filter((w) => plain(w) !== plain(word));
      const blanks = sentence.match(/_{2,}/g) || [];
      if (blanks.length !== 1) return err('la phrase doit contenir ___ (trois tirets du bas) une seule fois, à la place du mot manquant.');
      if (!word) return err('il manque le mot qui va à la place du ___ (colonne des bonnes réponses).');
      if (!wrongs.length) return err('il faut au moins 1 mauvaise réponse (colonnes « Réponse A » à « Réponse C »).');
      if (wrongs.length > 3) return err('il faut 3 mauvaises réponses au maximum.');
      if (tooLong([word, ...wrongs], 100)) return err('une réponse est trop longue (100 lettres au maximum).');
      q.type = 'single';
      q.gapSrc = sentence.replace(blanks[0], '[' + word + ']');
      q.text = sentence.replace(blanks[0], '_____');
      q.choices = [word, ...wrongs];
      q.correct = 0;
      q.double = false;
    } else {
      const map = {};
      const kept = [];
      choices.forEach((c, k) => { if (c) { map[k] = kept.length; kept.push(c); } });
      q.choices = kept;
      if (kept.length < 2) return err('il faut au moins 2 réponses.');
      if (tooLong(kept, 100)) return err('une réponse est trop longue (100 lettres au maximum).');
      if (type === 'single') {
        const k = idx(corr);
        if (k === -1 || map[k] === undefined) return err('la bonne réponse est invalide (écris A, B, C ou D, et la case doit être remplie).');
        q.correct = map[k];
      } else if (type === 'multi') {
        const list = corr.split(/[,+;&|\s]+/).map(idx).filter((k) => k !== -1 && map[k] !== undefined).map((k) => map[k]);
        if (!list.length) return err('écris les bonnes réponses, par exemple « A,C ».');
        q.correct = Array.from(new Set(list)).sort();
      } else { q.double = false; q.explain = explain; }
    }
    const bad = validateQ(q);
    if (bad) return err(bad + '.');
    out.normal.push(q);
  });
  if (out.normal.length > 100) out.errors.push('Il y a ' + out.normal.length + ' questions de quiz : 100 au maximum.');
  if (out.pairs.length && out.pairs.length < 3) out.errors.push('La roue a besoin d\'au moins 3 questions (il y en a ' + out.pairs.length + ').');
  if (out.pairs.length > 100) out.errors.push('Une roue peut avoir 100 questions au maximum.');
  if (out.items.length > 100) out.errors.push('Un jeu de mots peut avoir 100 mots au maximum.');
  return out;
}
// Compatibilité : ancien nom utilisé par les tests
function csvToQuestions(rows) {
  const hasHead = rows.length && plain(rows[0][0]) === 'type';
  const o = aiBuild(rows, hasHead);
  if (o.errors.length) throw new Error(o.errors[0]);
  return o.normal;
}

const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
// Crée les quiz à partir de la réponse de l'IA. Renvoie { ok, message } ou { ok:false, errors }
function aiCreate(replyText, titleIn, themeIn) {
  const { rows, hasHead } = aiExtract(replyText);
  const o = aiBuild(rows, hasHead);
  if (o.errors.length) return { ok: false, errors: o.errors };
  const base = String(titleIn || themeIn || 'Quiz IA').trim().slice(0, 60) || 'Quiz IA';
  const kinds = [o.normal.length > 0, o.pairs.length > 0, o.items.length > 0].filter(Boolean).length;
  const made = [];
  const parts = [];
  const taken = library.map((x) => x.title);
  const free = (t) => { const f = freeTitle(t, taken); taken.push(f); return f; };
  if (o.normal.length) {
    const title = free(base);
    made.push({ id: uid(), title, questions: o.normal });
    parts.push(plural(o.normal.length, 'question ajoutée', 'questions ajoutées') + ' au quiz « ' + title + ' »');
  }
  if (o.pairs.length) {
    const title = free(kinds > 1 ? base.slice(0, 52) + ' (roue)' : base);
    made.push({ id: uid(), kind: 'wheel', title, category: base.slice(0, 80), pairs: o.pairs, questions: [] });
    parts.push('une roue de ' + plural(o.pairs.length, 'question', 'questions') + ' créée : « ' + title + ' »');
  }
  if (o.items.length) {
    const title = free(kinds > 1 ? base.slice(0, 51) + ' (mots)' : base);
    made.push({ id: uid(), kind: 'letters', title, items: o.items, questions: [] });
    parts.push('un jeu de mots de ' + plural(o.items.length, 'mot', 'mots') + ' créé : « ' + title + ' »');
  }
  made.forEach((m) => library.push(m));
  selectedId = made[0].id;
  saveLibrary();
  renderQuizSelect();
  pushQuiz();
  const msg = parts.join(' ; ');
  return { ok: true, message: msg.charAt(0).toUpperCase() + msg.slice(1) + '.' };
}

function aiPromptText() {
  const theme = $('aiTheme').value.trim() || '(ton thème ici)';
  const n = Math.max(3, Math.min(100, parseInt($('aiCount').value, 10) || 10));
  const level = $('aiLevel').value;
  const pub = $('aiPublic').value.trim() || 'tout public';
  const chosen = AI_TYPES.filter((t) => $('aiT_' + t.id.replace(/\W/g, '')).checked);
  const types = chosen.length ? chosen : [AI_TYPES[0]];
  const L = [];
  L.push('Tu prépares des questions pour WeQuizzer, un quiz de révision en direct.');
  L.push('Thème : ' + theme + '.');
  L.push('Nombre de questions : ' + n + '. Niveau : ' + level + '. Public : ' + pub + '.');
  L.push('');
  L.push('FORMAT (très important) :');
  L.push('- Réponds avec UN SEUL bloc de code, sans aucune phrase avant ni après.');
  L.push('- Les colonnes sont séparées par un point-virgule ( ; ). N\'écris jamais de point-virgule dans le texte d\'une case.');
  L.push('- La première ligne est EXACTEMENT :');
  L.push(CSV_HEAD.join(';'));
  L.push('- Ensuite, une ligne par question, avec toujours 9 colonnes (laisse vide ce qui ne sert pas).');
  L.push('- Colonne Bonus : toujours vide.');
  L.push('- Colonne Explication : une phrase courte (200 lettres au maximum) qui explique la bonne réponse.');
  L.push('- Les questions doivent être exactes, claires et adaptées au public. Place les bonnes réponses à des endroits variés.');
  L.push('');
  L.push(types.length > 1 ? 'TYPES DE QUESTIONS (répartis les ' + n + ' questions entre ces types) :' : 'TYPE DE QUESTION (toutes les questions sont de ce type) :');
  types.forEach((t) => L.push('- ' + t.rule));
  L.push('');
  L.push('EXEMPLE DE LIGNES :');
  types.forEach((t) => L.push(t.ex.join(';')));
  return L.join('\n');
}
function copyText(text, btn) {
  const done = () => {
    const old = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-check"></i> Copié !';
    setTimeout(() => { btn.innerHTML = old; }, 1800);
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* rien */ }
    ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
}
function aiRefresh() { $('aiPrompt').value = aiPromptText(); }
(function aiInit() {
  $('aiTypes').innerHTML = AI_TYPES.map((t) => '<label style="display:block;margin:4px 0"><input type="checkbox" id="aiT_' + t.id.replace(/\W/g, '') + '"' + (t.on ? ' checked' : '') + '> ' + t.label + '</label>').join('');
  ['aiTheme', 'aiCount', 'aiLevel', 'aiPublic'].forEach((id) => { $(id).oninput = aiRefresh; $(id).onchange = aiRefresh; });
  AI_TYPES.forEach((t) => { $('aiT_' + t.id.replace(/\W/g, '')).onchange = aiRefresh; });
  aiRefresh();
})();
let aiErrText = '';
$('openAi').onclick = () => {
  $('aiErr').textContent = ''; $('aiErrBox').classList.add('hidden'); $('aiOk').classList.add('hidden');
  aiRefresh();
  show('aiPage');
};
$('aiBack').onclick = () => show('lobby');
$('aiCopy').onclick = () => { if (!$('aiTheme').value.trim()) { $('aiTheme').focus(); $('aiErr').textContent = 'Écris d\'abord le thème de ton quiz (étape 1).'; return; } $('aiErr').textContent = ''; copyText($('aiPrompt').value, $('aiCopy')); };
$('aiGo').onclick = () => {
  $('aiErr').textContent = ''; $('aiErrBox').classList.add('hidden'); $('aiOk').classList.add('hidden');
  if (!$('aiReply').value.trim()) { $('aiErr').textContent = 'Colle d\'abord la réponse de l\'IA dans la grande case.'; return; }
  let res;
  try { res = aiCreate($('aiReply').value, $('aiTitle').value, $('aiTheme').value); } catch (e) { res = { ok: false, errors: [e.message || 'Je n\'arrive pas à lire ce tableau.'] }; }
  if (!res.ok) {
    const list = res.errors.slice(0, 10).map((e) => '• ' + e);
    if (res.errors.length > 10) list.push('• … et ' + (res.errors.length - 10) + ' autre(s) erreur(s).');
    $('aiErr').style.whiteSpace = 'pre-wrap';
    $('aiErr').textContent = 'Rien n\'a été créé, car il y a ' + (res.errors.length > 1 ? res.errors.length + ' erreurs' : 'une erreur') + ' dans le tableau :\n' + list.join('\n');
    aiErrText = 'Ton tableau contient des erreurs, rien n\'a pu être importé :\n' + list.join('\n') + '\nCorrige-les et renvoie-moi le tableau COMPLET, dans un seul bloc de code, avec exactement le même format (9 colonnes, séparées par des points-virgules).';
    $('aiErrBox').classList.remove('hidden');
    return;
  }
  $('aiOk').innerHTML = '<b>✔ C\'est fait !</b> ' + res.message.replace(/</g, '&lt;') + '<br><button id="aiSee" class="btn mini" type="button" style="margin-top:8px">Voir mes quiz</button>';
  $('aiOk').classList.remove('hidden');
  $('aiSee').onclick = () => show('lobby');
  $('aiReply').value = '';
};
$('aiErrCopy').onclick = () => copyText(aiErrText, $('aiErrCopy'));
$('aiFile').onclick = () => $('csvFile').click();
$('csvFile').onchange = () => {
  const f = $('csvFile').files[0];
  $('csvFile').value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('aiReply').value = String(r.result); if (!$('aiTitle').value.trim()) $('aiTitle').value = f.name.replace(/\.[^.]+$/, '').slice(0, 60); };
  r.readAsText(f);
};
$('aiTemplate').onclick = () => {
  const esc = (c) => '"' + String(c).replace(/"/g, '""') + '"';
  const csv = [CSV_HEAD, ...CSV_SAMPLE].map((r) => r.map(esc).join(';')).join('\r\n');
  download('modele-wequizzer.csv', '﻿' + csv, 'text/csv');
};
