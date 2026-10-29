// Les phrases du Professeur Quizzo. Pour en changer une, modifie le texte entre guillemets.
// Trous remplis automatiquement : {pseudo} (le joueur), {serie} (bonnes réponses d'affilée), {gagnant} (le 1er ou l'équipe gagnante).
// Les phrases restent neutres : elles marchent pour tout le monde, garçon ou fille.
const LINES = {
  // ----- Téléphone du joueur -----
  attente: [
    'Installe-toi, {pseudo}, ça va bientôt commencer !',
    'Échauffe tes neurones, le quiz arrive !',
    'Tu es dans la partie ! On attend que l\'animateur lance le quiz…',
    'Prends une grande inspiration… le quiz va bientôt démarrer !',
  ],
  file: [
    'La partie a déjà commencé, mais je te garde une place pour la prochaine !',
    'Patience ! Tu joueras dès la prochaine partie. Reste sur cette page.',
    'Tu es dans la file d\'attente : la prochaine partie est pour toi !',
  ],
  lecture: ['Lis bien la question… les réponses arrivent !', 'Prends le temps de bien lire…', 'Lis attentivement, le piège n\'est jamais loin !'],
  pause: [
    'L\'animateur a mis la partie en pause. On souffle un peu !',
    'Petite pause ! Profites-en pour t\'étirer.',
    'Pause ! La partie reprend dans un instant.',
  ],
  pauseCoupure: [
    'L\'animateur a perdu la connexion. Je répare ça, la partie reprendra bientôt !',
    'Oups, l\'animateur a perdu la connexion… On l\'attend, ne quitte pas !',
    'Coupure chez l\'animateur ! La partie reprend dès son retour.',
  ],
  compte: ['Concentre-toi…', 'C\'est parti !', 'Prépare-toi, ça arrive !', 'Les yeux sur l\'écran !'],
  envoye: [
    'Réponse dans la boîte ! On attend les autres…',
    'C\'est noté ! Voyons ce que répondent les autres…',
    'Bien reçu ! Le suspense est insoutenable…',
  ],
  elimine: [
    'Pas de chance ! Reste avec nous, regarde la suite sur le grand écran.',
    'Hors jeu, mais toujours avec nous ! Suis la fin de la partie sur l\'écran de l\'animateur.',
    'Ça arrive aux meilleurs ! Regarde comment ça se termine.',
  ],
  bravo: ['Excellent !', 'Bien joué, {pseudo} !', 'Tu as tout compris !', 'Impressionnant !', 'Je n\'aurais pas mieux répondu !'],
  serie: [
    'Et de {serie} d\'affilée ! Rien ne t\'arrête !',
    '{serie} bonnes réponses de suite, tu es en feu !',
    'Série de {serie} ! Continue comme ça !',
  ],
  rate: [
    'Pas grave, la prochaine est pour toi !',
    'Presque ! Tu feras mieux à la suivante.',
    'On apprend de ses erreurs, c\'est comme ça qu\'on progresse !',
    'Raté de peu, garde le moral !',
  ],
  tropTard: [
    'Trop tard ! Sois plus rapide la prochaine fois.',
    'Le temps a filé… Garde l\'œil ouvert pour la suivante !',
    'Tu étais dans la lune ? La prochaine, tu ne la rates pas !',
  ],
  // dernière question ratée (ou sans réponse) : on ne parle plus de « la suivante »
  dernier: [
    'Dommage pour la dernière ! Place aux résultats…',
    'Raté de peu ! Voyons maintenant le classement…',
    'Pas grave, tu as tout donné ! Les résultats arrivent…',
  ],
  sondage: ['Voyons ce que pensent les autres !', 'Ton avis compte !', 'Intéressant… on verra si les autres sont d\'accord !'],
  finGagne: ['Victoire ! Tu as tout déchiré !', 'Première place ! Je suis fier de toi !', 'Personne n\'a fait mieux que toi, bravo !'],
  finPodium: ['Sur le podium, bien joué !', 'Une place sur le podium, chapeau !', 'Médaille méritée, bravo !'],
  finAutre: [
    'Bien joué, tu feras encore mieux la prochaine fois !',
    'Merci d\'avoir joué ! On remet ça ?',
    'Chaque partie te fait progresser, bravo d\'avoir joué !',
  ],
  // ----- Écran de l'animateur -----
  animAccueil: [
    'Sortez vos téléphones et scannez le QR code !',
    'Plus on est de fous, plus on rit : rejoignez la partie !',
    'Je vous attends ! Scannez le QR code ou tapez le code.',
  ],
  animLecture: ['Lisez bien la question… les réponses arrivent !', 'Prenez le temps de bien lire…', 'Lecture attentive, s\'il vous plaît !'],
  animPause: [
    'Pause ! Les joueurs voient que la partie est en pause.',
    'On souffle un peu… Appuie sur « Reprendre » quand tu veux.',
    'Petite pause, les joueurs attendent sagement !',
  ],
  animPauseCoupure: [
    'La connexion a coupé : la partie s\'est mise en pause toute seule.',
    'Ouf, la connexion est revenue ! Reprends quand tu veux.',
    'Coupure réparée ! Appuie sur « Reprendre » pour continuer.',
  ],
  animCompte: ['Tout le monde est prêt ?', 'Les téléphones en main !', 'Silence, ça commence !', '3, 2, 1… on y va !'],
  animTous: ['Trop fort, cette équipe !', 'Presque tout le monde a trouvé, bravo !', 'Facile pour vous, celle-là !'],
  animMoitie: ['Ça se joue serré !', 'Les avis sont partagés !', 'Une question qui divise !'],
  animPersonne: ['Aïe, celle-là était coriace !', 'Pas facile, celle-là ! On se rattrape à la suivante ?', 'Même moi, j\'ai hésité !'],
  animSondage: ['Merci pour vos votes !', 'Voilà ce que vous en pensez !', 'Intéressant, ces réponses !'],
  animPodium: ['Bravo à {gagnant} ! Et merci à tous d\'avoir joué !', 'Applaudissements pour {gagnant} !', '{gagnant} remporte la partie, bravo !'],
};

