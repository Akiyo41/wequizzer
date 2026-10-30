// Nom de la copie d'un quiz : « Titre (copie) », puis « Titre (copie 2) »… (60 caractères au maximum)
// copyTitle(titre du quiz copié, titres déjà pris) → nouveau titre
function copyTitle(title, taken) {
  const base = String(title || 'Quiz').replace(/\s*\(copie(?: \d+)?\)$/, '').trim() || 'Quiz';
  const used = new Set(taken || []);
  for (let n = 1; ; n++) {
    const tag = n === 1 ? ' (copie)' : ' (copie ' + n + ')';
    const t = base.slice(0, 60 - tag.length).trim() + tag;
    if (!used.has(t)) return t;
  }
}
if (typeof module !== 'undefined') module.exports = { copyTitle };
