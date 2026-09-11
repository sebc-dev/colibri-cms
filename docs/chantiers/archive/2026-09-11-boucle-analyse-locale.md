# Boucle locale d'analyse — ESLint type-aware, SonarJS, jscpd

Portée : hors-cycle
Ouvert le 2026-09-11 · branche `chore/boucle-analyse-locale` · HEAD `fcc2ae6`

## Objectif
Monter la boucle d'analyse locale décrite par le guide apporté en séance — quatre outils CLI qui
rendent, sans serveur ni compte, le retour qualité qu'un Sonar hébergé donnerait : ESLint
type-aware, `eslint-plugin-sonarjs`, `jscpd`, Knip. Et la rendre **lisible par un agent** : du JSON
sous `reports/`, pas une sortie console à recoller dans un contexte.

## Issue
Livré par la PR ouverte depuis cette branche. Deux outils installés (`eslint-plugin-sonarjs@4.2.0`,
`jscpd@5.1.2`), trois fichiers neufs (`eslint.config.analyse.js`, `.jscpd.json`,
`scripts/rapports-analyse.mjs`), sept scripts npm, deux checks de plus dans la quality gate avec
leur diagnostiqueur. **Aucun fichier de `src/` ni de `tests/` n'a été touché** : ce chantier pose
l'instrument, il ne traite pas ce que l'instrument montre.

**Deux des quatre outils étaient déjà là.** Knip tourne depuis la bascule scd-spec-dev, configuré et
en avis dans la gate ; ESLint aussi, mais en `tseslint.configs.recommended` — c'est-à-dire **sans
types**. Tout l'apport réel du guide tenait donc dans le mot *type-aware* : les règles qui lisent le
graphe de `tsc` (`no-floating-promises`, la famille `no-unsafe-*`, `no-unnecessary-condition`) et que
la passe syntaxique existante ne pouvait pas voir. Le reste était de la mise en cohérence.

