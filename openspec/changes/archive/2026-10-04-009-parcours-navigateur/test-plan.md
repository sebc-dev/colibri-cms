Ce change pose `skip_specs: true` (outillage, aucun comportement produit nouveau) : **ce document est
la source des critères observables** que la décomposition transformera en critères de tickets. Chaque
critère est écrit QUAND / ALORS, comme un scénario de spec.

## Niveaux

- **Bout en bout, dans un navigateur réel** : le seul niveau neuf. Chromium, piloté par Playwright,
  contre le Worker bâti servi par `wrangler dev` sur une base locale neuve (design D1, D2). C'est le
  seul niveau qui exécute le code navigateur sous la politique de sécurité réellement servie.
- **Intégration `workerd` (Vitest)** : inchangé. On vérifie seulement que la suite existante n'est ni
  ralentie ni perturbée par l'arrivée du nouvel étage (C6).
- Aucun test unitaire neuf : il n'y a pas de logique métier nouvelle.

## Critères observables

### Le dispositif

- **C1 — Le dispositif sert les en-têtes de l'administration.** QUAND la passe de parcours démarre et
  que le navigateur charge `/admin/pages/accueil`, ALORS la réponse porte `Content-Security-Policy`,
  `X-Content-Type-Options`, `Referrer-Policy` et `X-Frame-Options`, et la politique contient
  `script-src 'self'` et une directive `connect-src` ; sinon la passe échoue avec un message qui met en
  cause le dispositif, pas le produit.
- **C2 — L'éditrice est entrée sans e-mail ni code.** QUAND la passe démarre, ALORS le navigateur
  atteint `/admin/pages/accueil` sans être renvoyé vers l'écran de connexion, grâce à la seule session
  semée dans la base locale de la passe.
- **C3 — Sans session semée, la porte reste close.** QUAND un contexte de navigateur sans cookie de
  session charge `/admin/pages/accueil` sur le même serveur, ALORS il est renvoyé vers l'écran de
  connexion. (Ce critère prouve que C2 tient à la session semée, et non à un affaiblissement du garde.)
- **C4 — Chaque passe repart d'une base neuve.** QUAND deux passes s'enchaînent, ALORS la seconde voit
  le libellé d'origine du bouton d'action (« Demander un devis »), et non la correction enregistrée par
  la première.

### Le parcours pilote

- **C5 — La correction d'un bouton d'action est enregistrée et marquée en brouillon.** QUAND
  l'éditrice remplace, sur l'éditeur de la page Accueil, le libellé du bouton d'action par un autre
  libellé et enregistre, ALORS l'écran annonce l'enregistrement, la marque de brouillon de la page
  apparaît sans rechargement, et après rechargement le champ porte toujours le nouveau libellé.
- **C6 — Aucune violation de la politique de sécurité.** QUAND le parcours pilote se joue en entier,
  ALORS aucun évènement `securitypolicyviolation` et aucun message de console « Refused to … » ne s'est
  produit ; dans le cas contraire, le parcours échoue en nommant la directive et la ressource bloquées.
- **C7 — Le garde attrape une violation réelle.** QUAND on prive à dessein la politique servie de
  `connect-src` (passe d'épreuve, jamais commitée, comme le mutant du 2026-10-04 sur
  `texteDuRefusTeleversement`), ALORS le parcours pilote échoue sur C6 en nommant `connect-src` — la
  reproduction du défaut de la PR #72.

### La frontière avec l'étage existant

- **C8 — Les étages restent séparés.** QUAND on lance `npm test`, ALORS aucun fichier de
  `tests/parcours/` n'est collecté et la suite garde son compte de tests ; QUAND on lance
  `npm run parcours`, ALORS seuls les parcours se jouent.
- **C9 — Le produit n'est pas touché.** QUAND on compare la branche du change à `main`, ALORS aucun
  fichier sous `src/`, `migrations/`, `content/` ni `public/` n'est modifié.

### La CI (ticket distinct, après le pilote)

- **C10 — Le job de parcours tourne sur chaque PR, sans bloquer.** QUAND une PR est ouverte, ALORS un
  job `parcours` joue les parcours et publie leur verdict ; un rouge de ce job n'empêche pas la fusion
  (aucun status check requis par le ruleset, `docs/ci.md` à jour).

## Oracle

- C1, C3 : en-têtes et redirection observés par Playwright sur la réponse réelle — oracle exact,
  connu avant le code.
- C2, C5 : l'état de l'écran (texte annoncé, présence de la marque, valeur du champ après
  rechargement), lu par rôles et noms accessibles.
- C6 : l'absence d'évènement de violation ; C7 en est la preuve inverse : le garde **mord**.
- C4, C8, C9 : observations de commande (`npm test` et son compte, `git diff --stat main`).
- C10 : l'onglet des vérifications de la PR et la configuration du ruleset.

## Cas limites

- Cookie `__Host-` + `Secure` sur `http://localhost` : accepté ou refusé par Chromium — c'est la
  première chose que le pilote doit établir (design, Risks).
- Session à la borne : une session semée « maintenant » est valide ; aucune autre borne
  d'expiration n'est rejouée ici (les tests serveur de 001 la couvrent).
- Libellé corrigé : un libellé non vide et différent de l'original ; les refus (libellé vide,
  destination invalide) relèvent des tests serveur existants et d'un futur étage de composants.

## Doubles

**Aucun.** Ni `fetch` simulé, ni liaison remplacée, ni module de produit doublé : c'est la raison
d'être de l'étage. La seule préparation est la session semée dans la base locale (des données, pas un
double).

## Zones sans test automatisé

- **C7** se prouve par une passe d'épreuve locale (politique privée de `connect-src`, puis restaurée)
  dont la sortie est jointe à la PR : la modification n'est jamais commitée. Mode `observé`.
- **C10** se constate sur la forge (job présent, non requis) : mode `observé`.
- La fidélité aux en-têtes de la **production réelle** (HTTPS, domaine réel) n'est pas établie par
  ces parcours : elle reste du ressort de la recette sur le serveur Cloudflare.
