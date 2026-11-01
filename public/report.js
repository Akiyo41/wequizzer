// « Signaler un problème » (écran animateur : Aide ; écran joueur : Mes réglages).
// Le message part directement de la page vers Web3Forms (l'offre gratuite n'accepte pas les envois
// depuis un serveur). La clé vient du serveur (/api/report-config), lue dans la variable WEB3FORMS_KEY :
// elle n'est jamais écrite dans le code. Aucune donnée personnelle : ni e-mail, ni nom, ni pseudo, ni PIN.
const Report = (() => {
  const CATEGORIES = { bug: "C'est un bug", question: 'Je ne comprends pas quelque chose', idee: "J'ai une idée" };
  const MIN = 5;
  const MAX = 1000;
  const LIMIT = 3; // messages au plus…
  const WINDOW = 10 * 60000; // … par 10 minutes, sur cet appareil
  const KEY_TIMES = 'wequizzer.reportTimes';

  // Prépare ce qui part chez Web3Forms. → { ok: true, body } | { ok: false, error } | { ok: false, robot: true }
  function buildPayload({ key, category, message, screen, ua, width, trap }) {
    if (trap) return { ok: false, robot: true }; // champ piège caché rempli : c'est un robot
    if (!CATEGORIES[category]) return { ok: false, error: 'Choisis le type de message.' };
    const text = String(message || '').replace(/[<>]/g, '').trim(); // aucun HTML
    if (text.length < MIN) return { ok: false, error: 'Ton message est trop court (5 caractères au moins).' };
    if (text.length > MAX) return { ok: false, error: 'Ton message est trop long (1000 caractères au plus).' };
    const lines = [
      'Type : ' + CATEGORIES[category],
      '',
      text,
      '',
      '—',
      'Écran : ' + screen,
      'Navigateur : ' + String(ua || '').replace(/[<>]/g, '').slice(0, 300),
      "Largeur de l'écran : " + Math.round(Number(width) || 0) + ' px',
    ];
    return { ok: true, body: { access_key: key, subject: 'WeQuizzer – ' + CATEGORIES[category], from_name: 'WeQuizzer', message: lines.join('\n') } };
  }

  // Encore permis ? (3 messages au plus dans les 10 dernières minutes)
  function allowed(times, now) {
    return (times || []).filter((t) => now - t < WINDOW).length < LIMIT;
  }

  // Envoi à Web3Forms → true si c'est bien parti
  async function send(body, fetchImpl) {
    try {
      const res = await fetchImpl('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return !!(data && data.success);
    } catch (e) {
      return false;
    }
  }

  // ----- Fenêtre du formulaire (navigateur seulement) -----
  const readTimes = () => { try { return JSON.parse(localStorage.getItem(KEY_TIMES)) || []; } catch (e) { return []; } };
  const saveTimes = (t) => { try { localStorage.setItem(KEY_TIMES, JSON.stringify(t)); } catch (e) { /* rien */ } };
  let key = null;
  let box = null;

  function make(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function build(screen) {
    box = make('div', 'cbx-back hidden');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const inner = make('div', 'cbx report-box');
    const h = make('h3');
    h.appendChild(make('i', 'ti ti-help-circle'));
    h.appendChild(document.createTextNode(' Signaler un problème'));
    inner.appendChild(h);
    inner.appendChild(make('p', 'hint', 'Ton message part sans ton nom ni ton e-mail. Merci de nous aider à améliorer le jeu !'));
    const cats = make('div', 'report-cats');
    Object.keys(CATEGORIES).forEach((k, i) => {
      const lab = make('label', 'set-check');
      const r = make('input');
      r.type = 'radio';
      r.name = 'reportCat';
      r.value = k;
      if (i === 0) r.checked = true;
      lab.appendChild(r);
      lab.appendChild(document.createTextNode(' ' + CATEGORIES[k]));
      cats.appendChild(lab);
    });
    inner.appendChild(cats);
    const ta = make('textarea', 'report-text');
    ta.maxLength = MAX;
    ta.rows = 5;
    ta.placeholder = 'Ton message (5 à 1000 caractères)';
    ta.setAttribute('aria-label', 'Ton message');
    inner.appendChild(ta);
    // champ piège : invisible pour les gens, rempli par les robots
    const trap = make('input', 'report-trap');
    trap.type = 'text';
    trap.tabIndex = -1;
    trap.autocomplete = 'off';
    trap.setAttribute('aria-hidden', 'true');
    inner.appendChild(trap);
    const msg = make('p', 'report-msg');
    msg.setAttribute('role', 'status');
    inner.appendChild(msg);
    const btns = make('div', 'cbx-btns');
    const close = make('button', 'btn big', 'Fermer');
    close.type = 'button';
    const sendBtn = make('button', 'btn big green', 'Envoyer');
    sendBtn.type = 'button';
    btns.appendChild(close);
    btns.appendChild(sendBtn);
    inner.appendChild(btns);
    box.appendChild(inner);
    document.body.appendChild(box);

    const hide = () => box.classList.add('hidden');
    close.onclick = hide;
    box.addEventListener('click', (e) => { if (e.target === box) hide(); });
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    sendBtn.onclick = async () => {
      msg.className = 'report-msg';
      const now = Date.now();
      const times = readTimes().filter((t) => now - t < WINDOW);
      if (!allowed(times, now)) { msg.classList.add('error'); msg.textContent = 'Tu as déjà envoyé 3 messages : réessaie dans quelques minutes.'; return; }
      const cat = (inner.querySelector('input[name="reportCat"]:checked') || {}).value;
      const p = buildPayload({ key, category: cat, message: ta.value, screen, ua: navigator.userAgent, width: window.innerWidth, trap: trap.value });
      if (p.robot) { hide(); return; }
      if (!p.ok) { msg.classList.add('error'); msg.textContent = p.error; return; }
      sendBtn.disabled = true;
      msg.textContent = 'Envoi…';
      const ok = await send(p.body, window.fetch.bind(window));
      sendBtn.disabled = false;
      if (ok) {
        saveTimes(times.concat(now));
        ta.value = '';
        msg.classList.add('ok');
        msg.textContent = 'Merci ! Ton message est bien parti.';
      } else {
        msg.classList.add('error');
        msg.textContent = 'Impossible d\'envoyer pour le moment. Réessaie plus tard.';
      }
    };
    box.open = () => {
      msg.className = 'report-msg';
      msg.textContent = '';
      box.classList.remove('hidden');
      ta.focus();
    };
  }

  // Branche les boutons de la page ; ils restent cachés si le serveur n'a pas de clé
  async function mount(buttons, screen) {
    let cfg = { enabled: false };
    try { cfg = await (await fetch('/api/report-config')).json(); } catch (e) { /* bouton caché */ }
    if (!cfg || !cfg.enabled || !cfg.key) return;
    key = cfg.key;
    build(screen);
    buttons.forEach((b) => {
      b.classList.remove('hidden');
      b.onclick = () => box.open();
    });
  }

  return { buildPayload, allowed, send, mount, CATEGORIES };
})();
if (typeof module !== 'undefined') module.exports = { Report };
