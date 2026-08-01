# Stack technique — ColibriCMS

| | |
|---|---|
| **Statut** | accepted |
| **Créé** | 2026-07-17 |
| **Révisé** | 2026-08-01 — suites de la revue du PRD ([ADR-0010](./adr/ADR-0010-modele-brouillon-publie.md), vérifications factuelles), puis frontières de contenu hostile ([ADR-0011](./adr/ADR-0011-frontieres-de-contenu-hostile.md)) et leurs suites dans le cœur ([ADR-0004](./adr/ADR-0004-architecture-du-code.md) amendement (c) — restriction de schéma du `LinkTarget`) |
| **Accepté** | 2026-08-01 — plus rien de spéculatif : chaque choix est adossé à un ADR accepté. Une confrontation au code produira des **amendements datés**, pas un retour en `Draft`. |
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
| Cycle brouillon/publication | **Deux contenus** par objet, discriminant `state` | FR-078→FR-083, FR-047, FR-073 | [0010](./adr/ADR-0010-modele-brouillon-publie.md) |
| Lecture D1 **au build** | **API REST D1** (`POST …/d1/database/:id/query`) — aucun binding en CI | FR-035, SC-004 | [0004](./adr/ADR-0004-architecture-du-code.md) |
| Stockage médias | **R2**, binding direct | FR-020→FR-023 | [0003](./adr/ADR-0003-socle-technique.md) |
| Cache / session | **KV** | FR-003 (résolution user) | [0003](./adr/ADR-0003-socle-technique.md) |
| Éditeur de texte riche | **TipTap** (stockage JSON ProseMirror) | FR-015 | [0003](./adr/ADR-0003-socle-technique.md) |
| Validation | **Zod**, partagée client/serveur | FR-013, FR-014, FR-048 | [0004](./adr/ADR-0004-architecture-du-code.md) |
| Auth éditrice | **Cloudflare Access** (JWT vérifié côté Worker), **session 7 jours** au niveau application | FR-001, FR-002, FR-032, SC-006 | [0003](./adr/ADR-0003-socle-technique.md), [0004](./adr/ADR-0004-architecture-du-code.md) |
| Optimisation images | **Sharp** au build (SSG), dérivés **persistés en R2** | FR-026, FR-093, SC-005 | [0003](./adr/ADR-0003-socle-technique.md) |
| Réduction d'image **à l'entrée** | **Canvas navigateur** avant l'envoi (Sharp n'existe pas dans le Worker) | FR-088, FR-023 | [0003](./adr/ADR-0003-socle-technique.md) |
| Mise à jour du site public | **Deploy Hook** Workers Builds sur publication explicite | FR-034→FR-037, FR-058, SC-004 | [0004](./adr/ADR-0004-architecture-du-code.md) |
| Issue de la mise en ligne | **API Workers Builds** interrogée par **Cron Trigger** (boucle de réconciliation) | FR-055→FR-057, FR-087, FR-093, FR-094 | [0003](./adr/ADR-0003-socle-technique.md), [0010](./adr/ADR-0010-modele-brouillon-publie.md) |
| Styles | **Tailwind 4** via `@tailwindcss/vite` | (présentation admin) | [0003](./adr/ADR-0003-socle-technique.md) |
| Constructeur de formulaires | Îlot React en admin ; définition en base | FR-040→FR-048 | [0007](./adr/ADR-0007-constructeur-de-formulaires.md) |
| Acheminement des soumissions | **Cloudflare Email Service** via le seam `sendMail`, vers **adresse de destination vérifiée** (gratuit, hors quota) — *(Resend écarté : aucune dépendance hors écosystème)* | FR-061, FR-096, SC-001, SC-007 | [0007](./adr/ADR-0007-constructeur-de-formulaires.md) |
| Anti-spam des soumissions | **Cloudflare Turnstile**, script chargé **au premier geste dans le formulaire** | FR-063, FR-089 | [0007](./adr/ADR-0007-constructeur-de-formulaires.md) |
| Total du formulaire | **Calcul navigateur** (affichage) + **recalcul serveur** faisant foi | FR-050, FR-051, FR-091 | [0007](./adr/ADR-0007-constructeur-de-formulaires.md) |
| Vidéo | **Intégration** YouTube/Vimeo, lecteur au clic, vignette récupérée **au build** | FR-069, FR-089 | [0007](./adr/ADR-0007-constructeur-de-formulaires.md) |
| Déploiement | **Workers + Static Assets**, une instance/client | SC-001, SC-002 | [0003](./adr/ADR-0003-socle-technique.md) |
| Distribution du cœur | **Paquets versionnés open source**, épinglés par site client privé | SC-008 | [0008](./adr/ADR-0008-mise-a-jour-de-la-flotte.md) |
| Versionnage | **SemVer** (majeure = migration/rupture de contrat gabarit) | SC-008 | [0008](./adr/ADR-0008-mise-a-jour-de-la-flotte.md) |
| Mise à jour de la flotte | Bump de version épinglée + migrations D1 rejouables (étape outillée + sauvegarde) + redéploiement outillé | SC-008 | [0008](./adr/ADR-0008-mise-a-jour-de-la-flotte.md) |
| Tests | Vitest + `@cloudflare/vitest-pool-workers` + Playwright | (tous) | [0005](./adr/ADR-0005-strategie-de-test.md) |
| Monorepo | **pnpm workspaces** (`catalog:`) + Turborepo | NFR maintenabilité | [0003](./adr/ADR-0003-socle-technique.md), [0004](./adr/ADR-0004-architecture-du-code.md) |

