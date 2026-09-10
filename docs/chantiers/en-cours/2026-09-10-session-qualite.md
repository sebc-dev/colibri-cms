# Session qualité — ce que la quality gate ne mesure pas

Portée : socle
Ouvert le 2026-09-10 · branche `chore/session-qualite-2026-09-10` · HEAD `6bed09f`

## Objectif
J'allais établir où sont les trous de la quality gate en la jouant en local, puis décider lesquels
valent une correction. Aucun code de production n'était visé.

## Contexte à charger
à lire      `.claude/quality.json` — la gate possédée par le projet, à amender (30 l.)
à lire      `stryker.conf.json` — la configuration à revoir (9 l.)
à lire      `vitest.config.ts` — l'absence d'`include`/`exclude` de couverture est la cause (27 l.)
à extraire  `docs/ci.md` › « Commandes du projet » — le registre à raccorder aux constats
à extraire  `docs/test.md` › « Pyramide » — n'y figure pas `tests/unit/**`
à situer    `CLAUDE.md` — contredit `docs/ci.md` sur le wrangler de `dev`, conclusion ci-dessous

## Acquis
- La gate déclarée passe entièrement : les manques sont dans ce qu'elle ne joue pas, pas dans ce
  qu'elle mesure.
- La couverture attribue au **worker buildé** (`.wrangler/test-worker/**`) et non aux sources — une
  poignée seulement des fichiers de `src/` y figurent, avec des `content/*.json`. Cause : aucun
  `include`/`exclude` de couverture. Le total affiché ne veut rien dire, même comme indicateur.
- **Un CRAP est le cap retenu**, calculable sans nouvelle dépendance : complexité par fonction via la
  règle `complexity` d'ESLint, couverture par fonction via istanbul (`lcov.info` porte `FN`/`FNDA`).
  La voie classique clover → CRAP est morte ici (le reporter clover écrit `complexity: 0` en dur), et
  le CRAP reste **faux tant que la couverture vise le bundle** : corriger le périmètre passe avant.
- `npm run mutation` ne prouve rien tel quel : `commandRunner: npm test` rejoue le build à chaque
  mutant, `coverageAnalysis: "off"` interdit toute sélection, et la quasi-totalité des mutants
  **expire** au lieu d'être tuée — un timeout comptant comme tué, le score sort haut pour de
  mauvaises raisons (moins d'un test joué par mutant, mesuré).
- Un trou de test réel affleure dans le rapport incrémental déjà sur disque (à re-prouver par un run
  ciblé) : `src/core/pages/declaration.ts` ne tue aucun mutant — ni l'inversion du tri par rang, ni la
  projection vidée de `{slug, titre}`, qui ne sont donc assertés nulle part.
- `knip` remonte un export mort réel — la variante D1 de `pagePorteUnBrouillon` n'a aucun appelant,
  les deux routes prennent la version pure de `core/`.
- Le `scope` de `.claude/quality.json` est sans effet (commandes globales), et aucun agent qualité
  dédié n'existe (`checks[].agent`, `applier` absents) : tout échec va au conseiller générique.
- `lint:boundaries` porte l'invariant `I1` seul et rien ne le joue — assumé par `docs/ci.md`, consigné
  comme risque, pas comme défaut. Deux dérives documentaires par ailleurs : `tests/unit/**` ne figure
  pas dans la pyramide de `docs/test.md`, et `CLAUDE.md` contredit `docs/ci.md` sur le wrangler de `dev`.

## Prochaine étape
Corriger le périmètre de couverture — c'est le préalable du CRAP autant qu'une correction en soi —,
puis monter le CRAP ; l'export mort et la configuration de mutation viennent ensuite.

## Écarté
- Poser un seuil de couverture nu — `docs/test.md` la veut informative, et un seuil sur une mesure qui
  vise le bundle serait un mensonge chiffré. Le CRAP le remplace : il croise couverture et complexité.
- Ajouter un outil de duplication — aucun n'est installé, les volumes ne le justifient pas, et il n'y
  a ni `TODO` ni escape-hatch nulle part.
- Rendre des checks bloquants — la CI est informative par décision du 2026-09-06, et promouvoir un
  garde touche trois surfaces ; hors périmètre d'une session de constat.
