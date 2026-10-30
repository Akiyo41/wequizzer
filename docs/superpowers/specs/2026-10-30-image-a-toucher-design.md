# Question « Image à toucher » — conception

Date : 30/10/2026. Choix de l'utilisateur : cartes et schémas, cercle réglable, résultat avec tous les points, toucher puis valider ; façon A (un type de question dans le quiz classique). Il a laissé les détails à Claude (« fais ce que tu veux »).

## Le but

L'animateur montre une image (carte, schéma du corps, plan…) et demande « Touche la France », « Touche le cœur ». Chaque joueur touche l'endroit sur son téléphone. Une seule bonne zone par question.

## Ce qu'on ne fait pas

- Pas de création par l'IA (« Créer avec une IA ») : une IA ne sait pas placer un cercle sur une image. Ce type se crée dans l'éditeur.
- Pas de « quiz carte » séparé (une image pour tout un quiz), pas de plusieurs zones, pas de forme libre ni de rectangle.
- Pas de quiz d'exemple dans la Bibliothèque (il faudrait une image libre de droits).

## Les données

Une question de ce type, dans le quiz enregistré (navigateur, fichier exporté) et envoyée au serveur :

```
{ type: 'zone', text, image, zone: { x, y, r, ar }, double, explain }
```

- `image` : obligatoire (lien `http(s)://…` ou image envoyée, mêmes règles que les autres questions : `cleanImage`).
- `x`, `y` : centre du cercle, en proportion de la largeur et de la hauteur de l'image (0 à 1).
- `r` : rayon, en proportion de la **largeur** de l'image (0,03 à 0,25).
- `ar` : forme de l'image = hauteur / largeur (0,1 à 10), mesurée dans l'éditeur quand l'image se charge. Sert à calculer les distances : un cercle reste rond sur une image en hauteur.
- Tailles proposées par le curseur : petit 0,05, moyen 0,08 (par défaut), grand 0,12, réglage continu de 0,03 à 0,20.

Réponse d'un joueur : `player:answer { point: { x, y } }` (proportions 0 à 1). Toute autre forme est ignorée.

## La règle (fichier partagé `public/zone.js`)

Un seul fichier, utilisé par le serveur (comme `lines.js`), l'éditeur, l'écran de l'animateur et le téléphone :

- `zoneHit(zone, point)` → `true` si `√(dx² + (dy·ar)²) ≤ r + MARGE`, avec `dx = point.x − x`, `dy = point.y − y`, `MARGE = 0,02` (gros doigts).
- `zoneValid(zone)` → la zone a des nombres dans les bornes ci-dessus.
- `zoneDraw(box, img, zone, points)` (navigateur seulement) : pose sur l'image le cercle (si `zone`) et les points (`[{ x, y, ok }]`, vert si `ok`, rouge sinon) en positions relatives (pourcentages), pour que tout suive la taille de l'image.

## Le serveur

- `src/quiz.js` : accepte `type: 'zone'`. Erreurs : « Question n : il faut une image pour une question « image à toucher ». » et « Question n : touche l'image pour placer la bonne zone. » (zone absente ou invalide). L'export du quiz garde `zone`.
- `src/answers.js` :
  - `cleanAnswer` : `{ point: { x, y } }` avec deux nombres entre 0 et 1, sinon `null` ;
  - `isCorrect` : `zoneHit` ;
  - textes (statistiques, « Revoir mes erreurs ») : réponse du joueur « 📍 Dans la bonne zone » ou « 📍 À côté de la bonne zone », bonne réponse « 📍 La zone entourée sur l'image ».
- `src/round.js` :
  - la zone n'est **jamais** envoyée pendant la question (ni aux joueurs ni à l'animateur), seulement au résultat ;
  - l'image est toujours envoyée au téléphone pour ce type, même avec « Seulement sur mon écran » (comme la roue, relier, l'ordre) ;
  - résultats de l'animateur : `zone` et `points: [{ x, y, ok }]` (sans nom, ordre mélangé).
- Rien à changer pour les points, la vitesse, les cœurs, l'élimination, les équipes, le pendu, les titres, les statistiques : ils utilisent `isCorrect`.

## L'éditeur (animateur)

- Nouveau type « 📍 Image à toucher » dans la liste des types (`public/host/base.js`, `editor.js`, `quiz-list.js`).
- Champs : question, image (comme aujourd'hui), puis l'image affichée en grand avec la phrase « Touche l'image à l'endroit de la bonne réponse : » ; toucher pose ou déplace le cercle ; curseur « Taille de la zone » (Petite / Moyenne / Grande). Explication et points doubles comme les autres types.
- Tant qu'il n'y a pas d'image : « Ajoute d'abord une image. » à la place de l'image.
- Vérification avant d'enregistrer (`editor-check.js`) : mêmes messages que le serveur.
- « Tester » (aperçu, `preview.js`) : on peut toucher l'image et voir si c'est juste.

## Le téléphone (joueur)

- L'image en grand, la consigne fixe du Professeur `CONSIGNES.zone` : « Touche le bon endroit sur l'image, puis valide. » (`consigneFor` → `'zone'`), étiquette « Nouveau ! » la première fois.
- Un toucher pose l'épingle 📍 ; toucher ailleurs la déplace ; bouton « Valider » (grisé tant qu'il n'y a pas d'épingle). Avec « Changer sa réponse », on peut revalider avant la fin.
- Résultat : comme les autres questions (Bravo / Raté, bulle du Professeur).

## L'écran de l'animateur (partie)

- Question : l'image en grand ; note « Sur leur téléphone, les joueurs touchent le bon endroit sur l'image. »
- Résultat : l'image avec le cercle et un point par joueur (vert dans la zone, rouge à côté), « 7 / 12 ont trouvé ».

## Ailleurs

- « Créer avec une IA » : ce type n'est pas proposé ; une ligne `zone` dans une réponse d'IA est refusée avec un message clair.
- Aide (FAQ) : une nouvelle question `faq-zone` « Comment faire une question « image à toucher » ? », juste après `faq-roue`.
- Accessibilité : l'image a un texte de remplacement (la question), l'épingle est annoncée (« Épingle posée »), le bouton Valider est nommé.

## Tests

- `tests/zone.js` (sans navigateur) : `zoneHit` (dans le cercle, à côté, juste au bord avec la marge, image en hauteur `ar = 2`) ; `zoneValid` (bornes) ; `validateQuiz` refuse sans image, sans zone, zone hors bornes, et accepte une question correcte ; `cleanAnswer` refuse les points hors 0–1.
- `tests/smoke.js` : une partie avec une question « image à toucher », un joueur dans la zone (juste), un à côté (faux) ; l'animateur reçoit `zone` et deux `points`.
- Navigateur : créer la question dans l'éditeur, la tester, la jouer avec un animateur et deux joueurs.
