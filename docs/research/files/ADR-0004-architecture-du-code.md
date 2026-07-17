---
id: ADR-0004
title: Architecture du code (hybride A+B)
status: proposed
date: 2026-07-10
authors: [arborescence-digital]
scope: packages/, apps/
supersedes: []
superseded-by: null
depends-on: [ADR-0003]
---

# ADR-0004 — Architecture du code (hybride A+B)

**Statut :** proposed — 2026-07-10 · *à valider avant l'écriture du code métier V1*

> **Place dans la famille.** ADR-0004 fixe *comment le code est découpé et qui importe qui*. Les seams définis ici (contrat `@colibri/db`, `writeHandler`, `AssetResolver`, JWKS injectable) sont les cibles directes d'ADR-0005 (test) et les points de contrôle d'ADR-0006 (génération IA).

---

## Résumé exécutif

L'architecture retenue est un **hybride A+B**. De l'option « cœur pur + accès partagé » (A) on garde deux garanties structurelles : un package `@colibri/core` **100 % pur** (zéro dépendance Cloudflare) et un package `@colibri/db` qui est **le contrat de lecture unique** partagé par le site (build SSG) et l'admin (SSR), empêchant toute dérive entre eux. De l'option « tranches verticales » (B) on garde le **rangement par type de contenu** (un dossier = un type, complet), qui rend les ajouts de la V2 indolores. Les deux styles sont réconciliés par deux règles et rendus **mécaniques** dès l'Étape 0 via des frontières de dépendance en CI (ESLint `no-restricted-paths` / dependency-cruiser) : la discipline n'est plus une question de vigilance.

---

## Contexte

Contraintes héritées d'ADR-0003 et du PRD :
- **Pas d'API REST publique** : accès direct aux bindings D1/R2/KV (« Local API pattern »). Il n'existe donc *aucun contrat réseau* pour empêcher site et admin de diverger — c'est l'architecture qui doit le fournir.
- **Deux surfaces qui lisent les mêmes données** : le build SSG (`apps/site`) et la preview SSR (`apps/admin`) hydratent les mêmes relations (JOIN auteur + tags). Duplication = dérive.
- **Renderer ProseMirror→HTML partagé** entre SSG et SSR preview (NFR-11) : un bug s'y propage partout.
- **Contrôle d'accès réappliqué explicitement dans chaque endpoint d'écriture** (risque nommé §14 du PRD : « endpoint oublié »).
- **Verrou optimiste** sur `updated_at` (FR-13).
- **V2 attendue** : types de contenu additionnels + rôles différenciés.
- **Middleware Astro classique** imposé pour l'auth (ADR-0003 §risque 2, bug OOM #17181).

---

## Décision

