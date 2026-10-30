// Enregistrement dans le navigateur (localStorage, environ 5 Mo) : renvoie faux si la mémoire est pleine ou bloquée,
// pour prévenir l'animateur au lieu de perdre son quiz sans rien dire
function trySet(storage, k, v) {
  try { storage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
}
// Place prise par les quiz (en caractères ; un navigateur en garde environ 5 millions) : rien sous 50 %, alerte à partir de 80 %
const STORE_LIMIT = 5000000;
function memoryInfo(chars) {
  const pct = Math.min(100, Math.round((100 * chars) / STORE_LIMIT));
  if (pct < 50) return null;
  if (pct < 80) return { pct, warn: false, text: 'Tes quiz prennent ' + pct + ' % de la place de ce navigateur (surtout à cause des images).' };
  return { pct, warn: true, text: 'Attention : tes quiz prennent ' + pct + ' % de la place de ce navigateur. Enlève des images ou enregistre de vieux quiz dans un fichier avant de les supprimer.' };
}
if (typeof module !== 'undefined') module.exports = { trySet, memoryInfo };