// Tire une phrase de la situation `key`, différente de `last` s'il y en a plusieurs, et remplit les trous.
// Renvoie { raw, text } (raw = la phrase avant remplissage, à garder pour le prochain tirage).
function pickLine(key, vars, last) {
  const list = LINES[key];
  if (!list || !list.length) return { raw: '', text: '' };
  const choices = list.length > 1 ? list.filter((s) => s !== last) : list;
  const raw = choices[Math.floor(Math.random() * choices.length)];
  const v = vars || {};
  // une seule passe : une valeur insérée (ex. un pseudo « {serie} ») n'est jamais remplacée à son tour
  const filled = raw.replace(/\{(pseudo|serie|gagnant)\}/g, (_, n) => (v[n] === undefined || v[n] === null ? '' : String(v[n])));
  // une phrase commence par une majuscule, même quand elle commence par un trou (« l'équipe Bleu… » → « L'équipe Bleu… »)
  const text = filled.charAt(0).toLocaleUpperCase('fr') + filled.slice(1);
  return { raw, text };
}
// Résultat d'une question côté joueur → { key, pose } de la phrase du Professeur.
// Éliminé (ou pendu de l'équipe complet) passe avant tout : pas de « la prochaine est pour toi » à ce moment-là.
function resultLine(r) {
  if (r.outNow || (r.hangErrors !== null && r.hangErrors !== undefined && r.hangErrors >= r.hangMax)) return { key: 'elimine', pose: 'desole' };
  if (r.type === 'poll') return { key: 'sondage', pose: 'question' };
  if (r.correct) return { key: r.streak >= 3 ? 'serie' : 'bravo', pose: 'bravo' };
  if (r.last) return { key: 'dernier', pose: 'desole' };
  return { key: r.answered ? 'rate' : 'tropTard', pose: 'desole' };
}
// Fin de partie côté joueur → clé de la phrase. Une seule « première place » : le 1er (ou la 1re équipe) ;
// en élimination / cœurs, les autres survivants vont au podium (2e, 3e) ou avec les autres.
function endLine(d) {
  const teamy = d.mode === 'teams' || d.mode === 'hangman';
  const place = teamy ? d.teamRank : d.rank;
  if (place === 1) return 'finGagne';
  return place && place <= 3 ? 'finPodium' : 'finAutre';
}
// Consignes du Professeur sur le téléphone, selon le type de question. Elles ne varient pas : une consigne
// doit être claire et toujours la même. Choix unique et Vrai/Faux n'en ont pas (il suffit de toucher la réponse).
const CONSIGNES = {
  roue: 'Touche une réponse ou tourne la roue pour la mettre face à la question verte.',
  relier: 'Touche un élément, puis sa réponse. Il faut tout relier, et tout doit être juste !',
  mots: 'Tape les lettres dans le bon ordre, puis valide.',
  ordre: 'Touche les éléments dans le bon ordre : du premier au dernier.',
  multi: 'Plusieurs bonnes réponses : sélectionne-les toutes, puis valide.',
  sondage: 'Sondage : pas de bonne réponse.',
  texte: 'Écris ta réponse : les accents et les petites fautes sont pardonnés !',
};
// Question → clé de sa consigne (ou null)
function consigneFor(q) {
  if (q.wheel) return 'roue';
  if (q.match) return 'relier';
  if (q.letters) return 'mots';
  if (q.order || q.type === 'order') return 'ordre';
  if (q.type === 'multi') return 'multi';
  if (q.type === 'poll') return 'sondage';
  if (q.type === 'text') return 'texte';
  return null;
}
if (typeof module !== 'undefined') module.exports = { LINES, pickLine, resultLine, endLine, CONSIGNES, consigneFor };
