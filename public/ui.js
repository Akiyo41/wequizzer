// Petits morceaux d'interface communs à l'animateur et aux joueurs :
// - une belle fenêtre de confirmation (à la place de celle du navigateur)
// - le bouton de son, un réglage PERSONNEL (chacun règle le volume sur son propre appareil)
const UI = (() => {
  // UI.confirm({ title, text, ok, cancel, danger }) → Promise<true|false>
  function confirmBox(o) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'cbx-back';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      const box = document.createElement('div');
      box.className = 'cbx';
      if (typeof Brand !== 'undefined') {
        const m = document.createElement('div');
        m.className = 'cbx-mascot';
        m.appendChild(Brand.img(BRAND.poses[o.pose || 'question'] || BRAND.poses.base, 'mascot sm', BRAND.mascotName));
        box.appendChild(m);
      }
      const h = document.createElement('h3'); h.textContent = o.title || 'Tu es sûr ?'; box.appendChild(h);
      if (o.name) { const b = document.createElement('p'); b.className = 'cbx-name'; b.textContent = o.name; box.appendChild(b); }
      if (o.text) { const p = document.createElement('p'); p.textContent = o.text; box.appendChild(p); }
      const row = document.createElement('div'); row.className = 'cbx-btns';
      const no = document.createElement('button'); no.className = 'btn big'; no.type = 'button'; no.textContent = o.cancel || 'Annuler';
      const yes = document.createElement('button'); yes.className = 'btn big ' + (o.danger === false ? 'green' : 'danger'); yes.type = 'button'; yes.textContent = o.ok || 'Oui';
      row.appendChild(no); row.appendChild(yes); box.appendChild(row);
      wrap.appendChild(box);
      document.body.appendChild(wrap);
      const done = (v) => { document.removeEventListener('keydown', key); wrap.remove(); resolve(v); };
      const key = (e) => { if (e.key === 'Escape') done(false); };
      document.addEventListener('keydown', key);
      no.onclick = () => done(false);
      yes.onclick = () => done(true);
      wrap.addEventListener('click', (e) => { if (e.target === wrap) done(false); });
      no.focus();
    });
  }

  // Bouton 🔊 : bruitages (la musique viendra plus tard). Mémorisé dans le navigateur de chacun.
  const KEY = 'wequizzer.sfx';
  function loadSfx() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v.vol === 'number') return v; } catch (e) { /* ignoré */ }
    return { vol: 70 };
  }
  function saveSfx(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignoré */ } }
  // Applique le volume mémorisé (sans afficher de bouton)
  function soundInit() {
    const s = loadSfx();
    if (typeof FX !== 'undefined') { FX.setOn(s.vol > 0); FX.setVol(s.vol); }
  }
  // Une barre de volume « Bruitages » prête à mettre dans un menu
  function soundSlider() {
    const s = loadSfx();
    const wrap = document.createElement('label');
    wrap.className = 'snd-line';
    wrap.innerHTML = '<span>Bruitages</span><input type="range" min="0" max="100" step="5" aria-label="Volume des bruitages"><small>0 = son coupé</small>';
    const range = wrap.querySelector('input');
    range.value = s.vol;
    range.oninput = () => { s.vol = Number(range.value); saveSfx(s); soundInit(); };
    range.onchange = () => { if (typeof FX !== 'undefined' && s.vol > 0) FX.click(); };
    return wrap;
  }
  function soundButton() {
    const s = loadSfx();
    const apply = () => {
      if (typeof FX !== 'undefined') { FX.setOn(s.vol > 0); FX.setVol(s.vol); }
      btn.innerHTML = '<i class="ti ' + (s.vol > 0 ? 'ti-volume' : 'ti-volume-off') + '"></i>';
      btn.title = s.vol > 0 ? 'Son' : 'Son coupé';
    };
    const btn = document.createElement('button');
    btn.className = 'snd-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Régler le son');
    const pop = document.createElement('div');
    pop.className = 'snd-pop hidden';
    pop.innerHTML = '<label>Bruitages<input type="range" min="0" max="100" step="5" aria-label="Volume des bruitages"></label><small>0 = son coupé</small>';
    const range = pop.querySelector('input');
    range.value = s.vol;
    range.oninput = () => { s.vol = Number(range.value); saveSfx(s); apply(); };
    range.onchange = () => { if (typeof FX !== 'undefined' && s.vol > 0) FX.click(); };
    btn.onclick = (e) => { e.stopPropagation(); pop.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => { if (!pop.contains(e.target) && e.target !== btn) pop.classList.add('hidden'); });
    document.body.appendChild(btn);
    document.body.appendChild(pop);
    document.body.classList.add('has-snd');
    apply();
  }
  return { confirm: confirmBox, soundButton, soundInit, soundSlider };
})();
