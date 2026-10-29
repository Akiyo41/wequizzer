# Le Professeur parle sur tous les écrans — conception

Date : 30/10/2026. Validée morceau par morceau avec l'utilisateur.

## But

Le Professeur Quizzo ne parle aujourd'hui que pour l'explication après une question. Il doit aussi réagir sur les autres écrans, avec son ton (tutoiement, drôle, encourageant), pour rendre le jeu plus vivant — sur le téléphone des joueurs comme sur l'écran de l'animateur, souvent projeté devant tout le monde.

## Ce qui est décidé

- **Écrans** : téléphone du joueur ET écran de l'animateur.
- **Variété** : 3 à 5 phrases par situation, tirées au hasard, jamais deux fois de suite la même.
- **Ce que la bulle remplace** : les petites phrases à côté du Professeur. Les gros titres et les chiffres restent (« Bravo ! », « 3 / 5 », code PIN…).
- **Organisation** : un fichier unique `public/lines.js` + une fonction `Brand.line()`.

## Règles

1. **L'explication passe en premier** : si la question a une explication (et que le réglage « Montrer l'explication » est allumé), la bulle montre l'explication, comme aujourd'hui. Sinon, une phrase de réaction.
2. **Les informations utiles restent** : « 💔 Tu perds un cœur… », « 💀 Tu es éliminé… », « ⚡ Question bonus réussie ! », le pendu de l'équipe… restent affichées comme aujourd'hui (sous le gros titre). Seules les phrases génériques « Bonne réponse » et « Mauvaise réponse » sont remplacées par la bulle ; « Prochaine question bientôt… » / « Les résultats arrivent… » restent en bas de l'écran.
3. **Un seul Professeur à l'écran** : sur le téléphone, quand la bulle s'affiche, la mascotte posée au-dessus est cachée (la bulle contient déjà le Professeur), comme pour l'explication aujourd'hui.
4. **Phrases neutres** : on ne connaît pas le genre du joueur ; aucune phrase ne s'accorde au masculin ou au féminin (« Victoire ! » plutôt que « Champion »).
5. **Éliminé d'abord** : au résultat où le joueur est éliminé (ou où le pendu de son équipe est complet), la bulle utilise `elimine`, jamais une phrase qui annonce « la prochaine » (ajouté après la relecture).
6. **Pas de phrase = pas de bulle** : si une situation n'a pas de phrase, la bulle ne s'affiche pas ; rien ne casse.

## Écrans et situations

### Téléphone du joueur

