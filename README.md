# WeQuizzer

Quiz en temps réel : l'animateur crée ses quiz, les joueurs répondent depuis leur téléphone.

## Lancer
1. Installer Node.js (v18+)
2. `npm install`
3. `npm start`
4. Animateur : http://localhost:3000/host.html (PIN + QR code)
5. Joueurs : scanner le QR code, ou ouvrir l'adresse affichée puis PIN + pseudo

## Quiz
- « Nouveau » / « Modifier » : 5 types de questions (choix unique, vrai/faux, plusieurs bonnes réponses, réponse à écrire, sondage), question bonus (points doublés), image facultative.
- « Tester » : parcourir son quiz sans joueurs, avant de lancer.
- « Importer un tableur (CSV) » : depuis Excel / Google Sheets, « Enregistrer sous » CSV. « Modèle de tableur » donne le format.
- Les quiz et les paramètres sont enregistrés dans le navigateur de l'animateur. « Exporter » / « Importer » : fichier .json.

## Pendant la partie
- Reconnexion automatique des joueurs et de l'animateur (si l'animateur se déconnecte, la partie se met en pause).
- Écran des téléphones qui reste allumé, pause, « Quitter », exclusion d'un joueur à tout moment, file d'attente des retardataires.
- L'animateur voit qui n'a pas encore répondu, puis qui a bon / faux avec sa réponse. Aucun point ni rang pendant le quiz.
- Réactions (émojis), modes Standard / Équipes (au hasard ou choisies, avec noms) / Élimination / Pendu en équipe, jeux Relier et Vrai/Faux en rafale, titres amusants et image des résultats à la fin.

## Paramètres
Mode de jeu, limiter le temps (+ durée, bonus de rapidité), délai de lecture, enchaînement automatique, changer sa réponse,
questions bonus, affichage animateur seul ou animateur + joueurs, lettres ou chiffres, réactions, filtre de pseudos,
mélanges, nombre de questions, sons + volume, thème.

## Filtre de pseudos
La liste est dans `blocked-words.txt` (un mot par ligne). Modifie-la puis relance le serveur.

## Enchaîner les quiz
À la fin, « Rejouer ce quiz » ou « Nouvelle partie » : les joueurs (et la file d'attente) restent connectés avec le même PIN.

## Mettre en ligne (gratuit)
Render.com : Web Service, Build Command `npm install`, Start Command `npm start`, plan Free.

## Mettre en ligne (Render, gratuit)

1. Mets ce dossier sur GitHub (le fichier `.gitignore` exclut déjà `node_modules`).
2. Sur render.com : New → Web Service → choisis ton dépôt. Les réglages sont lus dans `render.yaml`
   (Build : `npm install`, Start : `npm start`, offre Free).
3. Ouvre l'adresse obtenue (`https://….onrender.com/host.html`) pour créer la partie : le QR code et le lien seront corrects.

Le site s'endort après ~15 min sans visite (le réveil prend environ une minute). Les quiz restent enregistrés dans le navigateur de l'animateur : utilise toujours le même.

## Roue (type de jeu, brouillon)

- Animateur : « Nouvelle roue » → titre, catégorie (au centre) et une paire par ligne `question ; réponse`. Deux roues d'exemple sont déjà dans la liste.
- La Roue marche avec toutes les règles (standard, équipes, élimination, cœurs, points bonus).
- Joueurs : on fait tourner l'anneau des réponses (doigt ou flèches) puis « Répondre ».
- Score : bonus de rapidité OU cœurs (un seul à la fois, l'autre est grisé).

## Jeu de mots (brouillon)

- « Nouveau jeu de mots » : une ligne par mot `question ; mot ; image (facultatif)`. Les joueurs remettent les lettres mélangées dans l'ordre. Deux exemples sont fournis.

- Nouveautés : explication après la réponse, Compléter la phrase, Remettre dans l'ordre, images envoyées depuis l'ordinateur, statistiques par quiz, bibliothèque de 19 quiz prêts à jouer (`public/library.json`, générée par `tools/make_library.py`).
