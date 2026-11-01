# Run bloqué : une image impossible à réduire paraît quand même

Portée : 014-site-public-rapide · ticket 03
Ouvert le 2026-11-01 · Actualisé le 2026-11-01 · branche `impl/une-image-impossible-a-reduire-parait-quand-meme-03` · HEAD `f325c47`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/une-image-impossible-a-reduire-parait-quand-meme-03`

## Objectif
Mener le ticket 03 jusqu'à sa PR après l'arrêt du run parallèle `wf_522002ed-6a8` en `blocked-record-incomplete`
(mode `tdd`), juste après le commit du progress-recorder.

## Contexte à charger
à lire      `openspec/changes/014-site-public-rapide/tickets/03-une-image-impossible-a-reduire-parait-quand-meme.md` — le ticket à honorer
à lire      `openspec/changes/014-site-public-rapide/` — le change (proposal, delta site-public, design D1 et D6)

## Acquis
- Le workflow avait tout joué jusqu'au Record : tests rouges puis verts, ceinture, quality gate, relecture, tri,
  correction. Le commit `f325c47` portait le code, le test et la case SC-03a cochée.
- Le progress-recorder avait laissé hors commit les données de test écrites par le test-writer. Sortie
  `porcelainAfter`, telle quelle :
  > ?? tests/static/fixtures/site-jetable-image-irreductible/content/medias/anime.json
  > ?? tests/static/fixtures/site-jetable-image-irreductible/content/medias/enorme.json
  > ?? tests/static/fixtures/site-jetable-image-irreductible/content/medias/tronque.json
  > ?? tests/static/fixtures/site-jetable-image-irreductible/content/pages/accueil/page.json
  > ?? tests/static/fixtures/site-jetable-image-irreductible/content/reglages/reglages.json
  > ?? tests/static/fixtures/site-jetable-image-irreductible/medias/anime.webp
  > ?? tests/static/fixtures/site-jetable-image-irreductible/medias/enorme.png
  > ?? tests/static/fixtures/site-jetable-image-irreductible/medias/tronque.png
- Le tri avait retenu une seule remarque, `architecture-F-1` : le nom de la copie de repli devait se former par la
  règle pure de `src/core/medias/variantes.ts` (design D1, D6). Sa correction avait touché
  `src/core/medias/variantes.ts` et `src/platform/contenu/medias.ts`, deux fichiers absents de la ligne **Fichiers :**.
- Deux questions écartées par le tri étaient à poser dans la PR : un ADR complémentaire à l'ADR-0031 pour le repli
  (`change-F-1`), et l'APNG non détecté comme animé (`error-handling-F-2`, limite connue).

## Prochaine étape
J'allais commiter seules les données de test, rejouer les tests du ticket, puis reprendre le run dans la session du
lancement avec, dans la copie locale du script, la sortie `git status --porcelain` recalculée à la place de celle du
Record : seules la description et la PR auraient tourné. Hors de cette session : commiter les données, puis appeler
`scd-spec-dev:pr-describer` et `scd-spec-dev:pr-author` à partir de `journal.jsonl`.

## Écarté
- Relancer avec `rerun: "2"` : tout l'aval du code aurait été rejoué, relecture comprise, pour huit fichiers oubliés.