---

## Contraintes techniques transverses

- **Free tier Cloudflare, invariants de garde** (SC-001) : enregistrement explicite jamais en autosave (protège les écritures D1/KV) ; Deploy Hook **uniquement** sur « Publier » (protège le quota de builds) ; optimisation d'images au **build** avec Sharp (évite le stockage d'images payant).
- **Le visiteur ne touche aucun runtime** (FR-039) sauf l'envoi d'un devis : les pages de contenu et le calcul d'estimation sont servis/exécutés sans code serveur.
- **Aucun code tiers avant une action du visiteur** (FR-089) — règle transverse issue de la revue, et **la plus contraignante des nouvelles** : elle vaut pour le lecteur vidéo (façade, chargement au clic), pour Turnstile (script injecté au premier geste dans le formulaire) et pour la vignette vidéo (récupérée au build, servie depuis le site). Elle ferme aussi la porte à toute mesure d'audience embarquée. SC-005 s'applique dès lors à **toutes** les pages, sans exemption.
- **Aucune API REST publique** : accès direct aux bindings dans l'admin SSR (« Local API pattern »). Corollaire imposé par l'architecture : le contrôle d'accès est **réappliqué explicitement** dans chaque endpoint d'écriture (FR-003) — voir [ADR-0004](./adr/ADR-0004-architecture-du-code.md).
- **Validation partagée, revalidée côté serveur** (FR-014, FR-042) : le client n'est jamais de confiance.
- **Secrets hors dépôt** : bindings, URL du Deploy Hook (traitée comme un secret), clés Turnstile, **jeton d'API D1** (lecture au build) et **jeton d'API Workers Builds** → `wrangler secret put`, jamais dans un fichier versionné. Le jeton Builds doit être *user-scoped* (les jetons de compte ne sont pas acceptés), donc attaché à une personne : il est créé depuis un **membre de compte dédié et non nominatif** (identité d'agence), jamais depuis le compte personnel d'un intégrateur — sans quoi la publication de **tous** les sites clients dépend du maintien d'une personne dans l'organisation *(tranché le 2026-08-01, ADR-0003 amendement (b))*.
- **La surface d'accès du Worker d'admin est réduite au nom d'hôte protégé** (FR-001) : une application Access protège un **nom d'hôte**, pas un Worker. `workers_dev: false` **et** `preview_urls: false` sont déclarés explicitement dans `apps/admin/wrangler.jsonc` ; laisser l'une des deux ouverte rend l'admin joignable hors de toute politique. C'est aussi ce qui rend la **révocation** effective : elle agit à la périphérie, pas dans la vérification JWT du Worker, qui ne voit qu'un `exp`. **Couper l'accès à une personne = deux gestes** — retirer l'adresse de la politique Access, *puis* révoquer (jetons rejetés en 20–30 s ; la révocation seule autorise une reconnexion au bout d'une minute).
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

**Règle qui gouverne tout le modèle** ([ADR-0010](./adr/ADR-0010-modele-brouillon-publie.md)) : toute table de **valeur de contenu** porte `state ∈ ('draft','live')` dans sa clé primaire — `draft` = contenu en cours, `live` = contenu en ligne. Le build ne lit que `live`. Il n'existe **aucune colonne d'état de publication** : les états de `FR-019` sont dérivés de `publications`.

Esquisse (le DDL de référence et les invariants d'accès sont portés par [ADR-0004](./adr/ADR-0004-architecture-du-code.md)) :

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (               -- FR-003, FR-004 (aucune surface en v1)
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE media (               -- FR-020 → FR-023 : faits TECHNIQUES et immuables uniquement
  id         TEXT PRIMARY KEY,
  r2_key     TEXT NOT NULL UNIQUE, -- media/{yyyy}/{mm}/{uuid}.{ext}
  width      INTEGER, height INTEGER, size INTEGER,
  mime       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);                                 -- PAS de colonne `alt` : le texte alternatif est du contenu
                                   -- (FR-025) et suit le cycle — il vit dans la valeur de zone

CREATE TABLE media_derivatives (   -- FR-093 : dérivés conservés d'un build à l'autre
  media_id   TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  transform  TEXT NOT NULL,        -- ex : 'w=1280;fmt=avif;q=70' — clé canonique
  r2_key     TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (media_id, transform)
);

-- ── Identité des objets (non versionnée) ────────────────────────────────────

CREATE TABLE pages (               -- FR-006, FR-007, FR-082
  id          TEXT PRIMARY KEY,
  template    TEXT NOT NULL,       -- clé de gabarit (déclarée en code par le projet client)
  slug        TEXT NOT NULL UNIQUE,-- fixé au provisioning, non éditable (FR-009, FR-011)
  title       TEXT NOT NULL,       -- libellé d'ADMIN (liste des pages) ; le titre vu par le
                                   -- visiteur vient de page_meta.seo_title ou du gabarit
  created_by  TEXT REFERENCES users(id),
  updated_by  TEXT REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))  -- jeton de verrou optimiste (FR-092)
);

CREATE TABLE forms (               -- FR-040 : identité seule
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))   -- jeton de verrou (FR-092)
);

