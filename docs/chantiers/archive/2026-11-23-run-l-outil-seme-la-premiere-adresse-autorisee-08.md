# Run bloqué — l'outil de livraison sème la première adresse autorisée

Portée : 020-deploiement-instance-client · ticket 08
Ouvert le 2026-11-23 · Actualisé le 2026-11-23 · branche `impl/l-outil-seme-la-premiere-adresse-autorisee-08` · HEAD `62db4ea`

## Objectif
Mener le ticket 08 jusqu'à sa PR : le run du 2026-11-23 s'est arrêté en `blocked-quality`, sur un
défaut de style dans le test unitaire neuf, que la quality gate n'avait pas le droit de corriger.

## Contexte à charger
à lire      `openspec/changes/020-deploiement-instance-client/tickets/08-l-outil-seme-la-premiere-adresse-autorisee.md` — le contrat du ticket
à lire      `openspec/changes/020-deploiement-instance-client/design.md` — le change que le ticket implémente

## Acquis
- Le run (mode `tdd`) avait écrit les deux tests, puis le code, puis passé la ceinture ; il s'est
  arrêté à la quality gate, avant la review, le commit et la PR. Rien n'était commité : le code et
  les tests étaient dans l'arbre de travail de la branche du ticket.
- Le seul check en échec était `analyse` (bloquant), localisé dans le test, non corrigeable par
  autofix. Sortie d'erreur :
  `tests/unit/premier-semis.test.ts 38:6 error Replace these 3 tests with a single Parameterized one sonarjs/parameterized-tests`
- Les trois tests visés étaient les trois cas `SC-08c` consécutifs (même adresse ; autre casse ;
  espaces de bord), de même corps et de même verdict attendu `deja-en-place`.
- Empreintes des tests au moment du blocage :
  `tests/unit/premier-semis.test.ts` `3ace2aa46ee9e47dd301c735ea45028b07c4b109b674c2d0e418fb6441209b1e`,
  `tests/integration/premier-semis.test.ts` `6a716faeb2217ae3b085df17898b59d0e7899284da44da0e516691549446fbc5`.

## Prochaine étape
Faire fondre par l'humain les trois cas `SC-08c` en un seul `it.each` à trois lignes, sans changer
ni les adresses essayées ni l'assertion ; `git add tests/unit/premier-semis.test.ts` ; puis
reprendre, dans la session qui a lancé le run seulement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.753566.js",
         resumeFromRunId: "wf_12756ddf-abf",
         args: { changeDir: "openspec/changes/020-deploiement-instance-client", ticket: "08",
                 oldBase: "impl/l-outil-cree-la-base-dans-le-compte-du-fichier-d-instance-07",
                 rerun: "2" })
```

Après un `/clear`, cette reprise n'existait plus : il fallait commiter le travail en vol puis
relancer `/scd-spec-dev:run 020-deploiement-instance-client 08`, qui repartait du début.

## Écarté
- Reprise nue, sans jeton `rerun` — le cache aurait resservi le même échec à l'identique.
- `eslint-disable` sur la ligne — c'est un escape-hatch, que le filet CI annote.

## Issue
Les trois cas `SC-08c` du test unitaire ont été fondus en un `it.each` avec l'accord de l'humain,
sans changer ni les adresses ni l'assertion. La reprise `rerun: "2"` a mené le ticket jusqu'au commit
`0efa04e` et à la PR #378. Les corrections de review error-handling-F-1 et coverage-F-1, rangées
« appliquées », avaient livré le code sans leurs tests : ils ont été ajoutés à la main, à la demande
de l'humain, par le commit `1f1c306`. Fermé le 2026-11-23.
