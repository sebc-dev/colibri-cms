# Stack technique — ColibriCMS

| | |
|---|---|
| **Statut** | Draft |
| **Créé** | 2026-07-17 |
| **Trace vers** | [docs/prd.md](./prd.md) |
| **Détaille** | [docs/adr/](./adr/README.md) |

> Ce fichier est une **synthèse**. Le *pourquoi* détaillé et les alternatives écartées vivent dans les ADR : ici on relie chaque choix aux exigences qu'il sert et à l'ADR qui le porte. Les **versions exactes** ne sont pas recopiées ici — elles vivent dans le `catalog:` pnpm, décidé par [ADR-0003](./adr/ADR-0003-socle-technique.md).

---

## Vue d'ensemble

Deux applications dans un monorepo pnpm, une seule base de code partagée. Un **site public statique** (Astro SSG) que le CDN sert sans runtime, et une **admin en rendu serveur** (Astro SSR sur Cloudflare Workers) où vit tout le dynamique. Les données passent par des **bindings Cloudflare directs** (D1, R2, KV), sans API REST publique. Le configurateur de devis calcule son estimation dans le navigateur du visiteur et n'appelle le serveur qu'à l'envoi — unique entaille à la staticité du site public.

Cette forme découle directement du PRD : le visiteur ne doit toucher aucun runtime (`FR-039`, `SC-005`), l'ensemble doit tenir sur le free tier Cloudflare (`SC-001`), et l'éditrice ne crée aucun compte hors son e-mail (`FR-002`, `SC-006`).

Le code se répartit en deux niveaux : un **cœur versionné open source** (le moteur : admin, site, `@colibri/core`, `@colibri/db`, migrations) et, par client, un **projet privé** qui épingle une version du cœur et fournit ses gabarits, son thème et sa configuration. C'est cette séparation qui permet de mettre à jour toute la flotte sans code divergent par client (`SC-008`) — mécanisme détaillé en « Contraintes techniques transverses ».

---

## Choix retenus

| Domaine | Choix | Sert (FR/SC) | ADR |
|---|---|---|---|
| Langage | TypeScript `strict` | (tous) ; frontière de typage | [0003](./adr/ADR-0003-socle-technique.md) |
| Framework site public | Astro **SSG**, sans adaptateur | FR-039, SC-005 | [0003](./adr/ADR-0003-socle-technique.md) |
| Framework admin | Astro **SSR** `@astrojs/cloudflare` + îlots React | FR-006→FR-034, FR-040→FR-048 | [0003](./adr/ADR-0003-socle-technique.md) |
| Base de données | **D1** (SQLite), bindings directs | FR-004→FR-019, FR-038, FR-040 | [0003](./adr/ADR-0003-socle-technique.md), [0004](./adr/ADR-0004-architecture-du-code.md) |
| Stockage médias | **R2**, binding direct | FR-020→FR-023 | [0003](./adr/ADR-0003-socle-technique.md) |
| Cache / session | **KV** | FR-003 (résolution user) | [0003](./adr/ADR-0003-socle-technique.md) |
| Éditeur de texte riche | **TipTap** (stockage JSON ProseMirror) | FR-015 | [0003](./adr/ADR-0003-socle-technique.md) |
| Validation | **Zod**, partagée client/serveur | FR-013, FR-014, FR-048 | [0004](./adr/ADR-0004-architecture-du-code.md) |
| Auth éditrice | **Cloudflare Access** (JWT vérifié côté Worker) | FR-001, FR-002, FR-032, SC-006 | [0003](./adr/ADR-0003-socle-technique.md), [0004](./adr/ADR-0004-architecture-du-code.md) |
| Optimisation images | **Sharp** au build (SSG) | FR-026, SC-005 | [0003](./adr/ADR-0003-socle-technique.md) |
| Mise à jour du site public | **Deploy Hook** sur publication explicite | FR-034→FR-037, FR-058, SC-004 | [0004](./adr/ADR-0004-architecture-du-code.md) |
| Styles | **Tailwind 4** via `@tailwindcss/vite` | (présentation admin) | [0003](./adr/ADR-0003-socle-technique.md) |
| Constructeur de formulaires | Îlot React en admin ; définition en base | FR-040→FR-048 | 0007 *(à créer)* |
| Acheminement des soumissions | **Cloudflare Email Routing** (envoi depuis le Worker) | FR-061, SC-007 | 0007 *(à créer)* |
| Anti-spam des soumissions | **Cloudflare Turnstile** (vérifié côté Worker) | FR-063 | 0007 *(à créer)* |
| Total du formulaire | **Calcul côté navigateur** (définition du formulaire bâtie dans le site) | FR-050, FR-051 | 0007 *(à créer)* |
| Déploiement | **Workers + Static Assets**, une instance/client | SC-001, SC-002 | [0003](./adr/ADR-0003-socle-technique.md) |
| Distribution du cœur | **Paquets versionnés open source**, épinglés par site client privé | SC-008 | 0008 *(à créer)* |
| Versionnage | **SemVer** (majeure = migration/rupture de contrat gabarit) | SC-008 | 0008 *(à créer)* |
| Mise à jour de la flotte | Bump de version épinglée + migrations D1 rejouables (étape outillée + sauvegarde) + redéploiement outillé | SC-008 | 0008 *(à créer)* |
| Tests | Vitest + `@cloudflare/vitest-pool-workers` + Playwright | (tous) | [0005](./adr/ADR-0005-strategie-de-test.md) |
| Monorepo | **pnpm workspaces** (`catalog:`) + Turborepo | NFR maintenabilité | [0003](./adr/ADR-0003-socle-technique.md), [0004](./adr/ADR-0004-architecture-du-code.md) |

