# Issue tracker : la chaîne `/scd-sdd`

Ce dépôt n'a **pas** de tracker markdown ad hoc (`.scratch/`) et n'utilise pas les GitHub Issues pour le travail planifié. Le suivi vit dans la chaîne spec-driven `/scd-sdd`, sur trois niveaux :

| Niveau | Où | Produit par |
|---|---|---|
| **Socle** | `docs/brief.md`, `docs/prd.md`, `docs/stack.md`, `docs/adr/`, `CLAUDE.md` | `/scd-sdd:brief`, `prd`, `stack`, `adr`, `contract` |
| **Specs** (une par feature) | `specs/NNN-slug/spec.md`, `plan.md`, `tasks.md` | `/scd-sdd:kickoff-feature`, `specify`, `clarify`, `plan`, `tasks`, `analyze` |
| **Implémentation** | lots `Rn` de `tasks.md` → une branche + une PR par lot | `/scd-sdd:run`, `run-parallel`, `sync`, `reland` |
| **Événements** | `docs/JOURNAL.md` | consigné par chaque commande `/scd-sdd:*` |

L'unité de travail équivalente à un « ticket » est le **lot de review `Rn`** (≈ une PR reviewable d'un bloc) ; sa décomposition en tâches `Tn` (un critère observable = un commit) tient dans `specs/NNN-slug/tasks.md`.

## Ce qui est autoritatif

- **L'état** se **dérive des fichiers**, jamais d'une mémoire d'agent : cases `[ ]` / `[x]` des `Tn` et `Rn` dans `tasks.md`, présence des fichiers `spec.md` / `plan.md` / `tasks.md`, état des PR.
- **Les événements non dérivables** (verdict `analyze`, issue d'un lot, run bloqué) vivent dans `docs/JOURNAL.md`.
- Les tableaux de bord se lisent avec `/scd-sdd:status` (vue d'ensemble), `status-specs`, `status-impl` — jamais en reconstruisant l'état à la main.

## Quand un skill dit « publier dans l'issue tracker »

**Ne pas** créer de fichier `.scratch/`, ni d'issue GitHub. Selon la nature de ce qui doit être publié :

- **Une capacité / feature nouvelle** → elle entre par `/scd-sdd:kickoff-feature` puis `specify`. Un agent ne scaffolde pas `specs/NNN-*` à la main : il propose le contenu et signale que la commande doit être jouée.
- **Une exigence ou un critère manquant dans une feature existante** → c'est un **FR** ou un critère EARS de `specs/NNN-slug/spec.md`. Le chemin propre est `/scd-sdd:premortem` (durcissement adverse après la gate `analyze`), qui applique les remédiations documentaires après approbation humaine.
- **Un travail d'implémentation** → une tâche `Tn` dans le bon lot `Rn` de `tasks.md`, avec son backref `_Requirements:_`. Produit par `/scd-sdd:tasks`.
- **Une décision structurante** → un candidat dans `docs/adr/_candidates/`, promu en ADR par `/scd-sdd:adr`. Jamais un ADR écrit directement par un agent d'exploration.

## Quand un skill dit « récupérer le ticket concerné »

Lire, dans cet ordre :

1. `specs/NNN-slug/tasks.md` — le lot `Rn` visé : sa ligne `_Livre :_` (FR/SC couverts), sa ligne `Fichiers :`, son `_vérif :_` (mode de vérification), ses tâches `Tn`.
2. `specs/NNN-slug/spec.md` — les FR/SC référencés par le backref `_Requirements:_`, en notation EARS (une SHALL = une vérification observable).
3. `specs/NNN-slug/plan.md` — l'approche, les contrats, les fichiers touchés.
4. `docs/adr/` — les ADR du scope concerné (voir `docs/agents/domain.md`).

Si l'utilisateur ne précise pas la feature, la règle de résolution « quelle feature est en cours » du skill `scd-sdd:feature-specs` s'applique — ne pas deviner.

## Frontières d'écriture (impératif)

- **Ne jamais éditer `tasks.md`, `spec.md`, `plan.md` de façon opportuniste.** Ces fichiers sont le contrat ; ils sont produits par les commandes `/scd-sdd:*` et cochés par l'agent `progress-recorder`. Un agent d'exploration, de review ou de diagnostic **rapporte** un manque, il ne le corrige pas en douce.
- **`docs/JOURNAL.md` est append-only** et porte des **événements**, pas de l'état (contrat : skill `scd-sdd:journal`). Ne pas y écrire de synthèse ni de statut courant.
- Les chemins interdits à la génération IA restent ceux de `CLAUDE.md` / ADR-0006 : `tests/`, `migrations/`, `**/schema/`, la config des frontières, le seam d'auth. Des hooks `PreToolUse` les font respecter (`.claude/hooks/protect-paths.mjs`, `golden-lock.mjs`).

## Demandes hors chaîne

Une demande qui n'appartient pas encore à une feature (rapport de bug externe, idée non instruite) n'a **pas** de file d'attente dédiée dans ce dépôt. Deux issues, au choix de l'humain :

- l'instruire jusqu'à une feature via `/scd-sdd:kickoff-feature` ;
- l'ouvrir en **GitHub Issue** sur `sebc-dev/colibri-cms` (le remote existe, `gh` est authentifié) et la trier avec les rôles de `docs/agents/triage-labels.md`.

Tant qu'aucune issue GitHub n'existe, `/triage` n'a pas de file à traiter : c'est attendu, pas un défaut de configuration.

## Wayfinding

`/wayfinder` (map + tickets enfants + blocages) **ne s'applique pas** ici : son rôle — décomposer un effort flou en questions ordonnées — est déjà tenu par la chaîne `specify → clarify → plan → tasks → analyze`, avec ses gates et sa traçabilité. Ne pas créer de `map.md` parallèle à `specs/NNN-slug/`.
