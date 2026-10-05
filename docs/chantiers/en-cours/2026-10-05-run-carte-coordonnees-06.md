# Run bloqué — carte Coordonnées (ticket 06)

Portée : 008-reglages-transverses · ticket 06
Ouvert le 2026-10-05 · branche `impl/carte-coordonnees-06` · HEAD `487b5db`

## Objectif
Livrer la carte Coordonnées de l'écran des réglages (SC-06a–e, mode `test`) ; le run s'est arrêté
en `blocked-verify`.

## Contexte à charger
à lire      `openspec/changes/008-reglages-transverses/tickets/06-carte-coordonnees.md` — le ticket
à lire      `openspec/changes/008-reglages-transverses/` — proposal, deltas, design du change

## Acquis
- Le workflow avait écrit l'îlot `CarteCoordonnees.svelte` et son montage dans `reglages.astro`,
  plus deux fichiers de test neufs (laissés non commités sur la branche, avec le code).
- Les dix tests neufs passaient ; la ceinture a rougi sur un test **existant** du ticket 04 :

```
FAIL tests/integration/ecran-reglages.test.ts > SC-04c
AssertionError: expected [ 'h1', 'h2', 'div', 'section', …(8) ] to include 'script'
(ecran-reglages.test.ts:205)
Test Files 1 failed | 52 passed (53) ; Tests 1 failed | 310 passed (311)
```

- Cause relevée par le verifier : le montage de l'îlot ajoutait un `<script>` de module **dans**
  `<main>`, alors que SC-04c restreint les balises de `<main>` à une liste fermée.
- L'implementer avait laissé `afficherPastilleDeBrouillon()` intacte (signature figée par un test
  statique) et ajouté `afficherPastilleDansLaZone(zone)` à côté.

## Prochaine étape
Trancher entre deux voies : (A) sortir le `<script>` de montage hors de `<main>` dans
`reglages.astro` (code seul, SC-04c intact) ; (B) l'humain ajoute `script` à la liste de SC-04c.
Appliquer, puis reprendre dans la session d'origine :
`Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.1915256.js",
resumeFromRunId: "wf_a2f6bea7-2c4", args: { changeDir: "openspec/changes/008-reglages-transverses",
ticket: "06", oldBase: "impl/enregistrer-les-coordonnees-05", rerun: "2" })`.
Hors de cette session : commiter la correction, puis relancer `/scd-spec-dev:run 008-reglages-transverses 06`.

## Écarté
- Laisser un agent du run élargir la liste de SC-04c : aucun agent n'a le droit de modifier un
  test existant, et ajouter `script` à la liste affaiblit la garde « aucun balisage interprété ».
