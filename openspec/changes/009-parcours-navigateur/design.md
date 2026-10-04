## Context

Voir `proposal.md` — Why. État constaté au 2026-10-04 :

- **Tests actuels** : Vitest dans `workerd` (ADR-0014), via `exports.default.fetch` contre le Worker
  bâti (`.wrangler/test-worker/`, recopié de `dist/` par `scripts/preparer-worker-de-test.mjs`). Aucune
  politique de sécurité n'y est appliquée par un navigateur, et aucun `<script>` de module n'y
  s'exécute.
- **Le Worker bâti** : `astro build` produit `dist/server/` et `dist/client/`, avec
  `dist/server/wrangler.json` (`main: entry.mjs`, assets `../client`, D1 `DB`, liaison `send_email`
  `EXPEDITEUR_CODE_CONNEXION`, migrations `../../migrations`). Six migrations, `0001` à `0006`.
- **Les en-têtes de l'administration** sont posés par `src/platform/entetes/middleware.ts`
  (`POLITIQUE_DE_SECURITE`, invariants **I11**, **I12**, **I15**) — par le Worker, pas par un fichier
  `_headers` (il n'y en a pas).
- **La session** : table `sessions` (`id` = le jeton du cookie, `identifiant_appareil`, `creee_le` ;
  `dernier_usage_le` ajoutée par `assurerTableSessions`). `verifierSession` lit le cookie
  `__Host-session`, juge l'expiration glissante (7 j) et la butée (30 j) ; aucune signature. Le cookie
  est posé `Path=/; HttpOnly; Secure; SameSite=Strict` (**I13**, ADR-0011).
- **Le parcours visé** : `/admin/pages/accueil`, dont `content/pages/accueil/page.json` déclare
  l'emplacement `bouton-devis` (nature `bouton-action`, libellé « Demander un devis », destination
  `/contact`). Sa correction traverse `monter.ts`, `CorrectionBoutonAction.svelte`,
  `soumettre-correction.ts` (POST JSON vers `/admin/pages/[slug]/emplacements/[id]`, anti-forgerie
  par le seul cookie `SameSite=Strict`), puis `pastille-brouillon.ts` ; le cadre (`cadre.ts`) est
  chargé sur toute page d'administration.
- **Approvisionnement** : `.npmrc` refuse toute version publiée depuis moins de sept jours
  (`min-release-age=7`). `@playwright/test` n'est pas installé ; des navigateurs Chromium existent
  déjà dans `~/.cache/ms-playwright` (ceux de `playwright-cli`, utilisé par la recette), sans garantie
  de correspondre à la version qui sera retenue.

## Goals / Non-Goals

**Goals :**
- Un navigateur réel charge la **page servie par le Worker bâti**, avec ses en-têtes et sa politique
  de sécurité, et y joue un geste de l'éditrice de bout en bout.
- Le dispositif **prouve sa propre fidélité** avant de prouver quoi que ce soit d'autre : les en-têtes
  de sécurité attendus sont bien servis en local.
- Une **violation de la politique de sécurité** fait échouer le parcours, quel que soit le geste en
  cours — c'est la classe de défaut de la PR #72.
- **Zéro changement du code produit** : ni route, ni drapeau, ni branche conditionnelle de test.
- Des parcours **rejouables** : base locale neuve à chaque passe, aucun état partagé avec `npm run dev`.

**Non-Goals :**
- Couvrir les cas fins de chaque îlot (chaque refus, chaque état) : c'est le rôle d'un éventuel étage
  de tests de composants, hors de ce change.
