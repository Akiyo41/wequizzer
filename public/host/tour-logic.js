// Visite guidée : les étapes et les règles, sans rien afficher (testées par tests/tour-logic.js)
// Pour retoucher un texte du Professeur, c'est ici.
const TourLogic = {
  INVITE: 'Salut ! Je suis le Professeur Quizzo. Je te fais visiter en 1 minute ?',
  // sel : l'élément à éclairer ; card : éclairer la carte qui le contient
  STEPS: [
    { sel: '.join-box', text: 'Tes joueurs scannent ce QR code avec leur téléphone, ou tapent le code. Tu peux aussi leur envoyer le lien avec « Partager » ou « Copier le lien ».' },
    { sel: '#quizSelect', card: true, text: 'Ici, tu choisis le quiz de la partie. Il y en a déjà quelques-uns pour commencer !' },
    { sel: '#paneJouer .card.settings', text: 'Le mode de jeu, le chrono, les équipes… Si un réglage te paraît mystérieux, touche son petit « ? ».' },
    { sel: '#startBtn', card: true, text: 'Les joueurs apparaissent ici en arrivant. Quand tout le monde est là, appuie sur « Lancer le quiz » !' },
    { sel: '#tabQuiz', text: 'Dans « Mes quiz », tu crées tes propres quiz, tu les modifies, et tu pioches dans la Bibliothèque.' },
    { sel: '#openFaq', text: 'Une question ? L\'Aide t\'explique tout. Tu peux même y relancer cette visite. À toi de jouer !' },
  ],
  // La visite n'est proposée qu'une fois, sur l'accueil, et pas quand on reprend une partie en cours
  shouldOffer({ seen, screen, rejoined }) {
    return !seen && screen === 'lobby' && !rejoined;
  },
  // Bulle en haut si l'élément éclairé est dans la moitié basse de l'écran, sinon en bas
  bubbleSide(rect, viewportH) {
    return (rect.top + rect.bottom) / 2 > viewportH / 2 ? 'top' : 'bottom';
  },
};
if (typeof module !== 'undefined') module.exports = TourLogic;
