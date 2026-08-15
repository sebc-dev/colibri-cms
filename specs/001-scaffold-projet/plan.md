# Plan technique : Scaffold du projet
Trace vers : [spec.md](./spec.md) · [docs/stack.md](../../docs/stack.md) ·
[docs/archi.md](../../docs/archi.md) · [docs/ci.md](../../docs/ci.md) · [docs/adr/](../../docs/adr/)

> **Les faits de plateforme de ce plan ont été mesurés le 2026-08-15**, sur un dépôt jetable
> (`$CLAUDE_JOB_DIR/tmp/probe`), avec `npm 11.16.0` / Node 24 et le gel de sept jours actif.
> Chaque mesure est citée à l'endroit où elle décide. Une mesure non citée ne décide rien.

## Approche

Le dépôt reçoit un scaffold **minimal et complet** : les **sept** commandes que `docs/ci.md`
déclare normatives deviennent réelles et la **huitième** — le graphe d'imports, qu'il laisse « non
posée » — est posée, les cinq zones de `docs/archi.md` naissent avec un fichier source chacune, et
le sens des imports devient vérifiable par la chaîne ESLint que `docs/ci.md` a déjà désignée. La
garde de scaffold des jobs CI se lève **d'elle-même** — elle teste `-f package.json` —, donc aucun
workflow n'est à réécrire.

Deux points sont tenus par une mesure et non par une intention. **Un** : le serveur de
développement et les migrations partagent le même état local (`.wrangler/state/v3/d1`), si bien
qu'une seule commande de run donne l'accès à la base que `FR-013` vient de migrer. **Deux** : la
route qui le prouve est **injectée en développement seulement** — elle n'entre pas dans l'artefact
bâti (`FR-024`), ce qui garde vraie la frontière « aucune route servie par l'artefact bâti » du lot
et n'entame ni `FR-096` ni `FR-097` du PRD.

## Réutilisation du socle

**Stack imposée — appliquée, jamais re-choisie.** TypeScript strict ([ADR-0010](../../docs/adr/0010-langage-typescript-strict.md)) ·
Astro 7 ([ADR-0002](../../docs/adr/0002-generateur-astro-7.md)) · Worker unique bâti par Workers
Builds ([ADR-0001](../../docs/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md)) ·
D1 et migrations `wrangler d1 migrations`, sans couche intermédiaire
([ADR-0018](../../docs/adr/0018-acces-aux-donnees-api-d1-native-et-migrations-wrangler.md)) ·
Vitest dans `workerd` ([ADR-0013](../../docs/adr/0013-tests-vitest-dans-workerd.md)) ·
`npm`, `min-release-age=7` ([ADR-0031](../../docs/adr/0031-gestionnaire-de-paquets-npm.md)) ·
variantes d'images au build, `constrained` + `[640, 960, 1280]`
([ADR-0019](../../docs/adr/0019-pipeline-d-images-variantes-au-build.md)) ·
`instance.json` à la racine ([ADR-0028](../../docs/adr/0028-valeurs-d-instance-dans-le-fichier-d-instance.md)).
Les **noms de commandes** viennent de `docs/ci.md` § Commandes du projet et ne se renégocient pas ici.

**Invariants d'architecture confrontés, fichier par fichier.** **Trois** sont **hors portée** faute
des fichiers qu'ils nomment (`I6`, `I7`, `I9`), et **sept** sont exercés : `I1` par la chaîne ESLint
que ce lot pose, `I2`, `I3`, `I4` et `I5` par `arch-invariants` déjà en place, `I8` par le placement
des valeurs, `I10` par la lecture d'`instance.json` dans `astro.config.ts` (§ ci-dessous). Ce partage
sept/trois **est** celui que `SC-010` énonce, et il n'y a pas d'autre lecture à en faire.

**Pourquoi sept et non cinq : c'est le plancher qui décide, et le mécanisme est littéral.** Les
gardes du script testent `git ls-files` — `exists 'src/render/*'`, `exists 'src/admin/*'` —, et
`FR-009` fait porter à chacune des cinq zones un fichier source versionné. `I3` et `I4` **sortent**
donc de « hors portée » du seul fait du plancher, **avant toute matière à examiner** : personne
n'importe `src/render/`, aucun fichier `.astro` ne vit sous `src/admin/`. Leur vert n'atteste rien
aujourd'hui — l'encadré d'`US2` le qualifie, et `SC-010` compte l'**état rapporté**, jamais la valeur
du constat. Ce plan n'a donc pas à les faire tenir : il a à **ne pas les casser**, ce que tiennent la
première confrontation ci-dessous (`src/render/` reste inatteignable) et le choix de n'écrire aucun
`.astro` sous `src/admin/`.

