// Enregistrement dans le navigateur (localStorage, environ 5 Mo) : renvoie faux si la mémoire est pleine ou bloquée,
// pour prévenir l'animateur au lieu de perdre son quiz sans rien dire
function trySet(storage, k, v) {
  try { storage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
}
if (typeof module !== 'undefined') module.exports = { trySet };
