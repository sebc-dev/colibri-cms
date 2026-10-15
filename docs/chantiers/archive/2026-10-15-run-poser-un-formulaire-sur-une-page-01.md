# Run bloqué — ticket 01, poser un formulaire sur une page

Portée : 012-envoi-des-demandes-de-devis · ticket 01
Ouvert le 2026-10-15 · branche `impl/poser-un-formulaire-sur-une-page-01` · HEAD `40c51df`

## Objectif
Livrer le ticket 01 (emplacement de nature « formulaire », carte en lecture seule dans l'éditeur) par
`/scd-spec-dev:run-parallel 01 02`, en chaîne 01 → 02 : les deux tickets partagent `src/admin/textes.ts`.

## Contexte à charger
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/tickets/01-poser-un-formulaire-sur-une-page.md` — le ticket (SC-01a à SC-01h, clause de dérogation)
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/` — le change (proposal, design, deltas)
à lire      `tests/static/nom-emplacement-editeur-statique.test.ts` — le test existant qui bloque (52 l.)

## Acquis
- Le run `wf_2223e2aa-964` s'est arrêté en `blocked-verify` (mode tdd) ; le ticket 02 n'a pas tourné
  (`blocked-upstream`), aucune branche ne lui a été créée.
- Le travail vit dans le worktree conservé
  `/home/negus/projets/colibri-cms/.git/scd-worktrees/poser-un-formulaire-sur-une-page-01`, NON
  COMMITÉ : le code en modifié, les deux tests neufs en non suivi (la ceinture a retiré leur
  intent-to-add). Ne pas les perdre : pas de `stash pop` aveugle, pas de `checkout --`.
- L'implémenteur a aussi touché `src/pages/admin/pages/[slug]/emplacements/[id].ts`, absent du
  `**Fichiers :**` mais demandé par la décision « la route de correction choisit sa branche selon la
  nature déclarée ».
- La ceinture a jugé les tests neufs strictement additifs et a vu les huit critères prouvés par leurs
  tests. Le seul rouge est un test EXISTANT, non modifié : SC-03c du change 006, qui fige à six le
  nombre de `<CardTitle>` de `src/pages/admin/pages/[slug].astro` (« une par nature »). La carte
  Formulaire en ajoute une septième, elle aussi une expression Astro.

Sortie d'erreur, rejouée à la main dans le worktree, non tronquée :
```
 FAIL  tests/static/nom-emplacement-editeur-statique.test.ts > SC-03c — un nom affiché avec des caractères de balisage n’est jamais interprété comme balise > SC-03c — le titre de chaque carte interpole le nom par l’échappement d’Astro, jamais par set:html, {@html} ou innerHTML
AssertionError: six occurrences de CardTitle sont attendues (une par nature): expected [ …(7) ] to have a length of 6 but got 7
- 6
+ 7
 ❯ tests/static/nom-emplacement-editeur-statique.test.ts:45:84
```

## Prochaine étape
Faire trancher par l'humain la dérogation sur SC-03c (six → sept, une carte par nature), puis finir à
la main depuis le worktree : rejouer typecheck, build, lint et la suite, commits séparés (code, tests
neufs, dérogation, cases), PR qui dit que la quality gate et la review n'ont pas tourné, puis
`/scd-spec-dev:review`. Ensuite seulement, lancer le ticket 02 empilé sur cette branche.

## Écarté
- Reprendre le workflow (`rerun`) après la retouche du test : la ceinture refuse une ligne de test
  modifiée sur un test existant, la reprise rebloquerait.
- Dessiner la carte Formulaire sans `<CardTitle>` pour éviter le compte : ce serait plier le code au
  test, et la carte divergerait des six autres.

## Issue
L'humain a accepté la dérogation le 2026-10-15. J'ai passé SC-03c de six à sept (commit `f0f2607`),
rejoué typecheck, build, lint et la suite, commité le travail du workflow tel quel en commits séparés,
puis ouvert la PR #245 vers `main`, qui dit que la quality gate et la review n'ont pas tourné. Restait
à jouer `/scd-spec-dev:review` sur la PR, puis à lancer le ticket 02 empilé sur cette branche.
