# 01 — Un navigateur réel entre dans l'administration servie comme en production

**Bloqué par :** —
**Vérif :** test
**Fichiers :** `package.json`, `package-lock.json`, `playwright.config.ts`, `tests/parcours/preparer-passe.ts`, `tests/parcours/entree.parcours.ts`, `vitest.config.ts`, `.gitignore`

## Ce que ça livre

Aucun test automatique n'exécute aujourd'hui le code que l'éditrice fait tourner dans son navigateur :
les tests Vitest tournent dans `workerd`, côté serveur, sans politique de sécurité appliquée par un
navigateur. Le défaut le plus coûteux qui leur a échappé — la directive `connect-src` manquante de la
PR #72, qui bloquait toute correction au navigateur alors que le serveur était vert — n'a été vu que par
la recette à la main.

Ce ticket ouvre l'étage « Parcours » (ADR-0014 : Playwright pour les parcours) avec son **dispositif** :
une commande `npm run parcours` bâtit le site, le sert en local tel qu'il sera déployé, sur une base
locale neuve, y sème une session, et Chromium ouvre l'éditeur de la page Accueil
(`/admin/pages/accueil`) en tant qu'éditrice déjà entrée. Avant toute chose, la passe vérifie que les
en-têtes de sécurité de l'administration sont bien servis — sans quoi un parcours vert ne prouverait
rien de ce que voit un navigateur en production — puis que, sans session, la porte reste close.

**Décisions à respecter :**
- **Servir le Worker bâti, pas `astro dev`.** `npm run build`, puis
  `wrangler dev --config dist/server/wrangler.json --local` sur un **port fixe**. `astro dev` est
  écarté (Vite sert des modules non regroupés, la politique `script-src 'self'` peut y diverger) ;
  `astro preview` reste un repli si `wrangler dev` posait problème.
- **Base propre aux parcours, neuve à chaque passe.** Répertoire dédié `--persist-to .wrangler/parcours`,
  effacé au début de chaque passe, puis `wrangler d1 migrations apply DB --local` sur ce même
  répertoire. Rien n'est partagé avec `npm run dev` ni avec les tests Vitest.
- **Entrer par une session semée, sans aucun code produit.** La préparation de passe (configuration
  globale de Playwright) tire un jeton `crypto.randomUUID()`, l'inscrit dans la table `sessions`
  (`id` = le jeton, `identifiant_appareil`, `creee_le` = maintenant) par `wrangler d1 execute --local`,
  et le contexte du navigateur reçoit le cookie `__Host-session` correspondant (`secure`, `httpOnly`,
  `sameSite: 'Strict'`, `path: '/'`). Aucune route, aucun drapeau, aucune branche de test dans `src/` :
  une route de connexion réservée aux tests serait une porte dérobée. Aucun jeton fixe, aucune base
  commitée (`.wrangler/` est déjà ignoré par git).
- **Cookie `Secure` / `__Host-` sur `http://localhost` : à établir en premier.** Chromium traite
  `localhost` comme un contexte sûr et devrait l'accepter. À défaut, servir `wrangler dev` en HTTPS
  local (`--local-protocol https`) — **jamais** retirer `Secure` ni le préfixe `__Host-`, jamais
  assouplir `verifierSession` (invariant I13, ADR-0011).
- **Garde de fidélité des en-têtes.** La réponse de `/admin/pages/accueil` doit porter les quatre
  en-têtes de l'invariant I11 (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`), avec une politique qui contient `script-src 'self'` (I12) et une directive
  `connect-src`. Ces en-têtes sont posés par le Worker (`src/platform/entetes/middleware.ts`), pas par
  un fichier `_headers`. Un manque fait échouer la passe avec un message qui met en cause **le
  dispositif**, pas le produit.
- **Outillage.** Parcours sous `tests/parcours/`, fichiers `*.parcours.ts` ; `playwright.config.ts` à
  la racine, avec un `webServer` qui bâtit, prépare la base puis lance `wrangler dev`,
  `reuseExistingServer: false`, **un seul worker** Playwright (les parcours partagent la base de la
  passe), **pas de `retries`**. `vitest.config.ts` écarte explicitement `tests/parcours/**` de sa
  collecte. Commande `npm run parcours`, distincte de `npm test`. `@playwright/test` en dépendance de
  **développement**, à une version publiée depuis plus de sept jours (`.npmrc` : `min-release-age=7`),
  installée par le lockfile ; Chromium installé par `npx playwright install chromium` — ne pas
  s'appuyer sur les navigateurs déjà présents de `playwright-cli`. Ignorer par git les sorties de
  Playwright (rapports, résultats).
- **Désignation des éléments.** Par rôle et nom accessibles, jamais par classe ou structure de DOM.
- **Attentes sur l'état de l'écran**, jamais de délais fixes.
- **Aucun double** : ni `fetch` simulé, ni liaison remplacée. La seule préparation est la session semée.

**Hors périmètre :** le parcours de correction du bouton d'action, la garde contre les violations de la
politique de sécurité et la mise à jour de `docs/test.md` (ticket 02) ; le job de CI (ticket 03) ; la
connexion par code de bout en bout, les autres navigateurs que Chromium, les tests de composants
montés seuls, toute simulation de navigateur dans Node (jsdom, happy-dom), la mesure de couverture.

## Critères
- [ ] Quand la passe de parcours démarre et que le navigateur charge `/admin/pages/accueil`, la réponse porte `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` et `X-Frame-Options`, et la politique contient `script-src 'self'` et une directive `connect-src` ; sinon la passe échoue avec un message qui met en cause le dispositif, pas le produit   (SC-01a)
- [ ] Quand la passe démarre, le navigateur atteint `/admin/pages/accueil` sans être renvoyé vers l'écran de connexion, grâce à la seule session semée dans la base locale de la passe — sans e-mail ni code   (SC-01b)
- [ ] Quand un contexte de navigateur sans cookie de session charge `/admin/pages/accueil` sur le même serveur, il est renvoyé vers l'écran de connexion (la porte reste close : l'entrée tient à la session semée, pas à un affaiblissement du garde)   (SC-01c)
- [ ] Quand on lance `npm test`, aucun fichier de `tests/parcours/` n'est collecté et la suite garde son compte de tests ; quand on lance `npm run parcours`, seuls les parcours se jouent   (SC-01d)
- [ ] Quand on compare la branche du ticket à `main`, aucun fichier sous `src/`, `migrations/`, `content/` ni `public/` n'est modifié   (SC-01e)
