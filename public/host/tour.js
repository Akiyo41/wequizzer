// Visite guidée de l'écran animateur : voile, zone éclairée, bulle du Professeur et boutons
// Les étapes, les textes et les règles sont dans tour-logic.js
const Tour = (() => {
  const SEEN = 'wequizzer.tourSeen';
  let shade = null; // voile : bloque les clics sur la page
  let hole = null; // zone éclairée (son ombre géante assombrit le reste)
  let box = null; // bulle du Professeur + boutons
  let target = null;
  const markSeen = () => LS.set(SEEN, true);
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  function build() {
    if (shade) return;
    shade = el('div'); shade.id = 'tourShade';
    hole = el('div'); hole.id = 'tourHole';
    box = el('div'); box.id = 'tourBox';
    document.body.append(shade, hole, box);
    addEventListener('resize', place);
    addEventListener('scroll', place, true);
    document.addEventListener('keydown', onKey);
  }
  function close() {
    if (!shade) return;
    [shade, hole, box].forEach((e) => e.remove());
    shade = hole = box = target = null;
    removeEventListener('resize', place);
    removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey);
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
    const side = visible ? TourLogic.bubbleSide(r, innerHeight) : 'bottom';
    box.classList.toggle('top', side === 'top');
    box.classList.toggle('bottom', side === 'bottom');
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
  }
  function go(i) {
    const s = TourLogic.STEPS[i];
    let t = document.querySelector(s.sel);
    if (t && s.card) t = t.closest('.card');
    target = t;
    if (t) t.scrollIntoView({ block: 'center' });
    const last = i === TourLogic.STEPS.length - 1;
    const buttons = [btn('Passer', 'ghost', close)];
    if (i > 0) buttons.push(btn('← Précédent', 'ghost', () => go(i - 1)));
    buttons.push(btn(last ? 'Terminer' : 'Suivant →', '', () => (last ? close() : go(i + 1))));
    render(s.text, 'explication', buttons, i + 1 + ' / ' + TourLogic.STEPS.length);
    place(); // tout de suite, puis une fois le défilement terminé
    requestAnimationFrame(place);
  }
  function start() {
    markSeen();
    show('lobby');
    setTab('jouer');
    build();
    go(0);
  }
  // Invitation « Je te fais visiter ? » ; attend que l'écran d'intro « Commencer » soit fermé
  function offer() {
    if (document.getElementById('intro')) { setTimeout(offer, 300); return; }
    build();
    target = null;
    render(TourLogic.INVITE, 'accueil', [btn('Non merci', 'ghost', () => { markSeen(); close(); }), btn('Oui, vas-y !', '', start)]);
    place();
  }
  // un joueur qui arrive fait bouger la page : la zone éclairée suit
  socket.on('host:players', () => { place(); requestAnimationFrame(place); });
  return { start, offer, close, active: () => !!shade };
})();