Quatre confrontations méritent d'être écrites, et elles se lisent dans cet ordre : la **première a
changé le découpage** plutôt que de produire une dérogation, la deuxième dit **où l'invariant mord
sur un fichier que ce lot pose lui-même** — c'est la contrainte que `FR-026` érige en exigence —,
la troisième a changé le découpage elle aussi, la quatrième dit **où un invariant ne mord pas**, et
ce qui tient à sa place. Aucune des quatre n'est une dérogation :

- **`I3` interdit au plancher de zone d'être un graphe complet.** `src/render/index.ts` est le seul
  chemin de `src/render/` atteignable de l'extérieur, et ce lot ne le pose pas (frontière de la
  spec). Donc `src/site/` et `src/admin/` **n'importent pas** `src/render/` : le plancher exerce
  les cinq arêtes qui restent légales sans le baril (`site→core`, `admin→core`, `admin→platform`,
  `render→core`, `platform→core`), et laisse les deux autres à la feature qui posera le baril.
  Le contrôle d'`I3` étant désormais **actif** — c'est le plancher qui l'a réveillé —, un import
  `site → src/render/zone.ts` ne serait plus une inélégance mais une **violation rapportée**.
- **Ce même réveil met `I3` en travers de la configuration de zones que ce lot pose.** Son contrôle
  est un **grep littéral** : il cherche la chaîne `src/render/` **suivie d'au moins un caractère**,
  entre guillemets, dans tout fichier versionné d'extension source (`.ts`, `.js`, `.astro`,
  `.svelte`…) hors de `src/render/` — et `eslint.config.boundaries.js`, qui déclare les cinq zones
  par motif de chemin, en est un. **La contrainte que ce lot tient est donc générale, et elle se lit
  dans les sources : aucun fichier hors `src/render/` ne porte la chaîne littérale `src/render/`
  suivie de quelque chose** — c'est le texte même de `FR-026`, qui l'érige en exigence plutôt que de
  la laisser au rang d'intention de plan. Elle vaut pour `src/core/zone.ts` — les cinq noms y sont
  des identifiants nus — comme pour `eslint.config.boundaries.js`, dont les motifs se déclarent
  **sans barre finale** (`'src/render'`). La forme exacte, sa mesure et le piège de la forme voisine
  sont au point 10. Ce n'est pas une dérogation : le contrôle reste tel quel, c'est le lot qui s'y
  plie.
- **La sonde de développement ne crée pas de sixième répertoire sous `src/`.** Elle vit dans
  `src/platform/d1/sonde-dev.ts` — lire D1 est le métier de `platform/` —, et non dans un `src/dev/`
  qu'aucune zone ne couvrirait et que `boundaries` ne saurait pas classer.
- **`I6` ne la couvre pas, et c'est `FR-024` qui rend ce trou soutenable.** La trace observable
  d'`I6` est un fichier de route sous `src/pages/api/` ou `src/pages/admin/` ; injectée depuis
  `src/platform/`, la sonde n'y est pas, donc elle ne porte **aucun garde de session** et aucun
  contrôle ne le lui reproche. Ce qui tient l'intention d'`I6` ici n'est donc pas le garde, c'est
  l'**absence** : la route n'existe qu'en développement et ne part pas dans l'artefact (`FR-024`).
  D'où la vérification dédiée à l'étape 6 ci-dessous — sans elle, cette ligne serait une intention.

**Ce que `I10` demande, et où il s'arrête.** L'invariant exigeait que `wrangler.*` lise aussi
`instance.json` « au moment où [elle] s'évalue, sans outil intermédiaire ». **Mesuré le 2026-08-15**
sur `wrangler@4.120.0` : un `wrangler.ts` évalué n'est pas une configuration —
`✘ [ERROR] No configuration file found. Create a wrangler.jsonc file to define your D1 database.`
Seul du JSON/TOML **statique** est accepté, et un fichier statique ne lit rien. Le candidat déposé
par ce plan a été promu le 2026-08-15 en
[ADR-0032](../../docs/adr/0032-invariant-i10-restreint-a-la-configuration-astro.md), qui
**remplace** [ADR-0030](../../docs/adr/0030-configurations-lisent-le-fichier-d-instance.md) et sort
la configuration du déploiement du périmètre de `I10`. Ce lot livre donc un `wrangler.jsonc`
statique **sans aucune valeur d'instance** (`FR-022`), et le contrôle `I10` de `arch-invariants` —
qui ne balaie plus que `astro.config.*` — **passe**. Il n'y a plus de dérogation à porter.
**Ce plan n'a modifié ni `docs/archi.md`, ni aucun ADR** : la promotion du candidat est le fait de
`/scd-sdd:adr`.

