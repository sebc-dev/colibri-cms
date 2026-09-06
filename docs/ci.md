# ColibriCMS — Intégration continue

L'état **réel** de la CI aujourd'hui, après la bascule vers `scd-spec-dev` (OpenSpec). La rigueur ne
passe plus par un portail de gardes bloquants : elle passe par la **review** du cycle
`scd-spec-dev`. Ce que la CI fait encore, elle le fait pour **annoter**, pas pour refuser.

> **Bascule du 2026-09-06.** L'ancien portail à douze contrôles bloquants (gardes d'intégrité, scans
> d'approvisionnement, invariants d'architecture) a été **retiré**. Le workflow `ci.yml` ne porte
> plus que `build` et `test`, et le ruleset de branche n'exige **aucun** status check. Toute
> description d'un portail à douze gardes est caduque.

## Commandes du projet

Source unique — `CLAUDE.md` y renvoie, il ne les recopie pas.

| Rôle | Commande | Note |
|---|---|---|
| Installation | `npm ci` | **jamais** `npm install` — l'installation est verrouillée par le lockfile |
| Typage | `npm run typecheck` | `tsc --noEmit`. Le typage strict n'est pas fait par le build seul |
| Build | `npm run build` | `astro build`, adaptateur `@astrojs/cloudflare`. `typecheck` **puis** `build` |
| Tests | `npm test` | `vitest run --passWithNoTests`, dans `workerd` (voir [`docs/test.md`](./test.md)) |
| Un seul test | `npx vitest run tests/integration/<fichier>.test.ts` | exige le **worker de test déjà bâti** — sinon, `npm run build` une fois, puis cette commande. Elle ne rejoue pas le build |
| Couverture | `npm run coverage` | `coverage/lcov.info` — informatif |
| Lint / format | `npm run lint` | `eslint .` — source de vérité du style |
| Frontières de zones | `npm run lint:boundaries` | `eslint --config eslint.config.boundaries.js .` — le porteur falsifiable de l'invariant `I1`. **Aucun workflow ne le joue** ; depuis le 2026-09-06 il est **bloquant dans la quality gate** (voir plus bas) |
| Migrations locales | `npm run db:migrate` | `wrangler d1 migrations apply DB --local` — applique `migrations/` à la base D1 locale |
| Run local | `npm run dev` | `astro dev`, liaisons D1 branchées via `wrangler.jsonc` |

`npm run mutation` (Stryker) est un **outil manuel** : aucun workflow ne le joue, aucun seuil n'en
dépend. `npm run knip` (code non utilisé) n'est joué par aucun workflow non plus, mais la quality
gate le rejoue **en avis** à chaque ticket.

> **`npm test` bâtit d'abord.** Il déclenche `pretest` → `npm run build`, lui-même encadré par
> `scripts/preparer-worker-de-test.mjs` (`prebuild` pose une amorce, `postbuild` recopie `dist/`
> vers `.wrangler/test-worker/`, l'emplacement stable que `wrangler.jsonc` désigne en `main` et
> `assets`) : **un échec de build ressort donc comme un échec de test**. `npm run coverage` suit la
> même règle (`precoverage`). Jouer `npx vitest` directement contourne cette étape — d'où la
> condition « worker de test déjà bâti » ci-dessus.

> **`.npmrc` porte `min-release-age=7`.** Une dépendance publiée il y a moins de sept jours est
> inutilisable à la résolution : c'est la fenêtre du *slopsquatting*, couverte à l'installation.
> N'impacte pas `npm ci` (version déjà figée), mais l'ajout d'une dépendance.

## Ce qui bloque une PR

**Aujourd'hui : rien.** Le ruleset « Main protect » n'exige aucun status check. Il ne garde que
trois choses, toutes structurelles :

- une **PR est obligatoire** pour porter sur `main` ;
- **anti-force-push** sur `main` ;
- **anti-suppression** de `main`.

Aucun job de CI n'est un check requis. `build`, `test` et le filet `escape-hatch-guard` **tournent**
sur chaque PR et **annotent** — un rouge se voit, il ne bloque pas la fusion.

## Ce que la CI exécute (sans bloquer)

- **`.github/workflows/ci.yml`** — deux jobs, indépendants, en parallèle :
  - `build` : `npm ci` → `npm run typecheck` → `npm run build`, puis un garde-fou du socle `C5` qui
    compte les fichiers produits dans `dist/` (alerte à 15 000, échec à 20 000 — le plafond de la
    plateforme). Les deux jobs portent une garde de scaffold : sans `package.json`, l'étape est
    « hors portée » et ne vérifie rien.
  - `test` : `npm ci` → `npm test`.
- **`.github/workflows/scd-escape-hatch-guard.yml`** — le seul garde-fou automatique du plugin : un
  `git grep` des escape-hatches (`@ts-ignore`, `as any`, `eslint-disable`, `.skip(`, `# noqa`,
  `--no-verify`) sur le code suivi, hors `docs/`, `openspec/` et `.github/`. Il annote, il ne bloque
  pas. Un escape-hatch légitime se **déroge explicitement en review**, il ne se neutralise pas en
  silence.

Les actions restent épinglées au **SHA complet** et les images au **digest** : un tag est mobile.

## Où vit la rigueur — le modèle `scd-spec-dev`

Ce que douze gardes CI faisaient de façon déterministe, le cycle le porte désormais en **review en
contexte frais** (producteur ≠ vérificateur) : huit dimensions — architecture, sécurité,
conventions, propreté, error-handling, couverture, change, intégrité — jouées par des reviewers qui
n'ont pas écrit le code, suivies d'un triage adversarial (`/scd-spec-dev:run`, `/scd-spec-dev:review`).

Une **quality gate déterministe** rejoue des checks à chaque ticket (phase 7½ de
`/scd-spec-dev:run`) : elle est **possédée par le projet** dans `.claude/quality.json`
(`/scd-spec-dev:quality-setup`). Posée puis revue le 2026-09-06 — cinq checks, quatre bloquants :

| Check | Commande | Sévérité | Pourquoi |
|---|---|---|---|
| `typecheck` | `npm run typecheck` | **bloquant** | le build seul ne type pas |
| `lint` | `npm run lint` | **bloquant** | source de vérité du style ; autofix `eslint --fix` |
| `boundaries` | `npm run lint:boundaries` | **bloquant** | seul porteur falsifiable de l'invariant `I1` — aucun workflow ne le joue |
| `test` | `npm test` | **bloquant** | la DoD l'exige ; bâtit déjà via `pretest`, un build cassé y ressort |
| `knip` | `npm run knip` | avis | code non utilisé — recoupe la dimension propreté de la review |

Il n'y a **pas** de check `build` : `npm test` le déclenche par `pretest`, un check séparé rejouerait
un second `astro build` pour rien. `coverage` et `mutation` restent hors gate — aucun seuil n'est
déclaré dans `vitest.config.ts`, et Stryker est hors de portée d'une gate par ticket.

Si ce fichier disparaît, la gate est un no-op — le **0-gate** est vrai par défaut : un check n'est
bloquant que si le projet le déclare.
