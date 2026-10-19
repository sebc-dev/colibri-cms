# Run bloqué : les nombres du site et de chaque formulaire

Portée : 013-reception-et-suivi-des-demandes · ticket 05
Ouvert le 2026-10-19 · branche `impl/les-nombres-du-site-et-de-chaque-formulaire-05` · HEAD `4c482a1`

## Objectif
Mener le ticket 05 jusqu'à sa PR après l'arrêt du run `wf_8d2a9e0d-3b1` en `blocked-verify`.

## Contexte à charger
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/tickets/05-les-nombres-du-site-et-de-chaque-formulaire.md` — le ticket à honorer
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/` — le change (proposal, spec suivi-des-demandes, design D6)

## Acquis
- Le workflow avait écrit le code et les deux tests neufs du ticket, laissés non commités sur la branche.
  Les tests neufs passaient ; la ceinture les avait trouvés strictement additifs.
- La ceinture s'était arrêtée sur un test EXISTANT du ticket 03, non modifié :
  `tests/integration/liste-des-demandes.test.ts:315`, « SC-03a — cas limite : une demande retirée
  n'apparaît pas dans la liste ». Il attendait « Devis atelier » absent de tout le `<main>`. Le ticket 05
  (FR-077) fait paraître au tableau des nombres un formulaire qui n'a plus que des demandes retirées.
  Les deux ne pouvaient pas être vrais ensemble. Le ticket 05 ne déclarait aucune dérogation sur ce test.
- Sortie de la ceinture, telle quelle :
  > POURQUOI failed=1 : le testCommand est `npm test`. La suite complète (`npm test`, pretest compris) donne
  > 'Test Files 1 failed | 143 passed (144) / Tests 1 failed | 1104 passed (1105)', exit 1. Le test en échec
  > est un test EXISTANT, pas un test du ticket, et il n'a pas été modifié :
  > tests/integration/liste-des-demandes.test.ts:315, 'SC-03a — cas limite : une demande retirée n'apparaît
  > pas dans la liste' -> AssertionError: expected '<h1>Demandes</h1><p class="mt-4 font-medium">1 demande ·
  > 0 commande · 1 retirée</p><table ... aria-label="Nombres par formulaire">...<th scope="row" ...>Devis
  > atelier</th><td>0</td><td>0</td><td>1</td>...' not to contain 'Devis atelier'. C'est une régression qui
  > vient de l'implémentation : le nouveau tableau des nombres liste, comme le ticket l'exige, un formulaire
  > qui n'a que des retirées, et l'ancienne assertion `expect(principal).not.toContain('Devis atelier')` porte
  > sur tout le <main>. Sur HEAD 4c482a1 (sans ce changement), la CI était verte. Pour corriger il faut soit
  > restreindre cette assertion de test (modifier un test existant, donc une dérogation à arbitrer par un
  > humain), soit changer le code.
- SC-05a et SC-05c portaient chacun un constat humain au téléphone (recette CT-37.1 à CT-37.3).

## Prochaine étape
J'allais faire trancher l'humain sur la retouche du test du ticket 03 (restreindre l'assertion à la liste
`<ul>`, recommandé), la commiter seule sur la branche, puis reprendre — dans la session du lancement seulement :
`Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.375012.js", resumeFromRunId: "wf_8d2a9e0d-3b1", args: { changeDir: "openspec/changes/013-reception-et-suivi-des-demandes", ticket: "05", oldBase: "impl/filtrer-et-parcourir-la-liste-04", rerun: "2" })`
Hors de cette session : commiter la retouche, puis relancer `/scd-spec-dev:run 013-reception-et-suivi-des-demandes 05`.

## Écarté
- Cacher le formulaire du tableau : le ticket exige qu'un formulaire qui n'a plus que des retirées y paraisse.
- Reprise nue sans retouche : elle aurait resservi le même échec depuis le cache.
