# Architecture — ColibriCMS

Le dossier d'architecture **relevé depuis le code** le 2026-10-09 : ce que le produit est aujourd'hui, pas
ce qu'il sera. Le modèle fait foi (`*.c4`) ; ce fichier s'en déduit. Les invariants opposables sont dans
[`../architecture.md`](../architecture.md), le *pourquoi* des choix dans [`../adr/`](../adr/).

<!-- scd:contexte -->
## Le produit et son contexte

- **Éditrice** — la cliente, seule utilisatrice de l'administration, sans notion technique ; elle entre par
  un code reçu par e-mail.
- **Intégrateur** — Isometria : pose les gabarits, les emplacements et les réglages de départ dans
  `content/`, hors administration.
- **Cloudflare Email Routing** *(externe)* — achemine l'e-mail portant le code de connexion vers l'adresse
  autorisée.

Pas encore dans le modèle, faute de trace dans le code : le **visiteur** (aucune route publique), **GitHub**
(publication) et **Turnstile** (anti-abus) — ils y entreront avec les stories qui les écrivent.

```mermaid
---
title: "Le produit et son contexte"
---
graph TB
  Editrice@{ icon: "fa:user", shape: rounded, label: "Éditrice" }
  Integrateur@{ icon: "fa:user", shape: rounded, label: "Intégrateur" }
  subgraph Colibri-cms["`colibri-cms`"]
    Colibri-cms.Worker@{ shape: rectangle, label: "Worker" }
    Colibri-cms.D1@{ shape: disk, label: "Base D1" }
    Colibri-cms.Contenu@{ shape: disk, label: "Contenu déclaré" }
  end
  Email-routing@{ shape: rectangle, label: "Cloudflare Email Routing" }
  Editrice -. "`ouvre l'administration et y corrige son 
contenu`" .-> Colibri-cms.Worker
  Integrateur -. "`déclare pages, emplacements et réglages`" .-> Colibri-cms.Contenu
  Colibri-cms.Worker -. "`requêtes préparées`" .-> Colibri-cms.D1
  Colibri-cms.Worker -. "`lit la déclaration au build`" .-> Colibri-cms.Contenu
  Colibri-cms.Worker -. "`expédie le code de connexion`" .-> Email-routing
```
<!-- /scd:contexte -->

<!-- scd:conteneurs -->
## Les conteneurs

Un **monolithe modulaire** : une seule unité déployée, dont les frontières internes sont les zones de
`src/` (matrice `I1`).

| Élément | Technologie | Code | Ce qu'il fait |
|---|---|---|---|
| `colibri-cms.worker` | Astro 7 (sortie serveur) sur Cloudflare Workers | `src` | L'unique unité déployée : sert l'administration, et servira le site public sur la même origine. |
| `colibri-cms.worker.routes` | Astro | `src/pages` | Un fichier = une URL ; chaque route est mince, garde la session et délègue. |
| `colibri-cms.worker.admin` | Astro + îlots Svelte 5, shadcn-svelte | `src/admin` | Écrans, gabarits et îlots de l'administration. |
| `colibri-cms.worker.core` | TypeScript pur | `src/core` | La logique métier, sans framework ni plateforme. |
| `colibri-cms.worker.platform` | TypeScript + liaisons Cloudflare | `src/platform` | Session, magasins D1, envoi d'e-mail, lecture du contenu déclaré, en-têtes de sécurité. |
| `colibri-cms.worker.render` | Astro | `src/render` | Rendu des emplacements partagé par le publié et l'aperçu — zone posée, encore vide. |
| `colibri-cms.worker.site` | Astro | `src/site` | Gabarits du site publié — zone posée, encore vide. |
| `colibri-cms.d1` | Cloudflare D1 (SQLite) | `migrations` | Adresse autorisée, codes, sessions, brouillons des pages, des médias et des réglages. |
| `colibri-cms.contenu` | JSON et Markdown versionnés | `content` | La déclaration de l'intégrateur ; lue au build, jamais écrite par le produit. |

