# CLAUDE.md — ColibriCMS

<!-- Point d'entrée injecté à chaque session. Garder < 200 lignes.
     Ne PAS dupliquer d'ADR ici : pointer + ne recopier que les contraintes actives.
     Ce fichier guide ; ce qui NE DOIT PAS arriver est appliqué par hooks/CI (cf. ADR-0002). -->

@docs/adr/README.md

## Projet

CMS sur-mesure open source pour sites vitrine, hébergé sur le free tier Cloudflare. **Site public statique (Astro SSG)** + **admin SSR sur Cloudflare Workers** (@astrojs/cloudflare + îlots React). Données **D1/R2/KV en bindings directs** (pas d'API REST).

Modèle **centré page** : une page est une instance de **gabarit**, faite de **zones typées** (texte, texte riche, image, galerie/carrousel, vidéo, CTA, **répéteur**). L'éditrice remplit les zones, ne restructure pas les pages. Un **constructeur de formulaires** (générique, borné) lui permet de composer des formulaires (dont un devis à total indicatif) acheminés par e-mail.

**Frontière cœur / client** : le **cœur** est packagé et versionné (SemVer, open source) ; chaque **site client** est un projet privé qui l'épingle et fournit ses gabarits via le **contrat de gabarit**. Une instance = un client. Le sur-mesure vit dans le projet client, jamais dans le cœur.

Chaîne documentaire : [brief](docs/brief.md) → [PRD](docs/prd.md) → [stack](docs/stack.md) → [ADR](docs/adr/README.md) → ce fichier.

## Chantier en cours — remédiation de l'audit de sécurité

Un [audit de sécurité du socle documentaire](docs/audit-securite-2026-08-01.md) (2026-08-01) a ouvert **54 constats** de conception. Aucun ne porte sur du code : il n'en existe pas encore hors `tooling/`. Tous se corrigent par **amendement documentaire**, et leur remédiation est le chantier ouvert du dépôt.

- **Le plan** — [docs/suites-audit-securite.md](docs/suites-audit-securite.md) : 11 lots, un par document cible, avec la matrice de traçabilité des 54 constats et les règles de forme des amendements. **Le lire avant de toucher un ADR.** Document temporaire, supprimé par le lot L9.
- **Le suivi par constat** — le tableau de la section `## Suivi` de l'audit. Un constat ne passe `Traité` que si sa règle vit dans un `## Constraints` **et** que le hook ou le check CI existe ; sinon `En cours`.
- **Où en est-on** — tableau d'avancement en tête du plan. **L1 est fait** (PRD, `FR-100` → `FR-110`) ; le lot suivant est **L2**, la création d'ADR-0011 « Frontières de contenu hostile ».

Deux faits qui ne se dérivent d'aucun fichier : le **stash unique du dépôt est écarté** (il précède la réécriture documentaire du 2026-08-01 et son candidat « ADR-0010 » entre en collision avec l'ADR-0010 accepté) — **`ADR-0011` est donc libre** ; et `0009` reste réservé par `docs/adr/_candidates/`.

## Comment travailler ici

- **Avant d'implémenter** : en Plan Mode, lire les ADR du `scope` concerné (`docs/adr/`). Signaler tout conflit avec un ADR **accepté** au lieu de le contourner.
- **Nouveau patron structurant** → rédiger un ADR *proposed* (`docs/adr/`) soumis à approbation **avant** d'écrire du code, dans la **même PR**.
- **Séquence par tranche** : schéma Zod (humain) → test rouge (humain) → implémentation (toi) jusqu'au vert.
- Donner un moyen de vérifier ton travail : lancer tests + lint avant de marquer « terminé ».

## Contraintes actives (impératif) — source : ADR, appliquées par hooks/CI

**Architecture (ADR-0004)**
- Aucun import de `cloudflare*` (hors types) dans `@colibri/core` ; aucun import de `apps/*` dans `@colibri/db` ni `@colibri/core`.
- Aucun gabarit/thème/code spécifique client dans le **cœur** ; un client déclare ses gabarits via le **contrat de gabarit**, jamais en éditant le cœur.
- Toute lecture partagée site+admin vit dans `@colibri/db` ; jamais de SQL de lecture dans `apps/*`.
- Tout endpoint d'écriture via `writeHandler({ auth: 'access' | 'public' })` ; une route **publique** vérifie **Turnstile**.
- Deux schémas Zod par surface (`xxxRow` sortie D1, `xxxInput` entrée) ; la validation d'une valeur de zone dérive du descripteur de gabarit.
- Verrou optimiste via `createRepository` uniquement.
- Seams **JWKS, mailer, Turnstile** injectables dès le code de prod.
- `ContentTypeDescriptor` reste **dormant** (non consommé en V1).