| Écran | Pose | Situation (clé) | Remplace | Garde |
|---|---|---|---|---|
| Salle d'attente | danse | `attente` | « Tu es dans la partie ! Attends que l'animateur lance le quiz… » et la mascotte du haut | avatar, « Salut {pseudo} ! », équipe, roue d'attente |
| File d'attente | recherche | `file` | le paragraphe et la mascotte du haut | « La partie a déjà commencé », roue d'attente |
| Compte à rebours | chrono | `compte` | « Prépare-toi ! » et la mascotte | « Question n sur N », le chiffre |
| Réponse envoyée | réflexion | `envoye` | « On attend les autres joueurs… » et la mascotte | icône, « Réponse envoyée ! », roue d'attente |
| Éliminé | désolé | `elimine` | le paragraphe et la mascotte | 💀, « Tu es éliminé » |
| Résultat juste | bravo | `bravo` (ou `serie` si 3 bonnes réponses d'affilée ou plus) | « Bonne réponse » et la mascotte | « Bravo ! », bonus ×2, compteur « Tes bonnes réponses », série, « Prochaine question bientôt… » |
| Résultat faux | désolé | `rate` | « Mauvaise réponse » et la mascotte | « Raté ! », cœurs, pendu, compteurs |
| Pas de réponse | désolé | `tropTard` | la mascotte | « Pas de réponse », cœurs, pendu, compteurs |
| Sondage | question | `sondage` | la mascotte | « Merci pour ton vote ! » / « Pas de vote » |
| Fin de partie | bravo | `finGagne` (1er, ou 1re équipe, ou dernier survivant), `finPodium` (2e ou 3e), `finAutre` | la mascotte du haut | médaille, titre, statistiques, boutons |

### Écran de l'animateur

| Écran | Pose | Situation (clé) | Où |
|---|---|---|---|
| Compte à rebours | chrono | `animCompte` | à la place de la mascotte au centre |
| Résultats d'une question | (la mascotte du coin garde bravo / désolé) | `animTous` (80 % ou plus de bonnes réponses), `animMoitie` (de 30 % à 79 %), `animPersonne` (moins de 30 %), `animSondage` (sondage) | dans la carte de résultat, à la place de l'explication quand il n'y en a pas ; rien s'il n'y a aucun joueur participant |
| Podium final | bravo | `animPodium` avec `{gagnant}` = « {avatar} {pseudo} » du 1er, ou « l'équipe {nom} » en mode équipes / pendu | à la place de la mascotte au-dessus du podium |

Pas de bulle (inchangés) : accueil de l'animateur (la visite guidée le couvre), écran « Lis bien… », pause, connexion perdue.

## Les phrases (`public/lines.js`)

Trous : `{pseudo}`, `{serie}`, `{gagnant}`.

- **attente** : « Installe-toi, {pseudo}, ça va bientôt commencer ! » · « Échauffe tes neurones, le quiz arrive ! » · « Tu es dans la partie ! On attend que l'animateur lance le quiz… » · « Prends une grande inspiration… le quiz va bientôt démarrer ! »
- **file** : « La partie a déjà commencé, mais je te garde une place pour la prochaine ! » · « Patience ! Tu joueras dès la prochaine partie. Reste sur cette page. » · « Tu es dans la file d'attente : la prochaine partie est pour toi ! »
- **compte** : « Concentre-toi… » · « C'est parti ! » · « Prépare-toi, ça arrive ! » · « Les yeux sur l'écran ! »
- **envoye** : « Réponse dans la boîte ! On attend les autres… » · « C'est noté ! Voyons ce que répondent les autres… » · « Bien reçu ! Le suspense est insoutenable… »
- **elimine** : « Pas de chance ! Reste avec nous, regarde la suite sur le grand écran. » · « Hors jeu, mais toujours avec nous ! Suis la fin de la partie sur l'écran de l'animateur. » · « Ça arrive aux meilleurs ! Regarde comment ça se termine. »
- **bravo** : « Excellent ! » · « Bien joué, {pseudo} ! » · « Tu as tout compris ! » · « Impressionnant ! » · « Je n'aurais pas mieux répondu ! »
- **serie** : « Et de {serie} d'affilée ! Rien ne t'arrête ! » · « {serie} bonnes réponses de suite, tu es en feu ! » · « Série de {serie} ! Continue comme ça ! »
- **rate** : « Pas grave, la prochaine est pour toi ! » · « Presque ! Tu feras mieux à la suivante. » · « On apprend de ses erreurs, c'est comme ça qu'on progresse ! » · « Raté de peu, garde le moral ! »
- **tropTard** : « Trop tard ! Sois plus rapide la prochaine fois. » · « Le temps a filé… Garde l'œil ouvert pour la suivante ! » · « Tu étais dans la lune ? La prochaine, tu ne la rates pas ! »
- **sondage** : « Voyons ce que pensent les autres ! » · « Ton avis compte ! » · « Intéressant… on verra si les autres sont d'accord ! »
- **finGagne** : « Victoire ! Tu as tout déchiré ! » · « Première place ! Je suis fier de toi ! » · « Personne n'a fait mieux que toi, bravo ! »
- **finPodium** : « Sur le podium, bien joué ! » · « Une place sur le podium, chapeau ! » · « Médaille méritée, bravo ! »
- **finAutre** : « Bien joué, tu feras encore mieux la prochaine fois ! » · « Merci d'avoir joué ! On remet ça ? » · « Chaque partie te fait progresser, bravo d'avoir joué ! »
- **animCompte** : « Tout le monde est prêt ? » · « Les téléphones en main ! » · « Silence, ça commence ! » · « 3, 2, 1… on y va ! »
- **animTous** : « Trop fort, cette équipe ! » · « Presque tout le monde a trouvé, bravo ! » · « Facile pour vous, celle-là ! »
- **animMoitie** : « Ça se joue serré ! » · « Les avis sont partagés ! » · « Une question qui divise ! »
- **animPersonne** : « Aïe, celle-là était coriace ! » · « Pas facile, celle-là ! On se rattrape à la suivante ? » · « Même moi, j'ai hésité ! »
- **animSondage** : « Merci pour vos votes ! » · « Voilà ce que vous en pensez ! » · « Intéressant, ces réponses ! »
- **animPodium** : « Bravo à {gagnant} ! Et merci à tous d'avoir joué ! » · « Applaudissements pour {gagnant} ! » · « {gagnant} remporte la partie, bravo ! »

## Fonctionnement

- `public/lines.js` (chargé avant `brand.js` sur `host.html` et `play.html`) déclare `LINES` (les listes ci-dessus) et `pickLine(key, vars, last)` : tire une phrase de `LINES[key]` différente de `last` (sauf s'il n'y en a qu'une), remplace chaque `{nom}` par `vars.nom`, renvoie `''` si la clé n'existe pas. Exporté aussi pour Node (`module.exports`) pour les tests.
- `public/brand.js` : `Brand.line(key, vars)` appelle `pickLine` en retenant la dernière phrase tirée pour chaque clé (pas deux fois de suite la même).
- Chaque écran concerné a un emplacement vide `<div class="say hidden" id="…">` ; quand l'écran s'affiche (à l'événement qui l'affiche), le code fait `Brand.say(emplacement, Brand.line(clé, trous), pose)` et montre l'emplacement (ou le cache si la phrase est vide).

## Fichiers

- Nouveau `public/lines.js` ; nouveau `tests/lines.js` (ajouté à `npm test`).
- `public/brand.js` : `Brand.line`.
- `public/play.html`, `public/host.html` : chargement de `lines.js`, emplacements des bulles à la place des petites phrases.
- `public/play/connection.js` (salle d'attente, file d'attente), `public/play/question.js` (compte à rebours, réponse envoyée), `public/play/results.js` (résultat, éliminé, fin).
- `public/host/game.js` (compte à rebours, résultats, podium).
- `public/style.css` : ajustements de la bulle si besoin.
- `PROJET.md` : où sont les phrases, comment les modifier.
- Serveur : aucun changement.

## Vérification

1. `npm test` : chaque situation a 3 à 5 phrases ; sur 50 tirages, jamais deux fois de suite la même phrase ; les trous sont remplis ; aucune phrase ne contient de trou inconnu (autre que `{pseudo}`, `{serie}`, `{gagnant}`) ; clé inconnue → `''`.
2. Navigateur, téléphone (375 px) et ordinateur : une partie avec un joueur passe par chaque écran du tableau ; chaque bulle montre une phrase de la bonne situation avec la bonne pose ; un seul Professeur à l'écran ; l'explication passe avant la réaction ; cœurs / éliminé / bonus toujours affichés ; aucune erreur dans la console.

## Hors sujet (pour plus tard)

Bulles sur l'accueil de l'animateur, « Lis bien… », pause et connexion perdue ; plusieurs langues ; personnalisation des phrases par l'animateur.
