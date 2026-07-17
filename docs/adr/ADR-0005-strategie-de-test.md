---
id: ADR-0005
title: Stratégie de test
status: accepted
date: 2026-07-17
authors: [arborescence-digital]
scope: tests/, "**/*.test.ts", vitest.config.ts, playwright.config.ts
supersedes: []   # renumérotation de l'ex-ADR-001 (non superseded : jamais formellement accepté) ; volet IA extrait vers ADR-0006
superseded-by: null
depends-on: [ADR-0003, ADR-0004]
---

# ADR-0005 — Stratégie de test

**Statut :** accepted — 2026-07-17 · *ex-ADR-001, re-pointé sur les seams d'ADR-0004 ; volet IA extrait vers ADR-0006 ; amendé pour le périmètre page + formulaires (2026-07-17)*

> **Amendement 2026-07-17 (périmètre page + constructeur de formulaires).** Trois ajouts au périmètre de test, sans changer la taxonomie : (1) l'**endpoint public de soumission de formulaire** (première route d'écriture non protégée par Access) est une cible d'intégration — testé pour la vérification Turnstile et le refus d'un jeton absent/invalide, pas seulement le happy-path ; (2) l'**envoi d'e-mail** (Cloudflare Email Routing) est **mocké** en test, au même titre que le Deploy Hook (garde-fou free tier — jamais d'envoi réel), et la vérification **Turnstile** est **injectable/mockée** (clé de test) comme le JWKS ; (3) le **calcul du total** du formulaire (somme des contributions) est une cible de **test unitaire pur** dans `@colibri/core`, au même rang que `toBlocks`. Les **migrations D1** sont testées sur données réelles-locales **avant** tout déploiement de flotte (lien ADR-0008).

> **Ce qui a changé depuis l'ex-ADR-001** (ce document, renuméroté). (1) Renuméroté et re-pointé sur les seams concrets d'ADR-0004 (`@colibri/core`, `@colibri/db`, `writeHandler`, `AssetResolver`, JWKS injectable) au lieu du vague `packages/shared`. (2) Le volet *génération de code par IA* — qui gonflait ce document — est **extrait vers ADR-0006** ; ADR-0005 ne traite plus que la taxonomie et l'outillage de test.

---

## Résumé exécutif

Trophée de test (Kent C. Dodds) pondéré par le risque : investissement massif sur le **statique** (TypeScript 6 `strict` + Zod 4) et sur les **tests d'intégration des endpoints d'écriture admin exécutés dans le vrai runtime workerd** (`@cloudflare/vitest-pool-workers`), un socle d'unitaires purs ciblés sur le noyau `@colibri/core` (renderer `toBlocks`, slug, verrou, schémas), et une fine couche E2E Playwright sur le parcours éditeur. Stack : **Vitest + Testing Library** (unit/composants), **`@cloudflare/vitest-pool-workers`** (intégration bindings réels-locaux via Miniflare), **Playwright** (E2E), orchestrés par **pnpm workspaces + Turborepo** dans **GitHub Actions**. Contournement de Cloudflare Access : **service tokens** en E2E réel, **JWT RS256 fabriqué + clé injectée** en intégration.

---

## Contexte : ce que l'architecture (ADR-0004) impose au test

1. **Accès direct aux bindings** (Local API) : les tests doivent exercer D1/R2/KV directement → runtime capable de simuler les bindings (workerd/Miniflare), pas de tests HTTP purs.
2. **Renderer `toBlocks` partagé** SSG + preview : surface critique n°1, testable en **unitaire pur** (ProseMirror JSON → `RenderBlock[]`, sans DOM ni éditeur).
3. **`writeHandler` réapplique le contrôle d'accès** + valide le JWT : chaque endpoint testé pour **l'autorisation**, pas seulement le happy-path.
4. **Verrou optimiste, upload R2, Deploy Hook secret.**
5. **Garde-fous free-tier même en test** : pas d'autosave, Deploy Hook **mocké** (jamais déclenché), aucun quota Cloudflare distant consommé.
6. **Réplicabilité inter-clients** : suite identique d'une instance à l'autre, 100 % locale/CI gratuite.

---

## Décision

### (a) Distribution d'effort (jugement d'expert, non chiffré)
- **Statique (socle continu)** : TS 6 `strict`, ESLint, **Zod 4** comme frontière de validation (les deux schémas `Row`/`Input` d'ADR-0004). Meilleur ratio confiance/coût.
- **Intégration (la plus grosse part)** : endpoints d'écriture (`writeHandler`) + fonctions de `@colibri/db` contre D1/R2/KV réels-locaux + validation d'autorisation. **Priorité n°1 par le risque.**
- **Unitaire pur (ciblé)** : `@colibri/core` — renderer `toBlocks`, slug, verrou (`lock`), schémas Zod. Code pur, déterministe, fort effet de levier.
- **E2E (fine couche)** : un parcours nominal complet + cas critiques (autorisation refusée, conflit de verrou).

### (b) Ordre d'investissement par le risque
1. `toBlocks` (unitaire) — un bug s'y propage au SSG **et** à la preview.
2. Endpoints `writeHandler` + contrôle d'accès (intégration workerd).
3. Verrou optimiste (unitaire + intégration : deux écritures concurrentes → la seconde échoue).
4. Upload R2 + validation MIME serveur (intégration).
5. Parcours éditeur E2E (login → CRUD → upload → preview → Deploy Hook mocké).

### (c) Ce qui NE mérite PAS d'être testé en V1
- Contenu statique trivial ; détails d'implémentation des composants (Dodds : « never test implementation details ») ; le SDK Cloudflare, Sharp, TipTap en tant que libs (on teste **notre** usage) ; le déclenchement réel du Deploy Hook (mocké) ; la couverture exhaustive des rendus visuels.

### (d) Matrice de la stack d'outillage

| Niveau | Outil | Justification | Confiance |
|---|---|---|---|
| Statique | TS 6 `strict` + ESLint + Zod 4 | déjà dans le socle ; frontière serveur | Élevée |
| Unitaire pur (`core`) | **Vitest** (env `node`) | Vite-native ; `toBlocks` testable sans DOM | Élevée |
| Composants React / TipTap | **Vitest + @testing-library/react + user-event** (jsdom/happy-dom) | comportement visible ; TipTap sous jsdom exige des workarounds | Moyenne |
| Composants `.astro` | **Container API** (`experimental_AstroContainer`) | seule voie de rendu `.astro` en test ; **expérimentale** | Moyenne |
| Intégration bindings (`db` + endpoints) | **`@cloudflare/vitest-pool-workers`** | tests **dans workerd**, bindings réels-locaux, migrations D1 via `applyD1Migrations` ; **beta ouverte** | Moyenne-Élevée |
| Validation JWT Access | **`jose` + clé injectée / `createLocalJWKSet`** | JWT RS256 fabriqué, clé publique injectée, zéro réseau | Moyenne |
| E2E | **Playwright** | multi-navigateur, auto-wait, `storageState`, `@axe-core/playwright` | Élevée |
| Contournement Access (E2E/CI) | **Service tokens (Service Auth)** | applique les politiques + logging | Élevée |
| A11y/SEO du SSG bâti | **Playwright + @axe-core/playwright** (`wcag2a`/`wcag2aa`) | sur le HTML réellement bâti | Élevée |
| Orchestration monorepo | **pnpm workspaces + Turborepo** (`--filter`) | cache par tâche, cibles affectées | Élevée |
| CI | **GitHub Actions** | natif pnpm/Turborepo, workerd local sans quota | Élevée |

### (e) Points à haut risque (détail)

**Renderer `toBlocks` (unitaire pur, Élevée).** Entrée déterministe → sortie déterministe. Table de cas (chaque nœud/mark → blocs attendus) + snapshots de non-régression. **Ne pas** instancier TipTap. Un seul jeu de tests protège SSG et preview.

**Schémas Zod / slug / verrou (unitaire pur, Élevée).** Zod : acceptation/rejet, coercitions, messages (frontière serveur). Slug : Unicode, collisions, longueur, caractères réservés. Verrou : comparaison en unitaire, puis comportement réel en intégration.

**Îlots React + TipTap sous jsdom (Moyenne).** Limites documentées (jsdom n'implémente pas `Range.getBoundingClientRect`, `getClientRects`, `elementFromPoint`) → stubber dans le setup Vitest ; exposer un rôle `textbox`. Incompatibilité jsdom↔Vitest v4 possible (#9279) → épingler. **Position** : logique légère autour de l'éditeur en Vitest+jsdom ; comportement d'édition réel (frappe, sélection, sérialisation) en **Playwright**. Ne pas sur-investir jsdom sur ProseMirror.

**Intégration (`vitest-pool-workers`, Moyenne-Élevée).** Migrations D1 : `readD1Migrations()` → binding `TEST_MIGRATIONS` → `applyD1Migrations()` dans un `setupFile`. **Bug #7739** : échec si la dernière ligne d'une migration est un commentaire → ne pas terminer une migration par un commentaire. Isolation **par fichier** depuis Vitest 4 / pool v0.13 (`isolatedStorage`/`singleWorker` retirés) ; état partagé → `--max-workers=1 --no-isolate`. **Contradiction de version** Vitest (4.1+ vs 2–3.2) selon la version du package → vérifier l'installé. Couverture V8 non supportée → **Istanbul**.

**Validation JWT Access (Moyenne).** Fabriquer un JWT RS256 via `jose` (`SignJWT`/`generateKeyPair`), `kid` cohérent avec le JWKS. **Résolution injectable (H-A, recommandé)** : passer `createLocalJWKSet(jwks)` ou la `CryptoKey` publique à `jwtVerify` — aucun réseau, indépendant de la version du pool. **Exige que le code de prod expose ce point d'injection** — c'est une décision d'ADR-0004 §e. `[À VÉRIFIER]` : aucun exemple officiel complet « JWT Access fabriqué + mock `/cdn-cgi/access/certs` sous vitest-pool-workers » ; composition d'API documentées séparément.

**E2E + contournement Access (Élevée sur les mécanismes).** Parcours : login → CRUD Page + construction de formulaire → upload R2 → preview SSR → Deploy Hook **mocké** ; + autorisation refusée, conflit de verrou. Contournement : (1) **service tokens** (Service Auth) — recommandé ; (2) tests **locaux sans Access** avec header `Cf-Access-Jwt-Assertion` fabriqué — recommandé pour le gros de la CI (zéro réseau/quota). Playwright : `webServer` en mode production-ish (`wrangler dev` sur les assets bâtis), `storageState` via `globalSetup`.

### (f) CI/CD & réplicabilité
Turborepo, cibles affectées : `turbo run test --filter='...[origin/main...HEAD]'` ; `test` dépend de `^build` (pour que `@colibri/core` soit bâti avant les apps). GitHub Actions, Node 22, cache pnpm, `fetch-depth: 0`. workerd/Miniflare **en local** dans le runner → **aucun** des 500 builds/mois consommé. Réplicabilité : `vitest.config`, `playwright.config`, workflow, `turbo.json` **identiques** par client ; seules les valeurs de binding (IDs D1/R2/KV, `TEAM_DOMAIN`, `POLICY_AUD`) changent.

---

## Objectif de couverture réaliste (V1 agence)
Pas de pourcentage imposé (Dodds : la couverture « does a very poor job » d'indiquer où investir). **Objectif orienté risque** : 100 % des endpoints d'écriture testés pour autorisation + happy-path + un cas d'erreur ; `toBlocks` couvert par table de cas exhaustive ; schémas Zod et verrou couverts. La couverture globale est un indicateur **secondaire**.

---

## Seuils / signaux qui feraient reconsidérer
- **vitest-pool-workers** : bug bloquant sur l'isolation/les bindings au-delà d'un cycle de release → **Miniflare standalone**.
- **TipTap sous jsdom** : flakiness au-delà de la tolérance équipe → **tout en Playwright**.
- **Container API** : breaking change à chaque minor Astro → réduire les tests `.astro` au minimum, compter sur l'E2E.
- **E2E derrière Access** : flakiness des service tokens → pattern « local sans Access + JWT fabriqué ».
- **Temps de CI** : > quelques minutes/PR → remote cache Turborepo + sharding Playwright.

---

## Anti-patterns à proscrire
- **Sur-mocker les bindings** (annule la fidélité workerd) → vrais bindings locaux.
- **Tester l'implémentation** plutôt que le comportement.
- **Login IdP interactif en CI** → service tokens ou JWT fabriqué.
- **Déclencher le vrai Deploy Hook** en test (viole le garde-fou free-tier).
- **Terminer une migration D1 par un commentaire** (#7739).
- **Confondre couverture et confiance.**

---

## Caveats
- **Écosystème mouvant** : `vitest-pool-workers` en **beta ouverte** (breaking changes v0.13/Vitest 4) ; Container API Astro **expérimentale**. Revalider toute config à l'installation.
- **Contradiction de version Vitest** requise par le pool — dépend de la version installée.
- **Test JWT Access** : pattern complet reconstitué par **inférence** `[À VÉRIFIER]`.
- **fake timers** inopérants sur KV/R2 (`[À VÉRIFIER]` pour l'expiration/TTL).
- **axe-core** ne couvre qu'une partie de WCAG — combiner avec du manuel.

---

## Alternatives Considered
- **Jest / Mocha** (unitaire). *Rejeté* : Vitest est Vite-native, aligné sur l'écosystème Astro.
- **Miniflare standalone** (intégration). *Repli* : retenu seulement si `vitest-pool-workers` présente un blocage durable.
- **Mocks manuels des bindings D1/R2/KV**. *Rejeté* : annule la fidélité workerd (anti-pattern « sur-mock »).
- **Politique Access « Bypass »** en E2E. *Rejeté* : ne journalise rien et n'applique aucun contrôle — réservé aux endpoints réellement publics.
- **Lighthouse CI seul** (a11y). *Rejeté* : axe-core intégré à Playwright, exécuté sur le HTML bâti.
- **Nx** (orchestration). *Rejeté* : Turborepo suffit (cache par tâche, cibles affectées).

## Constraints
- **OBLIGATOIRE** : l'intégration s'exécute dans **workerd** avec les vrais bindings locaux (Miniflare) ; **INTERDIT** de sur-mocker D1/R2/KV.
- **OBLIGATOIRE** : 100 % des endpoints d'écriture testés pour l'autorisation (refus + happy-path + un cas d'erreur).
- **INTERDIT** : déclencher le vrai Deploy Hook en test (toujours mocké — garde-fou free-tier).
- **INTERDIT** : envoyer un vrai e-mail en test (Cloudflare Email Routing mocké — garde-fou free-tier).
- **OBLIGATOIRE** : la route **publique** de soumission de formulaire est testée pour la vérification anti-spam (refus d'un jeton Turnstile absent/invalide **+** happy-path), en plus de la validation Zod.
- **INTERDIT** : terminer une migration D1 par un commentaire (bug #7739).
- **INTERDIT** : dépendre d'un login IdP interactif en CI (service tokens ou JWT fabriqué).
- **OBLIGATOIRE** : la couverture est un indicateur secondaire, jamais une cible chiffrée.

## Related
- Vise les seams de : ADR-0004 (`@colibri/core`, `@colibri/db`, `writeHandler`, `AssetResolver`, JWKS injectable).
- Contraint par : ADR-0003 (versions d'outillage, `nodejs_compat`).
- Compagnon : ADR-0006 (gouvernance de la génération IA & portail de vérification).