## Fichiers touchés

> **Le dépôt ne porte aucune source : ce lot *pose* les patrons.** Là où un patron existe, il est
> nommé ; là où il n'en existe pas, la convention à tenir est écrite — c'est elle que les features
> suivantes reprendront.

### Outillage et configuration (racine)

| Fichier | Ce qu'il porte | Patron / convention |
|---|---|---|
| `package.json` | les huit scripts que ce lot pose — les sept commandes normatives de `docs/ci.md` et le graphe d'imports — plus `dev` et `db:migrate` ; dépendances | noms de scripts **repris à la lettre** de `docs/ci.md` § Commandes |
| `package-lock.json` | versions figées | `npm ci` seul, jamais `npm install` (`docs/ci.md`) |
| `.npmrc` | `min-release-age=7` — la **déclaration** qu'exige `FR-027`, à l'endroit même où `dependency-review` la lit | bloc exact de `docs/ci.md` § Approvisionnement |
| `tsconfig.json` | `extends: astro/tsconfigs/strict`, `strict: true` | [ADR-0010](../../docs/adr/0010-langage-typescript-strict.md) |
| `astro.config.ts` | adaptateur Cloudflare (`platformProxy`), `image` d'[ADR-0019](../../docs/adr/0019-pipeline-d-images-variantes-au-build.md), **lecture d'`instance.json`**, intégration de sonde dev-only | porteur unique d'`I10` (`ADR-0032`) |
| `wrangler.jsonc` | `name`, `compatibility_date`, liaison D1 **sans `database_id`**, `migrations_dir` | `FR-016` ; aucune valeur d'instance (`FR-022`) |
| `instance.json` | `domain`, `turnstilePublicKey` — valeurs d'exemple | contrat d'E/S de la spec ; `I8` |
| `eslint.config.js` | style + TypeScript (job `lint`) | — |
| `eslint.config.boundaries.js` | **la matrice `I1` seule** (job `boundaries`) ; zones déclarées **sans barre finale** (`'src/render'`), contrainte d'`I3` — `FR-026`, point 10 | nom choisi pour matcher le glob `eslint.config.*` de `quality-config-guard` — un `eslint.boundaries.config.js` y échapperait |
| `vitest.config.ts` | `defineWorkersConfig`, couverture → `coverage/lcov.info` | [ADR-0013](../../docs/adr/0013-tests-vitest-dans-workerd.md) |
| `knip.json` · `stryker.conf.json` | jobs nocturnes `dead-code` et `mutation` | `.github/workflows/nightly.yml` |

### Sources — le plancher des cinq zones (`FR-009`)

Un fichier par zone, chacun important **vers le bas** pour exercer la matrice d'`I1` :

- `src/core/zone.ts` — le type `Zone` et la liste des cinq zones. N'importe **rien** (`I1`, `I2`).
  Les cinq noms y sont des **identifiants nus** (`'render'`), jamais des chemins (`'src/render/'`) :
  c'est ici l'application de la contrainte générale d'`I3` écrite plus haut, et ce fichier n'en est
  pas le seul porteur — `eslint.config.boundaries.js` la subit aussi, et plus durement.
- `src/render/zone.ts` — importe `src/core/`. **Pas** `index.ts` : ce nom est réservé au baril d'`I3`.
- `src/platform/zone.ts` — importe `src/core/`.
- `src/platform/d1/sonde-dev.ts` — la route de sonde, injectée en développement seulement.
- `src/site/zone.ts` — importe `src/core/`.
- `src/admin/zone.ts` — importe `src/core/` et `src/platform/`. **`.ts` et non `.astro`** : le
  contrôle d'`I4` ne balaie que `src/admin/*.astro`, et ce lot n'a aucun gabarit à y poser.

### Migrations et vérification

- `migrations/0001_amorce.sql` — migration **sans effet de schéma** (`FR-021`).
- `scripts/verif-bout-en-bout.sh` — l'étape unique, ci-dessous. Patron : `.github/scripts/arch-invariants.sh`
  (`set -uo pipefail`, un état par contrôle, le commentaire dit le *pourquoi*). **Écrit par les deux
  lots**, chaque étape naissant dans la section de tâches dont elle constate le résultat : `R1`
  porte les étapes 1 à 5, `R2` ajoute la 6ᵉ.
- `docs/preuves/` — répertoire **ouvert par ce lot**, domicile des pièces datées. Il en reçoit une
  seule ici, celle de `SC-009` (`AAAA-MM-JJ-gel-sept-jours.md`).