```mermaid
---
title: "Vue d'ensemble"
---
graph TB
  Email-routing@{ shape: rectangle, label: "Cloudflare Email Routing" }
  Integrateur@{ icon: "fa:user", shape: rounded, label: "Intégrateur" }
  Editrice@{ icon: "fa:user", shape: rounded, label: "Éditrice" }
  Colibri-cms@{ shape: rectangle, label: "colibri-cms" }
  Editrice -. "`ouvre l'administration et y corrige son 
contenu`" .-> Colibri-cms
  Email-routing -. "`remet le code`" .-> Editrice
  Integrateur -. "`déclare pages, emplacements et réglages`" .-> Colibri-cms
  Colibri-cms -. "`expédie le code de connexion`" .-> Email-routing
```

### L'intérieur du Worker

```mermaid
---
title: "Worker"
---
graph TB
  Editrice@{ icon: "fa:user", shape: rounded, label: "Éditrice" }
  subgraph Colibri-cmsWorker["`Worker`"]
    Colibri-cmsWorker.Routes@{ shape: rectangle, label: "Routes" }
    Colibri-cmsWorker.Render@{ shape: rectangle, label: "Rendu des emplacements" }
    Colibri-cmsWorker.Site@{ shape: rectangle, label: "Site public" }
    Colibri-cmsWorker.Admin@{ shape: rectangle, label: "Administration" }
    Colibri-cmsWorker.Platform@{ shape: rectangle, label: "Adaptateurs" }
    Colibri-cmsWorker.Core@{ shape: rectangle, label: "Noyau métier" }
  end
  Email-routing@{ shape: rectangle, label: "Cloudflare Email Routing" }
  Colibri-cmsD1@{ shape: disk, label: "Base D1" }
  Colibri-cmsContenu@{ shape: disk, label: "Contenu déclaré" }
  Editrice -. "`ouvre l'administration et y corrige son 
contenu`" .-> Colibri-cmsWorker.Routes
  Colibri-cmsWorker.Routes -. "`rend les écrans par les gabarits`" .-> Colibri-cmsWorker.Admin
  Colibri-cmsWorker.Routes -. "`vérifie une saisie`" .-> Colibri-cmsWorker.Core
  Colibri-cmsWorker.Routes -. "`garde la session, lit et écrit les 
brouillons`" .-> Colibri-cmsWorker.Platform
  Colibri-cmsWorker.Admin -. "`partage les règles de saisie`" .-> Colibri-cmsWorker.Core
  Colibri-cmsWorker.Admin -. "`reprend les types des magasins`" .-> Colibri-cmsWorker.Platform
  Colibri-cmsWorker.Platform -. "`applique une correction avant écriture`" .-> Colibri-cmsWorker.Core
  Colibri-cmsWorker.Render -. "`lit le contenu à rendre`" .-> Colibri-cmsWorker.Core
  Colibri-cmsWorker.Site -. "`lit le contenu à publier`" .-> Colibri-cmsWorker.Core
  Colibri-cmsWorker.Platform -. "`expédie le code de connexion`" .-> Email-routing
  Colibri-cmsWorker.Platform -. "`requêtes préparées`" .-> Colibri-cmsD1
  Colibri-cmsWorker.Platform -. "`lit la déclaration au build`" .-> Colibri-cmsContenu
```
<!-- /scd:conteneurs -->

<!-- scd:deploiement -->
## Le déploiement

Aucune production n'est encore déployée (Epic D de la feuille de route). Deux lieux ont une trace :

- **Poste local** — `astro dev` et la suite de tests tournent dans Miniflare (`workerd`), liaisons D1 et
  envoi d'e-mail servies localement.
- **Recette** — Cloudflare Workers sur `colibri.sebc.dev`, avec une vraie base D1.

```mermaid
---
title: "Déploiement — recette"
---
graph TB
  subgraph RecetteWorkers["`Cloudflare Workers — colibri.sebc.dev`"]
    RecetteWorkers.Worker@{ shape: rectangle, label: "Worker" }
  end
  subgraph RecetteBase["`Cloudflare D1`"]
    RecetteBase.D1@{ shape: disk, label: "Base D1" }
  end
  RecetteWorkers.Worker -. "`requêtes préparées`" .-> RecetteBase.D1
```
<!-- /scd:deploiement -->

