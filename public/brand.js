// Identité du jeu : tout ce qui touche au nom et à la mascotte est ICI (un seul endroit à modifier).
// Migration unique : récupère les données enregistrées sous l'ancien nom (aucune perte pour les quiz déjà créés)
(function migrate() {
  try {
    Object.keys(localStorage).filter((k) => k.indexOf('quizflash.') === 0).forEach((k) => {
      const nk = 'wequizzer.' + k.slice('quizflash.'.length);
      if (localStorage.getItem(nk) === null) localStorage.setItem(nk, localStorage.getItem(k));
      localStorage.removeItem(k);
    });
  } catch (e) { /* stockage indisponible : on ignore */ }
})();
const BRAND = {
  name: 'WeQuizzer',
  startLabel: 'Commencer',
  mascotName: 'Professeur Quizzo',
  logo: '/img/logo.webp',
  poses: {
    base: '/img/prof-base.webp',
    accueil: '/img/prof-accueil.webp',
    question: '/img/prof-question.webp',
    reflexion: '/img/prof-reflexion.webp',
    bravo: '/img/prof-bravo.webp',
    desole: '/img/prof-desole.webp',
    reparation: '/img/prof-reparation.webp',
    recherche: '/img/prof-recherche.webp',
    danse: '/img/prof-danse.webp',
    explication: '/img/prof-explication.webp',
    chrono: '/img/prof-chrono.webp',
  },
};
const Brand = (() => {
  function img(src, cls, alt) {
    const i = document.createElement('img');
    i.loading = 'lazy'; // une image cachée n'est téléchargée que le jour où elle s'affiche
    i.onerror = () => { i.style.display = 'none'; }; // image introuvable : on la cache plutôt que d'afficher une icône cassée
    i.src = src; i.className = cls; i.alt = alt || ''; i.draggable = false;
    return i;
  }
  // <span data-logo></span> → logo ; <span data-mascot="accueil" data-size="lg"></span> → mascotte
  function apply(root) {
    (root || document).querySelectorAll('[data-logo]').forEach((e) => {
      if (!e.firstChild) e.appendChild(img(BRAND.logo, 'brand-logo', BRAND.name));
    });
    (root || document).querySelectorAll('[data-mascot]').forEach((e) => {
      e.textContent = '';
      e.appendChild(img(BRAND.poses[e.dataset.mascot] || BRAND.poses.base, 'mascot ' + (e.dataset.size || ''), BRAND.mascotName));
    });
    document.querySelectorAll('[data-brand-name]').forEach((e) => { e.textContent = BRAND.name; });
    document.querySelectorAll('[data-mascot-name]').forEach((e) => { e.textContent = BRAND.mascotName; });
  }
  // ----- Écran de démarrage (commun joueur / animateur / accueil) -----
  function intro(onGo) {
    const o = document.createElement('div');
    o.id = 'intro'; o.className = 'intro';
    const add = (parent, src, cls) => { const i = img(src, 'deco ' + cls); parent.appendChild(i); return i; };
    const box = document.createElement('div'); box.className = 'intro-box';
    box.appendChild(img(BRAND.logo, 'brand-logo intro-logo', BRAND.name));
    box.appendChild(img(BRAND.poses.question, 'mascot intro-mascot', BRAND.mascotName));
    const b = document.createElement('button'); b.className = 'btn big intro-go'; b.textContent = BRAND.startLabel || 'Commencer';
    b.onclick = () => { o.classList.add('out'); setTimeout(() => o.remove(), 350); if (onGo) onGo(); };
    box.appendChild(b);
    o.appendChild(box);
    document.body.appendChild(o);
    return o;
  }
  // Image chargée tout de suite et gardée prête (pour l'écran « connexion perdue » : il faut l'avoir AVANT la coupure)
  function preload(pose, cls) {
    const i = document.createElement('img');
    i.className = 'mascot ' + (cls || ''); i.alt = BRAND.mascotName; i.draggable = false;
    i.onerror = () => { i.style.display = 'none'; };
    i.src = BRAND.poses[pose] || BRAND.poses.base;
    return i;
  }
  function setPose(el, pose) { if (el) { el.dataset.mascot = pose; apply(el.parentNode); } }
  // Le Professeur parle : sa pose à gauche, une bulle de BD avec le texte à droite (box reçoit la classe « say »)
  function say(box, text, pose) {
    box.textContent = '';
    box.classList.add('say');
    box.appendChild(img(BRAND.poses[pose || 'explication'] || BRAND.poses.base, 'mascot', BRAND.mascotName));
    const b = document.createElement('div');
    b.className = 'say-bubble';
    b.textContent = text;
    box.appendChild(b);
  }
  // Une phrase du Professeur pour la situation `key` (phrases dans lines.js), jamais deux fois de suite la même
  const lastLine = {};
  function line(key, vars) {
    if (typeof pickLine !== 'function') return '';
    const p = pickLine(key, vars, lastLine[key] || null);
    lastLine[key] = p.raw;
    return p.text;
  }
  document.addEventListener('DOMContentLoaded', () => { apply(); });
  return { apply, setPose, img, intro, preload, say, line };
})();
