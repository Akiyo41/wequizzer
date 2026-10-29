# Visite guidée de l'écran animateur — conception

Date : 29/10/2026. Validée morceau par morceau avec l'utilisateur.

## But

Quelqu'un qui ouvre l'écran animateur pour la première fois comprend en 1 minute où sont les choses essentielles : faire venir les joueurs, choisir un quiz, régler la partie, lancer, créer ses quiz, trouver l'aide. Le Professeur Quizzo guide, avec son ton habituel (tutoiement, simple, encourageant).

## Ce qui est décidé

- **Démarrage** : proposée une seule fois, à la première ouverture de l'écran animateur ; relançable à volonté depuis l'Aide.
- **Étendue** : l'accueil de l'animateur seulement (pas d'étapes pendant la partie).
- **Approche** : fait maison, sans bibliothèque (voile sombre + zone mise en lumière + bulle du Professeur `Brand.say`).

## Invitation

À la première arrivée sur l'accueil (QR code affiché), le Professeur apparaît en bas de l'écran avec sa bulle :

> « Salut ! Je suis le Professeur Quizzo. Je te fais visiter en 1 minute ? »

Boutons : **Oui, vas-y !** / **Non merci**.

## Les 6 étapes

Chaque étape éclaire un élément de l'onglet Jouer (ou de la barre d'onglets) et affiche « n / 6 ».

| # | Élément éclairé | Texte du Professeur |
|---|---|---|
| 1 | Carte QR code + code PIN (`.join-box`) | Tes joueurs scannent ce QR code avec leur téléphone, ou tapent le code. Tu peux aussi leur envoyer le lien avec « Partager » ou « Copier le lien ». |
| 2 | Carte « Quiz à jouer » (carte qui contient `#quizSelect`) | Ici, tu choisis le quiz de la partie. Il y en a déjà quelques-uns pour commencer ! |
| 3 | Carte « Réglages de la partie » (`#paneJouer .card.settings`) | Le mode de jeu, le chrono, les équipes… Si un réglage te paraît mystérieux, touche son petit « ? ». |
| 4 | Carte des joueurs + « Lancer le quiz » (carte qui contient `#startBtn`) | Les joueurs apparaissent ici en arrivant. Quand tout le monde est là, appuie sur « Lancer le quiz » ! |
| 5 | Onglet « Mes quiz » (`#tabQuiz`) | Dans « Mes quiz », tu crées tes propres quiz, tu les modifies, et tu pioches dans la Bibliothèque. |
| 6 | Bouton « Aide » (`#openFaq`) | Une question ? L'Aide t'explique tout. Tu peux même y relancer cette visite. À toi de jouer ! |

Boutons à chaque étape : **Passer**, **← Précédent** (absent à l'étape 1), **Suivant →** (« Terminer » à l'étape 6).

## Comportement

- **Une seule fois** : l'invitation n'apparaît que si la clé `wequizzer.tourSeen` n'existe pas dans le navigateur, que l'écran affiché est l'accueil (`lobby`) et que la partie n'a pas été reprise en cours (`rejoined`). À la toute première visite, l'écran d'intro « Commencer » (`#intro`, `Brand.intro`) est affiché : l'invitation attend qu'il soit fermé. Dès qu'on répond (Oui ou Non merci), la clé est enregistrée : l'invitation ne revient plus toute seule.
- **Relancer** : bouton « Revoir la visite guidée » en haut de la page Aide → retour à l'accueil, onglet Jouer, étape 1.
- **Voile** : couvre tout l'écran et bloque les clics (impossible de lancer une partie par accident) ; un « trou » lumineux entouré d'orange laisse voir l'élément de l'étape. Il suit l'élément si la fenêtre change de taille ou si la page défile.
- **Défilement** : la page défile pour amener l'élément au centre de l'écran à chaque étape.
- **Bulle** : en bas de l'écran, ou en haut si l'élément éclairé est dans la moitié basse, pour ne jamais le cacher. Pleine largeur sur téléphone.
- **Fermeture** : Passer, Échap, ou Terminer à la dernière étape. La visite se ferme aussi toute seule si l'écran quitte l'accueil (ex. reprise d'une partie en cours).
- **Joueurs** : s'ils arrivent pendant la visite, ils s'ajoutent normalement à la liste (le voile ne change rien au reste de la page).

## Fichiers

- `public/host/tour.js` (nouveau, chargé juste avant `host/game.js`) : liste des étapes (élément + texte), voile, zone éclairée, bulle, boutons, mémoire `wequizzer.tourSeen`. Fonctions publiques : `Tour.offer()` (invitation si jamais vue) et `Tour.start()` (lance à l'étape 1).
- `public/host/connection.js` : à la réception de `host:created` (hors reprise de partie), appelle `Tour.offer()`.
- `public/host.html` : bouton « Revoir la visite guidée » en haut de la page Aide.
- `public/style.css` : voile, zone éclairée, barre de boutons.
- Serveur : aucun changement.

## Vérification

Dans le navigateur, en largeur ordinateur et téléphone :

1. Première ouverture : l'invitation apparaît. « Non merci », puis recharger : elle ne revient pas.
2. « Revoir la visite guidée » depuis l'Aide : les 6 étapes éclairent le bon élément ; Suivant, Précédent, Passer, Échap et Terminer marchent.
3. La bulle ne cache jamais l'élément éclairé, y compris l'onglet « Mes quiz » en bas.
4. Un joueur qui rejoint pendant la visite apparaît sans rien casser ; un clic sur « Lancer le quiz » à travers le voile ne fait rien.
5. Recharger en pleine partie : pas d'invitation.

## Hors sujet (pour plus tard)

Bulles pendant la première partie, visite côté joueur, textes du Professeur regroupés dans un fichier unique (chantier « bulles sur les autres écrans »).
