# Run bloqué — l'écran médias (ticket 05)

Portée : 004-bibliotheque-de-medias · ticket 05
Ouvert le 2026-09-14 · branche `impl/ecran-medias-05` · HEAD `1623cfe`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/ecran-medias-05` — **seul exemplaire
du travail**, rien n'est commité ni poussé (4 fichiers modifiés, 3 nouveaux).

## Objectif
Faire passer la quality gate du ticket 05 puis reprendre le run là où il s'est arrêté (review, PR) —
le comportement, lui, était vérifié.

## Contexte à charger
à lire      `openspec/changes/004-bibliotheque-de-medias/tickets/05-ecran-medias.md` — les 7 critères et le mode `observé`
à lire      `openspec/changes/004-bibliotheque-de-medias/proposal.md` — le change que le ticket honore

## Acquis
- Run `run-parallel` (wf_ec552720-892, chaîne 05→07→08) arrêté en `blocked-quality` sur 05 ; 07 et
  08 interrompus en amont sans rien écrire. Les 7 critères de 05 avaient été vérifiés par le
  `verifier` en contexte frais, sans point à faire constater par un humain.
- Le seul échec **bloquant** était `analyse`, sur deux fichiers **hors du diff du ticket**, déjà
  rouges sur `main` (venus de #92 et #91). Sortie réelle :
  ```
  src/admin/ilots-svelte-5/libelle-compte-images.ts
    17:13  error  Invalid type "number" of template literal expression  @typescript-eslint/restrict-template-expressions
  tests/unit/medias/ingestion.test.ts
    355:41  error  Invalid type "number" of template literal expression  @typescript-eslint/restrict-template-expressions
    355:52  error  Invalid type "number" of template literal expression  @typescript-eslint/restrict-template-expressions
  ✖ 3 problems (3 errors, 0 warnings)
  ```
- La gate a déjà résorbé un clone neuf dans `Cadre.svelte` (rubrique du menu factorisée en
  `<svelte:element>`). Reste en avis : le clone de la garde de session `medias.astro` ↔
  `cadre.astro` — patron imposé par l'ADR-0007, à déroger en review ; et `knip`, artefact du
  worktree sans `node_modules` installé, vert sur `main`.

## Prochaine étape
Corriger la dette sur `main` par un change direct (`${String(nombre)}` l. 17 ;
`${String(largeur)}×${String(hauteur)}` l. 355), la merger, puis relancer la chaîne
`/scd-spec-dev:run-parallel 004-bibliotheque-de-medias 05 07 08` — le run rejoint ce worktree
(`exists:true`) après un rebase sur `main` à jour.

## Écarté
- Corriger les deux fichiers depuis la PR de 05 — hors périmètre du ticket, et le fichier de test
  est interdit aux agents du run.
- Déroger `analyse` pour ce ticket — le rouge est réel, il rattrapera chaque ticket suivant.
- Un helper commun de garde de session pour les six routes admin — refactor transverse à confronter
  à l'ADR-0007, pas ici.
