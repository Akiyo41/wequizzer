// Réglages fixes et valeurs par défaut

const PORT = process.env.PORT || 3000;
const COUNTDOWN = 3; // secondes avant chaque question
const MAX_PLAYERS = 200;
const MAX_GAMES = 300; // salles ouvertes en même temps sur le serveur (protège la mémoire)
const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🐵', '🦄', '🐯', '🐧', '🐢', '🦉', '🐳', '🐰', '🐨', '🦖', '🐝'];
const REACTIONS = ['👏', '😂', '😮', '🔥', '😢', '❤️'];
const THEMES = ['wequizzer']; // d'autres thèmes (enfant, ados, adulte…) pourront s'ajouter ici
const TIME_CHOICES = [10, 15, 20, 25, 30, 40, 50, 60];
const AUTO_DELAYS = [5, 8, 10, 15];
const READ_DELAYS = [3, 5, 8, 10];
const MODES = ['standard', 'teams', 'elimination', 'hangman'];
const WHEEL_Q_MAX = 60; // longueur max d'une question de la roue
const WHEEL_A_MAX = 25; // longueur max d'une réponse de la roue (elles sont écrites sur la roue)
const WHEEL_MAX = 4; // réponses visibles en même temps sur la roue
const HANG_MAX = 6; // erreurs avant que le pendu soit complet
const MAX_PAIRS = 100;
const TEAMS = [
  { name: 'Rouge', icon: '🔴', color: '#ef4444' },
  { name: 'Bleu', icon: '🔵', color: '#3b82f6' },
  { name: 'Vert', icon: '🟢', color: '#22c55e' },
  { name: 'Jaune', icon: '🟡', color: '#eab308' },
];
const HOST_GRACE_MS = 15 * 60 * 1000; // une salle sans animateur est supprimée après 15 min
const LOBBY_GRACE_MS = 90 * 1000; // un joueur déconnecté dans la salle d'attente est retiré après 90 s

const DEFAULTS = {
  mode: 'standard', // standard | teams | elimination | hangman
  teamCount: 2,
  teamAssign: 'random', // 'random' = au hasard, 'manual' = choisies par l'animateur
  teamNames: ['', '', '', ''], // noms personnalisés ('' = nom par défaut)
  limitTime: false, // false = temps illimité
  time: 20, // secondes si le temps est limité
  readDelay: false,
  readSeconds: 5,
  autoNext: false,
  autoDelay: 8,
  changeAnswer: false,
  bonusQuestions: true,
  shuffleQuestions: false,
  count: 0, // 0 = toutes les questions
  showAnswers: true,
  display: 'both', // 'both' = animateur + joueurs, 'host' = écran de l'animateur seulement
  showExplain: true, // affiche l'explication (si la question en a une) après la réponse
  pairsView: 'wheel', // jeu de paires : 'wheel' = roue, 'match' = relier
  labels: 'letters', // 'letters' = A B C D, 'numbers' = 1 2 3 4
  reactions: false, // masqué pour l'instant (le code reste)
  sounds: true,
  volume: 70,
  theme: 'wequizzer',
  speedBonus: true, // points bonus de rapidité (temps limité seulement, pas avec les cœurs)
  hearts: false, // cœurs : une mauvaise réponse fait perdre un cœur (pas avec le mode élimination ni les points bonus)
  lives: 3, // nombre de cœurs
  reviewErrors: true, // les joueurs peuvent revoir leurs erreurs à la fin
};

module.exports = { PORT, THEMES, TIME_CHOICES, AUTO_DELAYS, READ_DELAYS, MODES, WHEEL_Q_MAX, WHEEL_A_MAX, WHEEL_MAX, MAX_PAIRS, HANG_MAX, TEAMS, COUNTDOWN, AVATARS, MAX_PLAYERS, MAX_GAMES, REACTIONS, HOST_GRACE_MS, LOBBY_GRACE_MS, DEFAULTS };
