# Question « Image à toucher » — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**But :** un nouveau type de question `zone` : une image, une bonne zone en cercle, le joueur touche l'endroit sur son téléphone.

**Architecture :** une règle unique dans `public/zone.js` (chargé par le serveur comme `lines.js`, et par les pages). Le serveur valide, corrige et envoie les points au résultat. L'éditeur, le téléphone et l'écran de l'animateur dessinent cercle et points en positions relatives (%).

**Technique :** Node ≥ 18, Express, Socket.IO, JavaScript navigateur sans outil de construction (scripts classiques qui partagent l'espace global). Tests : `node tests/*.js` (`npm test`).

**Conception :** `docs/superpowers/specs/2026-10-30-image-a-toucher-design.md` (à lire avec ce plan).

## Contraintes générales

- Textes en français, tutoiement, neutres (aucun accord avec le joueur).
- Question enregistrée : `{ type: 'zone', text, image, zone: { x, y, r, ar }, double, explain }` ; `x`, `y` dans [0, 1] ; `r` dans [0,03 ; 0,25] ; `ar` dans [0,2 ; 5].
- Tailles du curseur : petite 0,05, moyenne 0,08 (défaut), grande 0,12, continu de 0,03 à 0,20.
- `MARGE = 0,02`. Juste si `√(dx² + (dy·ar)²) ≤ r + MARGE`.
- Réponse : `player:answer { point: { x, y } }`.
- La zone n'est jamais envoyée pendant la question ; seulement dans les résultats de l'animateur.
- Messages du serveur (exacts) : « Question n : il faut une image pour une question « image à toucher ». » et « Question n : touche l'image pour placer la bonne zone. »
- Textes de réponse : « 📍 Dans la bonne zone », « 📍 À côté de la bonne zone », bonne réponse « 📍 La zone entourée sur l'image ».
- Consigne : « Touche le bon endroit sur l'image, puis valide. »
- Pas de cache dans `sw.js`. Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Points d'attention pour la relecture

1. Image en hauteur ou très large : le cercle doit rester rond et la correction juste (`ar`). Test `zoneHit` avec `ar = 2` (tâche 1).
2. Réponse trafiquée (point hors 0–1, texte, `NaN`) : ignorée, pas d'erreur serveur. Test `cleanAnswer` (tâche 2).
3. « Seulement sur mon écran » : le téléphone doit quand même recevoir l'image d'une question `zone`. Test dans le smoke (tâche 2).
4. « Rejouer les questions ratées » / export : la zone doit survivre à l'aller-retour. Test `exportQuiz` (tâche 2).
5. La zone ne fuit pas avant le résultat (ni joueur ni animateur). Test smoke (tâche 2).

---

### Tâche 1 : la règle partagée `public/zone.js`

**Fichiers :** créer `public/zone.js`, `tests/zone.js` ; modifier `package.json` (ajouter `node tests/zone.js` avant `smoke.js`).

**Interfaces produites :**
- `ZONE_SIZES = { petite: 0.05, moyenne: 0.08, grande: 0.12 }`, `ZONE_MARGIN = 0.02`
- `zoneValid(zone) → boolean`
- `zoneHit(zone, point) → boolean` (`false` si point ou zone invalide)
- `zoneDraw(box, zone, points)` (navigateur) : vide `box` (un conteneur `position:relative` qui contient déjà l'`<img>`… → voir ci-dessous) et y ajoute un `div.zone-circle` (si `zone`) et des `span.zone-dot.ok|.bad` positionnés en `%` (`left = x*100%`, `top = y*100%` ; largeur du cercle `2r*100%` de la largeur, `aspect-ratio: 1`).
  Convention : `box` est un `div.zone-layer` posé par-dessus l'image (`position:absolute; inset:0`). `zoneDraw` ne touche que ce calque.
- `module.exports = { ZONE_SIZES, ZONE_MARGIN, zoneValid, zoneHit }` si `module` existe.

- [ ] **Étape 1 : écrire `tests/zone.js`** (même style que `tests/lines.js`) :
```js
const z = { x: 0.5, y: 0.5, r: 0.1, ar: 1 };
assert.strictEqual(zoneHit(z, { x: 0.5, y: 0.5 }), true);
assert.strictEqual(zoneHit(z, { x: 0.61, y: 0.5 }), true);   // dans la marge
assert.strictEqual(zoneHit(z, { x: 0.63, y: 0.5 }), false);
assert.strictEqual(zoneHit({ x: 0.5, y: 0.5, r: 0.1, ar: 2 }, { x: 0.5, y: 0.56 }), true);  // 0,06×2 = 0,12 ≤ 0,12
assert.strictEqual(zoneHit({ x: 0.5, y: 0.5, r: 0.1, ar: 2 }, { x: 0.5, y: 0.57 }), false);
assert.strictEqual(zoneHit(z, { x: 'a', y: 0.5 }), false);
assert.strictEqual(zoneValid({ x: 0, y: 1, r: 0.03, ar: 0.2 }), true);
[{ x: -0.1, y: 0.5, r: 0.1, ar: 1 }, { x: 0.5, y: 0.5, r: 0.3, ar: 1 }, { x: 0.5, y: 0.5, r: 0.1, ar: 6 }, null].forEach((b) => assert.strictEqual(zoneValid(b), false));
```
- [ ] **Étape 2 :** `node tests/zone.js` → ÉCHEC (fichier absent).
- [ ] **Étape 3 :** écrire `public/zone.js` (fonctions ci-dessus ; `zoneDraw` seulement si `typeof document !== 'undefined'` à l'appel).
- [ ] **Étape 4 :** `node tests/zone.js` → tout « ok ».
- [ ] **Étape 5 :** commit « Image à toucher : règle partagée zone.js ».

### Tâche 2 : le serveur

**Fichiers :** `src/quiz.js`, `src/answers.js`, `src/round.js` ; tests `tests/zone.js`, `tests/smoke.js`.

**Consomme :** `zoneValid`, `zoneHit` (`require('../public/zone.js')`).
**Produit :** résultats animateur avec `zone` et `points: [{ x, y, ok }]` (mélangés, sans nom) quand `type === 'zone'` ; `counts = [justes, faux]` comme pour `text`.

- [ ] **Étape 1 : tests** dans `tests/zone.js` :
  - `validateQuiz({ title: 'T', questions: [{ type: 'zone', text: 'Où ?', image: 'https://a.b/c.png', zone: { x: .5, y: .5, r: .08, ar: 1 } }] })` → pas d'`error`, question `type === 'zone'` avec `zone` identique ;
  - sans image → `error` exact « Question 1 : il faut une image pour une question « image à toucher ». » ; zone absente ou `r: 0.5` → « Question 1 : touche l'image pour placer la bonne zone. » ;
  - `cleanAnswer(qZone, { point: { x: .2, y: .3 } })` → `{ x: .2, y: .3 }` ; `{ point: { x: 1.2, y: .3 } }`, `{ point: 'a' }`, `{ index: 0 }` → `null` ;
  - `isCorrect(qZone, { x: .5, y: .5 })` → `true` ; `{ x: .9, y: .9 }` → `false` ;
  - export (fonction de `src/quiz.js` ligne ~240, utilisée par « Rejouer les questions ratées ») garde `zone`.
  Smoke (`tests/smoke.js`) : partie avec une question `zone` (image `https://example.com/a.png`) et `display: 'host'` : le joueur reçoit `question` avec `image` et **sans** `zone` ; l'animateur reçoit `question` sans `zone` ; joueur 0 répond `{ point: { x: .5, y: .5 } }` (juste), joueur 1 `{ point: { x: .95, y: .95 } }` (faux) ; `results.zone` présent, `results.points.length === 2`, un `ok` vrai et un faux ; `results.counts` = `[1, 1]`.
- [ ] **Étape 2 :** lancer → ÉCHEC.
- [ ] **Étape 3 :** code :
  - `src/quiz.js` : `'zone'` dans la liste des types ; validation (messages exacts) ; `q.zone = { x, y, r, ar }` (nombres recopiés) ; pas de mélange de choix ; export : `zone` en plus.
  - `src/answers.js` : `cleanAnswer` (point valide → `{ x, y }`) ; `isCorrect` → `zoneHit(q.zone, answer)` ; `shownAnswer` / `mistakeEntry` (« yours ») → « 📍 Dans la bonne zone » / « 📍 À côté de la bonne zone » ; `correctText` → « 📍 La zone entourée sur l'image ».
  - `src/round.js` : `q.type !== 'zone'` ajouté aux exceptions de `display === 'host'` (ligne ~58) ; `counts` comme `text` ; `hostResults.zone` et `hostResults.points` (participants qui ont répondu, `ok = lastCorrect`, ordre mélangé).
- [ ] **Étape 4 :** `npm test` → tout passe.
- [ ] **Étape 5 :** commit « Image à toucher : serveur ».

### Tâche 3 : l'éditeur et l'aperçu (animateur)

**Fichiers :** `public/host.html` (script `zone.js` après `lines.js`, dans `host.html` **et** `play.html`), `public/host/base.js` (`TYPE_LABEL.zone = '📍 Image à toucher'`), `public/host/quiz-list.js` (`normQ` garde `zone` ; `quizPayload` envoie `zone`), `public/host/editor.js`, `public/host/editor-check.js`, `public/host/preview.js`, `public/style.css` ; test `tests/zone.js` (contrôles statiques).

**Consomme :** `ZONE_SIZES`, `zoneValid`, `zoneDraw`.

- [ ] **Étape 1 : tests statiques** : `TYPE_LABEL` contient `zone:` ; `quiz-list.js` passe `zone` dans `quizPayload` ; `editor-check.js` contient les deux messages exacts ; `host.html` et `play.html` chargent `zone.js` avant les scripts `host/` et `play/`.
- [ ] **Étape 2 :** lancer → ÉCHEC.
- [ ] **Étape 3 :** code :
  - Éditeur, type `zone` : sous le champ image, « Touche l'image à l'endroit de la bonne réponse : » puis `div.zone-pick` (`position:relative`) avec l'`<img>` et un `div.zone-layer` ; un clic donne `x = offsetX/largeur`, `y = offsetY/hauteur` ; `ar = naturalHeight/naturalWidth` à `img.onload` ; `r` vient d'un `<input type="range" min="0.03" max="0.20" step="0.01">` avec trois boutons Petite / Moyenne / Grande (`ZONE_SIZES`), `aria-label` « Taille de la zone » ; redessin par `zoneDraw(layer, q.zone, [])`. Sans image : « Ajoute d'abord une image. ». Explication et points doubles comme les autres types.
  - `editor-check.js` : mêmes messages que le serveur (préfixe `Question n : ` déjà utilisé par le fichier).
  - `preview.js` : image + `zone-layer` ; un toucher pose un point vert ou rouge selon `zoneHit` (« Juste ! » / « À côté ») ; « Montrer la réponse » dessine le cercle.
  - `style.css` : `.zone-pick, .zone-view { position: relative; display: inline-block; max-width: 100%; }`, `.zone-layer { position: absolute; inset: 0; }`, `.zone-circle` (bordure blanche 3 px + contour bleu nuit, fond vert translucide, `transform: translate(-50%, -50%)`), `.zone-dot` (14 px, rond, `.ok` vert, `.bad` rouge, contour blanc), `.zone-pin` (📍 centrée en bas).
- [ ] **Étape 4 :** `npm test` → passe ; navigateur : créer une question image à toucher (image envoyée depuis l'ordinateur), placer et redimensionner le cercle, enregistrer, recharger la page (la zone est gardée), « Tester » (le cercle apparaît au bon endroit).
- [ ] **Étape 5 :** commit « Image à toucher : éditeur et aperçu ».

### Tâche 4 : le téléphone

**Fichiers :** `public/play.html` (bloc `#zoneAns` dans l'écran `question` : `div.zone-view` avec `<img id="zImg">` + `div.zone-layer#zLayer`, bouton `#zoneSend` « Valider »), `public/play/question.js`, `public/lines.js` (`CONSIGNES.zone`, `consigneFor` → `'zone'` si `q.type === 'zone'`) ; test `tests/lines.js`.

- [ ] **Étape 1 : tests** : dans `tests/lines.js`, la liste des clés de `CONSIGNES` devient `['mots','multi','ordre','relier','roue','sondage','texte','zone']` ; `consigneFor({ type: 'zone' }) === 'zone'` ; `CONSIGNES.zone === 'Touche le bon endroit sur l\'image, puis valide.'`.
- [ ] **Étape 2 :** lancer → ÉCHEC.
- [ ] **Étape 3 :** code : pour `q.type === 'zone'`, cacher `#choices`, `#textAns`, `#qImg` ; afficher `#zoneAns` avec l'image (`alt` = la question) ; un clic/toucher pose `.zone-pin` (position en %) et active `#zoneSend` ; `UI.announce('Épingle posée')` ; « Valider » envoie `player:answer { point }` ; reprise après coupure : `q.mine` (point) replace l'épingle ; « Changer sa réponse » : le bouton reste actif après l'envoi, comme `multiSend`.
- [ ] **Étape 4 :** `npm test` → passe ; navigateur : voir tâche 5.
- [ ] **Étape 5 :** commit « Image à toucher : téléphone ».

### Tâche 5 : l'écran de partie de l'animateur, l'IA, l'Aide

**Fichiers :** `public/host/game.js`, `public/host.html` (Aide `faq-zone` après `faq-roue`), `public/host/ai-import.js`, `PROJET.md`.

- [ ] **Étape 1 : tests statiques** (`tests/zone.js`) : `game.js` contient « Sur leur téléphone, les joueurs touchent le bon endroit sur l'image. » ; `host.html` contient `id="faq-zone"` ; `ai-import.js` refuse le type `zone` avec le message « les questions « image à toucher » se créent dans l'éditeur, pas avec une IA. ».
- [ ] **Étape 2 :** lancer → ÉCHEC.
- [ ] **Étape 3 :** code :
  - Question : image en grand (comme aujourd'hui) et la note ci-dessus ; pas de choix.
  - Résultats : `rChoices` reçoit un `div.zone-view` (image + `zone-layer`) et `zoneDraw(layer, r.zone, r.points)`, puis la ligne `✅ … / ❌ …` comme `text`. `rCorrect` : « Bonne réponse : 📍 La zone entourée sur l'image ».
  - FAQ : comment créer (type « Image à toucher », image, toucher l'image, taille), comment on joue, et que l'IA ne crée pas ce type.
  - `PROJET.md` : une ligne « (fait) Image à toucher » qui résume les fichiers.
- [ ] **Étape 4 :** `npm test` → passe. Navigateur : partie avec un animateur et deux joueurs (deux adresses : `localhost` et `127.0.0.1`), un joueur touche dans la zone, l'autre à côté : Bravo / Raté sur les téléphones, l'écran de l'animateur montre le cercle, un point vert et un point rouge, « 1 / 2 ». Aussi avec « Seulement sur mon écran ».
- [ ] **Étape 5 :** commit « Image à toucher : écran de partie, Aide ».
