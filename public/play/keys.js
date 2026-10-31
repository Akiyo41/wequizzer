// Répondre au clavier (joueurs sur ordinateur) : A B C D… ou 1 2 3 4… choisissent la réponse, Entrée valide un choix multiple.
// playerKey(touche, nombre de réponses, balise qui a le focus) → numéro de la réponse (0, 1…) ou null
function playerKey(key, count, tag) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return null; // on écrit : pas de raccourci
  const k = String(key || '').toLowerCase();
  let i = -1;
  if (/^[a-h]$/.test(k)) i = k.charCodeAt(0) - 97;
  else if (/^[1-8]$/.test(k)) i = Number(k) - 1;
  return i >= 0 && i < count ? i : null;
}
if (typeof module !== 'undefined') module.exports = { playerKey };
else {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || curScreen !== 'question' || !curQ) return;
    if (document.querySelector('.cbx-back:not(.hidden)')) return; // fenêtre ouverte (« Mes réglages », Quitter…)
    // une case cachée (le pseudo, après « Rejoindre ») peut garder le focus : on ne la compte pas
    const a = document.activeElement;
    const tag = a && a.offsetParent !== null ? a.tagName : 'BODY';
    const buttons = [...document.querySelectorAll('#choices button.choice')];
    if (e.key === 'Enter' && curQ.type === 'multi' && tag !== 'BUTTON') {
      if (!$('multiSend').disabled && !$('multiSend').classList.contains('hidden')) { e.preventDefault(); $('multiSend').click(); }
      return;
    }
    const i = playerKey(e.key, buttons.length, tag);
    if (i === null || buttons[i].disabled) return;
    e.preventDefault();
    buttons[i].click();
  });
}