**Socle (ADR-0003)**
- Versions via `catalog:` pnpm ; ne pas mélanger les majeures Astro/adaptateur.
- Pas de `@astrojs/tailwind` ni `tailwind.config.js` (Tailwind 4 = `@tailwindcss/vite`).
- `nodejs_compat` + `compatibility_date` fixés dans `apps/admin/wrangler.jsonc`, ainsi que `workers_dev: false` et `preview_urls: false` — Access protège un **nom d'hôte**, pas un Worker ; l'une de ces surfaces ouverte contourne `FR-001`.
- Auth par middleware Astro, pas de routage `src/fetch.ts` (bug #17181).
- `sharp` : `apps/site` uniquement, build-only ; réduction d'image à l'entrée **dans le navigateur**, jamais dans le Worker.
- Jamais `image/heic` dans un attribut `accept`. Boucle de Cron Trigger idempotente (aucun réessai plateforme).

**Contenu — brouillon/publié (ADR-0010)**
- Toute table de valeur de contenu porte `state ∈ ('draft','live')` dans sa clé primaire.
- **Jamais** lire une ligne `state='draft'` depuis le build du site public — c'est le pire bug possible du produit.
- Deux fonctions de lecture distinctes et typées dans `@colibri/db` ; jamais une fonction générique paramétrée par l'état.
- Écrire dans `state='live'` uniquement depuis l'opération de publication ; recopie atomique (un `batch()` D1) **avant** le Deploy Hook, verrou et zones obligatoires vérifiés d'abord.
- Une référence (page, formulaire, média) est un identifiant, jamais une copie du contenu.
- Rien de rendu au visiteur ne vit hors des deux contenus — en particulier, pas de `media.alt`.
- Les états de `FR-019` sont dérivés de `publications` ; aucune colonne d'état de publication sur `pages` ou `forms`.
- Un champ de formulaire est désigné par une clé naturelle stable (`field_key`), jamais par un id de substitution.

**Formulaires (ADR-0007)**
- Soumission = `writeHandler({auth:'public'})` + vérif Turnstile avant tout traitement.
- Valider toute soumission contre la définition `state='live'` ; **recalculer** le total côté serveur, jamais le reprendre de la requête.
- Ne jamais conserver une soumission au-delà de son acheminement **réussi** — une demande livrée n'entre jamais dans la corbeille de `FR-064`, qui ne contient que les **échecs**.
- La corbeille offre trois gestes et rien d'autre : consulter, relancer, effacer. Jamais de recherche, filtre, tri, export ni statut « traité » ; son expiration est **inconditionnelle**.
- Un champ `number` porte un **maximum** obligatoire ; adresse de destination **confirmée** avant publication.
- Une soumission produit **un seul** message, vers une **adresse de destination vérifiée du compte** ; jamais d'envoi au visiteur ni de `Reply-To` vers lui (`FR-095` hors v1).
- Montants en centimes entiers ; total = somme pure (`@colibri/core`), aucune règle conditionnelle en V1.
- Aucun code tiers chargé avant une action explicite du visiteur (vaut pour Turnstile et le lecteur vidéo).

**Flotte (ADR-0008)**
- Aucun code spécifique client dans le cœur ; ne pas forker le cœur (épinglage de version).
- Une rupture de migration ou de contrat de gabarit → **majeure** SemVer.
- Migrations D1 : versionnées, ordonnées, appliquées par étape outillée **après sauvegarde + vérification** ; jamais en automatique au déploiement.

**Test (ADR-0005)**
- Intégration dans workerd avec vrais bindings locaux ; ne pas sur-mocker D1/R2/KV.
- 100 % des endpoints d'écriture testés pour l'autorisation ; route publique testée pour Turnstile.
- Cible nommée : **aucune fuite de brouillon** (le build ne sert jamais `state='draft'`), soumission forgée rejetée, recalcul du total, refus d'écrasement concurrent.
- Ne jamais déclencher le vrai Deploy Hook ni envoyer un vrai e-mail en test (mockés).
- Ne pas terminer une migration D1 par un commentaire (#7739).

**Génération IA (ADR-0006)**
- Ne pas éditer : `tests/`, `migrations/`, `**/schema/`, la config des frontières, le seam d'auth.
- Ne pas lancer `--update`/`-u` sur les goldens.
- Ne pas viser un pourcentage de couverture-ligne.

## Pièges d'outillage constatés

- **Deux jeux de `FR-xxx` cohabitent.** `specs/001-ci-quality-gate/` utilise sa propre numérotation `FR-001…FR-030`, **locale à la feature et sans aucun rapport** avec les `FR-xxx` du PRD, qui vont jusqu'à `FR-099`. Les deux se recouvrent sur la plage 001–030 : toujours qualifier de quel jeu on parle.
- **Le contrôle `lint-format` du portail qualité ne couvre que `.ts` / `.tsx`.** Le Markdown est hors périmètre : `brief.md`, `prd.md` et `stack.md` ne sont pas conformes à Prettier et **n'ont pas à l'être** — ne pas les reformater.
- **Le hook `golden-lock` refuse toute commande shell contenant `-u` ou `--update`**, y compris un `sort -u` inoffensif. Contourner avec `sort | uniq`.
- **`pnpm gate` ne s'exécute pas tel quel dans un shell non interactif** : pnpm veut purger `node_modules` et exige un TTY (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Forcer avec `CI=true` **supprime le répertoire d'installation** — à ne pas faire à la légère.

## Style
- TypeScript `strict`, indentation 2 espaces, ESM.
- Français pour les commentaires de décision et la doc ; anglais toléré pour le code.

## Agent skills

### Issue tracker

Le suivi est la chaîne `/scd-sdd` : `specs/NNN-slug/{spec,plan,tasks}.md` (un lot `Rn` ≈ un ticket ≈ une PR) + `docs/JOURNAL.md` pour les événements. Pas de `.scratch/`. Voir [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

Les cinq rôles canoniques de triage — applicables uniquement aux demandes hors chaîne ouvertes en GitHub Issue. Voir [docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Mono-contexte : `CONTEXT.md` à la racine + `docs/adr/`. Voir [docs/agents/domain.md](docs/agents/domain.md).

<!-- Si deux règles se contredisent, le corriger ici plutôt que de laisser l'agent trancher au hasard.
     Diagnostiquer le contexte chargé avec /memory et /context. -->