-- ── Contenus versionnés : tout ce qui porte `state` ─────────────────────────

CREATE TABLE page_zone_values (    -- FR-008, FR-012, FR-013, FR-078
  page_id    TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  zone_key   TEXT NOT NULL,        -- correspond à une zone déclarée par le gabarit
  state      TEXT NOT NULL CHECK (state IN ('draft','live')),
  value_json TEXT NOT NULL,        -- forme validée par Zod selon le type de zone
  PRIMARY KEY (page_id, zone_key, state)
);

CREATE TABLE page_meta (           -- FR-027 → FR-029 : rendu au visiteur, donc versionné
  page_id         TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  state           TEXT NOT NULL CHECK (state IN ('draft','live')),
  seo_title       TEXT,
  seo_description TEXT,
  og_media_id     TEXT REFERENCES media(id),
  PRIMARY KEY (page_id, state)
);

CREATE TABLE form_defs (           -- FR-046, FR-047 : définition de niveau formulaire
  form_id         TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  state           TEXT NOT NULL CHECK (state IN ('draft','live')),
  title           TEXT NOT NULL,
  recipient_email TEXT NOT NULL,   -- doit être confirmée avant publication (FR-046)
  PRIMARY KEY (form_id, state)
);

CREATE TABLE form_fields (         -- FR-041 → FR-045
  form_id    TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  state      TEXT NOT NULL CHECK (state IN ('draft','live')),
  field_key  TEXT NOT NULL,        -- clé NATURELLE stable : FR-091 rapproche par elle
  type       TEXT NOT NULL CHECK (type IN ('text','email','phone','textarea',
                                'select_single','select_multi','number','date','consent')),
  label      TEXT NOT NULL,
  required   INTEGER NOT NULL DEFAULT 0,   -- booléen 0/1 (FR-043)
  min_value  INTEGER,              -- FR-045 : facultatif, borné à 0 par défaut
  max_value  INTEGER,              -- FR-045 : OBLIGATOIRE si type='number' (règle Zod)
  unit_price INTEGER,              -- centimes (FR-045)
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_id, state, field_key)
);

CREATE TABLE form_field_options (  -- FR-044 : choix d'un champ select_*, avec montant
  form_id     TEXT NOT NULL,
  state       TEXT NOT NULL,
  field_key   TEXT NOT NULL,
  option_key  TEXT NOT NULL,       -- clé naturelle, comme field_key
  label       TEXT NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0,  -- centimes entiers
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_id, state, field_key, option_key),
  FOREIGN KEY (form_id, state, field_key)
    REFERENCES form_fields(form_id, state, field_key) ON DELETE CASCADE
);

CREATE TABLE site_settings (       -- FR-071, FR-072, FR-073 : réglages transverses
  key        TEXT NOT NULL,        -- ex : 'social_links', 'contact'
  state      TEXT NOT NULL CHECK (state IN ('draft','live')),
  value_json TEXT NOT NULL,        -- forme validée par Zod selon la clé
  PRIMARY KEY (key, state)
);

-- ── Cycle de publication, commun aux trois genres d'objet ───────────────────

CREATE TABLE publications (        -- FR-019, FR-038, FR-079, FR-083
  kind               TEXT NOT NULL CHECK (kind IN ('page','form','settings')),
  ref                TEXT NOT NULL,  -- pages.id, forms.id, ou 'site' pour les réglages
  en_ligne           INTEGER NOT NULL DEFAULT 0,  -- exposé au visiteur ? (FR-083)
  first_published_at TEXT,           -- FR-038 : première publication
  last_published_at  TEXT,           -- FR-038 : dernière mise en ligne
  draft_fingerprint  TEXT NOT NULL,  -- empreinte du contenu en cours
  live_fingerprint   TEXT,           -- empreinte du contenu en ligne  (FR-079 : ≠ ⇒ en attente)
  PRIMARY KEY (kind, ref)
);

