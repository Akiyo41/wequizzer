# Visite guidée de l'écran animateur — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** à la première ouverture de l'écran animateur, le Professeur propose une visite guidée de 6 étapes de l'accueil, relançable depuis l'Aide.

**Architecture:** la logique sans écran (liste des étapes, « faut-il proposer ? », « bulle en haut ou en bas ? ») vit dans `public/host/tour-logic.js`, testable avec Node. L'affichage (voile, zone éclairée, bulle `Brand.say`, boutons) vit dans `public/host/tour.js`. Les deux sont des scripts classiques chargés dans `host.html` avant `host/game.js` (même portée globale que les autres fichiers de `public/host/`).

**Tech Stack:** JavaScript navigateur sans framework, Node ≥ 18 pour le test de la logique (`assert`), CSS dans `public/style.css`.

**Spec:** `docs/superpowers/specs/2026-10-29-visite-guidee-design.md`

## Global Constraints

- Textes en français, tutoiement, exactement ceux du tableau des 6 étapes et de l'invitation de la spec.
- Clé du navigateur : `wequizzer.tourSeen` (via l'objet `LS` de `public/host/base.js`).
- Aucun changement côté serveur ; aucune dépendance nouvelle.
- Le fichier qui ouvre la connexion (`socket.connect()` à la fin de `host/game.js`) reste le dernier chargé : les nouveaux scripts vont avant lui.
- Couleurs : celles du jeu (`--accent` orange #ff9f1c pour le liseré, voile noir à 65 %).

## Review Focus

1. Écran étroit (téléphone 375 px) avec l'onglet « Mes quiz » tout en bas : la bulle doit aller en haut et ne pas cacher l'onglet → test `bubbleSide` (Task 1) + vérification Task 3.
2. Rechargement en pleine partie (`rejoined` vrai) : aucune invitation → test `shouldOffer` (Task 1) + vérification Task 3.
3. Navigateur sans stockage (`localStorage` bloqué) : la visite marche quand même (`LS` ignore les erreurs) et l'invitation peut revenir — acceptable, rien ne doit planter → vérification Task 2.
4. Élément d'une étape caché ou absent (ex. carte vide) : l'étape s'affiche sans zone éclairée, centrée, au lieu de planter → Task 2, étape « élément introuvable ».
5. Joueur qui arrive pendant la visite (la liste grandit, la carte des joueurs bouge) : la zone éclairée se recale → recalcul sur `resize`, `scroll` et à chaque `host:players` (Task 2).

---

### Task 1: Logique de la visite (testable sans navigateur)

**Files:**
- Create: `public/host/tour-logic.js`
- Create: `tests/tour-logic.js`
- Modify: `package.json` (script `test`)

**Interfaces:**
- Produces: objet global `TourLogic` (et `module.exports = TourLogic` si `module` existe) :
  - `TourLogic.STEPS` : tableau de 6 `{ sel: string, text: string }` — `sel` = sélecteur CSS de l'élément à éclairer, dans l'ordre et avec les textes exacts de la spec : `'.join-box'`, `'#quizSelect'` (la carte se retrouve avec `closest('.card')` en Task 2), `'#paneJouer .card.settings'`, `'#startBtn'` (idem `closest('.card')`), `'#tabQuiz'`, `'#openFaq'`. Ajouter `card: true` aux étapes 2 et 4.
  - `TourLogic.INVITE` : `'Salut ! Je suis le Professeur Quizzo. Je te fais visiter en 1 minute ?'`
  - `TourLogic.shouldOffer({ seen: boolean, screen: string, rejoined: boolean }) → boolean` : vrai seulement si `!seen && screen === 'lobby' && !rejoined`.
  - `TourLogic.bubbleSide(rect: { top: number, bottom: number }, viewportH: number) → 'top' | 'bottom'` : `'top'` si le milieu de l'élément est dans la moitié basse de l'écran, sinon `'bottom'`.

- [ ] **Step 1: Écrire le test `tests/tour-logic.js`** (Node + `assert`, même style que `tests/smoke.js` : affiche `ok` / `ÉCHEC`, code de sortie 1 en cas d'échec)

```js
const assert = require('assert');
const T = require('../public/host/tour-logic.js');
assert.strictEqual(T.STEPS.length, 6);
assert.deepStrictEqual(T.STEPS.map((s) => s.sel), ['.join-box', '#quizSelect', '#paneJouer .card.settings', '#startBtn', '#tabQuiz', '#openFaq']);
assert.ok(T.STEPS[0].text.startsWith('Tes joueurs scannent ce QR code'));
assert.ok(T.STEPS[5].text.endsWith('À toi de jouer !'));
assert.strictEqual(T.shouldOffer({ seen: false, screen: 'lobby', rejoined: false }), true);
assert.strictEqual(T.shouldOffer({ seen: true, screen: 'lobby', rejoined: false }), false);
assert.strictEqual(T.shouldOffer({ seen: false, screen: 'question', rejoined: false }), false);
assert.strictEqual(T.shouldOffer({ seen: false, screen: 'lobby', rejoined: true }), false);
assert.strictEqual(T.bubbleSide({ top: 760, bottom: 812 }, 812), 'top');    // onglet « Mes quiz » en bas
assert.strictEqual(T.bubbleSide({ top: 100, bottom: 300 }, 812), 'bottom'); // carte QR en haut
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `node tests/tour-logic.js`
Expected: échec « Cannot find module '../public/host/tour-logic.js' ».

- [ ] **Step 3: Écrire `public/host/tour-logic.js`** avec l'interface ci-dessus (objet `TourLogic` déclaré avec `const` au niveau du fichier ; en bas : `if (typeof module !== 'undefined') module.exports = TourLogic;`).

- [ ] **Step 4: Relancer le test** — Run: `node tests/tour-logic.js` — Expected: `ok`, code 0.

- [ ] **Step 5: Brancher le test sur `npm test`** : script `"test": "node tests/tour-logic.js && node tests/smoke.js"`. Run: `npm test` — Expected: `ok` puis « Tous les tests passent ».

- [ ] **Step 6: Commit** — `git add public/host/tour-logic.js tests/tour-logic.js package.json` puis `git commit -m "Visite guidée : logique et textes des étapes (testés)"`.

---

### Task 2: Affichage de la visite (voile, zone éclairée, bulle, boutons)

**Files:**
- Create: `public/host/tour.js`
- Modify: `public/style.css` (fin du fichier, section « Visite guidée »)
- Modify: `public/host.html` (scripts : `host/tour-logic.js` puis `host/tour.js`, juste avant `host/game.js`)

**Interfaces:**
- Consumes: `TourLogic` (Task 1) ; `$`, `show`, `LS`, `screens` (`public/host/base.js`) ; `setTab` (`public/host/editor.js`) ; `Brand.say(box, texte, pose)` (`public/brand.js`).
- Produces: objet global `Tour` :
  - `Tour.start() → void` : `show('lobby')`, `setTab('jouer')`, étape 1, et enregistre `wequizzer.tourSeen = true`.
  - `Tour.offer() → void` : affiche l'invitation (bulle `TourLogic.INVITE`, pose `accueil`, boutons « Oui, vas-y ! » → `start()`, « Non merci » → enregistre `tourSeen` et ferme). Si `#intro` existe, attend sa disparition (vérifier toutes les 300 ms) avant d'afficher.
  - `Tour.close() → void` ; `Tour.active() → boolean`.

- [ ] **Step 1: Écrire `public/host/tour.js`**. Éléments créés une seule fois et ajoutés à `document.body` :
  - `#tourShade` : voile plein écran, `position:fixed`, capte les clics (les clics ne passent pas).
  - `#tourHole` : div `position:fixed` placée sur le rectangle de l'élément (+8 px de marge), `box-shadow: 0 0 0 9999px rgba(0,0,0,.65)`, bordure `3px solid var(--accent)`, `border-radius:16px`, `pointer-events:none`, transition douce.
  - `#tourBox` : bulle `Brand.say(…, 'explication')` (ou `'accueil'` pour l'invitation) + ligne « n / 6 » + boutons Passer / ← Précédent (caché à l'étape 1) / Suivant → (« Terminer » à l'étape 6). Classe `top` ou `bottom` selon `TourLogic.bubbleSide(rect, innerHeight)`.
  - À chaque étape : trouver l'élément (`document.querySelector(sel)`, puis `.closest('.card')` si `card`) ; `scrollIntoView({ block: 'center' })` ; placer le trou après le défilement (`requestAnimationFrame`). **Élément introuvable ou invisible** (rectangle de largeur 0) : pas de trou, bulle en bas, l'étape reste lisible.
  - Recaler le trou sur `resize`, `scroll` et à chaque événement socket `host:players` (`socket.on('host:players', …)` en plus du gestionnaire existant).
  - Échap = Passer. `close()` enlève les 3 éléments de l'écran (ou les cache) et retire les écouteurs.

- [ ] **Step 2: Style** dans `public/style.css` : `#tourShade` (z-index 60, au-dessus de la barre d'onglets et du bouton son), `#tourHole` (z-index 61), `#tourBox` (z-index 62, `position:fixed`, `left:50%`, `transform:translateX(-50%)`, largeur `min(560px, calc(100% - 24px))`, `.top{top:12px}` `.bottom{bottom:12px}`), ligne de boutons en flex avec retour à la ligne.

- [ ] **Step 3: Charger les scripts** dans `public/host.html` : `<script src="host/tour-logic.js"></script>` puis `<script src="host/tour.js"></script>`, juste avant `<script src="host/game.js"></script>`.

- [ ] **Step 4: Vérifier dans le navigateur** (`preview_start` « wequizzer », page `/host.html`, puis dans la console de la page) : `Tour.start()` → le trou entoure la carte QR, la bulle dit le texte de l'étape 1 et « 1 / 6 », pas de bouton Précédent ; cliquer 5 fois sur Suivant → chaque trou entoure le bon élément ; l'étape 6 affiche « Terminer » ; Échap ferme ; `Tour.active() === false`. Simuler un stockage bloqué n'est pas nécessaire : vérifier seulement qu'aucune erreur n'apparaît dans la console.

- [ ] **Step 5: Commit** — `git add public/host/tour.js public/style.css public/host.html` puis `git commit -m "Visite guidée : voile, zone éclairée, bulle et boutons"`.

---

### Task 3: Invitation au premier lancement, relance depuis l'Aide, fermeture hors de l'accueil

**Files:**
- Modify: `public/host/connection.js` (gestionnaire `host:created`)
- Modify: `public/host/base.js` (fonction `show`)
- Modify: `public/host.html` (page Aide `#faqPage`)
- Modify: `public/host/faq.js`
- Modify: `PROJET.md` (point 8 « Tutoriel facultatif » → fait, avec les fichiers)

**Interfaces:**
- Consumes: `Tour`, `TourLogic` (Tasks 1–2).

- [ ] **Step 1: Invitation** : à la fin du gestionnaire `host:created` de `connection.js`, appeler `Tour.offer()` seulement si `TourLogic.shouldOffer({ seen: LS.get('wequizzer.tourSeen', false), screen: <écran visible>, rejoined: !!d.rejoined })`.

- [ ] **Step 2: Fermeture hors de l'accueil** : dans `show(id)` (`base.js`), si `id !== 'lobby'` et que `typeof Tour !== 'undefined' && Tour.active()`, appeler `Tour.close()`.

- [ ] **Step 3: Relance** : bouton `<button id="faqTour" class="btn mini" type="button"><i class="ti ti-player-play"></i> Revoir la visite guidée</button>` en haut de `#faqPage` (sous le titre) ; dans `faq.js`, `$('faqTour').onclick = () => Tour.start();`.

- [ ] **Step 4: Vérifier dans le navigateur** les 5 points de la spec, en largeur ordinateur puis téléphone (`resize_window` preset `mobile`) :
  1. Vider `wequizzer.tourSeen` et la session (`LS.del('wequizzer.tourSeen'); LS.del('wequizzer.hostSession')`), recharger : l'écran « Commencer » d'abord, puis l'invitation après « Commencer ». « Non merci », recharger : pas d'invitation.
  2. Aide → « Revoir la visite guidée » : retour à l'accueil, étapes 1 à 6 correctes, Précédent / Suivant / Passer / Échap / Terminer.
  3. Téléphone, étape 5 : la bulle est en haut et l'onglet « Mes quiz » reste visible dans le trou.
  4. Un joueur rejoint (2e onglet `/play.html?pin=…`) pendant l'étape 4 : il apparaît, le trou se recale ; un clic sur « Lancer le quiz » ne lance rien.
  5. Lancer une partie, recharger l'écran animateur en pleine question : pas d'invitation.
  Aucune erreur dans la console.

- [ ] **Step 5: `npm test`** — Expected: `ok` puis « Tous les tests passent ».

- [ ] **Step 6: Commit** — `git add public/host/connection.js public/host/base.js public/host.html public/host/faq.js PROJET.md` puis `git commit -m "Visite guidée : invitation au premier lancement et relance depuis l'Aide"`.
