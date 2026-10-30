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
if (typeof module !== 'undefined') module.exports = { makeLeaveGuard };
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
