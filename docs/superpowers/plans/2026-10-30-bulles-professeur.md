# Le Professeur parle sur tous les écrans — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** sur le téléphone des joueurs et sur l'écran de l'animateur, le Professeur dit une phrase variée et adaptée à la situation dans sa bulle, à la place des petites phrases actuelles.

**Architecture :** toutes les phrases et le tirage au sort (`LINES`, `pickLine`) vivent dans `public/lines.js`, testable avec Node. `Brand.line()` (dans `public/brand.js`) se souvient de la dernière phrase par situation. Chaque écran remplace sa petite phrase par un emplacement `<div class="say hidden">` rempli avec `Brand.say(…)` (fonction existante) quand l'écran s'affiche.

**Tech Stack :** JavaScript navigateur sans framework (scripts classiques, portée globale partagée), Node ≥ 18 + `assert` pour les tests.

**Spec :** `docs/superpowers/specs/2026-10-30-bulles-professeur-design.md`

## Global Constraints

- Les phrases sont EXACTEMENT celles de la section « Les phrases » de la spec (19 situations, clés `attente`, `file`, `compte`, `envoye`, `elimine`, `bravo`, `serie`, `rate`, `tropTard`, `sondage`, `finGagne`, `finPodium`, `finAutre`, `animCompte`, `animTous`, `animMoitie`, `animPersonne`, `animSondage`, `animPodium`).
- Trous autorisés : `{pseudo}`, `{serie}`, `{gagnant}` seulement.
- L'explication passe avant la phrase de réaction ; les informations utiles (cœurs, éliminé, bonus, pendu) restent affichées.
- Un seul Professeur visible sur le téléphone : quand la bulle s'affiche, la mascotte posée au-dessus est cachée.
- Phrase vide (clé inconnue) → la bulle reste cachée.
- `lines.js` est chargé avant `brand.js` dans `play.html` et `host.html`. Le serveur ne change pas.

## Review Focus

1. Pseudo qui contient lui-même un trou (ex. un joueur nommé « {serie} ») : il doit s'afficher tel quel, sans être remplacé une deuxième fois → test `pickLine` Task 1.
2. Trou sans valeur (ex. `{gagnant}` sans gagnant) : remplacé par du vide, jamais « undefined » ni « {gagnant} » visible → test `pickLine` Task 1.
3. Retour d'un joueur après coupure en plein écran de résultat ou de fin (`sendPlayerState` renvoie `result` / `end`) : la bulle s'affiche comme au premier passage → vérification Task 2.
4. Résultats côté animateur sans aucun joueur participant (`partCount` = 0) : pas de bulle, pas de division par zéro → règle Task 3 + vérification.
5. Série de 2 seulement : phrase `bravo`, pas `serie` (le seuil est 3) → vérification Task 2.

---

### Task 1 : les phrases, le tirage et `Brand.line`

