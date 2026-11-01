// « Nouveautés et corrections » : la liste des changements, montrée aux animateurs et aux joueurs.
// Pour en ajouter : une ligne EN HAUT de LIST, avec un numéro (id) plus grand que tous les autres.
//   type : 'nouveau' ou 'correction' ; for : 'tous', 'animateur' ou 'joueur'.
// Une pastille sur le bouton compte ce qui n'a pas encore été vu sur cet appareil.
const News = (() => {
  const LIST = [
    { id: 25, date: '2026-11-01', type: 'nouveau', for: 'tous', text: 'Au lancement, un décompte de 5 secondes sur tous les écrans : « La partie démarre dans 5… ».' },
    { id: 24, date: '2026-11-01', type: 'nouveau', for: 'animateur', text: "Salle d'attente : tu vois qui est prêt (✅) ou pas (⏳). Au lancement, tu es prévenu, et tout le monde joue quand même. Tu peux annuler pendant le décompte." },
    { id: 23, date: '2026-11-01', type: 'nouveau', for: 'joueur', text: "Bouton « Je suis prêt » dans la salle d'attente : l'animateur sait quand tu es prêt à jouer." },
    { id: 22, date: '2026-11-01', type: 'nouveau', for: 'tous', text: 'Ce bouton « Nouveautés » : tout ce qui change dans WeQuizzer, au même endroit.' },
    { id: 21, date: '2026-11-01', type: 'nouveau', for: 'tous', text: '« Signaler un problème » : un bug, une question ou une idée, envoyé sans ton nom ni ton e-mail.' },
    { id: 20, date: '2026-11-01', type: 'nouveau', for: 'tous', text: 'Examens blancs (10 questions ou plus) : le pourcentage de réussite à la fin.' },
    { id: 19, date: '2026-11-01', type: 'nouveau', for: 'animateur', text: '« Copier le classement » sur le podium, à coller dans un message ou sur l\'ENT.' },
    { id: 18, date: '2026-11-01', type: 'nouveau', for: 'animateur', text: 'Bibliothèque : boutons de thèmes, « Ajouter les quiz de ce thème » et 3 nouveaux quiz FIMO.' },
    { id: 17, date: '2026-11-01', type: 'nouveau', for: 'animateur', text: 'Mes quiz rangés par thème, avec une case « Thème » dans l\'éditeur.' },
    { id: 16, date: '2026-11-01', type: 'nouveau', for: 'animateur', text: 'Rappel pour enregistrer tes quiz dans un fichier, au cas où.' },
    { id: 15, date: '2026-11-01', type: 'correction', for: 'tous', text: 'Le jeu se charge plus vite (images et icônes gardées par le navigateur).' },
    { id: 14, date: '2026-11-01', type: 'correction', for: 'joueur', text: 'Code de partie faux : un message plus clair.' },
    { id: 13, date: '2026-11-01', type: 'correction', for: 'joueur', text: '« 1er sur 3 » au lieu de « 1e sur 3 » à la fin de la partie.' },
    { id: 12, date: '2026-11-01', type: 'correction', for: 'animateur', text: 'Podium : « 1 pt » au lieu de « 1 pts ».' },
    { id: 11, date: '2026-11-01', type: 'correction', for: 'animateur', text: 'Sur téléphone, la barre du haut ne cache plus le jeu.' },
    { id: 10, date: '2026-10-31', type: 'nouveau', for: 'animateur', text: '« Fermer la salle » : plus de nouveaux joueurs une fois la classe connectée.' },
    { id: 9, date: '2026-10-31', type: 'nouveau', for: 'animateur', text: '« Terminer » : le podium tout de suite, et les questions restantes gardées pour la prochaine fois.' },
    { id: 8, date: '2026-10-31', type: 'nouveau', for: 'joueur', text: 'Après une erreur, la bonne réponse s\'affiche sur ton téléphone.' },
    { id: 7, date: '2026-10-31', type: 'nouveau', for: 'joueur', text: '« Revoir mes erreurs » montre aussi l\'explication de chaque question.' },
    { id: 6, date: '2026-10-31', type: 'nouveau', for: 'animateur', text: '« À revoir avec la classe » montre la bonne réponse des questions les plus ratées.' },
    { id: 5, date: '2026-10-31', type: 'nouveau', for: 'animateur', text: 'Page Stats : « Créer un quiz de révision » avec les questions les moins réussies.' },
    { id: 4, date: '2026-10-31', type: 'nouveau', for: 'tous', text: 'Nouveau type de question : ☁️ Nuage de mots (chacun écrit un mot, sans points).' },
    { id: 3, date: '2026-10-31', type: 'nouveau', for: 'animateur', text: 'Un message te prévient quand un quiz a deux fois la même question.' },
    { id: 2, date: '2026-10-31', type: 'correction', for: 'animateur', text: 'Sondages : ceux qui n\'ont pas répondu apparaissent aussi.' },
    { id: 1, date: '2026-10-31', type: 'correction', for: 'animateur', text: 'Plus de « gagnant » ni de confettis quand personne n\'a eu de bonne réponse.' },
  ];
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const KEY = 'wequizzer.newsSeenId';

  const forScreen = (list, screen) => list.filter((n) => n.for === 'tous' || n.for === screen);
  const unseen = (list, screen, seenId) => forScreen(list, screen).filter((n) => n.id > (seenId || 0)).length;
  function dayLabel(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return (d === 1 ? '1er' : String(d)) + ' ' + MONTHS[m - 1] + ' ' + y;
  }
  // [{ label: '1er novembre 2026', items: [...] }, …], les jours les plus récents d'abord
  function byDay(list) {
    const days = [];
    list.forEach((n) => {
      const last = days[days.length - 1];
      if (last && last.date === n.date) last.items.push(n);
      else days.push({ date: n.date, label: dayLabel(n.date), items: [n] });
    });
    return days.map(({ label, items }) => ({ label, items }));
  }

  // ----- Fenêtre (navigateur seulement) -----
  const readSeen = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch (e) { return 0; } };
  const saveSeen = (id) => { try { localStorage.setItem(KEY, String(id)); } catch (e) { /* rien */ } };
  function make(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  let box = null;
  function build(screen) {
    box = make('div', 'cbx-back hidden');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const inner = make('div', 'cbx news-box');
    const h = make('h3');
    h.appendChild(make('i', 'ti ti-sparkles'));
    h.appendChild(document.createTextNode(' Nouveautés et corrections'));
    inner.appendChild(h);
    const scroll = make('div', 'news-list');
    byDay(forScreen(LIST, screen)).forEach((d) => {
      scroll.appendChild(make('h4', 'news-day', d.label));
      d.items.forEach((n) => {
        const row = make('div', 'news-row');
        row.appendChild(make('span', 'news-tag ' + n.type, n.type === 'nouveau' ? '✨ Nouveau' : '🔧 Correction'));
        row.appendChild(make('span', 'news-text', n.text));
        scroll.appendChild(row);
      });
    });
    inner.appendChild(scroll);
    const btns = make('div', 'cbx-btns');
    const close = make('button', 'btn big', 'Fermer');
    close.type = 'button';
    btns.appendChild(close);
    inner.appendChild(btns);
    box.appendChild(inner);
    document.body.appendChild(box);
    const hide = () => box.classList.add('hidden');
    close.onclick = hide;
    box.addEventListener('click', (e) => { if (e.target === box) hide(); });
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    box.open = () => { box.classList.remove('hidden'); scroll.scrollTop = 0; close.focus(); };
  }

  // Branche les boutons « Nouveautés » d'une page : pastille avec le nombre pas encore vu, effacée à l'ouverture
  function mount(buttons, screen) {
    build(screen);
    const dots = buttons.map((b) => {
      const dot = make('span', 'news-dot hidden');
      b.appendChild(dot);
      return dot;
    });
    const refresh = () => {
      const n = unseen(LIST, screen, readSeen());
      dots.forEach((d) => { d.textContent = String(n); d.classList.toggle('hidden', !n); });
    };
    buttons.forEach((b) => {
      b.onclick = () => {
        saveSeen(Math.max(...LIST.map((x) => x.id)));
        refresh();
        box.open();
      };
    });
    refresh();
  }

  return { LIST, forScreen, unseen, byDay, mount };
})();
if (typeof module !== 'undefined') module.exports = { News };
