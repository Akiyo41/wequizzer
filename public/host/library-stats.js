// Bibliothèque de quiz prêts à jouer et statistiques
// ----- Bibliothèque de quiz prêts à l'emploi -----
const KIND_ICON = { quiz: 'ti-help-hexagon', wheel: 'ti-chart-donut-3', letters: 'ti-abc' };
let libPacks = null;
async function openLibPage() {
  show('libPage');
  if (!libPacks) {
    try { libPacks = await (await fetch('/library.json')).json(); }
    catch (e) { $('libList').textContent = 'La bibliothèque ne peut pas être chargée.'; return; }
  }
  const added = LS.get('wequizzer.libAdded', {});
  const box = $('libList');
  box.innerHTML = '';
  let theme = '';
  // recherche : les mots tapés doivent se trouver dans le titre ou le thème
  const query = $('libSearch').value;
  const shown = libPacks.filter((p) => quizMatches({ title: p.title + ' ' + p.theme }, query));
  $('libNone').classList.toggle('hidden', shown.length > 0);
  shown.sort((a, b) => a.theme.localeCompare(b.theme, 'fr')).forEach((p) => {
    if (p.theme !== theme) { theme = p.theme; box.appendChild(el('h3', '', theme)); }
    const n = p.kind === 'wheel' ? p.pairs.length : p.kind === 'letters' ? p.items.length : p.questions.length;
    const kindTxt = p.kind === 'wheel' ? 'paires' : p.kind === 'letters' ? 'mots' : p.flavor === 'tfrush' ? 'affirmations' : 'questions';
    const row = el('div', 'prow');
    row.appendChild(el('i', 'ti ' + (p.flavor === 'tfrush' ? 'ti-bolt' : KIND_ICON[p.kind])));
    const nm = el('span', 'nm', p.title + ' · ' + n + ' ' + kindTxt + ' · ' + p.level);
    row.appendChild(nm);
    const b = el('button', 'btn ghost mini');
    b.type = 'button';
    const label = () => (added[p.pid] ? '<i class="ti ti-check"></i> Ajouté (en rajouter une copie)' : '<i class="ti ti-plus"></i> Ajouter');
    b.innerHTML = label();
    b.onclick = () => {
      const copy = JSON.parse(JSON.stringify(p));
      delete copy.pid; delete copy.theme; delete copy.level;
      copy.id = uid();
      if (copy.kind === 'quiz') delete copy.kind;
      copy.title = freeTitle(p.title, library.map((x) => x.title));
      library.push(copy);
      selectedId = copy.id;
      added[p.pid] = true;
      LS.set('wequizzer.libAdded', added);
      saveLibrary();
      renderQuizSelect();
      pushQuiz();
      b.innerHTML = label();
    };
    row.appendChild(b);
    box.appendChild(row);
  });
}
$('openLib').onclick = () => { $('libSearch').value = ''; openLibPage(); };
$('libSearch').oninput = openLibPage;
$('libBack').onclick = () => show('lobby');

// ----- Statistiques : gardées dans ce navigateur, par quiz -----
const STATS_KEY = 'wequizzer.stats';
function recordStats(d) {
  if (!d.qstats || !d.qstats.length || !selectedId) return;
  const all = LS.get(STATS_KEY, {});
  const st = all[selectedId] || { games: 0, players: 0, qs: {} };
  st.games += 1;
  st.players += d.total || 0;
  d.qstats.forEach((q) => {
    const c = st.qs[q.label] || { ok: 0, total: 0 };
    c.ok += q.ok;
    c.total += q.total;
    st.qs[q.label] = c;
  });
  all[selectedId] = st;
  LS.set(STATS_KEY, all);
}
function renderStats() {
  const all = LS.get(STATS_KEY, {});
  const id = $('statsSelect').value;
  const st = all[id];
  const box = $('statsList');
  box.innerHTML = '';
  if (!st) { $('statsInfo').textContent = 'Pas encore de partie terminée avec ce quiz.'; return; }
  $('statsInfo').textContent = st.games + ' partie' + (st.games > 1 ? 's' : '') + ' jouée' + (st.games > 1 ? 's' : '') + ' · les questions les plus ratées en premier';
  Object.keys(st.qs)
    .map((k) => ({ label: k, pct: st.qs[k].total ? Math.round((100 * st.qs[k].ok) / st.qs[k].total) : 0, total: st.qs[k].total }))
    .sort((a, b) => a.pct - b.pct)
    .forEach((q) => {
      const row = el('div', 'srow');
      row.appendChild(el('div', 'slabel', q.label));
      const bar = el('div', 'sbar');
      const fill = el('div', 'sfill');
      fill.style.width = q.pct + '%';
      fill.style.background = q.pct >= 70 ? '#2fbf71' : q.pct >= 40 ? '#f2b705' : '#e5484d';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('div', 'spct', q.pct + ' % de bonnes réponses (' + q.total + ' réponse' + (q.total > 1 ? 's' : '') + ')'));
      box.appendChild(row);
    });
}
$('openStats').onclick = () => {
  const sel = $('statsSelect');
  sel.innerHTML = '';
  library.forEach((q) => { const o = new Option(q.title, q.id); sel.appendChild(o); });
  if (selectedId) sel.value = selectedId;
  renderStats();
  show('statsPage');
};
$('statsSelect').onchange = renderStats;
$('statsReset').onclick = async () => {
  const sel = $('statsSelect');
  if (!LS.get(STATS_KEY, {})[sel.value]) return;
  const ok = await UI.confirm({ title: 'Effacer les statistiques ?', name: '« ' + sel.options[sel.selectedIndex].text + ' »', text: 'Les résultats des parties déjà jouées avec ce quiz seront oubliés. Le quiz, lui, est gardé.', ok: 'Effacer', cancel: 'Annuler', pose: 'desole' });
  if (!ok) return;
  const all = LS.get(STATS_KEY, {}); delete all[$('statsSelect').value]; LS.set(STATS_KEY, all); renderStats();
  UI.toast('🧹 Statistiques effacées');
};
$('statsBack').onclick = () => show('lobby');
