# Plan technique : Scaffold du projet
Trace vers : [spec.md](./spec.md) · [docs/stack.md](../../docs/stack.md) ·
[docs/archi.md](../../docs/archi.md) · [docs/ci.md](../../docs/ci.md) · [docs/adr/](../../docs/adr/)

> **Les faits de plateforme de ce plan ont été mesurés le 2026-08-15**, sur un dépôt jetable
> (`$CLAUDE_JOB_DIR/tmp/probe`), avec `npm 11.16.0` / Node 24 et le gel de sept jours actif.
> Chaque mesure est citée à l'endroit où elle décide. Une mesure non citée ne décide rien.

## Approche

Le dépôt reçoit un scaffold **minimal et complet** : les huit commandes normatives de `docs/ci.md`
deviennent réelles, les cinq zones de `docs/archi.md` naissent avec un fichier source chacune, et
le sens des imports devient vérifiable par la chaîne ESLint que `docs/ci.md` a déjà désignée. La
garde de scaffold des jobs CI se lève **d'elle-même** — elle teste `-f package.json` —, donc aucun
workflow n'est à réécrire.

Deux points sont tenus par une mesure et non par une intention. **Un** : le serveur de
développement et les migrations partagent le même état local (`.wrangler/state/v3/d1`), si bien
qu'une seule commande de run donne l'accès à la base que `FR-013` vient de migrer. **Deux** : la
route qui le prouve est **injectée en développement seulement** — elle n'entre pas dans l'artefact
bâti, ce qui garde vraie la frontière « aucune route HTTP » du lot et n'entame ni `FR-096` ni
`FR-097`.

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

**Invariants d'architecture confrontés, fichier par fichier.** Sept sont **hors portée** faute des
fichiers qu'ils nomment (`I3`, `I4`, `I6`, `I7`, `I9`), et trois sont tenus : `I1` par la chaîne
ESLint que ce lot pose, `I2` et `I5` par `arch-invariants` déjà en place, `I8` par le placement des
valeurs. Deux conséquences ont **changé le découpage** plutôt que d'être écrites en dérogation :

- **`I3` interdit au plancher de zone d'être un graphe complet.** `src/render/index.ts` est le seul
  chemin de `src/render/` atteignable de l'extérieur, et ce lot ne le pose pas (frontière de la
  spec). Donc `src/site/` et `src/admin/` **n'importent pas** `src/render/` : le plancher exerce
  les cinq arêtes qui restent légales sans le baril (`site→core`, `admin→core`, `admin→platform`,
  `render→core`, `platform→core`), et laisse les deux autres à la feature qui posera le baril.
- **La sonde de développement ne crée pas de sixième répertoire sous `src/`.** Elle vit dans
  `src/platform/d1/sonde-dev.ts` — lire D1 est le métier de `platform/` —, et non dans un `src/dev/`
  qu'aucune zone ne couvrirait et que `boundaries` ne saurait pas classer.

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
| `package.json` | les huit scripts normatifs + `dev` et `db:migrate` ; dépendances | noms de scripts **repris à la lettre** de `docs/ci.md` § Commandes |
| `package-lock.json` | versions figées | `npm ci` seul, jamais `npm install` (`docs/ci.md`) |
| `.npmrc` | `min-release-age=7` | bloc exact de `docs/ci.md` § Approvisionnement |
| `tsconfig.json` | `extends: astro/tsconfigs/strict`, `strict: true` | [ADR-0010](../../docs/adr/0010-langage-typescript-strict.md) |
| `astro.config.ts` | adaptateur Cloudflare (`platformProxy`), `image` d'[ADR-0019](../../docs/adr/0019-pipeline-d-images-variantes-au-build.md), **lecture d'`instance.json`**, intégration de sonde dev-only | porteur unique d'`I10` (`ADR-0032`) |
| `wrangler.jsonc` | `name`, `compatibility_date`, liaison D1 **sans `database_id`**, `migrations_dir` | `FR-016` ; aucune valeur d'instance (`FR-022`) |
| `instance.json` | `domain`, `turnstilePublicKey` — valeurs d'exemple | contrat d'E/S de la spec ; `I8` |
| `eslint.config.js` | style + TypeScript (job `lint`) | — |
| `eslint.config.boundaries.js` | **la matrice `I1` seule** (job `boundaries`) | nom choisi pour matcher le glob `eslint.config.*` de `quality-config-guard` — un `eslint.boundaries.config.js` y échapperait |
| `vitest.config.ts` | `defineWorkersConfig`, couverture → `coverage/lcov.info` | [ADR-0013](../../docs/adr/0013-tests-vitest-dans-workerd.md) |
| `knip.json` · `stryker.conf.json` | jobs nocturnes `dead-code` et `mutation` | `.github/workflows/nightly.yml` |

### Sources — le plancher des cinq zones (`FR-009`)

Un fichier par zone, chacun important **vers le bas** pour exercer la matrice d'`I1` :

