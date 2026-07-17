---
id: ADR-0004
title: Architecture du code (cœur packagé + tranches par contenu)
status: accepted
date: 2026-07-17
authors: [arborescence-digital]
scope: packages/, apps/
supersedes: []
superseded-by: null
depends-on: [ADR-0003]
---

# ADR-0004 — Architecture du code (cœur packagé + tranches par contenu)

**Statut :** accepted — 2026-07-17 · *amende le draft du 2026-07-10 (ex-hybride A+B centré éditorial)*

> **Place dans la famille.** ADR-0004 fixe *comment le code est découpé et qui importe qui*. Les seams définis ici (contrat `@colibri/db`, `writeHandler`, `AssetResolver`, JWKS injectable, **contrat de gabarit**, seams e-mail/Turnstile) sont les cibles directes d'ADR-0005 (test), les points de contrôle d'ADR-0006 (génération IA), et la frontière que le versionnage de flotte d'ADR-0008 exploite.

---

> **Amendement 2026-07-17 — ce qui a changé depuis le draft du 10 juillet.** Le périmètre est passé d'un CMS éditorial (Article/Auteur/Tag) à un CMS **centré page + constructeur de formulaires** (cf. brief, PRD). Quatre conséquences structurelles :
> 1. **Fin des tranches `article/author/tag`** et de `baseEditorialDocument` (Article ∩ Page) : il ne reste qu'un seul type de document, la **Page**, décrite par des **gabarits** et des **zones typées**. Le seam `ContentTypeDescriptor` reste **dormant** pour le retour de l'éditorial en V2.
> 2. **Deux surfaces d'écriture nouvelles** : la gestion des **formulaires** (admin) et l'**endpoint public de soumission** — première route d'écriture **non protégée par Access**.
> 3. **Frontière cœur / site client** imposée par le mécanisme de versionnage (ADR-0008) : le cœur est un ensemble de **paquets versionnés** consommés par un **projet client privé**. Le **contrat de gabarit** devient un seam de premier plan.
> 4. **Nouveaux seams injectables** : envoi d'e-mail (Email Routing) et vérification anti-spam (Turnstile), au même titre que le JWKS.

---

## Résumé exécutif

Deux règles porteuses inchangées : un **noyau pur** (`@colibri/core`, zéro dépendance Cloudflare) et un **contrat de lecture unique** (`@colibri/db`) partagé par le site (build SSG) et l'admin (SSR), qui empêche toute dérive entre les deux surfaces lisant les mêmes données. À cela s'ajoute la contrainte neuve du versionnage de flotte : le code se sépare en un **cœur packagé** (moteur réutilisable, open source, versionné SemVer) et un **projet client privé** qui l'épingle et fournit ses **gabarits, thème et configuration**. Le **contrat de gabarit** est l'interface entre les deux : le projet client déclare la *structure* de ses pages (zones typées) et fournit leur *rendu*, sans jamais éditer le cœur. Les frontières sont rendues **mécaniques** dès l'Étape 0 (ESLint `no-restricted-paths` / dependency-cruiser en CI).

---

## Contexte

Contraintes héritées d'ADR-0003, du PRD et du mécanisme de versionnage (ADR-0008) :

- **Pas d'API REST publique** : accès direct aux bindings D1/R2/KV (« Local API pattern »). Aucun contrat réseau n'empêche site et admin de diverger — c'est l'architecture qui doit le fournir.
- **Deux surfaces lisent les mêmes données** : le build SSG (`apps/site`) et la preview SSR (`apps/admin`). Duplication = dérive.
- **Renderer partagé** entre SSG et preview SSR (contenu de page → HTML) : un bug s'y propage partout.
- **Contrôle d'accès réappliqué explicitement** dans chaque endpoint d'écriture admin (FR-003).
- **Une nouvelle route d'écriture publique** : la soumission de formulaire (FR-061), non authentifiée, protégée par Turnstile (FR-063) et non par un JWT Access.
- **Zones typées déclarées par le gabarit** (FR-007, FR-012, FR-074) ; l'éditrice remplit, ne restructure pas (FR-011, FR-016, FR-077). Exception : elle **compose** les formulaires (FR-041).
- **Cœur versionné, client épinglé, zéro code divergent par client** (SC-008, ADR-0008) : le sur-mesure vit dans le projet client, pas dans le cœur.
- **Middleware Astro classique** imposé pour l'auth (ADR-0003 §risque 2, bug OOM #17181).

---

## Décision

### Les deux règles porteuses

