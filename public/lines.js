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
  compte: ['Concentre-toi…', 'C\'est parti !', 'Prépare-toi, ça arrive !', 'Les yeux sur l\'écran !'],
  envoye: [
    'Réponse dans la boîte ! On attend les autres…',
    'C\'est noté ! Voyons ce que répondent les autres…',
    'Bien reçu ! Le suspense est insoutenable…',
  ],
  elimine: [
    'Pas de chance ! Reste avec nous, regarde la suite sur le grand écran.',
    'Éliminé, mais pas oublié ! Suis la fin de la partie sur l\'écran de l\'animateur.',
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
    'Le temps a filé… Reste prêt pour la suivante !',
    'Tu étais dans la lune ? La prochaine, tu ne la rates pas !',
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
if (typeof module !== 'undefined') module.exports = { LINES, pickLine };
