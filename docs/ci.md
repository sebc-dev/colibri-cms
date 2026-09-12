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
| Frontières de zones | `npm run lint:boundaries` | `eslint --config eslint.config.boundaries.js .` — le porteur falsifiable de l'invariant `I1`, joué en **bloquant** par la quality gate du cycle `run` (`.claude/quality.json`) ; aucun workflow de CI ne le joue |
| Analyse type-aware | `npm run analyse` | `eslint --config eslint.config.analyse.js .` — typescript-eslint `strictTypeChecked` + `stylisticTypeChecked` + `eslint-plugin-sonarjs`, sur les `.ts` seuls. Ce que le graphe de types rend visible et qu'aucune passe syntaxique ne voit. **Bloquant** dans la quality gate depuis le 2026-09-12 ; aucun workflow ne le joue |
| Duplication | `npm run dup` | `jscpd src` — seuil 5 % (`.jscpd.json`), 4,00 % au relevé du 2026-09-11 |
| Duplication neuve | `npm run dup:nouveau` | `jscpd src --baseline-from-ref origin/main --fail-on-new-clones` — n'échoue que sur un clone **absent de `origin/main`**. C'est la forme jouée par la quality gate |
| Boucle complète | `npm run check` | `lint` → `lint:boundaries` → `analyse` → `dup` → `knip`, en console, à l'arrêt sur le premier rouge |
| Boucle complète, en JSON | `npm run check:agent` | `node scripts/rapports-analyse.mjs` — joue les trois outils **jusqu'au bout** (une chaîne de `&&` s'arrêterait au premier), écrit `reports/analyse/{eslint.json,jscpd/jscpd-report.json,knip.json}` et imprime un digest. Rend toujours 0 : il constate, il ne juge pas |
| Migrations locales | `npm run db:migrate` | `wrangler d1 migrations apply DB --local` — applique `migrations/` à la base D1 locale |
| Run local | `npm run dev` | `astro dev`, liaisons D1 branchées via `wrangler.astro.jsonc` — Astro ne lit jamais `wrangler.jsonc` (racine), réservé aux tests |

`npm run knip` (code non utilisé) et `npm run mutation` (Stryker) sont des **outils manuels** :
aucun workflow ne les joue, aucun seuil n'en dépend.

### La boucle locale d'analyse (posée le 2026-09-11)

Quatre outils, une seule intention : rendre un retour de qualité **lisible par un agent** pendant
qu'il code, sans serveur, sans jeton, sans compte. Deux régimes, à ne pas confondre :

- **Boucle serrée**, pendant que le code s'écrit — une passe, sur les seuls fichiers touchés :
  `npx eslint --config eslint.config.analyse.js src/le/fichier.ts` (~3 s).