- `docs/ci.md` — **quatre gestes, dans trois endroits**, et le décompte n'est pas cosmétique : le
  premier bloc en demande deux, dont un qui se rate facilement.
  **(a)** § Commandes du projet : le tableau **ne porte aucune ligne « Run local »** — il n'y a
  donc pas de case à remplir, il faut **créer la ligne**, portant `npm run dev`. Et le paragraphe
  placé juste sous le tableau — « **Aucune commande de run local n'existe** […] Elle se pose au
  scaffold, dans ce tableau » — devient faux à l'instant où cette ligne existe : il se **retire
  dans le même geste**. Poser la ligne sans lui laisserait une négation en gras deux lignes sous
  ce qu'elle nie.
  **(b)** La ligne du job `boundaries` perd son `[à compléter]` **pour la matrice d'`I1` seule** et
  le garde, dit comme tel, pour le reliquat d'`I3` que ce lot ne pose pas — ré-exports, barils,
  alias (`FR-025`). Deux endroits portent cette même affirmation et se corrigent ensemble :
  § Commandes du projet, ligne « Graphe d'imports (invariants `I1`, `I3`) », et § Registre des ADR
  vérifiés en CI, ligne `ADR-0021`, dont la colonne « Non rendu » cesse d'être vraie dès que
  `lint:boundaries` existe. La ligne du § Contrôles, elle, **distingue déjà** `I1` du reliquat
  d'`I3` : rien à y changer. Sans cette seconde édition, le document laisserait croire la case
  close quand elle ne l'est qu'à moitié.

**Aucun fichier de `.github/` n'est touché.** La garde de scaffold se lève seule (`FR-008`) : chaque
job teste `-f package.json` et exécute la vérification réelle dès qu'il existe.

## Contrats d'interface

**Scripts npm** — la colonne de gauche est celle de `docs/ci.md`, caractère pour caractère :

| Script | Commande | Ce qu'il rend |
|---|---|---|
| `build` | `astro build` | `dist/` ; `0` sans identifiant Cloudflare (`FR-017`) |
| `typecheck` | `tsc --noEmit` | non nul sur incohérence de type (`FR-003`) |
| `test` | `vitest run --passWithNoTests` | `0` à vide (`FR-004`) |
| `coverage` | `vitest run --coverage --passWithNoTests` | `coverage/lcov.info`, vide (`FR-006`) |
| `lint` | `eslint .` | diagnostics, aucun fichier modifié (`FR-005`) |
| `lint:boundaries` | `eslint --config eslint.config.boundaries.js .` | violations d'`I1` (`FR-010`) |
| `knip` | `knip` | code mort ; exécutable sans `mutation` (`FR-007`) |
| `mutation` | `stryker run` | refus tant qu'aucun test n'a tourné ; exécutable sans `knip` (`FR-023`) |
| `dev` | `astro dev` | serveur HTTP local, liaisons branchées (`FR-012`) |
| `db:migrate` | `wrangler d1 migrations apply DB --local` | migrations en attente (`FR-013`) |

**`instance.json`** — le schéma de la spec, inchangé. `domain` est lu par `astro.config.ts` seul.

**`wrangler.jsonc`** — `d1_databases: [{ binding: "DB", database_name: "colibri", migrations_dir: "migrations" }]`,
**sans `database_id`**. *Mesuré* : `wrangler d1 migrations apply DB --local` s'exécute sans lui, et
l'adaptateur recopie la liaison telle quelle dans `dist/server/wrangler.json` en réécrivant les
chemins relatifs.

**Route de sonde** — `GET /_sonde` → `200`, `{"n": <entier>}`, le nombre de lignes de
`d1_migrations`. **Injectée par `injectRoute` uniquement quand `command === 'dev'`.** *Mesuré* :
elle répond `{"n":1}` en développement, et le build repasse à `0 page(s)` / 3 fichiers — elle est
**absente de l'artefact**. `FR-024` fait de cette absence une exigence et non un effet de bord :
la forme falsifiable retenue est **la double absence dans `dist/`** — aucun fichier d'entrée serveur
(`dist/server/entry.mjs`), et aucune occurrence de la chaîne `_sonde`. C'est ce que l'étape 6
vérifie, et c'est ce qui distingue ce plan de l'alternative écartée au point 4.

**Migrations** — `migrations/NNNN_nom.sql`, ordre numéroté. *Mesuré* : après `0001_amorce.sql`
(`SELECT 1;`), `sqlite_master` ne porte que `d1_migrations`, `sqlite_sequence` et `_cf_METADATA` —
c'est l'énoncé exact que `FR-021` et `SC-007` vérifient, et la seconde application répond
`✅ No migrations to apply!`.