---

## Contraintes techniques transverses

- **Free tier Cloudflare, invariants de garde** (SC-001) : enregistrement explicite jamais en autosave (protège les écritures D1/KV) ; Deploy Hook **uniquement** sur « Publier » (protège le quota de builds) ; optimisation d'images au **build** avec Sharp (évite le stockage d'images payant).
- **Le visiteur ne touche aucun runtime** (FR-039) sauf l'envoi d'un devis : les pages de contenu et le calcul d'estimation sont servis/exécutés sans code serveur.
- **Aucune API REST publique** : accès direct aux bindings dans l'admin SSR (« Local API pattern »). Corollaire imposé par l'architecture : le contrôle d'accès est **réappliqué explicitement** dans chaque endpoint d'écriture (FR-003) — voir [ADR-0004](./adr/ADR-0004-architecture-du-code.md).
- **Validation partagée, revalidée côté serveur** (FR-014, FR-042) : le client n'est jamais de confiance.
- **Secrets hors dépôt** : bindings, URL du Deploy Hook (traitée comme un secret), clés Turnstile → `wrangler secret put`, jamais dans un fichier versionné.
- **Le code entrant n'est pas relu ligne à ligne** (brief) : la confiance vient de vérifications mécaniques — voir [ADR-0005](./adr/ADR-0005-strategie-de-test.md), [ADR-0006](./adr/ADR-0006-generation-ia-verification.md).
- **Réplicabilité par client** : configs identiques d'une instance à l'autre ; seules changent les valeurs de binding.
- **Maintenabilité de la flotte** (SC-008) — *mécanisme de versionnage défini* :
  - **Séparation cœur / site client.** Le **cœur** ColibriCMS (moteur admin, site, `@colibri/core`, `@colibri/db`, pipeline de rendu, migrations) est publié en **paquets versionnés open source**. Chaque **site client** est un projet **privé distinct** qui **dépend d'une version épinglée** du cœur et fournit ses propres **gabarits, thème et configuration**. Le sur-mesure vit dans le projet client — qui *consomme* le cœur, ne le forke jamais ; le cœur ne contient aucun code spécifique client. C'est ce qui réconcilie « open source » et « pas de code divergent par client ».
  - **SemVer.** `MAJEUR.MINEUR.CORRECTIF`. Une **majeure** = rupture : migration D1 non rétro-compatible **ou** changement du contrat de gabarit. Mineure = ajout compatible ; correctif = bug.
  - **Mise à jour d'un client** = bump de la version du cœur épinglée + redéploiement ; opération **outillée sur la flotte** (jamais manuelle client par client). Chaque client monte de version quand il est prêt (les épinglages sont indépendants).
  - **Migrations D1** versionnées, ordonnées, rejouables, appliquées par une **étape explicite outillée, après sauvegarde du D1 client et vérification** — jamais automatiquement au déploiement (garde-fou anti-perte de contenu, SC-008).
  - Formalisation → ADR-0008. Le **contrat de gabarit** (comment un projet client enregistre ses gabarits/zones/thème auprès du cœur sans éditer le cœur) est le seam qui rend tout ceci possible → à définir dans ADR-0004.

