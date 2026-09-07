# Run bloqué — assembler la liste des pages dans le cadre — RÉSOLU

Portée : 003-remplir-emplacements · ticket 02
Ouvert le 2026-09-07 · RÉSOLU le 2026-09-07 (landé via review, PR #65) · branche `impl/liste-des-pages-02`

## Résolution
L'humain a arbitré la ceinture comme **faux positif** (voir 2e run) : le réalignement des tests est
légitime, on lande via la **review** plutôt qu'en rejouant la ceinture.
- Review 8 dimensions en contexte frais (producteur ≠ vérificateur) sur le diff `origin/main..HEAD` :
  **0 finding bloquant**, 6 suggestions, **toutes rejetées au triage adversarial** (style/goût,
  spéculation non ancrée, hors-scope). Détail dans le corps de la PR #65.
- DoD verte sur l'état commité : `typecheck`/`build`/`test`/`lint` tous exit 0, **94 tests** (workerd).
- SC-02e coché [x] (commit `a8c5e6d`) — livré ; la moitié « assemblage » reste en `humanCheckRequired`,
  portée par la **checklist visuelle de la PR** (constater le cadre autour de la liste dans un navigateur).
- **PR #65** ouverte, ready, base `main`, non empilée : https://github.com/sebc-dev/colibri-cms/pull/65
- Reste au fil de la forge (hors chantier) : le contrôle visuel de SC-02e, puis le merge de la PR.

## Objectif
Livrer le 5e critère du ticket 02 (SC-02e) : la liste servie DANS le cadre de l'administration,
ajouté au ticket après que les quatre premiers avaient été livrés et mergés.

## Contexte à charger
à lire      `openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md` — le contrat, dont SC-02e et sa nuance de vérif (44 l.)
à lire      `openspec/changes/003-remplir-emplacements/proposal.md` — le cadrage ; « Mes pages » = un vrai point d'entrée (58 l.)
à situer    `src/admin/ilots-svelte-5/Cadre.svelte` — la rubrique sans lien, à doter d'un href ; conclusion dans Acquis
à situer    PR #64 — la première livraison du ticket, mergée, ne pas relire
à situer    journal du 1er run `wf_1c01a247-eef` — hors dépôt (sous `~/.claude`), verdict distillé ici
à situer    journal du 2e run `wf_4863c1d2-511` — hors dépôt (sous `~/.claude`), verdict distillé plus bas
à situer    wip `56450a3` — le code en vol correct et vert du 2e run (impl + tests réalignés), non relu ici

## Acquis

### 1er run — `blocked-verify` (SC-02e non observable)
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

### 2e run — `blocked-verify` (ceinture : faux positif structurel)
- Relancé le 2026-09-07, le 2e run a produit l'approche arbitrée et s'est de nouveau arrêté en
  `blocked-verify` (mode `test`), avant review, PR ou coche — mais pour une **cause différente**.
- **Le code en vol du 2e run est correct et vert**, préservé dans le wip `56450a3` (impl + tests
  réalignés, arbre propre). Le verifier a inspecté le working-tree (la vraie tête du ticket) :
  - impl : `Cadre.svelte` pose le vrai `<a href="/admin/mes-pages">` + `aria-current=page` (les 4
    autres rubriques sans href) ; `mes-pages.astro` rend la liste NATIVEMENT dans la réponse HTTP
    (plus de `<template>`) ; `monter.ts` monte le cadre AUTOUR côté client.
  - `SC-02a` renforcé (comptage exact des `<li>` → `toEqual(['Accueil','Tarifs','Contact'])`), les
    deux points de test du 1er run corrigés. `SC-02a-d` vérifiés. `SC-02e` moitié HTTP-observable
    VERTE ; moitié « assemblage » bascule en `observé` → `humanCheckRequired` (voir plus bas).
  - Preuves : `npx vitest run` sur les 2 fichiers → 6 passed, 0 failed ; suite complète `npm test` →
    94 passed ; `npm run typecheck` / `build` / `lint` propres. Aucun escape-hatch
    (`.skip`/`.only`/`@ts-ignore`/`as any`/`eslint-disable`).
- **Pourquoi ça bloque quand même — la ceinture.** En mode `test`, la vérif exige un `git diff` VIDE
  sur les tests (garde anti-triche : « l'implementer n'a pas affaibli les tests »). Or les tests ont
  DÛ être réécrits pour honorer l'arbitrage 3 : le wip précédent `b26e9b2` avait commité les tests de
  l'approche `<template>` désormais **annulée**, donc toute réécriture fidèle fait diverger le diff.
  La ceinture ne sait pas distinguer un réalignement légitime d'une triche → `testsDiffEmpty:false` →
  `blocked-verify`. **Faux positif structurel**, pas un défaut du code.
- Geste posé par l'orchestrateur (ce run) : commit du code en vol en wip `56450a3`, comme
  `b26e9b2` avant lui. Effet de bord recherché : **HEAD porte désormais la base arbitrée** (tests
  réalignés commités) au lieu de la base `<template>` empoisonnée.
- `humanCheckRequired` de `SC-02e` (moitié assemblage, non automatisable en workerd, ADR-0006) :
  `npm run dev` → se connecter à l'administration → ouvrir `/admin/mes-pages` dans un navigateur et
  confirmer VISUELLEMENT : (1) le cadre est monté autour de la liste (barre latérale + menu) ;
  (2) « Mes pages » marquée active (surlignage `bg-primary` + `aria-current=page`) ; (3) « Mes pages »
  est un vrai lien navigable menant à `/admin/mes-pages` ; (4) la liste (Accueil, Tarifs, Contact)
  s'affiche À L'INTÉRIEUR du cadre, jamais à la place de la barre latérale.

## Prochaine étape
Décision humaine requise — c'est le 3e passage sur `SC-02e`, et la ceinture est une tension
**structurelle**, pas un bug de code. Deux voies :
1. **Relancer** `/scd-spec-dev:run 003-remplir-emplacements 02`. La branche est là, l'arbre est
   propre, et HEAD (`56450a3`) porte maintenant la base arbitrée. **Pari, non vérifié** : si le
   `test-writer` laisse en place les tests déjà réalignés et commités, la ceinture comparera contre
   eux → diff vide → elle passe. S'il les réécrit, elle rebloquera à l'identique.
2. **Arbitrer la ceinture directement** : le working-tree est correct et vert (94 tests, build/lint
   propres) ; la seule chose qui manque est un chemin de landing qui n'exige pas un diff test vide
   contre une base qui portait les tests annulés. À trancher avec l'humain (ex. acter que le
   réalignement des tests est légitime et faire passer par la review sans rejouer la ceinture, ou
   assainir la base `b26e9b2` avant relance).

`/scd-spec-dev:pause` avant tout `/clear` : cette fiche est le seul endroit où ce 2e run bloqué laisse
une trace. Le travail n'est pas perdu (wip `56450a3`).

## Écarté
- Rendre le cadre côté serveur dans la réponse HTTP : l'îlot est monté par script seul (ADR-0006), un
  rendu serveur le contredirait ; d'où le passage par le `<template>` — lui-même écarté (arbitrage 3).
- Faire passer le critère au seul grep de source : le verifier l'a jugé non probant (miroir de la forme).
- Éditer/supprimer les tests à la main pour « satisfaire » la ceinture : ce serait précisément la
  triche que la ceinture garde ; le réalignement est déjà fait légitimement dans le wip, le problème
  est la base commitée, pas le contenu des tests.
