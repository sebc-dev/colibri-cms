# Run bloqué — nom lu avec la déclaration (ticket 01)

Portée : 006-nom-des-emplacements · ticket 01
Ouvert le 2026-09-28 · branche `impl/nom-lu-avec-la-declaration-01` · HEAD `a0381dc`

## Objectif
Faire aboutir le run `tdd` du ticket 01 jusqu'à sa PR.

## Contexte à charger
à lire      `openspec/changes/006-nom-des-emplacements/tickets/01-nom-lu-avec-la-declaration.md` — le ticket et ses 4 critères
à lire      `openspec/changes/006-nom-des-emplacements/` — proposal, deltas, design du change

## Acquis
- Le run s'est arrêté en `blocked-quality`, après le segment tdd (tests écrits rouges, impl écrite), à la quality gate — avant review, record et PR.
- Le travail a été laissé **non commité** sur la branche : `src/core/pages/declaration.ts`, trois `content/pages/*/page.json`, et le test neuf `tests/unit/nom-emplacement.test.ts`.
- 7 checks sur 8 passaient ; seul `analyse` (bloquant, sans autofix déclaré) échouait, et uniquement dans le test neuf du ticket — aucun agent du cycle n'a le droit d'y toucher (pas d'`applier` déclaré).

Sortie du check `analyse` (`eslint --config eslint.config.analyse.js .`) :

```
tests/unit/nom-emplacement.test.ts
   65:21  error  Forbidden non-null assertion                                                       @typescript-eslint/no-non-null-assertion
   65:21  error  This assertion is unnecessary since it does not change the type of the expression  @typescript-eslint/no-unnecessary-type-assertion
  130:32  error  Forbidden non-null assertion                                                       @typescript-eslint/no-non-null-assertion
  130:32  error  This assertion is unnecessary since it does not change the type of the expression  @typescript-eslint/no-unnecessary-type-assertion

✖ 4 problems (4 errors, 0 warnings)
  2 errors and 0 warnings potentially fixable with the `--fix` option.
```

## Prochaine étape
J'allais proposer à l'humain de retirer les deux `!` superflus (l. 65 et 130) du test — édition humaine, l'assertion restant inchangée —, de commiter le travail sur la branche, puis de relancer `/scd-spec-dev:run 006-nom-des-emplacements 01` (ou de reprendre le workflow `wf_2cdf36ad-b48` dans la même session).

## Écarté
- Laisser un agent corriger le test : le contrat interdit toute édition de test hors `applier`, et `quality.json` n'en déclare pas.
- Déclasser `analyse` en advisory pour passer : ce serait désarmer un contrôle pour un défaut de deux caractères.
