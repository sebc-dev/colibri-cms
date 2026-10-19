# Run bloqué : les nombres du site et de chaque formulaire

Portée : 013-reception-et-suivi-des-demandes · ticket 05
Ouvert le 2026-10-19 · Actualisé le 2026-10-19 · branche `impl/les-nombres-du-site-et-de-chaque-formulaire-05` · HEAD `75fa34e`

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
- L'humain avait choisi l'option A : l'assertion du ticket 03 se restreignait à la liste `<ul>`, commitée
  seule (`75fa34e`). La reprise `rerun: "2"` avait passé la ceinture, puis s'était arrêtée en
  `blocked-quality` sur `analyse`, sortie telle quelle :
  > 96:119 and 239:47/70/94 error Invalid type "number" of template literal expression
  > @typescript-eslint/restrict-template-expressions; 4 problems (4 errors, 0 warnings)
  Les quatre erreurs tombaient dans le test neuf `tests/integration/nombres-des-demandes.test.ts`. J'avais
  enveloppé les quatre nombres dans `String(…)`, sans toucher aux valeurs ni aux assertions, puis indexé
  les deux tests neufs du ticket avant la reprise.

## Prochaine étape
J'allais reprendre — dans la session du lancement seulement :
`Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.375012.js", resumeFromRunId: "wf_8d2a9e0d-3b1", args: { changeDir: "openspec/changes/013-reception-et-suivi-des-demandes", ticket: "05", oldBase: "impl/filtrer-et-parcourir-la-liste-04", rerun: "3" })`
puis vérifier que le test commité portait encore les `String(…)`.
Hors de cette session : commiter les retouches, puis relancer `/scd-spec-dev:run 013-reception-et-suivi-des-demandes 05`.

## Écarté
- Cacher le formulaire du tableau : le ticket exige qu'un formulaire qui n'a plus que des retirées y paraisse.
- Reprise nue sans retouche : elle aurait resservi le même échec depuis le cache.