-- ── Surfaces nouvelles ──────────────────────────────────────────────────────

CREATE TABLE content_references (  -- FR-085 : qui pointe vers quoi
  source_kind    TEXT NOT NULL CHECK (source_kind IN ('page','form','settings')),
  source_ref     TEXT NOT NULL,
  source_state   TEXT NOT NULL CHECK (source_state IN ('draft','live')),
  source_locator TEXT NOT NULL,    -- zone_key, ou zone_key#index pour un répéteur
  target_kind    TEXT NOT NULL CHECK (target_kind IN ('page','form','media')),
  target_ref     TEXT NOT NULL,
  PRIMARY KEY (source_kind, source_ref, source_state, source_locator, target_kind, target_ref)
);
CREATE INDEX idx_refs_target ON content_references(target_kind, target_ref, source_state);

CREATE TABLE site_build_state (    -- FR-055 → FR-057, FR-087, FR-094 : UNE seule ligne
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  last_requested_at TEXT,           -- dernière publication ayant demandé un build
  current_build_uuid TEXT,          -- retourné par le Deploy Hook
  status            TEXT CHECK (status IN ('pending','running','success','failed')),
  finished_at       TEXT,
  last_success_at   TEXT,
  failure_reason    TEXT            -- motif exploitable, traduit sans jargon (FR-057)
);

