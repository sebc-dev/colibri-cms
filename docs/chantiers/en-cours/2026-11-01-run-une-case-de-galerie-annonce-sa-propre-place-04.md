# Run bloqué : une case de galerie annonce sa propre place

Portée : 014-site-public-rapide · ticket 04
Ouvert le 2026-11-01 · Actualisé le 2026-11-01 · branche `impl/une-case-de-galerie-annonce-sa-propre-place-04` · HEAD `cff23ab`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/une-case-de-galerie-annonce-sa-propre-place-04`

## Objectif
Mener le ticket 04 jusqu'à sa PR après l'arrêt du run parallèle `wf_522002ed-6a8` en `blocked-quality` (mode `tdd`).

## Contexte à charger
à lire      `openspec/changes/014-site-public-rapide/tickets/04-une-case-de-galerie-annonce-sa-propre-place.md` — le ticket à honorer
à lire      `openspec/changes/014-site-public-rapide/` — le change (proposal, delta site-public, design)

## Acquis
- Le workflow avait écrit les tests, le code (`src/render/places.ts`, `Image.astro`, `Galerie.astro`,
  `Carrousel.astro`) et passé la ceinture. Rien n'était commité ; tests et fixture `pages/places/` étaient `??`.
- Le check bloquant `analyse` avait échoué sur le seul test neuf. Sortie rejouée, telle quelle :
  > tests/unit/rendu/places.test.ts
  >   16:44  error  Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking  sonarjs/super-linear-regex
  >   26:29  error  Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking  sonarjs/super-linear-regex
  >   28:15  error  Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking  sonarjs/super-linear-regex
  > ✖ 3 problems (3 errors, 0 warnings)
- L'agent `quality-analyse` avait rendu `applicable: false` : aucun agent n'avait le droit de corriger un test, et le
  code de production était propre. Il proposait trois découpages littéraux, fidèles à la forme fixe que `sizesDe`
  émet : L16 `calc[1].split(' - ')`, L26 `sizes.split(', ')`, L28 `/^\(min-width: ([\d.]+)rem\) (.+)$/`.

## Prochaine étape
J'allais faire ces trois retouches, les vérifier (`npx eslint --config eslint.config.analyse.js` et `npx vitest run`
sur le test), indexer les tests du ticket par `git add`, puis reprendre dans la session du lancement avec
`rerun: "2"` (copie locale de `implement-parallel.js` complétée de `rerun: step.rerun`). Après le run : vérifier que
le test commité portait les retouches. Hors de cette session : retouches, `git add`, puis
`/scd-spec-dev:run 014-site-public-rapide 04`.

## Écarté
- Toucher `eslint.config.analyse.js` ou poser un `eslint-disable` : interdit, et la règle avait raison sur la forme.