**Le calibrage s'est décidé sur une mesure, pas sur un principe.** Première passe complète, grille
entière (`strictTypeChecked` + `stylisticTypeChecked` + SonarJS) sur tout le dépôt : **486
remontées, dont 456 dans `tests/integration`** — et 14 seulement dans `src/`. Le guide prévenait
(« ne noyez pas l'agent sous 800 avertissements ») ; le rapport 30:1 dit *où* le bruit est. Il vient
de deux sources nommées et non de la sévérité du preset : les tests d'intégration parlent au worker
par HTTP, donc `res.json()` rend `any` par contrat (la famille `no-unsafe-*`, 286 remontées), et
`SELF`/`env` de `cloudflare:test` sont déclarés dépréciés en amont (99 + 77). Sept règles éteintes
sur `tests/**` ramènent le total à **119, dont 29 dans `src/`** — un arriéré qui se lit. `src/`
garde la grille entière, y compris `strictTypeChecked` : à 3 248 lignes de TypeScript, 29 remontées
n'ont pas besoin du palier doux que le guide propose pour les grosses bases.

**Pourquoi `analyse` est en avis et pas bloquant.** Il sort rouge (ces 119), et poser rouge un check
qu'on déclare bloquant ne fait que paralyser le cycle `run` dès le premier ticket. La promotion est à
une ligne près — `severity: "blocking"` dans `.claude/quality.json` —, le ruleset GitHub n'exigeant
aucun status check : rien d'autre à toucher, contrairement à une promotion de garde CI.

**Ce que la première passe a déjà trouvé dans `src/`**, sans que personne l'ait cherché : une
comparaison `!==` toujours vraie et un `reduce()` sans valeur initiale dans
`core/pages/texte-riche.ts`, trois fonctions à retour invariant dans `platform/brouillons/magasin.ts`,
une complexité cognitive de 19 (plafond 15) dans `core/medias/ingestion.ts`. C'est le genre de
constat qui justifie l'outil à lui seul — et c'est exactement ce que ce chantier **ne traite pas**.

**La duplication était déjà sous le seuil** : 4,00 % sur `src/` (15 clones, 50 fichiers), pour un
seuil à 5 %. Le vrai apport de jscpd 5.x ici n'est pas ce seuil global — qu'un ticket ne fait
pratiquement pas bouger — mais `--baseline-from-ref origin/main --fail-on-new-clones` : la question
« ce ticket a-t-il ajouté un clone ? », qui est celle qu'on veut poser à chaque PR. Éprouvé sur un
clone volontaire jetable : `jscpd found 1 new clones not in the baseline (allowed: 0)`, sortie 1,
puis vert de nouveau après retrait. C'est cette forme-là qui est déclarée dans la gate.

## Contexte à charger
à lire      `docs/ci.md` › « La boucle locale d'analyse » — la synthèse durable, les deux régimes
            (boucle serrée / boucle complète), la dette et le calibrage
à lire      `eslint.config.analyse.js` — la passe type-aware et son bloc de calibrage `tests/**`,
            chaque extinction portant son motif (75 l.)
à situer    `.claude/agents/quality-analyse.md` — porte la règle de périmètre : ne remonter que les
            fichiers du ticket, jamais l'arriéré du dépôt
à situer    `scripts/rapports-analyse.mjs` — pourquoi un script plutôt qu'une chaîne de `&&`

## Prochaine étape
Rien n'est en attente : le chantier est clos. Ce qu'il laisse ouvert, par ordre de valeur —

1. **Les 29 remontées de `src/`**, à traiter par petits lots (`npm run check:agent` puis
   `reports/analyse/eslint.json`). `npx eslint --config eslint.config.analyse.js --fix` en résorbe
   une partie mécaniquement ; les quatre constats cités plus haut demandent un regard.
2. **La migration `SELF`/`env` → `cloudflare:workers`** (77 occurrences, `exports.default.fetch()` et
   `env` depuis `cloudflare:workers`). L'amont donne le remplacement dans le message de la règle.
   Le jour où elle est faite, retirer `no-deprecated` et `sonarjs/deprecation` du bloc `tests/**`.
3. **Promouvoir `analyse` en bloquant** quand il est vert.

## Écarté
- **Fondre le type-aware dans `npm run lint`** — c'est le check **bloquant** de la gate et il est
  vert. Y verser 119 remontées bloquait le cycle `run` au premier ticket, ou forçait à corriger
  `src/` dans une PR d'outillage. Trois configs ESLint, une par intention, prolongent la décision
  déjà prise pour `lint:boundaries` : trois questions distinctes, qu'on veut faire échouer
  séparément.
- **Corriger les 119 remontées dans cette PR** — « rien hors périmètre de la tâche n'a été modifié »
  (DoD). Poser l'instrument et traiter ce qu'il montre sont deux gestes ; les mêler rend le diff
  illisible et fait passer un refactor de `core/` pour de la configuration.
- **Un autofix sur `analyse` et `dup`** — `eslint --fix` sait réécrire `prefer-nullish-coalescing`,
  mais `||` et `??` ne coïncident pas sur `0` et `''` : c'est une réécriture sémantique, pas un
  formatage. Et factoriser un clone, c'est réécrire de la logique. Aucun des deux n'est un geste
  mécanique, donc aucun ne mérite d'être joué sans regard.
- **La passe type-aware sur `.astro` et `.svelte`** — leurs parsers tiers ne rendent pas le programme
  TypeScript que les règles à types exigent. Les îlots restent tenus par `tsc` et par
  `lint:boundaries`, qui, lui, les parse. Noté comme limite dans `docs/ci.md`, pas contourné.
- **Le fragment GitLab CI du guide** — ce dépôt est sur GitHub, et sa CI **annote sans bloquer**
  depuis la bascule du 2026-09-06. L'équivalent fonctionnel ici n'est pas un job de CI : c'est la
  quality gate du cycle `run`, possédée par le projet dans `.claude/quality.json`. C'est là que les
  deux checks ont été déclarés.
- **Semgrep CE et osv-scanner** — les deux couches optionnelles du guide. Semgrep CE n'analyse que
  l'intérieur d'un fichier, donc rate les injections qui traversent les zones, et la revue de
  sécurité du cycle couvre déjà cette dimension avec plus de portée. Pour les dépendances,
  `.npmrc` (`min-release-age=7`) et `npm audit` tiennent le terrain ; ajouter un scanner de plus ne
  révélerait rien que les 9 alertes connues ne disent déjà.
- **Monter `jscpd@5.2.0`** — publié le 2026-09-08, écarté par le gel de 7 jours de `.npmrc`. 5.1.2
  (2026-09-03) est passée. Ce n'est pas un choix, c'est la règle d'approvisionnement qui joue.
