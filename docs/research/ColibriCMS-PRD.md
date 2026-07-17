# PRD — ColibriCMS

| | |
|---|---|
| **Produit** | ColibriCMS |
| **Version du document** | 1.0 |
| **Statut** | Décisions arbitrées — prêt à implémenter |
| **Périmètre** | V1 (MVP consistant) |
| **Contexte** | CMS sur-mesure open source, déployé par client chez Arborescence Digital |
| **Dernière mise à jour** | Décisions figées en session |

---

## 1. Résumé exécutif

ColibriCMS est un CMS **sur-mesure et open source** pour sites vitrine et éditoriaux. Il repose sur une séparation stricte entre un **site public statique** (Astro SSG) et une **application d'admin séparée** (Astro SSR), avec un stockage **100 % Cloudflare** (D1 + R2 + KV), conçu pour tenir intégralement sur le **plan gratuit**.

Principe directeur : **le visiteur ne touche jamais le runtime.** Le site public est du HTML statique servi par le CDN (bande passante gratuite illimitée). Tout le dynamique vit dans l'admin, utilisée par une poignée d'éditeurs.

Cible de déploiement : un site par client, répliqué via une convention d'infrastructure standardisée.

---

## 2. Objectifs & non-objectifs

### 2.1 Objectifs (V1)
- Fournir une admin sécurisée permettant à 2-5 éditeurs de gérer des articles, pages, auteurs et tags.
- Publier un site public statique, rapide, optimisé SEO et images.
- Rester **intégralement sur le free tier Cloudflare** dans les conditions d'un site vitrine/éditorial.
- Offrir une **prévisualisation instantanée** des brouillons sans rebuild.
- Constituer une base réplicable et maintenable pour l'usage agence (déploiement par client).

### 2.2 Non-objectifs (hors V1)
- Contenu dynamique à l'edge pour le site public (SSR lisant D1 à chaque visite) — **exclu par conception**.
- Versioning éditorial par document (repoussé V2).
- Médiathèque complète avec grille/recherche (V2 ; un sélecteur léger suffit en V1).
- Presigned URLs pour l'upload (V2 ; binding R2 en V1).
- Multi-tenant / SaaS mutualisé (un déploiement = un site).
- Gestion de rôles différenciés (tous les éditeurs sont égaux en V1).
- Fonctions collaboratives temps réel, commentaires, IA d'édition.

---

## 3. Utilisateurs cibles

| Persona | Description | Besoins principaux |
|---|---|---|
| **Éditeur** | 2 à 5 personnes par site, authentifiées via l'IdP. Tous égaux (aucun rôle différencié). | Rédiger, éditer, prévisualiser, publier du contenu sans friction technique. |
| **Visiteur** | Public du site. Non authentifié. | Pages rapides, SEO propre, images optimisées. |
| **Intégrateur agence** | Développeur Arborescence Digital qui déploie et maintient une instance par client. | Réplicabilité, convention d'infra claire, maîtrise des coûts. |

---

## 4. Contexte & contraintes

### 4.1 Architecture (verrouillée)
Deux déploiements distincts :
- `colibri-site` : Astro **statique (SSG)**, sans adaptateur → Cloudflare Pages/Assets, sur `client.com`.
- `colibri-admin` : Astro **SSR** (`@astrojs/cloudflare`) → Workers, sur `admin.client.com`.

L'accès aux données se fait par **bindings directs D1/R2** dans l'admin SSR (`context.locals.runtime.env`), pas d'API REST publique (pattern « Local API » de Payload). **Contrôle d'accès réappliqué explicitement dans chaque endpoint d'écriture.**

### 4.2 Budget free tier à respecter
*Repères vérifiés le 8 juillet 2026 — à revérifier avant prod, l'offre évolue.*

| Service | Limite gratuite | Risque |
|---|---|---|
| Pages (statique) | Bande passante illimitée ; **500 builds/mois** | Moyen |
| Workers (admin) | 100 000 req/jour ; **10 ms CPU/req** ; 128 MB | Faible |
| D1 | 5 M lectures/jour ; **100 k écritures/jour** ; 5 GB | Faible |
| R2 | 10 GB ; 1 M écritures/mois ; egress gratuit | Faible→Moyen |
| KV | 100 k lectures/jour ; **1 000 écritures/jour** ; 1 GB | Faible |
| Cloudflare Access | **≤ 50 utilisateurs** | Nul |
| Cloudflare Images | 5 000 transformations/mois (stockage payant) | Faible (Sharp au build) |