## Décisions & alternatives écartées

**1. TypeScript est épinglé en `6.0.3`, pas en `latest` — et le plafond est déposé en candidat
ADR.** [officiel · cité] registre npm, lu le 2026-08-15 : `typescript@7.0.2` est la version
courante, mais `typescript-eslint@8.66.0` pose `typescript >=4.8.4 <6.1.0` et
`@astrojs/svelte@9.0.1` pose `^5.3.3 || ^6.0.0`. Prendre TS 7 **tuerait la chaîne ESLint** — donc
`boundaries`, donc la seule vérification d'`I1`. C'est le second des deux murs qui avaient déjà
écarté dependency-cruiser (`docs/ci.md`). `6.0.3` (2026-04-16) est la dernière 6.x.
**Ce plafond ne peut pas rester ici** : `FR-105` et `SC-008` le font porter par **toute la flotte**,
et une contrainte écrite dans le plan d'une feature n'est lue par personne au moment où elle mord —
la feature suivante qui monte TypeScript ne croiserait rien qui l'en empêche. Il est donc déposé en
[candidat ADR](../../docs/adr/_candidates/typescript-plafonne-a-la-branche-6.md), avec sa condition
de révision : le jour où `typescript-eslint` élargit son pair à TS 7.
Écarté : **suivre `latest`** — le contrôle qui tient `ADR-0021` s'éteindrait en silence.

**2. Le serveur de développement est `astro dev`, pas `wrangler dev`.** `FR-012` exige **une**
commande qui donne à la fois le HTTP et la base migrée. *Mesuré* : `astro dev` avec
`platformProxy: { enabled: true }` sert une route qui lit la base locale — `{"n":1}` —, sur l'état
même que `wrangler d1 migrations apply --local` vient d'écrire. Écarté : **`wrangler dev`** — il
exige un build préalable, donc deux commandes et un artefact intermédiaire à chaque itération.
*À savoir : `astro dev` **démarre en arrière-plan** (`astro dev stop` / `status` / `logs`) ; la
vérification bout-en-bout doit l'arrêter explicitement.*

**3. L'accès aux liaisons passe par `import { env } from 'cloudflare:workers'`.** *Mesuré* :
`Astro.locals.runtime.env has been removed in Astro v6. Use 'import { env } from "cloudflare:workers"' instead.`
Ce n'est pas un détail de ce lot — c'est la porte d'entrée de toute la plateforme, et `I2` la ferme
à `src/core/`. D'où le placement de la sonde dans `src/platform/`.

**4. La sonde est injectée en développement seulement.** Écarté : **une route sous
`src/pages/api/public/`** — elle satisferait `I6` (le sous-arbre public est exempt du garde de
session), mais *mesuré* : une route serveur sous `src/pages/` **entre dans l'artefact**
(`dist/server/entry.mjs`, 17 fichiers au lieu de 3). Le produit livrerait une route serveur
publique atteignable par un inconnu, contre `FR-097` — « l'envoi d'une demande DOIT être le seul
geste d'un visiteur déclenchant un traitement serveur ». Écarté aussi : **prouver le HTTP et la base
séparément** — `FR-012` et `SC-006` demandent une *route* qui lit la base, pas deux preuves à côté.

**5. Ni Svelte ni les greffons ESLint `.astro`/`.svelte` ne sont installés.** Ce lot ne pose aucun
fichier `.astro` ni `.svelte` : les installer maintenant, c'est de la dépendance morte que `knip`
signalera à juste titre. [ADR-0011](../../docs/adr/0011-ilots-svelte-5.md) reste la décision ; la
feature qui pose le premier îlot les ajoute, par un commit `chore(config):`. Écarté : **tout
installer d'avance** — le nocturne `dead-code` part en rouge dès le premier soir sans cause réelle.

**6. Deux fichiers de configuration ESLint, pas un.** `docs/ci.md` sépare `lint` (style, mode 2) de
`boundaries` (mode 5) précisément pour que le chantier de durcissement puisse promouvoir `I1` sans
promouvoir le style. Un fichier unique rendrait cette séparation impossible. Le nom
`eslint.config.boundaries.js` est choisi pour rester **sous le glob `eslint.config.*` de
`quality-config-guard`** : autrement, le fichier qui porte `I1` serait modifiable en silence.

**7. Aucun alias `tsconfig paths`.** Les imports du plancher sont relatifs. Écarté : **des alias
`@core/*`** — le résolveur les gère (`docs/ci.md`), mais ils ajoutent une convention que rien
n'oblige aujourd'hui, et un chemin relatif se lit tel quel dans un diff.