<!-- scd:flux -->
## Les flux clés

### Connexion par code
```mermaid
---
title: "Connexion par code"
---
graph LR
  Editrice@{ icon: "fa:user", shape: rounded, label: "Éditrice" }
  Colibri-cmsWorkerRoutes@{ shape: rectangle, label: "Routes" }
  Colibri-cmsWorkerPlatform@{ shape: rectangle, label: "Adaptateurs" }
  Colibri-cmsD1@{ shape: disk, label: "Base D1" }
  Colibri-cmsWorkerCore@{ shape: rectangle, label: "Noyau métier" }
  Email-routing@{ shape: rectangle, label: "Cloudflare Email Routing" }
  Editrice -. "`POST /admin/connexion — son adresse`" .-> Colibri-cmsWorkerRoutes
  Colibri-cmsWorkerRoutes -. "`l'adresse est-elle autorisée ?`" .-> Colibri-cmsWorkerPlatform
  Colibri-cmsWorkerPlatform -. "`lit l’adresse autorisée, écrit le code 
sous plafond`" .-> Colibri-cmsD1
  Colibri-cmsWorkerRoutes -. "`délai plancher, plafond par heure`" .-> Colibri-cmsWorkerCore
  Colibri-cmsWorkerPlatform -. "`expédie le code`" .-> Email-routing
  Email-routing -. "`remet le code`" .-> Editrice
  Editrice -. "`POST /admin/connexion — le code`" .-> Colibri-cmsWorkerRoutes
  Colibri-cmsWorkerPlatform -. "`vérifie le code, ouvre la session`" .-> Colibri-cmsD1
  Colibri-cmsWorkerRoutes -. "`cookie de session SameSite=Strict, vers 
/admin/`" .-> Editrice
```

### Correction d'un emplacement vers son brouillon
```mermaid
---
title: "Correction d'un emplacement vers son brouillon"
---
graph LR
  Editrice@{ icon: "fa:user", shape: rounded, label: "Éditrice" }
  Colibri-cmsWorkerAdmin@{ shape: rectangle, label: "Administration" }
  Colibri-cmsWorkerRoutes@{ shape: rectangle, label: "Routes" }
  Colibri-cmsWorkerPlatform@{ shape: rectangle, label: "Adaptateurs" }
  Colibri-cmsContenu@{ shape: disk, label: "Contenu déclaré" }
  Colibri-cmsWorkerCore@{ shape: rectangle, label: "Noyau métier" }
  Colibri-cmsD1@{ shape: disk, label: "Base D1" }
  Editrice -. "`corrige un emplacement, « Enregistrer »`" .-> Colibri-cmsWorkerAdmin
  Colibri-cmsWorkerAdmin -. "`POST 
/admin/pages/<page>/emplacements/<id>`" .-> Colibri-cmsWorkerRoutes
  Colibri-cmsWorkerRoutes -. "`garde de session`" .-> Colibri-cmsWorkerPlatform
  Colibri-cmsWorkerPlatform -. "`nature déclarée de l’emplacement`" .-> Colibri-cmsContenu
  Colibri-cmsWorkerPlatform -. "`applique la correction`" .-> Colibri-cmsWorkerCore
  Colibri-cmsWorkerPlatform -. "`écrit le brouillon si acceptée`" .-> Colibri-cmsD1
  Colibri-cmsWorkerRoutes -. "`accepté, ou refus par champ`" .-> Colibri-cmsWorkerAdmin
```

### Téléversement d'une image
```mermaid
---
title: "Téléversement d'une image"
---
graph LR
  Editrice@{ icon: "fa:user", shape: rounded, label: "Éditrice" }
  Colibri-cmsWorkerAdmin@{ shape: rectangle, label: "Administration" }
  Colibri-cmsWorkerRoutes@{ shape: rectangle, label: "Routes" }
  Colibri-cmsWorkerPlatform@{ shape: rectangle, label: "Adaptateurs" }
  Colibri-cmsWorkerCore@{ shape: rectangle, label: "Noyau métier" }
  Colibri-cmsD1@{ shape: disk, label: "Base D1" }
  Editrice -. "`dépose une image dans la bibliothèque`" .-> Colibri-cmsWorkerAdmin
  Colibri-cmsWorkerAdmin -. "`POST /admin/medias/televerser`" .-> Colibri-cmsWorkerRoutes
  Colibri-cmsWorkerRoutes -. "`garde de session`" .-> Colibri-cmsWorkerPlatform
  Colibri-cmsWorkerRoutes -. "`reconnaît JPEG, PNG ou WebP sur les 
