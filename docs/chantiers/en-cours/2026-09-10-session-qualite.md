# Session qualité — ce que la quality gate ne mesure pas

Portée : socle
Ouvert le 2026-09-10 · Actualisé le 2026-09-10 · branche `chore/session-qualite-2026-09-10` · HEAD `3ea8785`

## Objectif
J'allais établir où sont les trous de la quality gate en la jouant en local, puis décider lesquels
valent une correction. Aucun code de production n'était visé.

## Contexte à charger
à lire      `.claude/quality.json` — la gate possédée par le projet, à amender (30 l.)
à lire      `stryker.conf.json` — la configuration à revoir (9 l.)
à lire      `vitest.config.ts` — où se règle la ré-attribution de la couverture (27 l.)
à extraire  `astro.config.ts` › `vite` — où activer les sourcemaps du worker bâti
à extraire  `docs/ci.md` › « Commandes du projet » — le registre à raccorder aux constats
à extraire  `docs/test.md` › « Pyramide » — n'y figure pas `tests/unit/**`

## Acquis
- La gate déclarée passe entièrement : les manques sont dans ce qu'elle ne joue pas, pas dans ce
  qu'elle mesure.
- La couverture se lit sur le **worker bâti** (`.wrangler/test-worker/**`) : c'est fidèle, pas
  accidentel — la plupart des fichiers de test n'atteignent le produit que par `SELF.fetch` sur lui,
  qui est aussi ce qui part en ligne. Inexploitable pour autant : chunks au nom haché changeant à
  chaque build, framework mêlé au produit, même fonction comptée deux fois. **Cause : aucun `.map`
  n'est émis**, donc rien ne ramène l'exécution du bundle aux sources.
- **Un CRAP est le cap retenu**, calculable sans nouvelle dépendance : complexité par fonction via la
  règle `complexity` d'ESLint, couverture par fonction via istanbul (`lcov.info` porte `FN`/`FNDA`).
  La voie classique clover → CRAP est morte ici (le reporter clover écrit `complexity: 0` en dur), et
  le CRAP suppose des fonctions **éditables** : sans sourcemap, aucune fonction de chunk n'y répond.
- Non vérifié, à tester avant d'en faire un plan : que le fournisseur istanbul de vitest remappe bien
  à travers la chaîne astro build → `.wrangler/test-worker/` → module runner de workerd.
- `npm run mutation` ne prouve rien tel quel : `commandRunner: npm test` rejoue le build à chaque
  mutant, `coverageAnalysis: "off"` interdit toute sélection, et presque tous les mutants **expirent**
  au lieu d'être tués — un timeout comptant comme tué, le score sort haut à tort (moins d'un test
  joué par mutant, mesuré).
- Trou de test réel dans le rapport incrémental sur disque (à re-prouver par un run ciblé) :
  `src/core/pages/declaration.ts` ne tue aucun mutant — ni l'inversion du tri par rang, ni la
  projection vidée de `{slug, titre}`, donc assertés nulle part.
- `knip` remonte un export mort réel — la variante D1 de `pagePorteUnBrouillon` n'a aucun appelant,
  les deux routes prennent la version pure de `core/`.
- Le `scope` de `.claude/quality.json` est sans effet (commandes globales), et aucun agent qualité
  dédié n'existe (`checks[].agent`, `applier` absents) : tout échec va au conseiller générique.
- `lint:boundaries` porte `I1` seul et rien ne le joue (assumé par `docs/ci.md`) ; `tests/unit/**`
  manque à la pyramide de `docs/test.md` ; et c'est `docs/ci.md`, pas `CLAUDE.md`, qui est périmé sur
  le wrangler de `dev` — Astro lit `wrangler.astro.jsonc`.

## Prochaine étape
Activer les sourcemaps du worker bâti et vérifier que la couverture retombe sur `src/` — c'est le
préalable du CRAP. L'export mort et la configuration de mutation viennent ensuite.

## Écarté
- Exclure `.wrangler/**` de la couverture — mon premier réflexe, et le mauvais : le rapport
  paraîtrait plus propre en mesurant beaucoup moins, presque toute la suite passant par le worker bâti.
- Poser un seuil de couverture nu — `docs/test.md` la veut informative, et un seuil sur une mesure
  visant le bundle serait un mensonge chiffré. Le CRAP le remplace en croisant les deux.
- Ajouter un outil de duplication — les volumes ne le justifient pas, et il n'y a ni `TODO` ni
  escape-hatch nulle part.
- Rendre des checks bloquants — la CI est informative par décision du 2026-09-06, et promouvoir un
  garde touche trois surfaces ; hors périmètre d'une session de constat.
