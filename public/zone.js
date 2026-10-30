// Question « image à toucher » : la bonne zone est un cercle sur l'image. Fichier partagé :
// le serveur s'en sert pour corriger, l'éditeur, le téléphone et l'écran de l'animateur pour dessiner.
// Toutes les positions sont en proportion de l'image (0 à 1) : le cercle tombe au même endroit sur tous les écrans.
// zone = { x, y } centre (part de la largeur / de la hauteur), r rayon (part de la LARGEUR), ar = hauteur / largeur de l'image.
const ZONE_SIZES = { petite: 0.05, moyenne: 0.08, grande: 0.12 };
const ZONE_MARGIN = 0.02; // un peu de marge pour les gros doigts

const zoneNum = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
function zoneValid(z) {
  return !!z && typeof z === 'object' && zoneNum(z.x, 0, 1) && zoneNum(z.y, 0, 1) && zoneNum(z.r, 0.03, 0.25) && zoneNum(z.ar, 0.2, 5);
}
// Le point touché est-il dans le cercle ? (les distances sont comptées en largeurs d'image, d'où ar pour la hauteur)
function zoneHit(z, p) {
  if (!zoneValid(z) || !p || !zoneNum(p.x, 0, 1) || !zoneNum(p.y, 0, 1)) return false;
  const dx = p.x - z.x;
  const dy = (p.y - z.y) * z.ar;
  return Math.sqrt(dx * dx + dy * dy) <= z.r + ZONE_MARGIN + 1e-9;
}
// Dessine sur le calque posé par-dessus l'image : le cercle (si zone) et les points [{ x, y, ok }]
function zoneDraw(layer, z, points) {
  layer.innerHTML = '';
  if (zoneValid(z)) {
    const c = document.createElement('div');
    c.className = 'zone-circle';
    c.style.left = z.x * 100 + '%';
    c.style.top = z.y * 100 + '%';
    c.style.width = z.r * 200 + '%';
    layer.appendChild(c);
  }
  (points || []).forEach((p) => {
    const d = document.createElement('span');
    d.className = 'zone-dot ' + (p.ok ? 'ok' : 'bad');
    d.style.left = p.x * 100 + '%';
    d.style.top = p.y * 100 + '%';
    layer.appendChild(d);
  });
}
// L'image avec son calque de dessin par-dessus : { wrap, img, layer }
function zoneView(src, alt) {
  const wrap = document.createElement('div');
  wrap.className = 'zone-view';
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  img.draggable = false;
  const layer = document.createElement('div');
  layer.className = 'zone-layer';
  wrap.appendChild(img);
  wrap.appendChild(layer);
  return { wrap, img, layer };
}
// Endroit touché sur l'image, en proportion (0 à 1)
function zonePoint(e, img) {
  const b = img.getBoundingClientRect();
  const c = (v) => Math.min(1, Math.max(0, v));
  return { x: c((e.clientX - b.left) / b.width), y: c((e.clientY - b.top) / b.height) };
}
if (typeof module !== 'undefined') module.exports = { ZONE_SIZES, ZONE_MARGIN, zoneValid, zoneHit };