1. **Règle du noyau.** Ce qui doit être *identique partout* et *agnostique au gabarit* (renderer, calcul de total de formulaire, verrou, slug, pipeline d'auth) vit dans un noyau mince. Le reste **compose** le noyau, ne le ré-implémente jamais.
2. **Règle du contrat.** Toute lecture consommée par le site **et** l'admin vit dans `@colibri/db`. Une app n'écrit jamais son propre SQL de lecture.

Rendues exécutables : un import de Cloudflare dans `core`, ou d'`apps` dans `db`, casse la CI.

### Frontière cœur / site client (nouveau — ADR-0008)

```
  [ CŒUR — paquets versionnés, open source ]
  @colibri/core  ←  @colibri/db  ←  apps/{site,admin}   (le « moteur »)
                                          ▲
                                          │  contrat de gabarit (épinglé, SemVer)
                                          │
  [ SITE CLIENT — projet privé, non forké ]
  gabarits/ (structure + rendu)  theme/  config d'instance (bindings, e-mails)
```

Le **cœur** ne contient aucun gabarit client. Le **projet client** ne contient aucune logique de moteur : il déclare ses gabarits et fournit leur rendu via le **contrat de gabarit**, épingle une version du cœur, et porte sa configuration d'instance. Mettre à jour un client = bumper la version épinglée (ADR-0008).

### Le contrat de gabarit (seam de premier plan)

Un gabarit a **deux faces**, et le contrat les sépare :

- **Descripteur de structure** (consommé par le **cœur**) : `template key → liste ordonnée de zones { key, type, required, … }`. Pour une zone **répéteur**, le descripteur porte la **forme d'un élément** (sous-champs typés, FR-074). Le cœur en dérive **trois choses** : l'UI d'édition admin (quelles zones afficher), la **validation Zod** des valeurs de zone (FR-013), et la forme attendue de `page_zone_values`.
- **Rendu** (fourni par le **projet client**) : les composants Astro qui rendent chaque gabarit et chaque zone (dont le mode d'affichage d'une galerie — grille/carrousel, FR-068). Consommé par le build SSG et la preview SSR.

Le descripteur est **données** (typé, versionné, possédé par l'intégrateur dans le projet client) ; le rendu est **code du projet client**. Le cœur ne connaît que le descripteur ; il ignore à quoi ressemble une page.

### Topologie des packages

```
packages/                          # CŒUR (versionné, open source)
  core/                            # PUR — zéro dépendance Cloudflare/Astro/React
    zone/                          # schémas Zod par type de zone (Row/Input)
    renderer/                      # toBlocks() PUR + interface AssetResolver
    form/                          # calcul du total PUR (somme des contributions)
    slug.ts  lock.ts
    gabarit.ts                     # types du contrat de gabarit (descripteur)
    content-type.ts                # ContentTypeDescriptor V2 — présent mais DORMANT
  db/                              # bindings en paramètre — contrat de lecture unique
    repository.ts                  # createRepository() : verrou hérité
    page/  media/  form/  settings/  user/     # tranches par contenu
apps/                              # CŒUR — le « moteur » consommé par le client
  site/                            # build SSG → db + renderer (résolveur BUILD, Sharp)
  admin/
    lib/env.ts                     # parseEnv(env) via Zod
    lib/auth.ts                    # verifyAccessJwt, JWKS injectable
    lib/handler.ts                 # writeHandler — pipeline non-contournable
    lib/mailer.ts                  # seam d'envoi (Email Routing), injectable
    lib/turnstile.ts              # seam de vérification anti-spam, injectable
    middleware.ts                  # Access JWT global (admin) + CSRF checkOrigin
    pages/api/…                    # endpoints minces (admin + soumission publique)
    pages/preview/…                # SSR → db + renderer (résolveur PREVIEW)
    islands/…                      # React : éditeur de zones, constructeur de formulaires
```

### Décisions de conception fines

**a. Deux schémas Zod par surface de donnée, jamais un.**
- `xxxRow` valide ce qui **sort** de D1 (id, timestamps, verrou) — parse défensif, aucun `any` qui fuit du binding.
- `xxxInput` valide ce que l'éditrice (ou le visiteur) **soumet**. C'est **lui** la frontière Zod côté endpoint (FR-014, FR-042, FR-048). Pour une **valeur de zone**, le schéma d'entrée est **dérivé du descripteur de gabarit** (le type de la zone détermine le Zod ; répéteur → liste d'items conformes à la forme déclarée, FR-076).
- Confondre les deux casse soit le verrou, soit la sécurité.

**b. Renderer en deux temps + seam `AssetResolver`.**
- `toBlocks(...)` est **pur, déterministe, synchrone** — cœur de test n°1, partagé site+preview.
- Une image ne connaît qu'un `media_id` ; sa résolution est **injectée** via `AssetResolver` : site (build) → `<Image>` Astro + Sharp ; admin (preview) → URL R2 brute. Preview et build appellent le **même** `toBlocks` et la **même** requête `db` → le rendu ne peut pas diverger.

**c. Calcul du total de formulaire, pur.**
Le total est une **somme des contributions** (montants des choix sélectionnés + valeur×prix unitaire), calculée par une fonction **pure** de `@colibri/core` (FR-050), partagée entre le calcul côté navigateur et la vérification éventuelle côté serveur. Aucune règle conditionnelle (hors périmètre). Cible de test unitaire pur (ADR-0005).

**d. Repository primitif à verrou atomique.**
`createRepository()` implémente `UPDATE … WHERE id=? AND updated_at=?` : le verrou (jeton `updated_at`) est **atomique dans le SQL**. `changes === 0` ⇒ `OptimisticLockError` → 409. Chaque tranche en hérite. *(En V1, l'édition concurrente est hors périmètre — une éditrice — mais le primitif existe : il ne coûte rien et évite un écrasement accidentel deux-onglets.)*

**e. `writeHandler` — deux familles de routes, un seul pipeline.**
Un endpoint d'écriture **est** un `writeHandler({ auth, schema, authorize?, run })`. Le pipeline se déroule toujours avant `run` ; sa **tête varie selon `auth`** :
- `auth: 'access'` (admin, défaut) : `JWT Cf-Access-Jwt-Assertion → CSRF checkOrigin → résolution user (email→users, cache KV) → Zod → authorize → run`.
- `auth: 'public'` (soumission de formulaire) : `vérif Turnstile → Zod → run` (pas de JWT, pas de user — le visiteur est anonyme). CSRF et anti-abus assurés par Turnstile.

On **ne peut pas** livrer une route d'écriture qui saute sa tête de pipeline : le risque « endpoint sans contrôle » est éliminé par la forme, et une route publique **doit** déclarer `auth: 'public'` (donc passer Turnstile) — il n'existe pas de troisième voie « ni Access ni Turnstile ».

**f. Config env + seams injectables (JWKS, mailer, Turnstile).**
`parseEnv(env)` via Zod, **une fois** en bordure d'app. Trois points d'injection existent **dès le code de prod** (exigence d'ADR-0005) :
- `verifyAccessJwt(token, { jwks })` — `createRemoteJWKSet` par défaut, `createLocalJWKSet` en test.
- `sendMail(msg, { mailer })` — Email Routing par défaut, **mock** en test (jamais d'envoi réel — garde-fou free tier).
- `verifyTurnstile(token, { verifier })` — appel siteverify par défaut, **stub** en test.

**g. Descripteur V2 dormant.**
`ContentTypeDescriptor<T>` définit *la forme* à laquelle une future tranche de contenu éditorial (article…) se conformera. En V1 il n'est **pas** consommé par du code générique (règle de trois). Quand l'éditorial revient en V2, l'abstraction est déjà là.

### Les flux (preuve du partage)

- **Écriture admin** : formulaire d'édition → `PUT /api/pages/:id` → `writeHandler({auth:'access'})` → `pageRepo.update` (verrou) → sur « Publier », `status/published_at` + Deploy Hook (mocké en test).
- **Soumission publique** : `POST /api/forms/:slug/submit` → `writeHandler({auth:'public'})` → vérif Turnstile → Zod → `sendMail` (Email Routing) → confirmation (FR-061, FR-062). Rien n'est persisté (FR-064).
- **Preview (SSR)** : `GET /preview/:slug` (derrière Access) → `db.page.getBySlug(env.DB, slug, { includeDrafts:true })` → `toBlocks` → rendu via composants du gabarit client (résolveur PREVIEW).
- **Build site (SSG)** : `getStaticPaths` → `db.page.getPublished(buildD1)` → `toBlocks` → composants du gabarit client avec `<Image>` (Sharp).

---

## Alternatives considérées (et pourquoi rejetées)

| Option | Idée | Rejet |
|---|---|---|
| Monorepo unique de toute la flotte | Cœur + tous les sites clients dans un dépôt | Sites clients (commerciaux) hors du dépôt open source ; MAJ tout-ou-rien ; cf. ADR-0008 |
| Template forké par client | Chaque client = fork de ColibriCMS | Divergence des forks = « code divergent » interdit par SC-008 |
| Gabarits en config-données seule (sans code de rendu client) | Tout piloté par un descripteur générique | Un site vitrine sur-mesure a besoin de composants de rendu réels ; le générique pur bride le design |
| Apps épaisses, noyau mince | Défaut littéral du socle | Dérive site/admin quasi garantie ; réveille le risque « endpoint sans contrôle » |
| Moteur générique piloté par descripteurs (tout contenu) | `ContentTypeDescriptor` consommé dès V1 | Sur-ingénierie pour un seul type (Page) ; règle de trois violée — gardé dormant |

---

## Conséquences

### Bénéfices
- Anti-dérive (contrat `db`) **et** frontière cœur/client qui rend la flotte maintenable (SC-008).
- Risque « endpoint sans contrôle d'accès » éliminé par construction, **y compris** pour la route publique (Turnstile obligatoire).
- Renderer et calcul de total partagés → preview, prod et navigateur ne peuvent pas diverger.
- Le contrat de gabarit permet le sur-mesure client **sans** forcer de code dans le cœur.
- Porte V2 (descripteur éditorial) posée sans construire le moteur.

### Risques / vigilance
- Le contrat de gabarit est le seam le plus délicat : trop rigide, il bride le design client ; trop lâche, il laisse fuir de la logique dans le projet client. À stabiliser tôt et à versionner avec soin (une rupture = majeure SemVer, ADR-0008).
- Plus de packages que l'option « apps épaisses » → plus de câblage `catalog:`/`package.json`.
- La discipline noyau/tranche **exige les frontières ESLint dès l'Étape 0**.

---

## Seuils qui feraient reconsidérer
- Si `ContentTypeDescriptor` commence à être *consommé* par du code générique en V1 → dérive vers la sur-ingénierie : le garder dormant.
- Si le retour de l'éditorial (article/auteur/tag) arrive en V2 → activer le chemin générique (le descripteur est déjà là).
- Si le contrat de gabarit se révèle trop contraint pour un design client → l'assouplir par une majeure, jamais par du code spécifique dans le cœur.

---

## Caveats
- **Accès D1 au build** SSG sur Workers Static Assets **[À VÉRIFIER]** : binding d'intégration build vs D1 REST. L'architecture est agnostique (le build fournit son adaptateur à `db`).
- **Optimisation d'images distantes R2 au build** via `getImage()` + `image.remotePatterns` **[À VÉRIFIER]** : config Astro 7 exacte à confirmer.
- **Auth via middleware Astro** (pas `src/fetch.ts`) tant que l'OOM #17181 n'est pas corrigé (ADR-0003).

---

## Constraints
> Règles impératives et vérifiables — compilées en frontières ESLint/dependency-cruiser + revue (cf. ADR-0002, ADR-0006).
- **INTERDIT** : tout import de `cloudflare*` / `@cloudflare/*` (hors types) dans `@colibri/core`.
- **INTERDIT** : tout import de `apps/*` dans `@colibri/db` ou `@colibri/core`.
- **INTERDIT** : tout gabarit, thème ou code spécifique à un client dans les paquets du **cœur** (il vit dans le projet client).
- **OBLIGATOIRE** : un projet client déclare ses gabarits via le **contrat de gabarit** (descripteur + rendu) ; **INTERDIT** d'éditer le cœur pour ajouter un gabarit.
- **OBLIGATOIRE** : toute lecture consommée par le site **et** l'admin vit dans `@colibri/db` ; **INTERDIT** d'écrire du SQL de lecture dans `apps/*`.
- **OBLIGATOIRE** : tout endpoint d'écriture est déclaré via `writeHandler({...})` avec un `auth` explicite (`'access'` ou `'public'`) ; **INTERDIT** un handler d'écriture ad hoc, ou une route publique sans vérification Turnstile.
- **OBLIGATOIRE** : deux schémas Zod par surface (`xxxRow` en sortie D1, `xxxInput` en entrée) ; la validation d'une valeur de zone dérive du descripteur de gabarit.
- **OBLIGATOIRE** : le verrou optimiste passe par `createRepository`, jamais réimplémenté.
- **OBLIGATOIRE** : les seams JWKS, mailer et Turnstile sont injectables dès le code de prod.
- **INTERDIT** : consommer `ContentTypeDescriptor` par du code générique en V1 (le garder dormant).

## Related
- Contraint par : ADR-0003 (socle — middleware vs `src/fetch.ts`, bindings, versions).
- Testé par : ADR-0005 (les seams `db`/`writeHandler`/`toBlocks`/total/JWKS/mailer/Turnstile sont les cibles de test).
- Gouverné par : ADR-0006 (les frontières sont le portail anti-dérive de la génération IA).
- Exploité par : ADR-0007 (constructeur de formulaires), ADR-0008 (le contrat de gabarit est la frontière cœur/client du versionnage).
- Cadre : brief, PRD, stack ColibriCMS.