**Files :**
- Create : `public/lines.js`, `tests/lines.js`
- Modify : `public/brand.js` (ajouter `line` à l'objet `Brand`), `public/play.html` et `public/host.html` (`<script src="lines.js"></script>` juste avant `<script src="brand.js"></script>`), `package.json` (script `test`)

**Interfaces :**
- Produces :
  - `LINES` : objet `{ clé: string[] }` avec les 19 clés et les phrases de la spec.
  - `pickLine(key: string, vars: object, last: string|null) → { raw: string, text: string }` : `raw` = phrase choisie au hasard parmi `LINES[key]`, différente de `last` s'il y en a au moins 2 ; `text` = `raw` où chaque `{nom}` est remplacé UNE fois par `String(vars.nom)` ou `''` si absent. Clé inconnue → `{ raw: '', text: '' }`. En bas du fichier : `if (typeof module !== 'undefined') module.exports = { LINES, pickLine };`.
  - `Brand.line(key: string, vars?: object) → string` : appelle `pickLine` avec la dernière `raw` retenue pour cette clé, retient la nouvelle, renvoie `text`.

- [ ] **Step 1 : écrire `tests/lines.js`** (même style que `tests/tour-logic.js` : `ok` / `ÉCHEC`, code 1 en cas d'échec) avec ces tests :

```js
const { LINES, pickLine } = require('../public/lines.js');
const KEYS = ['attente', 'file', 'compte', 'envoye', 'elimine', 'bravo', 'serie', 'rate', 'tropTard', 'sondage', 'finGagne', 'finPodium', 'finAutre', 'animCompte', 'animTous', 'animMoitie', 'animPersonne', 'animSondage', 'animPodium'];
// 'les 19 situations, 3 à 5 phrases chacune'
assert.deepStrictEqual(Object.keys(LINES).sort(), KEYS.slice().sort());
KEYS.forEach((k) => assert.ok(LINES[k].length >= 3 && LINES[k].length <= 5, k));
// 'seulement des trous connus'
Object.values(LINES).flat().forEach((s) => (s.match(/\{[^}]*\}/g) || []).forEach((t) => assert.ok(['{pseudo}', '{serie}', '{gagnant}'].includes(t), s)));
// 'jamais deux fois de suite la même phrase' : 50 tirages par clé
KEYS.forEach((k) => { let last = null; for (let i = 0; i < 50; i++) { const p = pickLine(k, {}, last); assert.notStrictEqual(p.raw, last, k); last = p.raw; } });
// 'les trous sont remplis'
assert.strictEqual(pickLine('animPodium', { gagnant: '🦊 Alice' }, null).text.includes('🦊 Alice'), true);
assert.ok(!/\{|undefined/.test(pickLine('animPodium', {}, null).text)); // trou sans valeur → vide
// 'un pseudo qui ressemble à un trou reste tel quel' (voir le paragraphe sous ce bloc)
// → tirer jusqu'à obtenir 'Bien joué, {pseudo} !' avec { pseudo: '{serie}', serie: 9 } ; attendu : 'Bien joué, {serie} !'
// 'clé inconnue'
assert.deepStrictEqual(pickLine('nimporte', {}, null), { raw: '', text: '' });
// 'les phrases exactes de la spec' (une par clé, échantillon)
assert.ok(LINES.bravo.includes('Je n\'aurais pas mieux répondu !'));
assert.ok(LINES.animPersonne.includes('Même moi, j\'ai hésité !'));
assert.ok(LINES.sondage.includes('Ton avis compte !'));
```

Pour le test « pseudo qui ressemble à un trou » : forcer la phrase `'Bien joué, {pseudo} !'` en appelant `pickLine` jusqu'à l'obtenir (boucle ≤ 100 tirages), puis vérifier que `text === 'Bien joué, {serie} !'`.

- [ ] **Step 2 : lancer le test** — Run : `node tests/lines.js` — Expected : échec « Cannot find module '../public/lines.js' ».

- [ ] **Step 3 : écrire `public/lines.js`** avec l'interface ci-dessus. Remplacement en une passe : `raw.replace(/\{(pseudo|serie|gagnant)\}/g, (_, n) => (vars[n] === undefined || vars[n] === null ? '' : String(vars[n])))` (une seule passe = la valeur insérée n'est jamais relue). Commentaire en tête : « Les phrases du Professeur Quizzo. Pour en changer une, modifie le texte entre guillemets. »

- [ ] **Step 4 : relancer** — Run : `node tests/lines.js` — Expected : tous `ok`, code 0.

- [ ] **Step 5 : `Brand.line`** dans `public/brand.js` (mémoire `const lastLine = {}` dans la fermeture de `Brand`), chargement de `lines.js` dans les deux pages, et `package.json` : `"test": "node tests/lines.js && node tests/tour-logic.js && node tests/smoke.js"`. Run : `npm test` — Expected : `ok` partout puis « Tous les tests passent ».

- [ ] **Step 6 : commit** — `git add public/lines.js tests/lines.js public/brand.js public/play.html public/host.html package.json` puis `git commit -m "Phrases du Professeur : fichier unique et tirage au sort (testés)"`.

---

### Task 2 : les bulles sur le téléphone du joueur

**Files :**
- Modify : `public/play.html` (écrans `wait`, `queued`, `countdown`, `sent`, `spectate`, `result`, `end`)
- Modify : `public/play/connection.js` (événements `lobby`, `queued`), `public/play/question.js` (`countdown`, `answer:ack` → écran `sent`, et le passage à `sent` dans le gestionnaire `question` quand la réponse est déjà donnée), `public/play/results.js` (`result`, `end`, écran `spectate` atteint par `result` ou `question`)
- Modify : `public/style.css` si besoin (marges de `.say` dans les écrans centrés)

**Interfaces :**
- Consumes : `Brand.line(key, vars)` (Task 1), `Brand.say(box, text, pose)` (existant), `me.name` (pseudo, `play/connection.js`).

- [ ] **Step 1 : emplacements dans `play.html`** : sur chaque écran du tableau « Téléphone du joueur » de la spec, ajouter `<div class="say hidden" id="sayXxx"></div>` à la place de la petite phrase, et donner un id à la mascotte posée au-dessus quand elle n'en a pas (`waitMascot`, `queuedMascot`, `cdMascot`, `sentMascot`, `specMascot`, `endMascot` ; `resMascot` existe). Ids des bulles : `sayWait`, `sayQueued`, `sayCount`, `saySent`, `saySpec`, `sayRes` (= l'actuel `resExplain`, renommé ou réutilisé), `sayEnd`.

- [ ] **Step 2 : une petite fonction commune** dans `public/play/base.js` : `profSay(boxId: string, mascotId: string|null, key: string, pose: string, vars?: object) → void` — tire `Brand.line(key, vars)` ; phrase non vide → `Brand.say($(boxId), phrase, pose)`, montre la bulle, cache la mascotte ; phrase vide → cache la bulle, montre la mascotte.