- **Boucle complète**, quand une tranche est finie — `npm run check` (verdict, ~10 s) ou
  `npm run check:agent` (les mêmes outils en JSON sous `reports/analyse/`, pour que l'agent lise un
  rapport au lieu d'avaler une sortie console).

Trois fichiers de configuration ESLint cohabitent, **un par intention** — `eslint.config.js` (style,
bloquant), `eslint.config.boundaries.js` (invariant `I1`, bloquant), `eslint.config.analyse.js`
(type-aware, bloquant). Ce n'est pas de la dispersion : ce sont trois questions différentes, qu'on
veut pouvoir jouer et faire échouer séparément.

**Ce que la passe `analyse` ne couvre pas** : les fichiers `.astro` et `.svelte`. Le lint à types
exige le programme TypeScript que leurs parsers tiers ne rendent pas. Les îlots restent donc tenus
par `tsc`, par `lint:boundaries` — qui, lui, les parse — et par la review, pas par cette passe.

**Résorbée, et le check est bloquant depuis le 2026-09-12.** `npm run analyse` sortait **rouge** au
montage, à 119 remontées dont **29 dans `src/`** ; il sort **vert** sur tout le dépôt depuis que la
dette a été traitée par petits lots (`docs/chantiers/archive/2026-09-11-corrections-analyse.md`).
C'est cet état vert, et lui seul, qui autorise la promotion : un check qu'on pose rouge et qu'on
déclare bloquant ne fait que paralyser le cycle. `severity` vaut donc `blocking` dans
`.claude/quality.json` — la seule surface en jeu, le ruleset GitHub n'exigeant aucun check et
`analyse` n'étant pas un job de `ci.yml`.

**Calibrage assumé, en deux blocs.** Sur `tests/**`, **huit** règles sont éteintes (la famille
`no-unsafe-*` — cinq règles —, `require-await`, `no-deprecated`, `sonarjs/deprecation`). Les tests
d'intégration parlent au worker par HTTP — `res.json()` rend `any` par contrat — et `SELF`/`env` de
`cloudflare:test` sont déclarés dépréciés en amont alors qu'ils sont la seule porte d'entrée du pool
`workerd`. Sans ce calibrage : 486 remontées dont 456 dans les tests, c'est-à-dire aucun signal.
Le second bloc éteint `sonarjs/no-clear-text-protocols` sur le **seul**
`tests/integration/regler-lien-video.test.ts`, dont le test du rejet non-https porte un `http://`
comme donnée d'épreuve : ni une connexion, ni remplaçable sans rendre le test tautologique. La portée
a été **mesurée**, pas supposée — sous une extinction élargie à `tests/**`, un `http://` planté
ailleurs cesserait d'être vu ; bornée à ce fichier, il reste vu. `src/` garde la grille entière.
La migration `SELF`/`env` → `cloudflare:workers` que ces règles signalent (77 occurrences) est un
travail à part entière, consigné dans
[`docs/chantiers/archive/2026-09-11-boucle-analyse-locale.md`](./chantiers/archive/2026-09-11-boucle-analyse-locale.md).

> ⚠️ **`npm run mutation` mesure désormais, mais aucun score n'a encore été relevé depuis.**
> ADR-0013 fait du score de mutation l'indicateur de profondeur des tests ; le relevé du 2026-09-10 a
> montré deux défauts qui empêchaient l'outil, tel qu'il était monté ici, de mesurer quoi que ce
> soit. **Les deux sont corrigés** — mais aucun rejeu complet n'a eu lieu depuis : le dernier chiffre
> publié (98,21 %) n'atteste rien, et le score réel du dépôt reste inconnu.
>
> **Corrigé — la péremption.** Stryker calcule son seuil `netTime × 1,5 + timeoutMS`, où `netTime`
> est mesuré sur **un** rejeu **seul**, alors que les mutants s'exécutent **à plusieurs en
> parallèle**. Chaque mutant rejoue `npm test`, donc `pretest` → `npm run build` : ~19 s seul, mais
> ~73 s à onze en parallèle. Le `timeoutMS` par défaut (5 s) plaçait le seuil à ~33 s, et **toute la
> mesure périmait** — un mutant périmé comptant comme détecté, le score annonçait 98,21 % pour
> 1 mutant réellement tué sur 112. `stryker.conf.json` porte donc `timeoutMS: 120000` (seuil ≈ 148 s,
> le double de la durée observée) : 0 péremption depuis.
>
> **Corrigé — l'activation du mutant dans `workerd`.** Le code instrumenté lit
> `process.env.__STRYKER_ACTIVE_MUTANT__` pour savoir quel mutant activer. Or nos tests ne tournent
> pas dans le processus où Stryker la pose : ils tournent dans `workerd`, où `process.env` est monté
> par le pool depuis `wrangler.jsonc` et n'hérite jamais de l'hôte. **Aucun mutant ne s'activait**,
> et le mutant qui inverse le tri par rang (`declaration.ts:119`) était rapporté « survivant » alors
> qu'un test d'intégration l'attrape. `vitest.config.ts` porte maintenant le pont : `define` lit la
> variable côté Node et la fait déposer dans l'isolat par `tests/setup/activer-mutant-stryker.ts` —
> dans `process.env` (l'objet existe : le bundle Astro pose `globalThis.process.env ??= {}` en tête
> d'`entry.mjs`) **et** dans `__stryker__.activeMutant`, que le préambule instrumenté relit à chaque
> test de mutant. Le worker bâti et les tests partagent leur `globalThis` — c'est déjà ce dont dépend
> `ignorer-rejet-wasm-lexer.ts`. **Éprouvé** : mêmes mutants, même commande, **0,00 % sans le pont
> (2 survivants) contre 100,00 % avec (2 tués)** ; et la présence de la variable seule ne fabrique
> aucun faux tué (165/165 verts sur un identifiant de mutant inexistant). **Et la mesure
> discrimine** : premier relevé partiel depuis le pont, `declaration.ts` lignes 125-160 — 53 mutants,
> **47 tués, 6 survivants, 0 péremption, 88,68 %** en 6 min 36 (4 en parallèle). Les survivants sont
> des opérateurs logiques et des expressions conditionnelles de garde, que rien n'asserte.
>
> **Conséquence sur la lecture du chiffre.** Les mutants s'exécutant vraiment, des **timeouts**
> deviennent possibles là où il n'y en avait aucun. La colonne `# timeout` reste donc le premier
> chiffre à regarder, avant le score.
>
> **Le rapport incrémental d'avant le pont est invalide.** `incremental: true` réutilise les
> verdicts de `reports/stryker-incremental.json` ; ceux d'avant l'activation ont été rendus sans
> qu'aucun mutant ne tourne. Le fichier a donc été retiré : le prochain rejeu repart de zéro. Un
> rapport produit sans le pont se reconnaît à un `# timeout` nul sur toute la mesure.

> **Le relevé est automatisé, hors du dépôt.** Un timer systemd utilisateur
> (`colibri-mutation.timer`, 01:07) déclenche `~/.local/bin/colibri-mutation.sh`, qui mesure dans un
> **worktree détaché sur `origin/main`** — jamais l'arbre de travail — un jour sur deux en
> incrémental, et le dimanche un passage complet (`--force`) si le dernier a plus de six jours. Le
> script digère ensuite `reports/mutation/mutation.json` en un extrait des seuls survivants, puis
> `claude -p` le trie sous la consigne de `.claude/agents/mutation-analyste.md` — en lecture seule,
> sans `Write`, `Edit` ni `Bash`. Les rapports datés vivent dans
> `~/.local/state/colibri-mutation/rapports/`, le dernier est toujours lisible en
> `~/.local/state/colibri-mutation/dernier.md`. Comme `kfz-disk-alert`, rien ne notifie : l'unité
> **échoue** si la mesure est impossible ou si le score a baissé, ce que
> `systemctl --user is-failed` relève. Des survivants, il y en a toujours : ça ne fait pas échouer.
>
> Compter ~2 h 30 pour un rejeu complet (1321 mutants ; `incremental` limite les suivants aux
> fichiers touchés).

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
(`/scd-spec-dev:quality-setup`). Posée le 2026-09-06 à six checks, portée à **huit** le
2026-09-11 : `typecheck`, `lint`, `boundaries` et — depuis le 2026-09-12, sa dette résorbée —
`analyse` **bloquants** (`lint` seul porte un autofix, `eslint --fix`), `build`, `test`, `knip` et
`dup` en **avis**. Ni `analyse` ni `dup` ne
porte d'autofix, délibérément : `eslint --fix` sait réécrire une partie des règles à types, mais ces
réécritures touchent la sémantique (`||` et `??` ne coïncident pas sur `0` et `''`), et factoriser un
clone, c'est réécrire de la logique — aucun des deux n'est un geste mécanique. Si ce fichier disparaît, la gate est un no-op — le **0-gate** est vrai par défaut : un
check n'est bloquant que si le projet le déclare.

Chaque check a son **diagnostiqueur** dédié, `.claude/agents/quality-<id>.md`
(`/scd-spec-dev:quality-agents`), lui aussi possédé par le projet : en échec non résorbé par
l'autofix, le run route vers lui plutôt que vers le générique `quality-advisor`. Les huit sont en
**lecture seule** — ils remontent et proposent, ils n'éditent rien. Aucun **applier** de projet
n'est déclaré : les corrections passent par le `fix-applier` générique, qui exige un diff de test
**vide**. Un applier — le seul agent autorisé à renforcer un test — ne se justifiera que le jour où
la gate portera une métrique qui est son propre oracle, `mutation` en tête.