octets`" .-> Colibri-cmsWorkerCore
  Colibri-cmsWorkerRoutes -. "`persiste l'image en brouillon`" .-> Colibri-cmsWorkerPlatform
  Colibri-cmsWorkerPlatform -. "`insère les octets et leurs dimensions`" .-> Colibri-cmsD1
```

### Requête d'administration
```mermaid
---
title: "Requête d'administration"
---
graph LR
  Editrice@{ icon: "fa:user", shape: rounded, label: "Éditrice" }
  Colibri-cmsWorkerRoutes@{ shape: rectangle, label: "Routes" }
  Colibri-cmsWorkerPlatform@{ shape: rectangle, label: "Adaptateurs" }
  Colibri-cmsD1@{ shape: disk, label: "Base D1" }
  Colibri-cmsWorkerAdmin@{ shape: rectangle, label: "Administration" }
  Editrice -. "`GET /admin/mes-pages`" .-> Colibri-cmsWorkerRoutes
  Colibri-cmsWorkerRoutes -. "`middleware : CSP et trois en-têtes`" .-> Colibri-cmsWorkerPlatform
  Colibri-cmsWorkerRoutes -. "`garde de session`" .-> Colibri-cmsWorkerPlatform
  Colibri-cmsWorkerPlatform -. "`lit la session`" .-> Colibri-cmsD1
  Colibri-cmsWorkerRoutes -. "`rend l'écran dans le cadre`" .-> Colibri-cmsWorkerAdmin
  Colibri-cmsWorkerRoutes -. "`page, ou renvoi vers /admin/connexion 
sans session`" .-> Editrice
```
<!-- /scd:flux -->

<!-- scd:decisions -->
## Décisions à figer — `/scd-spec-dev:adr`

Ce que le code a déjà tranché et qu'aucun ADR accepté ne porte encore ; chacune existe en candidat sous
`docs/adr/_candidates/`.

| Décision observée | Trace | ADR |
|---|---|---|
| Sens unique et descendant des dépendances entre zones (`I1`) | `eslint.config.boundaries.js:46-52` | — |
| `src/core/` sans framework ni plateforme (`I2`) | `eslint.config.boundaries.js:29` | — |
| Astro 7 génère l'administration et le futur site | `package.json:40`, `astro.config.ts:68` | — |
| Svelte 5 pour les îlots | `package.json:43`, `astro.config.ts:115` | — |
| TypeScript strict, plafonné à la branche 6 | `tsconfig.json:2-4`, `package.json:65` | — |
| npm, avec gel d'approvisionnement de sept jours | `package-lock.json`, `.npmrc` | — |
| API D1 native et migrations `wrangler d1` | `wrangler.astro.jsonc:6-11`, `package.json:28` | — |
| Un Worker unique sert public et administration | `wrangler.astro.jsonc:3`, `astro.config.ts:98` | — |
| D1 porte les brouillons | `migrations/0004…0007` | — |
| Contenu déposé : un répertoire par objet | `content/pages/*/page.json` | — |
| Médias reconnus sur leurs octets, liste blanche JPEG/PNG/WebP | `src/core/medias/ingestion.ts:13,72` | — |
| Texte riche en Markdown restreint, schémas d'URL autorisés | `src/core/pages/texte-riche.ts:69,153` | — |
| Valeurs d'instance dans `instance.json`, lues par la configuration Astro (`I8`, `I10`) | `instance.json`, `astro.config.ts:51-57` | — |
<!-- /scd:decisions -->

Le modèle est dans `*.c4` ; ce fichier s'en déduit. Valider :
`likec4 validate --no-layout --json --project colibri-cms docs/architecture` — rendre les vues :
`likec4 gen mermaid -o <répertoire hors du dépôt> docs/architecture`.