- [ ] **Step 3 : brancher chaque écran** (situation et pose selon la spec) :
  - `lobby` → `attente` (danse, `{pseudo}` = `me.name`) ; `queued` → `file` (recherche) ; `countdown` → `compte` (chrono) ; écran `sent` (deux chemins) → `envoye` (réflexion) ; écran `spectate` → `elimine` (désolé).
  - `result` : si `r.explain` → comportement actuel (bulle = explication, pose explication) ; sinon sondage → `sondage` (question), juste → `serie` si `r.streak >= 3` (`{serie}` = `r.streak`) sinon `bravo` (`{pseudo}`), pas de réponse → `tropTard`, faux → `rate` (désolé). La ligne `resSub` ne garde que les infos utiles (bonus, cœur perdu, éliminé) : retirer « Bonne réponse » et « Mauvaise réponse ».
  - `end` : `finGagne` si (mode équipes/pendu et `d.teamRank === 1`) ou (élimination/cœurs et `d.alive`) ou (sinon `d.rank === 1`) ; `finPodium` si rang (ou rang d'équipe) 2 ou 3 ; sinon `finAutre` (pose bravo).

- [ ] **Step 4 : vérifier dans le navigateur** (`preview_start` « wequizzer », hôte `/host.html` + joueur `/play.html?pin=…`, largeur téléphone 375 × 812 puis ordinateur) : passer par chaque écran (attente, file d'attente avec un 2e joueur qui arrive en cours de partie, 3-2-1, réponse envoyée, juste / faux / pas de réponse / sondage, série de 3 vs série de 2, élimination, fin 1er / 2e / 4e) ; pour chacun : la phrase appartient à la bonne liste de `LINES`, un seul Professeur, la bonne pose. Avec une explication : l'explication s'affiche, pas la réaction. Cœurs : « 💔 Tu perds un cœur… » toujours là. Recharger la page du joueur sur l'écran de résultat puis de fin : la bulle revient. Aucune erreur dans la console.

- [ ] **Step 5 : `npm test`** — Expected : « Tous les tests passent ».

- [ ] **Step 6 : commit** — `git add public/play.html public/play/ public/style.css` puis `git commit -m "Le Professeur parle sur le téléphone des joueurs"`.

---

### Task 3 : les bulles sur l'écran de l'animateur

**Files :**
- Modify : `public/host.html` (écran `countdown` : mascotte chrono ; écran `end` : mascotte bravo ; écran `results` : réutiliser `rExplain`)
- Modify : `public/host/game.js` (gestionnaires `countdown`, `results`, `end`)
- Modify : `PROJET.md` (point 3 « Professeur qui parle » : étape 2 faite, où sont les phrases)

**Interfaces :**
- Consumes : `Brand.line`, `Brand.say` (Task 1 et existant).

- [ ] **Step 1 : compte à rebours** : la mascotte chrono de l'écran `countdown` devient un emplacement `say` (`sayHostCount`) rempli avec `animCompte` (pose chrono) à chaque événement `countdown`.

- [ ] **Step 2 : résultats** : dans le gestionnaire `results`, si `r.explain` → comportement actuel ; sinon, si `r.partCount > 0` : sondage → `animSondage` ; sinon taux = `r.okCount / r.partCount` → `animTous` si ≥ 0,8, `animMoitie` si ≥ 0,3, `animPersonne` sinon (pose bravo pour Tous, question pour Moitié, désolé pour Personne) ; `r.partCount === 0` → bulle cachée.

- [ ] **Step 3 : podium** : la mascotte bravo au-dessus du podium devient un emplacement `say` (`sayHostEnd`) rempli avec `animPodium`, `{gagnant}` = `'l\'équipe ' + d.teams[0].name` en mode équipes / pendu, sinon `d.board[0].avatar + ' ' + d.board[0].name` ; aucun joueur (`d.board` vide) → bulle cachée.

- [ ] **Step 4 : vérifier dans le navigateur** (ordinateur 1280 × 720 et téléphone 375 × 812) : 3-2-1 (phrase de `animCompte`, pose chrono), résultats tout le monde juste / moitié / personne / sondage / avec explication (l'explication l'emporte), podium standard et équipes (nom de l'équipe gagnante). Aucune erreur dans la console.

- [ ] **Step 5 : `PROJET.md`** : point 3 → « (fait, étape 2) phrases dans `public/lines.js` (19 situations), tirage `Brand.line`, écrans… ; pour modifier une phrase : `lines.js` ».

- [ ] **Step 6 : `npm test`** — Expected : « Tous les tests passent ».

- [ ] **Step 7 : commit** — `git add public/host.html public/host/game.js PROJET.md` puis `git commit -m "Le Professeur parle sur l'écran de l'animateur"`.
