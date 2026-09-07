# Run bloqué — assembler la liste des pages dans le cadre

Portée : 003-remplir-emplacements · ticket 02
Ouvert le 2026-09-07 · Actualisé le 2026-09-07 · branche `impl/liste-des-pages-02` · HEAD `8cfe939`

## Objectif
Livrer le cinquième critère du ticket 02 (la liste servie dans le cadre de l'administration), ajouté
après la PR #64 qui avait déjà livré SC-02a à SC-02d.

## Contexte à charger
à lire      `openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md` — le contrat, dont le 5e critère sans id (36 l.)
à lire      `openspec/changes/003-remplir-emplacements/proposal.md` — le cadrage du change

## Acquis
- Statut du run : `blocked-verify`, mode `test` (run `wf_1c01a247-eef`, 7 agents, arrêt en phase Verify).
- La branche a été recréée depuis `origin/main` puis re-rebasée et poussée `--force-with-lease`.
- Le workflow a laissé **quatre fichiers modifiés, non commités**, dans l'arbre de travail de la branche :
  `src/pages/admin/mes-pages.astro`, `src/admin/ilots-svelte-5/monter.ts`,
  `tests/integration/liste-des-pages.test.ts`, `tests/static/liste-des-pages-statique.test.ts`.
  Approche prise : le contenu de la page est déposé dans un `<template>` inerte, et un script client
  monte l'îlot `Cadre` en lui confiant ce contenu comme enfant. Aucune PR, aucune case cochée.
- Le verifier a rendu son verdict, non tronqué :
  « SC-02e — ÉCHEC DE PREUVE, sur deux plans distincts. (1) NON OBSERVABLE : le cadre (barre latérale +
  menu) n'apparaît jamais dans la réponse HTTP — îlot Svelte monté uniquement par script (ADR-0006).
  Les 4 tests SC-02e passent mais ne prouvent aucun comportement : les 3 tests statiques sont des greps
  par regex sur le source (`?raw`) qui miroitent la forme de l'implémentation sans monter le composant ;
  le test d'intégration asserte la NON-restitution serveur du contenu. Aucun test ne fait naître le
  cadre. (2) ÉCART AU TEXTE DU CRITÈRE : il exige « Mes pages » marquée active ET menant à cet écran ;
  dans `Cadre.svelte` la rubrique est un `<span aria-current="page">`, aucune ancre ni `href` dans le
  fichier. La moitié « menant à cet écran » n'est ni implémentée ni testée. »
  Il a aussi refusé d'attester SC-02a et SC-02b : le corps HTTP ne porte plus que `<div id="ilot-cadre">`
  et un `<template>`, la page est visuellement vide sans JavaScript, et les tests existants ne
  distinguent plus « affiché » de « inerte dans un template ».
- Le test-validator avait signalé avant l'impl : le 5e critère n'a **aucun id** dans le ticket
  (« SC-02e » est une numérotation proposée par le brief) ; une assertion épingle le nom de la variable
  locale `contenu` ; SC-02a n'asserte jamais « une ligne par page » (pas de comptage de `<li>`).

## Prochaine étape
Trancher trois points avec l'humain avant toute relance : (1) inscrire l'id `SC-02e` dans le ticket ;
(2) « menant à cet écran » — exiger un lien navigable vers `/admin/mes-pages` dans le cadre, ou
reformuler le critère puisque l'état actif suffit quand on est déjà sur l'écran ; (3) accepter ou non
une page blanche sans JavaScript, et si oui, comment la couture HTTP prouve encore « affiche ».
Puis relancer `/scd-spec-dev:run 003-remplir-emplacements 02` (le code en vol est dans l'arbre de
travail de la branche, à commiter ou remiser d'abord).

## Écarté
- Rendre le cadre côté serveur dans la réponse HTTP : l'îlot est monté par script seul (ADR-0006),
  un rendu serveur le contredirait ; c'est pourquoi la preuve est passée par le `<template>`.
- Faire passer le critère au seul grep de source : le verifier l'a jugé non probant (miroir de la forme).