### Les deux règles porteuses
1. **Règle du noyau.** Ce qui doit être *identique partout* et *agnostique au type de contenu* (renderer, verrou, slug, pipeline d'auth) vit dans un noyau mince. Les tranches le **composent**, ne le ré-implémentent jamais.
2. **Règle du contrat.** Toute lecture consommée par le site **et** l'admin vit dans `@colibri/db`. Une app n'écrit jamais son propre SQL de lecture.

Ces règles sont **rendues exécutables** : un import de Cloudflare dans `core`, ou d'`apps` dans `db`, casse la CI.

### Topologie des packages et sens des dépendances
```
apps/{site,admin}  →  @colibri/db  →  @colibri/core
```
`@colibri/core` : domaine pur (TS + Zod), zéro dépendance Cloudflare/Astro/React.
`@colibri/db` : accès données, dépend de `core` + `@cloudflare/workers-types` (types only), **bindings passés en paramètre**.
`apps/*` : *composition roots* qui câblent bindings ↔ domaine.

```
packages/
  core/                 # PUR
    schema/             # + baseEditorialDocument (Article ∩ Page)
    renderer/           # toBlocks() PUR + interface AssetResolver
    slug.ts  lock.ts
    content-type.ts     # descripteur V2 — présent mais DORMANT
  db/                   # bindings en paramètre — contrat unique
    repository.ts       # createRepository() : verrou hérité
    article/  page/  author/  tag/     # tranches
apps/
  site/                 # build → db + renderer (résolveur BUILD, Sharp)
  admin/
    lib/env.ts          # parse env via Zod (config typée)
    lib/auth.ts         # validation JWT, résolution JWKS injectable
    lib/handler.ts      # writeHandler — pipeline non-contournable
    middleware.ts       # Access JWT global + CSRF checkOrigin
    pages/api/…         # endpoints minces
    pages/preview/…     # SSR → db + renderer (résolveur PREVIEW)
    islands/…           # React : Editor (TipTap), MediaPicker
```

### Décisions de conception fines

**a. Deux schémas Zod par type, pas un.**
- `xxxRow` valide ce qui **sort** de D1 (id, timestamps, verrou) — parse défensif, aucun `any` qui fuit du binding.
- `xxxInput` valide ce que l'éditeur **soumet** (sans id/audit ; avec `tag_ids` ; avec `updated_at` = jeton du verrou). C'est **lui** la frontière Zod côté endpoint (NFR-3).
- Confondre les deux casse soit le verrou (renvoyer `updated_at` en écriture), soit la sécurité (accepter `status` sans contrôle).
- La commonalité Article ∩ Page (slug, title, body_json, status, SEO, audit, verrou) est extraite en `baseEditorialDocument`. **Règle de trois** : on s'arrête à deux instances, on ne construit pas de moteur générique en V1.

**b. Renderer en deux temps + seam `AssetResolver`.**
- `toBlocks(bodyJson): RenderBlock[]` est **pur, déterministe, synchrone** — cœur de test n°1, partagé site+preview.
- Une image du corps ne connaît qu'un `mediaId`. Sa résolution est **injectée** via l'interface `AssetResolver` :
  - site (build) → composant `<Image>` Astro + Sharp (optimisé) ;
  - admin (preview) → URL R2 brute (pas de build disponible).
- Preview et build appellent **le même `toBlocks` et la même requête `db`** → le rendu ne peut pas diverger.

**c. Repository primitif à verrou atomique.**
`createRepository()` implémente `UPDATE … WHERE id=? AND updated_at=?` : le verrou (FR-13) est **atomique dans le SQL** (pas de read-then-write racé). `res.meta.changes === 0` ⇒ `OptimisticLockError` → 409. Chaque tranche *hérite* de ce comportement, ne le réécrit jamais.

**d. `writeHandler` — l'auth non-contournable.**
Un endpoint d'écriture **est** un `writeHandler({ schema, authorize?, run })`. Le pipeline se déroule toujours avant `run` : `JWT (Cf-Access-Jwt-Assertion) → CSRF checkOrigin → résolution user (email→users, cache KV) → validation Zod → authorize → run → mapping OptimisticLockError=409 → réponse`. On **ne peut pas** livrer une route d'écriture qui saute l'auth : le risque §14 du PRD est éliminé par la forme. `authorize` est trivial en V1 (tous éditeurs égaux) mais le seam existe déjà pour les rôles V2.

**e. Config env + JWKS injectable.**
`parseEnv(env)` via Zod, **une fois** en bordure d'app — jamais de `env.X` dispersé (réplicabilité : seules les valeurs de binding changent par client). `verifyAccessJwt(token, { jwks })` où `jwks` vaut par défaut `createRemoteJWKSet(certsUrl)` mais est **injectable** (`createLocalJWKSet` en test). Ce point d'injection doit exister dans le code de prod **dès le jour 1** (contrainte d'ADR-0005 §validation JWT).

**f. Descripteur V2 dormant.**
`ContentTypeDescriptor<T>` définit *la forme* à laquelle chaque tranche se conforme (schéma, table, relations, requête de lecture, champs de formulaire). En V1, chaque tranche est écrite à la main **mais conforme** ; le moteur générique qui consomme le descripteur **n'est pas** construit. Quand le 3ᵉ type arrive en V2, l'abstraction est déjà là.

### Les trois flux (preuve du partage)
- **Écriture / publication** : formulaire → `PUT /api/articles/:id` → `writeHandler` → `articleRepo.update` (verrou SQL) → sur « Publier », `status/published_at` + Deploy Hook (mocké en test).
- **Preview (SSR, sans build)** : `GET /preview/article/:slug` (derrière Access) → `db.article.getBySlug(env.DB, slug, { includeDrafts:true })` → `toBlocks` → `blocksToHtml(blocks, previewResolver)`.
- **Build site (SSG)** : `getStaticPaths` → `db.article.getPublishedArticles(buildD1)` → `toBlocks` → `<RenderedBody>` avec `<Image>` (Sharp).

---

## Alternatives considérées (et pourquoi rejetées)

| Option | Idée | Rejet |
|---|---|---|
| **A** seul | Cœur pur + `db` partagé, rangement horizontal | Bon anti-dérive, mais un type est éparpillé sur plusieurs dossiers → V2 pénible |
| **B** seul | Tranches verticales par type | Localité idéale, mais risque de dupliquer la lecture site/admin (le risque que A supprime) |
| **C** | Apps épaisses, noyau mince (défaut littéral du socle) | Dérive site/admin quasi garantie ; réveille le risque §14 |
| **D** | Moteur générique piloté par descripteurs | Sur-ingénierie pour 4 types ; règle de trois violée |
| **E** | Onion / DDD à 4 couches | Cérémonie disproportionnée ; interfaces multiples pour une seule implémentation |
| **F** | Frontière RPC/BFF interne | Rouvre la décision « pas d'API » du PRD ; superflu pour peu de formulaires |

→ La vraie décision était **A vs B** ; leurs faiblesses étant complémentaires, l'hybride prend la contrainte anti-dérive de A et la localité de B.

---

## Conséquences

### Bénéfices
- Anti-dérive de A (contrat `db`) **et** localité de B (tranches).
- Risque « endpoint sans contrôle d'accès » éliminé par construction.
- Renderer partagé → preview et prod ne peuvent pas diverger.
- Porte V2 (descripteur) posée sans construire le moteur.
- Seams alignés sur la stratégie de test (ADR-0005) et la gouvernance IA (ADR-0006).

### Risques / vigilance
- Deux packages de plus que l'option C → plus de câblage catalog/`package.json`.
- La discipline noyau/tranche **exige les frontières ESLint dès l'Étape 0**, sinon B reprend ses mauvaises habitudes.
- Le renderer en blocs demande plus de design amont qu'un renderer-string naïf.

---

## Seuils qui feraient reconsidérer
- Si `ContentTypeDescriptor` commence à être *consommé* par du code générique en V1 → dérive vers l'option D (sur-ingénierie) : le garder dormant.
- Si le 3ᵉ, 4ᵉ… type arrive vite en V2 → activer le chemin générique (le descripteur est déjà là).
- Si les îlots React deviennent nombreux et complexes → réévaluer l'option F (frontière RPC typée).

---

## Caveats
- **Accès D1 au build** sur Workers Static Assets **[À VÉRIFIER]** : binding d'intégration build vs D1 REST/wrangler. L'architecture est agnostique (le build fournit son adaptateur à `db`), mais le chemin exact reste à trancher.
- **Optimisation d'images distantes R2 au build** via `getImage()` + `image.remotePatterns` **[À VÉRIFIER]** : mécanisme sain, config Astro 7 exacte à confirmer.
- **Auth via middleware Astro** (pas `src/fetch.ts`) tant que l'OOM #17181 n'est pas corrigé (ADR-0003).

---

## Constraints
> Règles impératives et vérifiables — compilées en frontières ESLint/dependency-cruiser + revue (cf. ADR-0002, ADR-0006).
- **INTERDIT** : tout import de `cloudflare*` / `@cloudflare/*` (hors types) dans `@colibri/core`.
- **INTERDIT** : tout import de `apps/*` dans `@colibri/db` ou `@colibri/core`.
- **OBLIGATOIRE** : toute lecture consommée par le site **et** l'admin vit dans `@colibri/db` ; **INTERDIT** d'écrire du SQL de lecture dans `apps/*`.
- **OBLIGATOIRE** : tout endpoint d'écriture est déclaré via `writeHandler({...})` ; aucun handler d'écriture ad hoc.
- **OBLIGATOIRE** : deux schémas Zod par type (`xxxRow` en sortie D1, `xxxInput` en entrée éditeur).
- **OBLIGATOIRE** : le verrou optimiste passe par `createRepository` (`UPDATE … WHERE updated_at=?`), jamais réimplémenté.
- **OBLIGATOIRE** : la résolution JWKS de l'auth est injectable dès le code de prod.
- **INTERDIT** : consommer `ContentTypeDescriptor` par du code générique en V1 (le garder dormant).

## Related
- Contraint par : ADR-0003 (socle — middleware vs `src/fetch.ts`, bindings, versions).
- Testé par : ADR-0005 (les seams `db`/`writeHandler`/`toBlocks`/JWKS sont les cibles de test).
- Gouverné par : ADR-0006 (les frontières sont le portail anti-dérive de la génération IA).
- Cadre : PRD ColibriCMS.
- *Note de granularité : si un facet évolue seul (ex. renderer en blocs), il pourra graduer en ADR dédié qui supersède la sous-partie correspondante.*
