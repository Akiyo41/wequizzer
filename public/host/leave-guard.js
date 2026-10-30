// Éditeurs : « Annuler » après une modification demande « Quitter sans enregistrer ? »
// guard.arm(éditeur, lire) mémorise l'état à l'ouverture ; guard.changed(éditeur) dit s'il a changé depuis
function makeLeaveGuard() {
  const start = {};
  const read = {};
  const snap = (k) => JSON.stringify(read[k]());
  return {
    arm(k, fn) { read[k] = fn; start[k] = snap(k); },
    changed(k) { return !!read[k] && snap(k) !== start[k]; },
  };
}
// Une question encore vide se supprime sans demander ; une question remplie demande confirmation
function questionEmpty(q) {
  const full = (s) => String(s || '').trim() !== '';
  return !full(q.text) && !full(q.gapSrc) && !full(q.image) && !full(q.explain) && !(q.choices || []).some(full) && !(q.answers || []).some(full);
}
// Ligne de roue ou de jeu de mots : vide si toutes ses cases sont vides
const rowEmpty = (r) => Object.values(r).every((v) => String(v || '').trim() === '');
if (typeof module !== 'undefined') module.exports = { makeLeaveGuard, questionEmpty, rowEmpty };
else {
  var leaveGuard = makeLeaveGuard(); // eslint-disable-line no-var
  // Bouton « Annuler » d'un éditeur : retour à l'accueil, après confirmation s'il y a des changements
  var leaveEditor = async (k) => { // eslint-disable-line no-var
    if (leaveGuard.changed(k)) {
      const ok = await UI.confirm({ title: 'Quitter sans enregistrer ?', text: 'Tes modifications seront perdues.', ok: 'Quitter', cancel: 'Continuer à modifier', pose: 'question' });
      if (!ok) return;
    }
    show('lobby');
  };
}
