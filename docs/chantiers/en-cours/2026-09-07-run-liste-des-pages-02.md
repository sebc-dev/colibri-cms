# Run bloqué — assembler la liste des pages dans le cadre

Portée : 003-remplir-emplacements · ticket 02
Ouvert le 2026-09-07 · Actualisé le 2026-09-07 · branche `impl/liste-des-pages-02` · HEAD `40f96ac`

## Objectif
Livrer le 5e critère du ticket 02 (SC-02e) : la liste servie DANS le cadre de l'administration,
ajouté au ticket après que les quatre premiers avaient été livrés et mergés.

## Contexte à charger
à lire      `openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md` — le contrat, dont SC-02e et sa nuance de vérif (44 l.)
à lire      `openspec/changes/003-remplir-emplacements/proposal.md` — le cadrage ; « Mes pages » = un vrai point d'entrée (58 l.)
à situer    `src/admin/ilots-svelte-5/Cadre.svelte` — la rubrique sans lien, à doter d'un href ; conclusion dans Acquis
à situer    PR #64 — la première livraison du ticket, mergée, ne pas relire
à situer    journal du run `wf_1c01a247-eef` — hors dépôt (sous `~/.claude`), verdict distillé ici

## Acquis
- Le run du 2026-09-07 s'est arrêté en `blocked-verify` (mode `test`), avant review, PR ou coche.
- Le code en vol est à l'abri dans le wip `b26e9b2` : contenu de page dans un `<template>` inerte, un
  script client montant l'îlot `Cadre` avec ce contenu comme enfant. J'ai décidé d'ANNULER cette
  approche (arbitrage 3) : elle laissait la page vide sans JS et a fait tomber l'attestation de
  SC-02a/b (le corps HTTP ne portait plus que `<div id="ilot-cadre">` et le template).
- Cœur du verdict du verifier : SC-02e non observable (le cadre, îlot monté par script seul, n'entre
  jamais dans la réponse HTTP) ; et écart au texte — « menant à cet écran » exige un lien, or la
  rubrique est un `<span aria-current>` sans href.
- Trois arbitrages tranchés avec l'humain (désormais portés au ticket) :
  1. inscrire l'id `SC-02e` sur le 5e critère — il n'en avait aucun (« SC-02e » venait du brief) ;
  2. « menant à cet écran » = un VRAI lien navigable `<a href="/admin/mes-pages">` + aria-current ;
  3. liste rendue dans la réponse HTTP (SC-02a-d à nouveau observables), cadre monté AUTOUR côté
     client ; moitié « assemblage » de SC-02e vérifiée en `observé`, car workerd n'a aucun harnais de
     montage DOM et l'îlot est client-only (ADR-0006). Mode mixte assumé face au `Vérif : test`.
- Deux points de test à corriger au passage (signalés par le test-validator) : une assertion épingle
  la variable locale `contenu` ; le test SC-02a ne compte pas les `<li>` (« une ligne par page »).

## Prochaine étape
Relancer `/scd-spec-dev:run 003-remplir-emplacements 02` : la branche et le wip `b26e9b2` sont là, le
run reprend dessus. Il doit annuler le `<template>` (liste en HTTP), poser le lien navigable, honorer
`observé` pour l'assemblage de SC-02e, et corriger les deux points de test ci-dessus.

## Écarté
- Rendre le cadre côté serveur dans la réponse HTTP : l'îlot est monté par script seul (ADR-0006), un
  rendu serveur le contredirait ; d'où le passage par le `<template>` — lui-même écarté (arbitrage 3).
- Faire passer le critère au seul grep de source : le verifier l'a jugé non probant (miroir de la forme).