---

## Modèle de données (D1 / SQLite)

Le modèle est **centré page**, pas éditorial : ni articles, ni auteurs, ni tags (hors périmètre, brief). Une page est une instance de gabarit ; ses **valeurs de zone** sont stockées à part, indexées par clé de zone, ce qui permet à l'intégrateur de faire évoluer un gabarit sans migration de colonnes. Les **définitions** de gabarits et de zones vivent dans le code (elles sont typées, versionnées, possédées par l'intégrateur) ; la base ne stocke que les **valeurs**.

Esquisse (le DDL de référence et les invariants d'accès sont portés par [ADR-0004](./adr/ADR-0004-architecture-du-code.md)) :

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (               -- FR-003, FR-004
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE media (               -- FR-020 → FR-023, FR-025
  id         TEXT PRIMARY KEY,
  r2_key     TEXT NOT NULL UNIQUE, -- media/{yyyy}/{mm}/{uuid}.{ext}
  alt        TEXT,
  width      INTEGER, height INTEGER, size INTEGER,
  mime       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pages (               -- FR-006, FR-007, FR-019, FR-027 → FR-029, FR-038
  id              TEXT PRIMARY KEY,
  template        TEXT NOT NULL,   -- clé de gabarit (défini en code)
  slug            TEXT NOT NULL UNIQUE,  -- fixé au provisioning, non éditable (FR-009/011)
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published')),
  seo_title       TEXT, seo_description TEXT, og_image_id TEXT REFERENCES media(id),
  created_by      TEXT REFERENCES users(id),
  updated_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  published_at    TEXT
);

CREATE TABLE page_zone_values (    -- FR-008, FR-012, FR-013
  page_id   TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  zone_key  TEXT NOT NULL,         -- correspond à une zone du gabarit
  value_json TEXT NOT NULL,        -- forme validée par Zod selon le type de zone
  PRIMARY KEY (page_id, zone_key)
);

CREATE TABLE forms (               -- FR-040, FR-046, FR-047
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  recipient_email TEXT NOT NULL,   -- destination des soumissions (FR-046)
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','published')),
  created_by     TEXT REFERENCES users(id),
  updated_by     TEXT REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  published_at   TEXT
);

CREATE TABLE form_fields (         -- FR-041, FR-042, FR-043, FR-045
  id          TEXT PRIMARY KEY,
  form_id     TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  type        TEXT NOT NULL        -- text|email|phone|textarea|select_single|select_multi|number|date|consent
                CHECK (type IN ('text','email','phone','textarea',
                                'select_single','select_multi','number','date','consent')),
  label       TEXT NOT NULL,
  required    INTEGER NOT NULL DEFAULT 0,   -- booléen 0/1 (FR-043)
  unit_price  INTEGER,             -- centimes, pour type 'number' à prix unitaire (FR-045)
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE form_field_options (  -- FR-044 : choix d'un champ select_*, avec montant
  id         TEXT PRIMARY KEY,
  field_id   TEXT NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0,  -- centimes, entier
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE site_settings (       -- FR-071, FR-072, FR-073 : réglages transverses
  key        TEXT PRIMARY KEY,     -- ex : 'social_links', 'contact'
  value_json TEXT NOT NULL,        -- forme validée par Zod selon la clé
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);
```

Notes :
- **`value_json` typé par zone** : texte simple → chaîne ; texte riche → JSON ProseMirror (FR-015) ; image → `{ media_id }` ; galerie → `{ items: [{ media_id, caption? }, ...] }`, liste **ordonnée** (FR-066) avec légende facultative par image (FR-067) — le texte alternatif vit sur `media.alt` ; vidéo → `{ provider, ref }` ou `{ url }` `[À VÉRIFIER : hébergée vs intégrée]` (FR-069) ; CTA → `{ label, href }` (FR-070) ; répéteur → `{ items: [ { <clé_sous-champ>: <valeur typée>, ... }, ... ] }`, liste **ordonnée** d'éléments conformes à la forme déclarée par le gabarit (FR-074), chaque sous-champ validé selon son type de base (FR-076). Un schéma Zod par type de zone valide la forme (FR-013) ; c'est la frontière serveur (FR-014).
- **Répéteur — exemple « carrousel d'avis »** : le gabarit déclare la forme d'un élément `{ image, auteur, texte, rôle?, avatar?, date? }` ; l'éditrice gère la liste d'éléments (FR-075), le gabarit rend chaque élément comme une diapo (image + avis en surimpression). La *forme* est possédée par le gabarit (intégrateur), le *contenu* par l'éditrice — même partage que page/zone. **Pas d'imbrication en v1** : un sous-champ n'est jamais lui-même un répéteur ou une galerie (FR-076).
- **Mode d'affichage d'une galerie** (grille, carrousel…) : déclaré par le **gabarit en code** (FR-068), jamais stocké en base ni éditable ; la base ne connaît que la liste ordonnée d'images. L'éditrice gère le contenu, le gabarit gère la présentation.
- **Montants en centimes entiers** : jamais de flottant pour de la monnaie. Le total est une **somme** des contributions (montants de choix sélectionnés + valeur×`unit_price`), calculée côté navigateur (FR-050) ; aucune règle conditionnelle (hors périmètre).
- **Cycle brouillon/publication des formulaires** (FR-047) : la définition d'un formulaire publié est **bâtie dans le site** (donnée statique consommée par le rendu et le calcul navigateur, FR-049/FR-050) ; une modification non publiée reste en base sans rebuild, donc invisible au public. Sémantique fine (portée du « Publier ») → [ADR-0004](./adr/ADR-0004-architecture-du-code.md).
- **Pas de table de soumissions** : une soumission est acheminée par e-mail puis non conservée (FR-064).
- **La définition de formulaire est possédée par l'éditrice** (structure composable, FR-041) — à la différence des gabarits de page, possédés par l'intégrateur en code. C'est la seule surface où l'éditrice compose une structure ; l'entorse à la philosophie « zones typées non restructurables » est assumée et bornée aux formulaires.
- **Réglages transverses** (`site_settings`) : clé → `value_json` typé par clé (liens réseaux sociaux, coordonnées), bâtis dans le site et servis sur toutes les pages ; même cycle brouillon/publication que les pages (FR-073), géré par la temporalité du build.
- **Verrou optimiste** : `updated_at` reste le jeton, mais **édition concurrente hors périmètre v1** (une éditrice) — le seam existe, la protection n'est pas une priorité v1.

---

## Décisions structurantes → candidats ADR

Les ADR 0001–0006 (recherche existante) couvrent la gouvernance, le socle, l'architecture, le test et la génération IA. Cette session en amende deux et en ouvre un :

- **ADR-0007 — Constructeur de formulaires (nouveau).** Un moteur de formulaire **générique dans sa structure, borné dans ses capacités** : l'éditrice compose des formulaires (champs typés, obligatoires, à prix) ; le total est une **somme calculée côté navigateur** à partir de la définition bâtie dans le site (préserve FR-039/SC-005 hors envoi) ; acheminement par **Cloudflare Email Routing** depuis le Worker (reste dans l'écosystème, gratuit, sert SC-001) ; anti-spam par **Cloudflare Turnstile** vérifié côté Worker ; **aucune persistance** des soumissions (FR-064). Le devis de la cliente en est la première instance, pas un objet dédié. Alternatives écartées : formulaire devis-spécifique en dur (non réutilisable) ; constructeur avec logique conditionnelle/multi-étapes (abstraction en avance sur le besoin — règle de trois) ; Resend / MailChannels (dépendance tierce, gratuité moins sûre) ; stockage des soumissions (mini-CRM hors périmètre) ; calcul serveur (romprait la staticité au-delà du nécessaire).
- **ADR-0004 à amender** : le modèle passe d'éditorial (article/auteur/tag) à **centré page + formulaires** (pages + zones ; forms + fields + options). Les tranches `article/author/tag` disparaissent de la v1 ; le seam `ContentTypeDescriptor` reste dormant. La surface d'écriture ajoute la gestion des formulaires (admin, via `writeHandler`) et l'endpoint public de soumission (via `writeHandler` sans auth Access — route publique — mais avec vérif Turnstile + envoi e-mail mocké en test). **Point d'attention** : l'endpoint de soumission est la première route d'écriture **publique** (non protégée par Access) ; le pipeline `writeHandler` doit distinguer les routes authentifiées des routes publiques anti-spam. **Frontière cœur/site client** : le mécanisme de versionnage (voir « Maintenabilité de la flotte ») impose qu'ADR-0004 définisse le cœur comme un ensemble de paquets consommés par un projet client privé ; le **contrat de gabarit** — l'interface par laquelle un projet client déclare ses gabarits, zones et thème au cœur sans l'éditer — devient un seam de premier plan, au même rang que `@colibri/db` ou `writeHandler`.
- **ADR-0005 à amender** : ajouter l'endpoint de soumission aux cibles d'intégration ; l'envoi d'e-mail est **mocké** en test (comme le Deploy Hook, garde-fou free tier) ; le calcul du total côté navigateur est une cible de test pur (`@colibri/core`) ; la vérification Turnstile est mockée/injectable en test.
- **ADR-0008 — Stratégie de mise à jour de la flotte (nouveau).** Répond à SC-008. **Décidé** (cf. contrainte « Maintenabilité de la flotte » ci-dessus) : cœur en **paquets SemVer open source**, site client **privé** épinglant une version ; **majeure = migration/rupture du contrat de gabarit** ; migrations appliquées par **étape outillée + sauvegarde + vérification**, jamais au déploiement. **Reste à formaliser dans l'ADR** : l'outil concret de redéploiement de la flotte (CI par dépôt client vs orchestration centrale) ; le format des migrations et le registre de leur application par instance ; la procédure de rollback. Interagit avec ADR-0003 (déploiement Workers), **ADR-0004** (le contrat de gabarit est le seam cœur/client), ADR-0005 (migrations testées sur données réelles-locales avant flotte) et ADR-0006 (migrations possédées par l'humain, jamais éditées par l'IA pour verdir).

---

## Questions ouvertes (techniques)

- **Cloudflare Email Routing en envoi sortant** `[À VÉRIFIER]` : confirmer que l'envoi *depuis* un Worker (pas seulement le routage entrant) est disponible sur le free tier et ses limites, au jour de l'installation. Repli documenté si non : Resend (gratuit plafonné).
- **Accès D1 au build** SSG `[À VÉRIFIER]` : binding d'intégration au build vs D1 REST — hérité d'ADR-0004, inchangé par cette session.
- **`compatibility_date` / `nodejs_compat`** : à fixer selon la version de miniflare installée — voir ADR-0003.