**8. Le typage ne couvre pas `.astro` ni `.svelte`, et c'est assumé.** `docs/ci.md` fixe
`typecheck` = `tsc --noEmit` ; `tsc` ignore ces extensions. Le trou est **théorique dans ce lot**
(aucun fichier de ce type) et devient réel avec le premier gabarit. Le refermer supposerait
`astro check`, donc une divergence d'avec `docs/ci.md` : c'est une reprise de ce document, pas une
décision de plan.

**9. Une gêne d'approvisionnement à connaître.** *Mesuré* : `npm 11.16.0` **n'exécute plus les
scripts d'installation par défaut** — `npm warn allow-scripts … workerd … esbuild … Run npm
approve-scripts`. Les deux paquets concernés fonctionnent quand même ici (leurs binaires viennent de
paquets de plateforme), et le build comme le serveur de développement ont tourné sans rien
approuver. Mais une dépendance future dont le `postinstall` est vital s'installerait **muette et
cassée en CI**. À vérifier au premier ajout de dépendance, pas à traiter ici.

**10. Les cinq zones se déclarent par un motif sans barre finale — `'src/render'`, jamais
`'src/render/*'`.** C'est `I3` qui l'impose et non le greffon : son contrôle cherche la chaîne
`src/render/` suivie d'au moins un caractère, et la configuration qui déclare les zones est un
fichier `.js` versionné hors de `src/render/`. **Mesuré le 2026-08-15** en rejouant le contrôle
d'`arch-invariants.sh` sur un arbre à cinq zones : `'src/render/*'` et `'src/render/**'` sont
rapportés en violation — donc **sortie à `1`**, donc l'étape 3, `SC-010` et l'issue de `R2`
tombent —, quand `'src/render'` n'est même pas apparié. Et la forme sans barre **vérifie
réellement** : **mesuré** sur `eslint-plugin-boundaries@7.2.0` (la version de `docs/ci.md`) branché
sur `@typescript-eslint/parser`, elle classe les neuf fichiers de l'arbre — zéro
`boundaries/no-unknown-files` —, y compris le fichier imbriqué `src/platform/d1/sonde-dev.ts`, et
rapporte les trois violations injectées (`core→platform`, `site→admin`, `platform/d1→admin`).

Écarté : **retirer le préfixe `src/`** — `'render/*'`, qui est la forme des exemples du greffon.
Elle passe le grep d'`I3`, et c'est précisément le piège : **mesuré** sur le même arbre et les mêmes
défauts, elle **ne classe rien** — `boundaries/no-unknown-files` signale sept des neuf fichiers — et
rapporte **zéro** violation là où la forme retenue en rapporte trois. Le job `boundaries` sortirait vert en n'ayant rien vérifié — un contrôle qui ne
vérifie plus rien, sans qu'aucun écran ne change. Ce qui l'attrape n'est pas l'étape 3 mais
l'**étape 4**, qui exige qu'un import `src/core/ → src/platform/` soit *signalé* : les deux étapes
ferment la question par les deux bouts, la 3 sur la lettre du fichier, la 4 sur ce qu'il fait.
Écarté aussi : **relâcher le contrôle `I3`** pour laisser passer la configuration — il vit dans
`.github/scripts/arch-invariants.sh`, que ce lot ne touche pas (`FR-008`, `FR-011`), et affaiblir un
vérificateur pour faire entrer un fichier est le mode 2 de la grille de `docs/ci.md`.

**Contrainte de livraison, à ne pas découvrir en PR.** Ce lot touche `eslint.config.*`,
`tsconfig.json`, `vitest.config.*`, `knip.*`, `stryker.conf.*`, `.npmrc` et les lignes de scripts de
`package.json` — tous surveillés par `quality-config-guard`. La PR **doit** porter le label
`config-change`, ou **chaque** commit qui y touche un scope `chore(config):`. Et `package-lock.json`
exige en plus `build(deps):` / `chore(deps):` ou le label `deps` (`dependency-review`).

## Étape de vérification bout-en-bout

Une seule commande, sur un dépôt propre :

```bash
bash scripts/verif-bout-en-bout.sh
```

**Le script naît avec les lots qu'il vérifie ; il n'est pas un lot à lui seul.** `R1` écrit les
étapes 1 à 5, chacune dans la section de tâches dont elle constate le résultat ; `R2` y ajoute
l'étape 6, qui est la sienne. C'est ce qui empêche qu'une même observation soit faite deux fois —
une fois à la main dans une tâche `Vérif`, une fois retranscrite dans un script écrit après coup.

Il enchaîne, et refuse au premier écart :

1. `npm ci` — puis `typecheck`, `build`, `test`, `coverage`, `lint`, `lint:boundaries` : **six codes
   de sortie nuls** (`SC-002`), `dist/` peuplé et `coverage/lcov.info` présent. `knip` et la
   commande de mutation sont lancées **à part** : l'étape constate qu'elles **s'exécutent et
   rapportent** (`FR-007`, `FR-023`), leur code de sortie ne décidant de rien — les deux cas limites
   de la spec disent pourquoi, et pourquoi les faire taire serait pire.
2. Le build est rejoué par `env -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_API_TOKEN` : `0` (`SC-008`).
3. `bash .github/scripts/arch-invariants.sh` : **code de sortie nul, aucune violation tolérée**, et
   sur les **dix invariants de la table** de `docs/archi.md`, `I2`, `I3`, `I4`, `I5`, `I8` et `I10`
   au vert, `I6`, `I7` et `I9` seuls hors portée. Avec `I1`, rendu à l'étape 1 par
   `lint:boundaries`, c'est le **sept/trois** de `SC-010` : la vérification compte les **états
   rapportés**, `I3` et `I4` passant faute de matière (§ Réutilisation du socle).
   ⚠️ **L'assertion porte sur ces dix-là, jamais sur la ligne de bilan du script.** Celui-ci rend
   aussi trois contrôles réclamés par des ADR, hors table : le plancher en réveille **deux**
   (`ADR-0015 (a)` sur `run_worker_first`, `ADR-0024` sur les directives CSP relâchées), qui passent
   sur ce lot, et laisse `ADR-0006` hors portée faute de `src/platform/session/`. Le bilan lira donc
   **8 au vert · 4 hors portée** — une assertion écrite sur « trois hors portée » échouerait à tort
   et ferait tomber l'issue de `R1`.
   L'étape attrape les deux sens : un `I3` ou un `I4` retombé « hors portée » dirait que le plancher
   de `FR-009` a été amputé ; un `I3` **rapporté en violation** dirait qu'un fichier du lot — au
   premier chef `eslint.config.boundaries.js` — porte un motif à barre finale (point 10), et c'est
   là que `FR-026` se vérifie. Elle s'exécute sur l'arbre qui porte cette configuration, sans quoi
   elle ne prouverait rien de ce qu'elle prétend prouver.
4. **Quatre** défauts injectés puis retirés, chacun devant être **signalé** : une incohérence de
   type (`SC-003`), un import `src/core/ → src/platform/` (`SC-004`, par `lint:boundaries`), un
   `import 'cloudflare:workers'` dans `src/core/` (`SC-005`, par `arch-invariants` — **un porteur
   distinct**, comme la spec l'exige), et une **violation de la règle de lint de style** (`FR-005`).
   Ce quatrième manquait, et son absence était un trou : sans lui, un `eslint.config.js` **sans une
   seule règle** satisfaisait l'étape 1 comme la tâche de vérif — exactement le mode de défaillance
   que le point 10 traque pour `boundaries`, sur l'autre configuration. L'arbre est rendu intact à
   la fin.
5. `npm run db:migrate` deux fois : la seconde répond `No migrations to apply!` ; le schéma obtenu
   ne porte **aucun objet du produit** — seules `d1_migrations`, plus `sqlite_sequence` et
   `_cf_METADATA`, qui sont du moteur et non du mécanisme de migration (`SC-007`, `FR-021` — c'est
   cette distinction que la spec porte désormais, une assertion écrite sur « les seules tables du
   mécanisme de migration » échouerait contre cette mesure).
6. *(écrite par `R2`)* `npm run dev`, puis `curl /_sonde` → `{"n":1}`, puis `astro dev stop`
   (`SC-006`) — **et, immédiatement après, la double absence dans le `dist/` de l'étape 1** : pas de
   `dist/server/entry.mjs`, aucune occurrence de `_sonde` sous `dist/` (`FR-024`, scénario 3
   d'`US3`). Les deux moitiés sont dans la même étape **à dessein** : « la route répond » et « la
   route n'est pas livrée » ne valent que constatées ensemble, sur le même arbre.

**`SC-009` n'entre pas dans ce script, et sa pièce a un domicile.** C'est une pièce datée, produite
une fois — elle démontre le **comportement** de `FR-019`, c'est-à-dire la résolution à l'**ajout**
d'une dépendance, jamais l'installation verrouillée. La recette est rejouée et tient : dans un
dossier neuf portant `min-release-age=7`, `npm install astro` résout **7.2.0** quand le registre
publie **7.2.2** depuis le 2026-08-13. La sortie est conservée dans
**`docs/preuves/AAAA-MM-JJ-gel-sept-jours.md`**, datée du jour où elle est produite. Le répertoire
n'existe pas encore : ce lot l'ouvre, et il devient le domicile des pièces que le socle réclame
sans jamais avoir dit où (`SC-011`, `SC-014` du PRD). La **déclaration** de `FR-027`, elle, n'a pas
besoin de ce script : `dependency-review` la lit en permanence dans `.npmrc`, à chaque PR.

## Couverture des exigences

Les **27** `FR` de la spec sont couverts, et par quoi :

| `FR` | Porté par |
|---|---|
| `FR-001` `FR-018` | `package.json` + `package-lock.json` ; étape 1 (installation), défaut de désynchronisation injecté |
| `FR-027` | `.npmrc`, la **déclaration** de `min-release-age=7` — c'est elle que le contrôle permanent `dependency-review` lit, et lui seul |
| `FR-019` | le **comportement** de résolution à l'**ajout** d'une dépendance ; pièce datée de `SC-009` dans `docs/preuves/`, hors script |
| `FR-002` `FR-017` | script `build` ; étapes 1 et 2 |
| `FR-003` | `tsconfig.json` + script `typecheck` ; défaut injecté, étape 4 |
| `FR-004` `FR-006` | `vitest.config.ts` + scripts `test` / `coverage` ; étape 1 |
| `FR-005` | `eslint.config.js` + script `lint` ; étape 1, **et défaut de lint injecté à l'étape 4** — sans lui, une configuration sans règle passait |
| `FR-007` `FR-023` | `knip.json` · `stryker.conf.json`, deux scripts distincts ; étape 1, qui constate qu'ils **s'exécutent et rapportent** — leur code de sortie est hors de `SC-002`, faute de test ayant tourné pour l'un, de point d'entrée pour l'autre |
| `FR-008` | aucun fichier de `.github/` touché — la garde teste `-f package.json` |
| `FR-009` | les cinq sources `src/*/zone.ts`, une par zone ; étape 3 |
| `FR-010` `FR-020` | `eslint.config.boundaries.js` + script `lint:boundaries` ; défaut injecté, étape 4 |
| `FR-011` | `arch-invariants.sh` **déjà en place** ; défaut injecté, étape 4 — porteur distinct |
| `FR-025` | `docs/ci.md`, édition (b) — la ligne du job `boundaries` distingue `I1` (refermé) du reliquat d'`I3` (`[à compléter]`) |
| `FR-026` | la contrainte générale d'`I3` — 2ᵉ confrontation et décision 10 : motifs de zone **sans barre finale** dans `eslint.config.boundaries.js`, identifiants nus dans `src/core/zone.ts` ; étape 3, qui attrape les deux sens |
| `FR-012` | script `dev` + `src/platform/d1/sonde-dev.ts` ; étape 6 |
| `FR-024` | injection conditionnée à `command === 'dev'` ; double absence dans `dist/`, étape 6 |
| `FR-013` `FR-014` `FR-021` | `migrations/0001_amorce.sql` + script `db:migrate` ; étape 5 |
| `FR-015` | `instance.json`, lu par `astro.config.ts` ; contrôle `I10`, étape 3 |
| `FR-016` `FR-022` | `wrangler.jsonc` statique, sans `database_id` ni valeur d'instance |

Deux lectures sont **fixées ici** pour qu'elles ne soient pas rouvertes en aval :

- **`SC-010` se lit sur les deux porteurs, et sur l'état rapporté.** `FR-010` confie `I1` à la
  commande de graphe d'imports et `FR-011` confie à `arch-invariants` les six autres exercés
  (`I2`, `I3`, `I4`, `I5`, `I8`, `I10`) ; « la vérification d'invariants d'architecture » de
  `SC-010` désigne donc l'ensemble des deux — `arch-invariants.sh` déclare `I1` « NON RENDU » et le
  renvoie explicitement à la chaîne ESLint que ce lot pose. Ce que le critère compte est l'**état**
  que chaque contrôle rapporte, jamais la valeur de ce qu'il a trouvé : `I3` et `I4` y entrent en
  passant faute de matière, et c'est l'encadré d'`US2` qui dit à quelle condition leur vert cessera
  d'être vide. Aucune tâche de ce lot n'a donc à leur fabriquer de la matière.
- **`I10` est exercé, et son résultat est vert.** « Ne pas se déclarer hors portée » est ce que
  `SC-010` demande, et `astro.config.ts` donne au contrôle de quoi lire. Depuis `ADR-0032`, il ne
  balaie plus que la configuration du site : ce qu'il exerce, ce lot le satisfait.
