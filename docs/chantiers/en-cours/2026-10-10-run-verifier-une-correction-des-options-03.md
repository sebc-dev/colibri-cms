# Run bloqué — ticket 03, vérifier une correction des options

Portée : 010-reglage-des-formulaires · ticket 03
Ouvert le 2026-10-10 · branche `impl/verifier-une-correction-des-options-03` · HEAD `93148f2`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/verifier-une-correction-des-options-03`

## Objectif
Faire aboutir le run du ticket 03 (mode `tdd`) jusqu'à la PR, après correction des erreurs du check
`analyse`, toutes situées dans les fichiers du ticket.

## Contexte à charger
à lire      `openspec/changes/010-reglage-des-formulaires/tickets/03-verifier-une-correction-des-options.md` — le ticket
à lire      `openspec/changes/010-reglage-des-formulaires/` — le change (proposal, specs, design)

## Acquis
- Le run parallèle `wf_77a145aa-1b3` (tickets 02 et 03) a mené le 02 à la PR #192 et arrêté le 03 en
  `blocked-quality`. Le code (`prix.ts`, `options.ts`, retouche de `declaration.ts`) et les deux tests
  neufs sont restés **non commités** dans le worktree ci-dessus, conservé : rien n'est perdu.
- Le check bloquant `analyse` a relevé 9 erreurs, toutes dans des fichiers du ticket. Sortie rejouée à
  la main dans le worktree après le run :

```
src/core/formulaires/options.ts
   35:22  error  Use concise character class syntax '\d' instead of '[0-9]'                           sonarjs/concise-regex
   53:17  error  Refactor this function to reduce its Cognitive Complexity from 39 to the 15 allowed  sonarjs/cognitive-complexity
  115:35  error  Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed  sonarjs/cognitive-complexity

src/core/formulaires/prix.ts
  18:22  error  Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined  @typescript-eslint/no-unnecessary-condition

tests/unit/formulaires/options.test.ts
  140:62  error  Invalid type "number" of template literal expression                                                @typescript-eslint/restrict-template-expressions
  283:45  error  Unnecessary optional chain on a non-nullish value                                                   @typescript-eslint/no-unnecessary-condition
  284:19  error  Unnecessary optional chain on a non-nullish value                                                   @typescript-eslint/no-unnecessary-condition
  297:18  error  Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined  @typescript-eslint/no-unnecessary-condition
  299:38  error  Unnecessary optional chain on a non-nullish value                                                   @typescript-eslint/no-unnecessary-condition

✖ 9 problems (9 errors, 0 warnings)
```

- Le conseiller `quality-analyse` a proposé trois retouches sûres (`trouve.at(2) ?? ''` à `prix.ts:18`,
  `\d` à `options.ts:35`, scinder la branche saut de ligne / longueur à `options.ts:115`) et jugé
  `appliquerOptions` (39 > 15) à découper : un remaniement, hors de portée du correcteur. Les 5 erreurs
  du test viennent de types que le code n'existait pas encore pour montrer (mode `tdd`) ; aucun agent
  n'a le droit d'y toucher.

## Prochaine étape
J'allais proposer à l'humain : les trois retouches, le découpage d'`appliquerOptions`, puis les 5
retouches de typage du test sans toucher à aucune assertion. Ensuite, reprise dans la session de
lancement, l'orchestrateur ne transmettant pas `rerun` : ajouter `rerun: step.rerun || undefined` aux
arguments du ticket dans la copie `.git/implement-parallel.1096548.js`, puis :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-parallel.1096548.js",
         resumeFromRunId: "wf_77a145aa-1b3",
         args: { changeDir: "openspec/changes/010-reglage-des-formulaires",
                 implPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.1096548.js",
                 chains: [{ id: "03", tickets: [{ ticket: "03",
                   oldBase: "impl/lire-la-declaration-des-formulaires-01", rerun: "2" }] }] })
```

Hors de cette session : commiter le travail dans le worktree, puis relancer
`/scd-spec-dev:run 010-reglage-des-formulaires 03` depuis ce worktree.

## Écarté
- Éteindre les règles par `eslint-disable` ou dans `eslint.config.analyse.js` : la fonction est neuve,
  sa complexité est un vrai défaut du ticket.
- Activer `noUncheckedIndexedAccess` pour rendre les types justes : décision de configuration hors du
  ticket.