CREATE TABLE verified_recipients ( -- FR-046 : une adresse ne sert qu'une fois confirmée
  email        TEXT PRIMARY KEY,
  confirmed_at TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE undelivered_submissions (  -- FR-064 : corbeille de courrier NON DISTRIBUÉ
  id             TEXT PRIMARY KEY,     -- (ex-submission_retries, renommée : elle est désormais consultable)
  form_id        TEXT NOT NULL,
  payload_json   TEXT NOT NULL,        -- le message composé, pas la soumission brute
  attempts       INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,                 -- motif rendu sans jargon à l'éditrice (FR-094)
  first_try_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_try_at    TEXT,
  expires_at     TEXT NOT NULL         -- effacement INCONDITIONNEL à échéance (FR-064, FR-065)
);
-- Pas d'index de recherche, volontairement : ce qui ferait d'une corbeille un fichier,
-- c'est la capacité à l'interroger (ADR-0007 amendement (c)).
```

Notes :
- **`value_json` typé par zone** — un schéma Zod par type de zone valide la forme (FR-013) ; c'est la frontière serveur (FR-014) :

  | Type de zone | Forme | FR |
  |---|---|---|
  | texte simple | chaîne | FR-012 |
  | texte riche | JSON ProseMirror, **allowlist fermée** de nœuds / marques / attributs (voir ci-dessous), marque `link` **typée** | FR-015, FR-100 |
  | image | `{ media_id, alt }` — **l'alt est ici**, pas sur `media` | FR-025, FR-078 |
  | galerie | `{ items: [{ media_id, alt, caption? }, …] }`, liste **ordonnée** | FR-066, FR-067 |
  | vidéo | `{ provider: 'youtube'\|'vimeo', ref, poster_media_id? }` | FR-069 |
  | CTA | `{ label, target }` avec `target` **typé** (voir ci-dessous) | FR-070 |
  | **date** | chaîne ISO `YYYY-MM-DD` | FR-012, FR-076 |
  | **formulaire** | `{ form_id }` — une **référence**, jamais une copie | FR-086 |
  | répéteur | `{ items: [ { <clé_sous-champ>: <valeur typée>, … }, … ] }`, ordonnée | FR-074, FR-076 |

- **Le schéma du texte riche est la frontière de neutralisation** (FR-015, FR-100 — [ADR-0011](./adr/ADR-0011-frontieres-de-contenu-hostile.md)). Le stockage en JSON ProseMirror est structurellement plus favorable que du HTML brut, mais cette sûreté n'est réelle **que si le schéma Zod est une allowlist fermée** : les `type` de nœuds, les marques et, pour chaque nœud et chaque marque, ses attributs sont **énumérés**, chacun avec son propre schéma. Tout élément non énuméré **rejette la valeur entière** — jamais ignoré, jamais nettoyé. Le piège à ne pas laisser passer est `z.record(z.unknown())` sur les `attrs` : c'est la forme naturelle de « valider du JSON ProseMirror », et elle annule toute la protection. Corollaire : la neutralisation vit **à l'entrée**, jamais au rendu — pas d'assainissement dans `toBlocks` ni dans un composant. Ajouter une marque à l'éditeur est donc un geste de **schéma**, pas un geste d'îlot.
- **Contexte de rendu déclaré** ([ADR-0011](./adr/ADR-0011-frontieres-de-contenu-hostile.md)) — les textes libres n'atterrissent pas au même endroit : corps HTML (FR-015), attribut (`alt`, FR-025), URL (FR-070 à FR-072), `<title>` et `content` d'une `<meta>` (FR-027, FR-028), texte non-HTML (message acheminé). Un échappement uniforme « corps HTML » est **faux** pour les trois derniers ; le descripteur de gabarit porte donc le contexte de chaque zone, et une valeur sans contexte déclaré n'est pas rendue.
- **Destination typée d'un lien** (FR-015, FR-070) — l'éditrice ne saisit **jamais** une adresse interne. Une même forme sert au CTA et à la marque `link` du texte riche :
  ```ts
  type LinkTarget =
    | { kind: 'page';     page_id: string }
    | { kind: 'external'; href: string };     // schémas http/https énumérés — ADR-0004 (c)
  ```
  **Restriction de schéma — désormais une contrainte, plus un commentaire** ([ADR-0004](./adr/ADR-0004-architecture-du-code.md) amendement 2026-08-01 (c)). La règle « http(s) uniquement » vivait jusqu'ici dans le **commentaire de code ci-dessus**, donc compilée en aucune vérification : par la mécanique d'ADR-0002, seule une section `## Constraints` alimente un hook ou un check. Elle est remontée. Le schéma d'entrée **énumère** les schémas d'adresse autorisés — `http`, `https`, et rien d'autre ; `z.string().url()` ne suffit **pas**, il accepte `javascript:`. Et tout lien externe rendu porte `rel="noopener noreferrer"`. C'est l'énumération concrète que réclame le contexte de rendu `url` d'[ADR-0011](./adr/ADR-0011-frontieres-de-contenu-hostile.md) § 3.
  **Point dur, tranché** : pour le texte riche, cette forme vit dans un **attribut de marque personnalisé** TipTap — la marque `link` standard est étendue en `{ kind, page_id?, href? }` et l'attribut `href` n'est **jamais** stocké pour une cible interne. La résolution `page_id → slug` se fait au rendu, dans `toBlocks` : c'est ce qui permet à FR-085 de **ne pas rendre** le lien si la page cible n'est pas en ligne (la marque est retirée, le texte reste). Une extension TipTap du cœur, consommée par l'îlot d'édition ; c'est le changement de forme le plus coûteux de la revue, et il est assumé.
- **Vidéo : intégrée, jamais hébergée** (FR-069). Le `[À VÉRIFIER : hébergée vs intégrée]` est levé — l'hébergement était déjà exclu de fait (plafond 8 Mo, FR-023). Liste **fermée** de fournisseurs pour que le système puisse valider l'adresse et fabriquer la vignette.
- **Répéteur — exemple « carrousel d'avis »** : le gabarit déclare la forme d'un élément `{ image, auteur, texte, rôle?, avatar?, date? }` ; l'éditrice gère la liste d'éléments (FR-075), le gabarit rend chaque élément comme une diapo (image + avis en surimpression). La *forme* est possédée par le gabarit (intégrateur), le *contenu* par l'éditrice — même partage que page/zone. **Pas d'imbrication en v1** : un sous-champ n'est jamais lui-même un répéteur ou une galerie (FR-076).
- **Mode d'affichage d'une galerie** (grille, carrousel…) : déclaré par le **gabarit en code** (FR-068), jamais stocké en base ni éditable ; la base ne connaît que la liste ordonnée d'images. L'éditrice gère le contenu, le gabarit gère la présentation.
- **Montants en centimes entiers** : jamais de flottant pour de la monnaie. Le total est une **somme** des contributions (montants de choix sélectionnés + valeur×`unit_price`), calculée par une fonction **pure** de `@colibri/core` — la **même** côté navigateur pour l'affichage (FR-050) et côté serveur pour le montant qui fait foi (FR-091). Aucune règle conditionnelle (hors périmètre). Le total du navigateur n'est plus qu'un **confort d'affichage** : seul le recalcul serveur entre dans le message.
- **Cycle brouillon/publication des formulaires** (FR-047) : la définition `state='live'` est **bâtie dans le site** (donnée statique consommée par le rendu et le calcul navigateur, FR-049/FR-050) et sert aussi de **référence de validation serveur** (FR-090, FR-091) ; une modification non publiée reste en `draft`, donc invisible au public. Sémantique fine (portée du « Publier ») → [ADR-0010](./adr/ADR-0010-modele-brouillon-publie.md).
- **Corbeille de courrier non distribué** (FR-064, FR-097 → FR-099) — *amendée le 2026-08-01, en même temps que le retrait de `FR-095`*. Il n'y a **pas de base de prospects** : `undelivered_submissions` ne contient que les acheminements **en échec**, et une demande livrée n'y entre jamais. Ce qu'elle stocke est le **message déjà composé** — exactement ce qui aurait dû arriver dans la boîte de l'éditrice —, donc l'afficher ne révèle rien de plus que l'e-mail qu'elle n'a pas reçu. Elle peut le **consulter**, le **relancer** après avoir corrigé l'adresse, ou l'**effacer**. Une demande n'en sort que pour disparaître : livrée, effacée ou expirée — **aucun statut « traité »**, aucune recherche, aucun filtre, aucun export. L'expiration est **inconditionnelle** et ne se repousse pas.
  **Paramètre à fixer** : `expires_at` valait quelques heures quand la corbeille n'existait que pour le réessai automatique ; il doit maintenant laisser à l'éditrice le temps de s'apercevoir de l'échec. **Défaut proposé : 30 jours.** C'est la donnée à porter dans la mention d'information (question RGPD ouverte du PRD) — la conserver plus longtemps n'apporte rien, moins longtemps rend le geste inutile.
- **La définition de formulaire est possédée par l'éditrice** (structure composable, FR-041) — à la différence des gabarits de page, possédés par l'intégrateur en code. C'est la seule surface où l'éditrice compose une structure ; l'entorse à la philosophie « zones typées non restructurables » est assumée et bornée aux formulaires.
- **Réglages transverses** (`site_settings`) : clé → `value_json` typé par clé (liens réseaux sociaux, coordonnées), bâtis dans le site et servis sur toutes les pages ; **même cycle brouillon/publication** que les pages (FR-073), porté par `state` et par la ligne `('settings','site')` de `publications` — plus par la temporalité du build, qui ne suffisait pas.
- **Verrou optimiste** : `updated_at` est le jeton, et **la protection est exigée** (FR-092). *La note antérieure — « le seam existe, la protection n'est pas une priorité v1 » — est caduque* : le refus d'écrasement silencieux est une exigence, pas un confort. `createRepository` (ADR-0004) le porte ; la publication vérifie le jeton **avant** toute écriture (ADR-0010).

## Surfaces nouvelles

- **Index de références** (`content_references`, FR-085) — **stocké, pas dérivé au build.** Il doit répondre *avant* une dépublication (« où est-ce utilisé ? »), donc hors build. Il est reconstruit à chaque écriture d'un contenu, par une fonction **pure** de `@colibri/core` — `extractReferences(descripteur, valeur) → Ref[]` — appliquée au `draft` à l'enregistrement et au `live` à la publication. Le build s'en sert pour ne pas rendre une référence dont la cible n'est pas en ligne, et FR-055 pour vérifier que tout `target_kind='media'` du `live` existe encore.
- **État de la mise en ligne** (`site_build_state`, FR-087) — le build étant **global**, une seule ligne suffit. La publication pose `last_requested_at` et le `current_build_uuid` retourné par le Deploy Hook. Un **Cron Trigger** interroge l'API Workers Builds et met à jour `status` / `finished_at` / `failure_reason`. Ce que lit l'éditrice pour une page se **dérive** : `last_published_at ≤ last_success_at` ⇒ *en ligne* ; sinon build `pending`/`running` ⇒ *en cours* ; sinon ⇒ *échouée*, avec son motif.
- **Boucle de réconciliation** (FR-056, FR-093) — le même Cron : si `last_success_at < last_requested_at` et qu'aucun build ne tourne, redéclencher. Un seul mécanisme couvre le quota épuisé, l'échec transitoire et la déduplication — **sans dépendre d'un signal de quota**, qui n'est pas documenté. Quota réel de l'offre gratuite : **3 000 minutes de build/mois, 1 build concurrent**.
- **Menu** (FR-084) — déclaré **en code** par le projet client (ordre et libellés), au titre du contrat de gabarit ; jamais en base, jamais éditable. Le build le filtre sur `publications.en_ligne = 1`. Quasi gratuit : le build connaît déjà l'état.
- **Provisionnement des pages** (FR-082) — **ni migration, ni graine ad hoc** : le jeu de pages est une **déclaration du projet client** (clé de gabarit, slug, titre d'admin), au même titre que ses gabarits. Une étape outillée (`colibri provision`) insère les lignes `pages` + `publications` **manquantes**, et ne touche ni ne supprime jamais une page existante (FR-010). Motif : une migration appartient au **cœur** et serait la même pour tous les clients, alors que le jeu de pages est du **sur-mesure client** — le mettre en migration violerait la frontière d'ADR-0004. Conséquence pour ADR-0008 : ajouter une page chez un client = amender sa déclaration + rejouer le provisionnement, sans toucher au cœur.
- **Retraitement incrémental** (FR-093) — les dérivés d'image sont **persistés en R2** (`media_derivatives`), clés par `(media_id, transform)`. Le build consulte R2 **avant** de réencoder ; seul un média nouveau ou une transformation nouvelle coûte du Sharp. Le délai cesse ainsi de croître avec le volume déjà publié. *Choix délibéré de ne pas s'en remettre au cache de build de la plateforme* (il existe — l'API expose sa purge — mais son contenu et sa persistance ne sont pas garantis) : R2 est sous notre contrôle et déjà au périmètre.
- **Réduction d'image à l'entrée** (FR-088) — **dans le navigateur**, avant l'envoi : Sharp est *build-only* et n'existe pas dans le Worker. `createImageBitmap` + `canvas.toBlob`, plafond de côté long et qualité cible, jusqu'à passer sous la limite. `FR-023` (8 Mo) reste la **butée serveur** (FR-014), jamais atteinte dans le parcours nominal. L'attribut `accept` ne déclare **jamais** `image/heic` : c'est ce qui fait transcoder Safari en JPEG et évite le sujet HEIC à la source.
- **Vignette vidéo** (FR-069 × FR-089) — **conséquence non évidente** : la récupérer chez le fournisseur *au moment de la visite* serait déjà une requête tierce avant action du visiteur. Elle est donc récupérée **au build** (oEmbed), stockée en R2 et servie depuis le site. Le lecteur du fournisseur n'est chargé **qu'au clic** (façade).
- **Anti-spam** (FR-063 × FR-089) — **Turnstile conservé**, mais son script n'est chargé qu'au **premier geste dans le formulaire** (focus d'un champ), jamais au chargement de la page. FR-089 est satisfait — un geste dans le formulaire *est* une action explicite — et SC-005, qui se mesure au chargement, n'est pas affecté. Le mode d'intégration est donc contraint : rendu **explicite** (`turnstile.render()` après injection du script), jamais le rendu implicite qui suppose le script présent au chargement.
- **Acheminement** (FR-061) — **Cloudflare Email Service**, via le seam `sendMail` déjà injectable (ADR-0004 §f). *(Décision du 2026-08-01 : Resend, un temps retenu, est écarté — **aucune dépendance hors écosystème**. ADR-0007 amendement (b).)* **Un seul message par soumission**, vers l'**adresse de destination vérifiée** du formulaire : gratuit et **hors quota** sur toutes les offres, donc aucun plafond de volume à surveiller. Deux renoncements, écrits : `FR-095` (copie au visiteur) est **retirée de la v1** — le visiteur est un destinataire quelconque, indisponible en gratuit — et `FR-061` perd le `Reply-To` vers le visiteur, par choix et non par contrainte. Contrepartie côté produit : l'éditrice n'achemine pas vers une adresse arbitraire ; en ajouter une déclenche un courriel de vérification à confirmer (FR-046).
- **Message de test** (FR-096) — endpoint d'écriture authentifié `writeHandler({ auth: 'access' })`, envoi **mocké** en test (ADR-0005). Sert aussi à constater qu'une adresse de destination est bien confirmée (FR-046).

---

## Décisions structurantes → ADR

Les ADR 0001–0008 sont **acceptés**. La revue du PRD du 1<sup>er</sup> août 2026 en a ouvert un neuvième (ADR-0010) et en amende trois ; l'audit de sécurité du même jour en a ouvert un dixième (ADR-0011) :

- **[ADR-0010](./adr/ADR-0010-modele-brouillon-publie.md) — Modèle brouillon/publié à deux contenus (accepté).** La décision mère : discriminant `state ∈ ('draft','live')` dans la clé primaire des tables de valeur ; recopie synchrone en un `batch()` D1 au clic « Publier », **avant** le Deploy Hook ; publication granulaire par objet ; une référence est un identifiant, jamais une copie ; rien de rendu au visiteur ne vit hors des deux contenus. Écarté : l'instantané JSON figé (dédoublerait le chemin de lecture qu'ADR-0004 unifie) et les tables séparées (double migration, `UNION` partout).
- **[ADR-0011](./adr/ADR-0011-frontieres-de-contenu-hostile.md) — Frontières de contenu hostile (accepté).** La racine « sécurité » que la chaîne documentaire n'avait pas (audit du 2026-08-01) : allowlist **fermée** du schéma de texte riche, neutralisation à l'entrée et jamais au rendu ; **contexte de rendu déclaré** par le contrat de gabarit ; type réel d'un téléversement par **signature d'octets**, liste fermée JPEG/PNG/WebP/AVIF, `image/svg+xml` interdit sans ADR, extension de clé R2 dérivée du type détecté ; en-têtes de réponse et politique de contenu, sur le site statique comme sur le Worker, sans `unsafe-inline`. Écarté : l'assainissement au rendu (laisse la donnée hostile en base, où cinq autres surfaces la relisent) et le stockage en HTML assaini (perd la marque `link` typée, donc FR-085).
- **ADR-0004 — amendé (c), 2026-08-01** — le cœur face au contenu hostile, suites de l'audit de sécurité : `toBlocks()` retourne un **arbre de blocs typés** rendu nœud par nœud, ce qui rend `set:html` inutile puis interdit ; **toute requête D1 est paramétrée**, interpolation exclue jusque pour un nom de colonne ou une clause `IN` variable ; l'**aperçu SSR et les médias bruts** quittent l'origine des endpoints d'écriture pour un **hôte distinct sous la même politique Access**, avec sa propre politique de contenu — `checkOrigin` n'y protégeait de rien ; en-têtes de service d'un média (type **détecté**, `nosniff`, `Content-Disposition` normalisé), bucket d'originaux jamais public ; `verifyAccessJwt` vérifie signature, `aud`, `iss`, `exp` et refuse **fail-closed**, Access restant l'unique source d'autorisation ; la soumission publique passe à `writeHandler({auth:'public', against:'live-form-definition'})`, relecture de la définition `live` et **recalcul du total** dans la tête du pipeline. Au passage : signatures `getBySlug(…, {includeDrafts})` renversées (ADR-0010) et « Email Routing » corrigé en **Email Service**.
- **ADR-0004 — amendé** — le **contrat de gabarit** gagne quatre déclarations : zone de type **formulaire** (FR-086), zone de type **date** (FR-012), **ordre et libellés du menu** (FR-084), **destination typée** d'un lien (FR-015, FR-070). S'y ajoutent l'**index de références** (FR-085), la **surface d'état de publication** (FR-087) et l'**adaptateur HTTP** que le build fournit à `@colibri/db` pour lire D1 par l'API REST — le caveat `[À VÉRIFIER]` correspondant est **levé**.
- **ADR-0007 — amendé** — validation serveur contre la définition publiée (FR-090), **total recalculé** (FR-091), bornes de champ nombre avec maximum obligatoire (FR-045), rétention transitoire en cas d'échec (FR-064), message de test (FR-096), chargement différé de l'anti-spam (FR-089 × FR-063). **Fait** — amendements (a) et (b) du 2026-08-01. L'ADR a porté un renversement de fournisseur (Resend à la place de Cloudflare, l'envoi Cloudflare n'atteignant aucun destinataire quelconque en gratuit) puis **son annulation** le même jour, sur décision de n'ajouter aucune dépendance hors écosystème : retour à **Cloudflare Email Service**, `FR-095` retirée de la v1 et `Reply-To` abandonné. Le seam `sendMail` étant injectable, cet aller-retour n'a coûté aucune architecture — c'est précisément ce que le seam achetait.
- **ADR-0005 — amendé** — nouvelles cibles : soumission forgée rejetée, recalcul du total (test pur `@colibri/core`), index de références, refus d'écrasement concurrent (FR-092), non-rendu d'un lien vers une page non publiée (FR-085), et **la fuite de brouillon** — qu'aucune lecture du build ne serve une ligne `state='draft'`. C'est le pire bug possible du produit : il mérite sa cible dédiée.
- **ADR-0003 — amendé** — deux mécanismes absents du socle : le **Cron Trigger** (FR-056, FR-087, FR-093 — interrogation de l'issue de build et boucle de réconciliation) et la **réduction d'image dans le navigateur** (FR-088 — Sharp est *build-only* et n'existe pas dans le Worker).

---

## Questions ouvertes (techniques)

- **`compatibility_date` / `nodejs_compat`** : à fixer selon la version de miniflare installée — voir ADR-0003.
- **Signal de quota de build épuisé** : non documenté par la plateforme. Rendu **non bloquant** par conception (boucle de réconciliation), mais si un motif exploitable existe, FR-057 gagnerait à le traduire plutôt qu'à se replier sur un message générique. **Ne se constate qu'en production** — c'est ici son lieu durable (décision du 2026-08-01 : l'item a quitté les suites de la revue du PRD, qui ne pouvaient pas le fermer par un geste documentaire).

*Résolues par la revue du 2026-08-01* : l'envoi sortant depuis un Worker (→ **Cloudflare Email Service** vers adresse vérifiée, après un aller-retour par Resend ; `FR-095` retirée de la v1), **le domaine d'envoi et la flotte** (→ question éteinte avec Resend, sans avoir eu à être tranchée), l'accès D1 au build (→ API REST), l'issue réelle d'un build (→ `build_uuid` + API Workers Builds + Cron), le HEIC (→ ne jamais déclarer `image/heic` dans `accept`), vidéo hébergée vs intégrée (→ intégrée), **durée de session et révocation d'accès** (→ 7 jours au niveau application ; retrait de politique *puis* révocation ; jeton Builds non nominatif ; `workers_dev` et `preview_urls` fermés).