- Mesurer la couverture du code navigateur.
- Remplacer la recette : le cahier de test (`docs/cahier-de-test.md`) reste joué sur le serveur de
  recette Cloudflare, au plus près de la production (vraie D1, vraie liaison d'e-mail, HTTPS).
- Jouer les parcours dans d'autres navigateurs que Chromium.

## Decisions

### D1 — Servir le Worker bâti par `wrangler dev`, pas `astro dev`

Le parcours vise `npm run build` puis `wrangler dev --config dist/server/wrangler.json --local`, sur
un port fixe. C'est le même `entry.mjs` et les mêmes assets que ce qui est déployé, exécutés par
`workerd`.

- *`astro dev`* écarté : Vite y sert des modules non regroupés et ses propres scripts de
  rechargement ; la page n'est pas celle de la production, et la politique `script-src 'self'`
  (**I12**) peut y diverger dans les deux sens.
- *`astro preview`* : avec l'adaptateur Cloudflare, il lance lui aussi `workerd` ; il n'apporte rien
  de plus que `wrangler dev` et ne permet pas de choisir aussi directement le répertoire de la base
  locale (D2). Gardé comme repli si `wrangler dev` posait problème.

La fidélité de ce choix n'est **pas supposée** : c'est le premier critère du pilote (D5).

### D2 — Une base locale propre aux parcours, neuve à chaque passe

La base des parcours vit dans un répertoire dédié (`--persist-to .wrangler/parcours`), effacé au début
de chaque passe, puis préparé par `wrangler d1 migrations apply DB --local` sur ce même répertoire.
Rien n'est partagé avec l'état de `npm run dev` ni avec les tests Vitest. Une correction enregistrée
par un parcours ne fuit donc jamais dans la passe suivante.

### D3 — Entrer par une session semée, sans aucun code produit

La préparation de passe (configuration globale de Playwright) tire un jeton aléatoire
(`crypto.randomUUID()`), l'inscrit dans `sessions` (`id`, `identifiant_appareil`, `creee_le` = maintenant)
par `wrangler d1 execute --local`, et le contexte du navigateur reçoit le cookie `__Host-session`
correspondant (`secure`, `httpOnly`, `sameSite: 'Strict'`, `path: '/'`).

- **I13** tenu : aucun en-tête `Set-Cookie` n'est composé ailleurs qu'en `enteteCookieSession`. Le
  navigateur de test reçoit un cookie, il ne le reçoit pas d'une réponse HTTP.
- **I6** tenu : aucune route n'est ajoutée, sous `/admin/` ni ailleurs.
- *Connexion par code de bout en bout* écartée pour le pilote : le code part par e-mail (liaison
  `send_email`), et en local il n'est lisible nulle part, sauf à ajouter au produit une sortie de test.
  Un parcours de connexion pourra venir plus tard en lisant le message capturé par Miniflare, sans
  toucher au produit.
- *Route de connexion réservée aux tests* : refusée, c'est une porte dérobée (voir
  `security-review.md`).

### D4 — Le parcours pilote : corriger le bouton d'action de l'accueil

Ouvrir `/admin/pages/accueil`, remplacer le libellé de `bouton-devis`, enregistrer, constater
l'acceptation et l'apparition de la marque de brouillon sans recharger l'écran, recharger, constater
que la correction tient. Ce geste exerce, en une passe, le cadre, le montage d'un îlot Svelte, l'envoi
d'une correction (le chemin même que `connect-src` bloquait à la PR #72) et la marque de brouillon.

Les éléments sont désignés par leur **rôle et leur nom accessibles** (libellé du champ, nom du bouton),
jamais par une classe ou une structure de DOM : un parcours lit l'écran comme l'éditrice, et un
changement de mise en forme ne le casse pas.

### D5 — Deux gardes de fidélité

1. **En-têtes.** Avant tout geste, la réponse de `/admin/pages/accueil` doit porter les quatre
   en-têtes de **I11**, avec une politique qui contient `script-src 'self'` (**I12**) et une directive
   `connect-src`. Si l'un manque, le parcours échoue en disant que le dispositif, et non le produit,
   est en cause.
