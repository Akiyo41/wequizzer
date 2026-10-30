// Raccourcis clavier de l'animateur pendant la partie (pratique au vidéoprojecteur) :
// Espace ou Entrée = « Voir le résultat » pendant la question, « Question suivante » au résultat ; P = pause / reprise ; + = 10 s de plus.
// F = plein écran (aussi dans la salle d'attente et sur le podium).
// hostKey(touche, écran affiché, balise qui a le focus) → 'skip' | 'next' | 'pause' | 'moreTime' | 'fullscreen' | null
const KEY_GAME_SCREENS = ['countdown', 'reading', 'question', 'results'];
function hostKey(key, screen, tag) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return null; // on écrit : pas de raccourci
  if ((key === 'f' || key === 'F') && (KEY_GAME_SCREENS.includes(screen) || screen === 'lobby' || screen === 'end')) return 'fullscreen';
  if (!KEY_GAME_SCREENS.includes(screen)) return null;
  if (key === 'p' || key === 'P') return 'pause';
  if (key === '+' && screen === 'question') return 'moreTime';
  if (key === ' ' || key === 'Enter') {
    if (tag === 'BUTTON' || tag === 'A') return null; // le navigateur clique déjà sur le bouton qui a le focus
    if (screen === 'question') return 'skip';
    if (screen === 'results') return 'next';
  }
  return null;
}
if (typeof module !== 'undefined') module.exports = { hostKey };
else {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (document.querySelector('.cbx-back') || !$('kickDlg').classList.contains('hidden') || (typeof Tour !== 'undefined' && Tour.active && Tour.active())) return; // fenêtre ouverte
    const screen = screens.find((s) => !$(s).classList.contains('hidden'));
    const action = hostKey(e.key, screen, document.activeElement ? document.activeElement.tagName : 'BODY');
    if (action === 'fullscreen') { if (UI.toggleFullscreen()) e.preventDefault(); return; }
    const btn = action && $({ skip: 'skipBtn', next: 'nextBtn', pause: 'pauseBtn', moreTime: 'moreTimeBtn' }[action]);
    if (!btn || btn.disabled || !btn.getBoundingClientRect().width) return;
    e.preventDefault();
    btn.click();
  });
}