- `src/core/zone.ts` — le type `Zone` et la liste des cinq zones. N'importe **rien** (`I1`, `I2`).
- `src/render/zone.ts` — importe `src/core/`. **Pas** `index.ts` : ce nom est réservé au baril d'`I3`.
- `src/platform/zone.ts` — importe `src/core/`.
- `src/platform/d1/sonde-dev.ts` — la route de sonde, injectée en développement seulement.
- `src/site/zone.ts` — importe `src/core/`.
- `src/admin/zone.ts` — importe `src/core/` et `src/platform/`.

### Migrations et vérification

- `migrations/0001_amorce.sql` — migration **sans effet de schéma** (`FR-021`).
- `scripts/verif-bout-en-bout.sh` — l'étape unique, ci-dessous. Patron : `.github/scripts/arch-invariants.sh`
  (`set -uo pipefail`, un état par contrôle, le commentaire dit le *pourquoi*).
- `docs/ci.md` — **une seule ligne** : la case vide « Run local » reçoit `npm run dev`. Ce document
  déclare lui-même que la commande « se pose au scaffold, dans ce tableau ».

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
| `knip` | `knip` | code mort |
| `mutation` | `stryker run` | refus tant qu'aucun test n'a tourné (`FR-007`) |
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
**absente de l'artefact**.

**Migrations** — `migrations/NNNN_nom.sql`, ordre numéroté. *Mesuré* : après `0001_amorce.sql`
(`SELECT 1;`), `sqlite_master` ne porte que `d1_migrations`, `sqlite_sequence` et `_cf_METADATA` —
c'est l'énoncé exact que `FR-021` et `SC-007` vérifient, et la seconde application répond
`✅ No migrations to apply!`.

## Décisions & alternatives écartées

**1. TypeScript est épinglé en `6.0.3`, pas en `latest`.** [officiel · cité] registre npm, lu le
2026-08-15 : `typescript@7.0.2` est la version courante, mais `typescript-eslint@8.66.0` pose
`typescript >=4.8.4 <6.1.0` et `@astrojs/svelte@9.0.1` pose `^5.3.3 || ^6.0.0`. Prendre TS 7
**tuerait la chaîne ESLint** — donc `boundaries`, donc la seule vérification d'`I1`. C'est le second
des deux murs qui avaient déjà écarté dependency-cruiser (`docs/ci.md`). `6.0.3` (2026-04-16) est la
dernière 6.x. *Condition de révision : le jour où `typescript-eslint` élargit son pair à TS 7.*
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

Elle enchaîne, et refuse au premier écart :

1. `npm ci` — puis `typecheck`, `build`, `test`, `coverage`, `lint`, `lint:boundaries`, `knip` :
   **sept codes de sortie nuls** (`SC-002`), `dist/` et `coverage/lcov.info` présents.
2. Le build est rejoué par `env -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_API_TOKEN` : `0` (`SC-008`).
3. `bash .github/scripts/arch-invariants.sh` : `I2`, `I5`, `I8` et `I10` au vert — **code de sortie
   nul**, aucune violation tolérée.
4. Trois défauts injectés puis retirés, chacun devant être **signalé** : une incohérence de type
   (`SC-003`), un import `src/core/ → src/platform/` (`SC-004`, par `lint:boundaries`), un
   `import 'cloudflare:workers'` dans `src/core/` (`SC-005`, par `arch-invariants` — **un porteur
   distinct**, comme la spec l'exige). L'arbre est rendu intact à la fin.
5. `npm run db:migrate` deux fois : la seconde répond `No migrations to apply!` ; le schéma obtenu
   ne porte que `d1_migrations`, `sqlite_sequence` et `_cf_METADATA` (`SC-007`).
6. `npm run dev`, puis `curl /_sonde` → `{"n":1}`, puis `astro dev stop` (`SC-006`).

**`SC-009` n'entre pas dans ce script** : c'est une pièce datée, produite une fois. La recette est
rejouée et tient : dans un dossier neuf portant `min-release-age=7`, `npm install astro` résout
**7.2.0** quand le registre publie **7.2.2** depuis le 2026-08-13. Sortie à conserver, datée.

## Couverture des exigences

Les 22 `FR` de la spec sont couverts. Deux lectures sont **fixées ici** pour qu'elles ne soient pas
rouvertes en aval :

- **`SC-010` se lit sur les deux porteurs.** `FR-010` confie `I1` à la commande de graphe d'imports
  et `FR-011` confie `I2` à `arch-invariants` ; « la vérification d'invariants d'architecture »
  de `SC-010` désigne donc l'ensemble des deux — `arch-invariants.sh` déclare `I1` « NON RENDU »
  et le renvoie explicitement à la chaîne ESLint que ce lot pose.
- **`I10` est exercé, et son résultat est vert.** « Ne pas se déclarer hors portée » est ce que
  `SC-010` demande, et `astro.config.ts` donne au contrôle de quoi lire. Depuis `ADR-0032`, il ne
  balaie plus que la configuration du site : ce qu'il exerce, ce lot le satisfait.