2. **Violations de la politique de sécurité.** Le contexte du navigateur écoute l'évènement
   `securitypolicyviolation` (script d'initialisation injecté par Playwright, hors de portée de la
   politique de la page) ainsi que les messages de console « Refused to … ». Toute occurrence fait
   échouer le parcours, en nommant la directive et la ressource bloquées.

### D6 — Emplacement et outillage

- Parcours sous `tests/parcours/`, fichiers `*.parcours.ts`, et une `playwright.config.ts` à la racine
  (`webServer` qui bâtit, prépare la base puis lance `wrangler dev` ; un seul worker Playwright, les
  parcours partageant la base de la passe).
- `vitest.config.ts` écarte `tests/parcours/**` de sa collecte, même si le suffixe `.parcours.ts` ne
  correspond déjà pas au motif par défaut : la frontière entre les deux étages est explicite.
- Une commande `npm run parcours`, distincte de `npm test` : les parcours ne ralentissent pas la boucle
  de test courante.
- `@playwright/test` en dépendance de développement, à une version publiée depuis plus de sept jours
  (`.npmrc`) ; le Chromium installé par `npx playwright install chromium`, qui correspond à cette
  version — on ne s'appuie pas sur ceux de `playwright-cli`.

### D7 — CI : un job informatif, après le pilote

Un job `parcours` dans `.github/workflows/ci.yml`, **non requis** par le ruleset (`docs/ci.md` : la CI
annote, elle ne bloque pas). Il met en cache les navigateurs de Playwright et installe Chromium avec
ses dépendances système. Il vient dans un ticket distinct, **après** que le pilote a tenu en local :
brancher la CI sur un dispositif pas encore éprouvé produirait des rouges qu'on apprendrait à ignorer.

### Conformité

ADR-0014 (Playwright pour les parcours, oracle du produit) : appliqué. ADR-0011 (anti-forgerie par
`SameSite=Strict`) : le parcours l'exerce réellement, la requête d'écriture partant d'une page de même
origine. ADR-0006 et **I4** (aucune directive `client:*`) : non touchés, le parcours les exerce. Aucun
invariant **I1–I15** n'est franchi : aucun fichier de `src/` n'est modifié. Aucune décision
structurante nouvelle : pas d'ADR.

## Risks / Trade-offs

- [`wrangler dev` ne sert pas exactement les mêmes en-têtes que la production] → la garde D5.1 le
  détecte à chaque passe ; la recette sur le serveur Cloudflare reste la référence pour ce qui ne se
  reproduit pas en local (HTTPS, domaine réel, vraie liaison d'e-mail).
- [Chromium refuse un cookie `Secure` / `__Host-` sur `http://localhost`] → Chromium traite
  `localhost` comme un contexte sûr et l'accepte. C'est **à vérifier en premier par le pilote** ; à
  défaut, servir `wrangler dev` en HTTPS local (`--local-protocol https`).
- [Parcours instables (attentes, ports)] → attentes sur l'état de l'écran, jamais de délais fixes ;
  port fixe et `reuseExistingServer: false` ; un seul worker. Un parcours instable se corrige ou se
  retire, il ne se relance pas en boucle (pas de `retries` en local).
- [Lenteur : build + démarrage + navigateur, de l'ordre de la minute] → commande séparée de
  `npm test` ; en CI, job parallèle aux autres.
- [Seconde chaîne d'outillage à tenir à jour (ADR-0014 l'annonçait)] → une seule dépendance, et le
  navigateur qu'elle épingle ; le gel de sept jours s'applique.
- [Une session semée contourne la connexion par code] → assumé : la connexion a ses tests serveur
  (001) et sa recette ; le pilote vise le code navigateur de l'édition, pas l'entrée.

## Migration Plan

Aucune donnée ni aucun déploiement concerné. Retour arrière : retirer `tests/parcours/`,
`playwright.config.ts`, la dépendance, la commande et le job ; rien dans le produit n'en dépend.