### 4.3 Garde-fous free tier (invariants)
1. **Save explicite** (jamais d'autosave par caractère) → protège les écritures D1/KV.
2. **Deploy Hook sur « Publier » uniquement** → protège les 500 builds/mois.
3. **Optimisation d'images au build (Sharp)** → évite le stockage Cloudflare Images payant.

---

## 5. Périmètre fonctionnel

### 5.1 Dans le périmètre (V1)
Gestion de contenu (Article, Page, Auteur, Tag), médias, authentification, prévisualisation, publication.

### 5.2 Hors périmètre (V2+)
Versioning éditorial, médiathèque complète, presigned URLs, types de contenu additionnels, rôles différenciés.

---

## 6. Exigences fonctionnelles

### 6.1 Authentification & accès
- **FR-1** — L'accès à l'admin est protégé par **Cloudflare Access** (MFA délégué à l'IdP : Google / GitHub / OTP e-mail). Aucun mot de passe géré applicativement.
- **FR-2** — Le Worker admin **valide le JWT `Cf-Access-Jwt-Assertion`** à chaque requête (défense en profondeur ; ne pas se reposer sur le seul proxy).
- **FR-3** — À la première connexion, l'e-mail extrait du JWT est mappé à une ligne de la table `users` (création si absente).
- **FR-4** — Tous les éditeurs disposent des mêmes droits (aucun rôle différencié en V1).

### 6.2 Gestion du contenu
- **FR-5** — CRUD complet sur **Article**, **Page**, **Auteur**, **Tag**.
- **FR-6** — Chaque Article référence **un seul auteur** (relation n-1 vers `authors`).
- **FR-7** — Un Article peut porter **plusieurs tags** (relation n-n).
- **FR-8** — Le corps riche est édité dans **TipTap** et stocké en **JSON ProseMirror** (`body_json`, TEXT).
- **FR-9** — La sauvegarde est **explicite** (bouton, ou debounce), jamais par frappe.
- **FR-10** — Chaque document possède un statut **`draft` / `published`**.
- **FR-11** — Les slugs sont générés automatiquement depuis le titre, **éditables manuellement**, avec contrainte d'unicité par type.
- **FR-12** — Chaque Article/Page expose des champs SEO dédiés : `seo_title`, `seo_description`, `og_image`.
- **FR-13** — En cas d'édition concurrente, un **verrouillage optimiste** (jeton `updated_at`) rejette une sauvegarde périmée pour éviter l'écrasement silencieux.

### 6.3 Médias
- **FR-14** — Upload d'images via **binding R2** (`env.BUCKET.put`), directement depuis l'article/page en édition (**upload contextuel**).
- **FR-15** — Un **sélecteur « réutiliser un média existant »** léger est disponible sur les champs image (cover, avatar auteur, og:image) pour éviter les doublons R2.
- **FR-16** — Les métadonnées média (alt, largeur, hauteur, taille, MIME, clé R2) sont stockées dans la table `media`.
- **FR-17** — Convention de clés R2 : `media/{yyyy}/{mm}/{uuid}.{ext}`.
- **FR-18** — Formats acceptés : jpeg / png / webp / avif ; taille max ~8 Mo ; **MIME validé côté serveur**.
- **FR-19** — L'optimisation d'images se fait **au build** via Astro `<Image>`/`<Picture>` (Sharp).

### 6.4 Prévisualisation
- **FR-20** — La prévisualisation des brouillons se fait en **SSR à l'edge** : un endpoint lit D1 en direct et rend le contenu via le renderer partagé, **sans rebuild**.
- **FR-21** — La preview est **protégée par Cloudflare Access** (réservée aux éditeurs).

### 6.5 Publication & déploiement
- **FR-22** — La publication déclenche un **Deploy Hook** (`POST`) qui rebuild + redéploie le site statique.
- **FR-23** — Le hook est appelé **uniquement** sur l'action « Publier » (jamais sur save/autosave).
- **FR-24** — Le build du site public filtre `WHERE status='published'` ; la preview inclut les `draft`.
- **FR-25** — Le build hydrate les relations (JOIN auteur + tags) et optimise les images (Sharp).

---

## 7. Modèle de données (D1 / SQLite)

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE media (
  id         TEXT PRIMARY KEY,
  r2_key     TEXT NOT NULL UNIQUE,        -- media/{yyyy}/{mm}/{uuid}.{ext}
  alt        TEXT,
  width      INTEGER,
  height     INTEGER,
  size       INTEGER,
  mime       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE authors (
  id        TEXT PRIMARY KEY,
  slug      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  bio       TEXT,
  avatar_id TEXT REFERENCES media(id)
);

CREATE TABLE articles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  body_json       TEXT NOT NULL,          -- JSON ProseMirror
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published')),
  author_id       TEXT NOT NULL REFERENCES authors(id),
  cover_id        TEXT REFERENCES media(id),
  seo_title       TEXT,
  seo_description TEXT,
  og_image_id     TEXT REFERENCES media(id),
  created_by      TEXT REFERENCES users(id),
  updated_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),  -- jeton verrou optimiste
  published_at    TEXT
);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_author ON articles(author_id);

CREATE TABLE tags (
  id   TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE article_tags (
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE pages (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  body_json       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published')),
  seo_title       TEXT,
  seo_description TEXT,
  og_image_id     TEXT REFERENCES media(id),
  created_by      TEXT REFERENCES users(id),
  updated_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  published_at    TEXT
);
CREATE INDEX idx_pages_status ON pages(status);
```

**Conventions :** IDs en TEXT (UUID v4 ou nanoid, générés applicativement) ; slugs `UNIQUE` ; SEO en colonnes dédiées (1-1) ; traçabilité via `created_by`/`updated_by` ; `updated_at` = jeton du verrou optimiste.

---

## 8. Exigences non-fonctionnelles

### 8.1 Performance
- **NFR-1** — Le site public est 100 % statique, servi par le CDN Cloudflare (aucun runtime sur le chemin visiteur).
- **NFR-2** — Images optimisées au build (formats modernes, dimensions adaptées).

### 8.2 Sécurité
- **NFR-3** — Validation **Zod** partagée client + serveur (`packages/shared`) ; **revalidation obligatoire côté endpoint** — le client n'est jamais de confiance.
- **NFR-4** — Contrôle d'accès réappliqué explicitement dans chaque endpoint d'écriture.
- **NFR-5** — JWT Access vérifié côté Worker (défense en profondeur).
- **NFR-6** — CSRF Astro (`checkOrigin`) actif sur les routes d'écriture.
- **NFR-7** — Secrets (bindings R2, URL du Deploy Hook) via `wrangler secret put`, **jamais** dans `wrangler.toml` versionné. L'URL du hook est traitée comme un secret.
- **NFR-8** — `@aws-sdk/client-s3` proscrit dans le Worker ; `aws4fetch` uniquement (si presigned en V2).

### 8.3 Coût
- **NFR-9** — L'ensemble tient sur le free tier Cloudflare dans les conditions d'un site vitrine/éditorial (voir §4.2 et garde-fous §4.3).

### 8.4 Maintenabilité & réplicabilité
- **NFR-10** — **Monorepo pnpm** : `packages/shared` (types + schémas Zod), `apps/site`, `apps/admin`.
- **NFR-11** — Le renderer JSON ProseMirror → HTML est un **module partagé**, consommé à la fois par le build SSG et par la preview SSR.
- **NFR-12** — Déploiement standardisé par client (voir §10).

---

## 9. Stack technique (figée)

```
Site public   : Astro SSG (sans adaptateur) → Cloudflare Pages/Assets
Admin         : Astro SSR + @astrojs/cloudflare + îlots React → Workers
Contenu       : D1 (SQLite)
Médias        : R2 (binding en V1)
Cache/session : KV
Éditeur       : TipTap (JSON ProseMirror)
Validation    : Zod (partagé client/serveur)
Auth          : Cloudflare Access (JWT vérifié côté Worker)
Rebuild       : Deploy Hook sur publication explicite
Repo          : monorepo pnpm (shared / site / admin)
```

---

## 10. Convention de déploiement (par client)

**Sous-domaine admin.**
- Site public → `client.com` (Pages/Assets, statique).
- Admin → `admin.client.com` (Workers, SSR).

**Dev/staging :** défauts `*.pages.dev` et `*.workers.dev` avant le domaine custom.
**Prérequis :** la zone DNS du client doit être sur Cloudflare (Access + sous-domaine custom). DNS ailleurs → migrer la zone ou CNAME setup.

---

## 11. Parcours utilisateurs clés

**Rédiger et publier un article**
1. L'éditeur se connecte à `admin.client.com` (Access + MFA).
2. Crée un Article, saisit titre (slug auto), sélectionne l'auteur, ajoute des tags.
3. Rédige le corps dans TipTap ; uploade une cover (contextuel) ou réutilise un média existant.
4. Renseigne les champs SEO.
5. Sauvegarde explicite (statut `draft`).
6. Ouvre la **preview SSR** pour vérifier le rendu instantané.
7. Clique « Publier » → statut `published`, `published_at` renseigné, Deploy Hook déclenché.
8. Le site statique rebuild et se redéploie ; l'article est en ligne.

**Prévisualiser sans publier**
1. Sur un brouillon, l'éditeur ouvre la preview → endpoint SSR lit D1 en direct, rend via le renderer partagé, aucun build consommé.

---

## 12. Roadmap

### V1 — MVP consistant (ordre de bataille)
1. Schéma D1 (7 tables) + types & schémas Zod dans `packages/shared`.
2. Admin protégée par Access + mapping e-mail → `users` ; CRUD Article / Auteur / Tag / Page.
3. Éditeur TipTap + save explicite (JSON) + verrou optimiste.
4. Upload binding R2 + sélecteur de réutilisation + métadonnées `media`.
5. Site public Astro : build lit D1 (JOIN auteur + tags), Sharp.
6. Preview SSR à l'edge (renderer partagé), protégée par Access.
7. Deploy Hook branché sur « Publier ».

### V2 — Confort
- Presigned URLs pour l'upload (aws4fetch).
- Médiathèque réutilisable complète (grille, recherche).
- Versioning éditorial (table `revisions` append-only).
- Types de contenu additionnels.
- Rôles différenciés si le besoin se confirme.

---

## 13. Métriques de succès

- **Coût** : 0 € / mois par site en conditions nominales (aucun dépassement de quota).
- **Fraîcheur** : contenu publié en ligne en quelques minutes après « Publier ».
- **Builds** : consommation mensuelle < 500 (marge confortable).
- **Adoption éditeurs** : publication autonome sans intervention technique.
- **Réplicabilité** : déploiement d'une nouvelle instance client selon la convention standard.

---

## 14. Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Saturation des 500 builds/mois | Publications bloquées | Hook sur « Publier » uniquement ; surveiller le compteur ; basculer en rebuild groupé si proche du seuil |
| Dépassement écritures D1/KV | Erreurs d'écriture | Save explicite / debounce ; jamais d'autosave par frappe |
| Bascule sur Cloudflare Images payant | Coût inattendu | Stockage R2 + transformations Sharp au build |
| Édition concurrente (2-5 éditeurs) | Écrasement silencieux | Verrouillage optimiste sur `updated_at` |
| Zone DNS client hors Cloudflare | Access/sous-domaine indisponibles | Migrer la zone ou CNAME setup en amont |
| Évolution des quotas free tier | Hypothèses caduques | Revérifier developers.cloudflare.com avant prod |
| Contrôle d'accès oublié sur un endpoint (piège Local API) | Faille d'écriture | Le réappliquer explicitement + revue systématique |

---

## 15. Questions ouvertes

Aucune décision bloquante en suspens. Points de suivi non-bloquants :
- Réserver le nom `colibri-cms` sur npm (libre) tôt, via un placeholder.
- Design system de l'admin (Tailwind / composants) — à cadrer à l'implémentation.

---

## Annexe — Glossaire

- **SSG** : Static Site Generation — build de HTML statique.
- **SSR** : Server-Side Rendering — rendu à la requête (ici : admin + preview).
- **Binding** : liaison native Worker ↔ ressource Cloudflare (D1, R2, KV).
- **Deploy Hook** : URL secrète déclenchant un rebuild/redeploy à la publication.
- **Verrou optimiste** : rejet d'une écriture si le jeton de version (`updated_at`) est périmé.
