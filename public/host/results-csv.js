// Tableur des résultats de fin de partie (pour noter une classe, garder une trace…)
// resultsCsv(données de fin, date affichée) → texte CSV (séparateur ;, avec BOM pour qu'Excel lise les accents)
function resultsCsv(d, date) {
  // les cases qui commencent par = + - @ seraient lues comme des formules par le tableur
  const txt = (s) => {
    let v = String(s === undefined || s === null ? '' : s);
    if (/^[=+\-@\t\r]/.test(v)) v = '\'' + v;
    return '"' + v.replace(/"/g, '""') + '"';
  };
  const res = d.results || [];
  const teams = res.some((r) => r.team);
  const hearts = !!d.heartsMode;
  const elim = !hearts && d.mode === 'elimination';
  // une colonne par question notée (Q1, Q2…) : Juste, Faux, ou vide si le joueur n'y a pas joué
  const nq = res.reduce((n, r) => Math.max(n, (r.answers || []).length), 0);
  const qcols = Array.from({ length: nq }, (_, i) => 'Q' + (i + 1));
  const L = ['Quiz;' + txt(d.quizTitle), 'Date;' + date, ''];
  L.push(['Rang', 'Pseudo'].concat(teams ? ['Équipe'] : [], ['Points', 'Bonnes réponses'], hearts ? ['Cœurs'] : [], elim ? ['En jeu'] : [], qcols).join(';'));
  res.forEach((r) => {
    const row = [r.rank, txt(r.name)];
    if (teams) row.push(txt(r.team));
    row.push(r.score, r.correct + ' / ' + (d.questions || 0));
    if (hearts) row.push(r.alive ? (r.hearts || 0) : 'Éliminé');
    if (elim) row.push(r.alive ? 'Oui' : 'Éliminé');
    qcols.forEach((_, i) => { const a = (r.answers || [])[i]; row.push(a === true ? 'Juste' : a === false ? 'Faux' : ''); });
    L.push(row.join(';'));
  });
  if (d.qstats && d.qstats.length) {
    L.push('', 'Question;Bonnes réponses;Réussite');
    d.qstats.forEach((q, i) => L.push(txt((nq ? 'Q' + (i + 1) + ' – ' : '') + q.label) + ';' + q.ok + ' / ' + q.total + ';' + (q.total ? Math.round((100 * q.ok) / q.total) : 0) + ' %'));
  }
  return '﻿' + L.join('\r\n');
}
// « À revoir » sur le podium : les questions sous 60 % de bonnes réponses, les moins réussies d'abord, 3 au plus
function toReview(qstats) {
  return (qstats || [])
    .filter((q) => q.total > 0)
    .map((q) => ({ label: q.label, pct: Math.round((100 * q.ok) / q.total) }))
    .filter((q) => q.pct < 60)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);
}
if (typeof module !== 'undefined') module.exports = { resultsCsv, toReview };
