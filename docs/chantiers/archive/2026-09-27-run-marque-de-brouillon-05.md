# Run bloqué — la marque de brouillon

Portée : 005-mise-en-page-administration · ticket 05
Ouvert le 2026-09-27 · Clos le 2026-09-27 · branche `impl/marque-de-brouillon-05` (séquentiel, code non commité) · HEAD `7390ea4`

## Objectif
Donner à « Brouillon » une marque unique, en couleur gorge, sur la ligne de Mes pages et dans le
titre de l'éditeur, la seconde clonée côté navigateur depuis un `<template>` rendu par le serveur.
Lancé en `/scd-spec-dev:run` séquentiel (run `wf_207226da-680`, vérif `test`).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/05-marque-de-brouillon.md` — le ticket
à lire      `openspec/changes/005-mise-en-page-administration/design.md` — le change
à situer    le checkout de session sur `impl/marque-de-brouillon-05` — le SEUL exemplaire du travail (`MarqueBrouillon.astro` et les 2 tests non suivis, 4 fichiers d'impl modifiés)

## Acquis
- Le run s'est arrêté en `blocked-verify`, après le vert et avant la quality gate et la review :
  ni gate, ni review 8 dimensions, ni triage n'ont joué. Aucune PR.
- La ceinture était propre (diff de tests strictement additif, aucun neutraliseur, 0 échec).
  SC-05a et SC-05c ont été prouvés. SC-05b n'est prouvé que par lecture de la source : `workerd`
  n'exécute aucun script navigateur et le dépôt n'a ni jsdom ni happy-dom. C'est le blocage
  spurious déjà vu sur un `humanCheckRequired` posé par le verifier lui-même.
- Le verifier a rendu, sans troncature, ce point à constater :
  « Dans un navigateur, ouvrir /admin/pages/<slug> sur une page SANS brouillon et enregistrer une
  correction : le badge « Brouillon » (rubis sur fond rubis pâle, point devant) doit apparaître une
  seule fois dans le titre, sans recharger. Enregistrer une seconde correction : toujours un seul
  badge. Recharger : le badge doit être visuellement identique à celui apparu sans recharger. »
- Le cahier de test (`docs/cahier-de-test.md`, non versionné) a été remisé avant le run :
  `git stash list` → « cahier-de-test ».

## Prochaine étape
Suivre la voie de la recette globale de fin de front (précédent : ticket 06, #116). Ajouter le cas
SC-05b au cahier et à l'artefact de recette dans un § dédié au ticket 05, commiter le travail,
cocher SC-05a et SC-05c, puis ouvrir la PR à la main. Comme la review n'a pas joué, lancer
`/scd-spec-dev:review` sur la branche avant d'ouvrir la PR.

## Issue
Arbitrage humain : SC-05b ne bloque pas le ticket, sa part navigateur part à la recette globale
de fin de mise en page (cahier de recette § 19, CT-19.1 à CT-19.6). J'ai rejoué la review à la main
(8 dimensions, triage) : un seul finding retenu, SC-05c qui ignorait les îlots `.svelte`, corrigé.
`analyse` relevait une interpolation non typée dans le test neuf, corrigée aussi. J'ai coché SC-05a
et SC-05c, laissé SC-05b ouvert. Livré par #120.

## Écarté
- Relancer le run tel quel : le verifier rebloquerait sur le même critère.
