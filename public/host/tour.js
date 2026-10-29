// Visite guidée de l'écran animateur : voile, zone éclairée, bulle du Professeur et boutons
// Les étapes, les textes et les règles sont dans tour-logic.js
const Tour = (() => {
  const SEEN = 'wequizzer.tourSeen';
  let shade = null; // voile : bloque les clics sur la page
  let hole = null; // zone éclairée (son ombre géante assombrit le reste)
  let box = null; // bulle du Professeur + boutons
  let target = null;
  let side = 'bottom'; // côté de la bulle, choisi une fois par étape
  let align = null; // 'end' : montrer le bas de l'élément s'il est trop grand
  let inviting = false; // l'invitation « Je te fais visiter ? » est affichée
  let waiting = false; // une invitation attend la fin de l'écran d'intro
  let ro = null; // suit les changements de taille de l'accueil (image arrivée en retard, texte qui change…)
  const markSeen = () => LS.set(SEEN, true);
  // Échap ferme (sur l'invitation, ça vaut « Non merci ») ; Tab reste dans la bulle (le voile bloque aussi le clavier)
  function onKey(e) {
    if (e.key === 'Escape') { if (inviting) markSeen(); close(); return; }
    if (e.key !== 'Tab' || !box) return;
    const btns = [...box.querySelectorAll('button')];
    if (!btns.length) return;
    e.preventDefault();
    const i = btns.indexOf(document.activeElement);
    const next = i < 0 ? 0 : (i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length;
    btns[next].focus();
  }
  // Fait défiler pour que l'élément tienne dans la place laissée par la bulle
  function fit() {
    if (!target || !box) return;
    const r = target.getBoundingClientRect();
    if (r.width > 0) scrollBy(0, TourLogic.scrollDelta(r, innerHeight, box.offsetHeight, side, align));
  }
  const onAnim = () => { fit(); place(); }; // les cartes « pop » grandissent en apparaissant : la zone suit

  function build() {
    if (shade) return;
    shade = el('div'); shade.id = 'tourShade';
    hole = el('div'); hole.id = 'tourHole';
    box = el('div'); box.id = 'tourBox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-live', 'polite');
    document.body.append(shade, hole, box);
    addEventListener('resize', place);
    addEventListener('scroll', place, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('animationend', onAnim, true);
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => place());
      ['lobby', 'tabbar'].forEach((id) => { if ($(id)) ro.observe($(id)); });
    }
  }
  function close() {
    if (!shade) return;
    [shade, hole, box].forEach((e) => e.remove());
    shade = hole = box = target = null;
    inviting = false;
    removeEventListener('resize', place);
    removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('animationend', onAnim, true);
    if (ro) { ro.disconnect(); ro = null; }
  }
  // Recale la zone éclairée sur l'élément, et met la bulle du côté où elle ne le cache pas
  function place() {
    if (!shade) return;
    const r = target && target.getBoundingClientRect();
    const visible = !!r && r.width > 0 && r.height > 0; // élément introuvable ou caché : pas de zone éclairée
    shade.classList.toggle('dark', !visible);
    hole.classList.toggle('hidden', !visible);
    if (visible) {
      const m = 8;
      Object.assign(hole.style, { top: r.top - m + 'px', left: r.left - m + 'px', width: r.width + 2 * m + 'px', height: r.height + 2 * m + 'px' });
    }
    const s = visible ? side : 'bottom';
    box.classList.toggle('top', s === 'top');
    box.classList.toggle('bottom', s === 'bottom');
  }
  function btn(label, cls, fn) {
    const b = el('button', 'btn mini' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.onclick = fn;
    return b;
  }
  function render(text, pose, buttons, count) {
    box.innerHTML = '';
    const say = el('div');
    Brand.say(say, text, pose);
    box.appendChild(say);
    const row = el('div', 'tour-row');
    if (count) row.appendChild(el('span', 'tour-count', count));
    buttons.forEach((b) => row.appendChild(b));
    box.appendChild(row);
    buttons[buttons.length - 1].focus(); // le bouton principal (Suivant / Oui) est prêt pour le clavier
  }
  function go(i) {
    inviting = false;
    const s = TourLogic.STEPS[i];
    let t = document.querySelector(s.sel);
    if (t && s.card) t = t.closest('.card');
    target = t;
    align = s.align || null;
    if (t) t.scrollIntoView({ block: 'center' });
    side = t ? TourLogic.bubbleSide(t.getBoundingClientRect(), innerHeight) : 'bottom';
    const last = i === TourLogic.STEPS.length - 1;
    const buttons = [btn('Passer', 'ghost', close)];
    if (i > 0) buttons.push(btn('← Précédent', 'ghost', () => go(i - 1)));
    buttons.push(btn(last ? 'Terminer' : 'Suivant →', '', () => (last ? close() : go(i + 1))));
    render(s.text, 'explication', buttons, i + 1 + ' / ' + TourLogic.STEPS.length);
    fit(); // la bulle est connue : on place l'élément dans la place qu'elle laisse
    place(); // tout de suite, puis après le défilement, puis quand les cartes ont fini d'apparaître
    requestAnimationFrame(place);
    setTimeout(onAnim, 500);
  }
  function start() {
    markSeen();
    show('lobby');
    setTab('jouer');
    build();
    go(0);
  }
  // Invitation « Je te fais visiter ? » ; attend que l'écran d'intro « Commencer » soit fermé.
  // Une seule à la fois, même si on la demande plusieurs fois (reconnexion pendant l'intro).
  function offer() {
    if (shade) return;
    if (document.getElementById('intro')) {
      if (!waiting) { waiting = true; setTimeout(() => { waiting = false; offer(); }, 300); }
      return;
    }
    build();
    target = null;
    inviting = true;
    render(TourLogic.INVITE, 'accueil', [btn('Non merci', 'ghost', () => { markSeen(); close(); }), btn('Oui, vas-y !', '', start)]);
    place();
  }
  // un joueur qui arrive fait bouger la page : la zone éclairée suit
  socket.on('host:players', () => { place(); requestAnimationFrame(place); });
  return { start, offer, close, active: () => !!shade };
})();
