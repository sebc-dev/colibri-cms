## Why

La recette globale du 2026-11-12 (`docs/cahier-de-test.md`, PR #350) a relevé deux situations que les
specs ne prévoient pas, et où l'éditrice attend sans fin quelque chose qui ne viendra pas.

- **Issue #354 — connexion.** L'adresse autorisée saisie avec une majuscule ne reçoit aucun code, et
  l'écran est le même que pour une demande réussie. Le clavier d'un téléphone met de lui-même une
  majuscule en tête de saisie quand il ne s'ouvre pas en disposition d'adresse (constaté le
  2026-11-13 sur Android). La spec dit la casse indifférente pour le code, elle ne dit rien pour
  l'adresse.
- **Issue #355 — publication.** Quand le dépôt du client refuse la publication de façon durable (clé
  expirée ou refusée, dépôt introuvable), l'écran invite à « réessayer dans quelques minutes » et le
  journal du serveur reste vide. Une clé de dépôt expire : ce jour-là l'éditrice réessaie
  indéfiniment, et la personne qui dépanne ne trouve aucune trace (constaté le 2026-11-15, CT-31.2).

Sert l'**Epic A — Entrer et éditer** (`docs/roadmap.md`) : corrige la story **001 — Connexion de
l'éditrice par code** (FR-001, FR-005, FR-008) et la story **011 — Aperçu et publication** (FR-090,
FR-091), sous **FR-117** (`docs/vision.md`).

## What Changes

- **L'adresse de connexion se reconnaît sans tenir compte des majuscules ni des espaces en bord de
  saisie.** Le code part alors à l'adresse autorisée telle qu'elle est enregistrée, jamais à la
  saisie. La réponse reste la même pour toute adresse, au même moment.
- **Le champ d'adresse de l'écran de connexion demande le clavier d'adresse e-mail**, comme le font
  déjà les champs téléphone, prix et lien. Le champ de l'écran « Adresse e-mail » reçoit la même
  indication.
- **Un refus durable de la publication se dit autrement qu'un échec passager.** Quand le dépôt refuse
  l'accès, reste introuvable ou n'est pas configuré, l'écran ne propose plus de réessayer : il dit
  que rien n'a changé et invite l'éditrice à prévenir la personne qui s'occupe de son site. Un échec
  passager garde le message actuel. La relance d'une mise en ligne suit la même règle.
- **Tout échec de dépôt laisse une ligne au journal du serveur** : l'étape (images, contenu, relance)
  et la nature du refus. La clé du dépôt n'y paraît jamais.

Aucun changement cassant. Aucune donnée nouvelle, aucune table nouvelle, aucun secret nouveau, aucune
route nouvelle.

Arbitrages rendus par l'humain le 2026-11-15 : un seul change pour les deux issues, deux tickets, une
PR par issue ; pour #355, le journal **et** le message distinct.

Hors périmètre : la consigne « la clé du dépôt a une date d'expiration à suivre » relève du dossier
d'instance remis à la livraison (SC-014), qui n'existe pas encore dans le dépôt ; elle reste notée
dans l'issue #355.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `connexion-par-code` : l'exigence « L'envoi d'un code à l'adresse autorisée » reconnaît l'adresse
  sans tenir compte de la casse ni des espaces en bord, expédie à l'adresse enregistrée, et le champ
  demande le clavier d'adresse e-mail.
- `publication` : l'exigence « Une publication qui échoue avant le dépôt ne change rien » distingue
  le refus durable de l'échec passager dans le message à l'éditrice ; une exigence nouvelle demande
  qu'un échec de dépôt soit consigné au journal.

## Impact

- Connexion : `src/platform/auth/magasin.ts` (reconnaissance de l'adresse), `src/pages/admin/connexion.astro`
  (adresse d'expédition, champ), `src/pages/admin/adresse-e-mail.astro` (champ).
- Publication : `src/platform/publication/publier.ts` (raison rendue, journal),
  `src/pages/admin/publication/suite.ts` et `relancer.ts` (raison transmise),
  `src/admin/ilots-svelte-5/EcranPublier.svelte` et `src/admin/textes.ts` (message).
- Tests `workerd` : `tests/integration/code-vers-adresse-autorisee.test.ts`,
  `tests/integration/publication-qui-echoue.test.ts` et voisins.
- Cahier de test : les cas CT-18.10 et CT-31.2 gagnent un attendu.
