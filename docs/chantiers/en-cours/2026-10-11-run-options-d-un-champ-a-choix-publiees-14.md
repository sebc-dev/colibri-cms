# Run bloqué — ticket 14, options d'un champ à choix publiées

Portée : 011-apercu-et-publication · ticket 14
Ouvert le 2026-10-11 · branche `impl/options-d-un-champ-a-choix-publiees-14` · HEAD `d7c70ec`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/options-d-un-champ-a-choix-publiees-14`
Bloqué par : la complexité de `deposerImages`, sur la branche du ticket 13 (PR #217)

## Objectif
Faire aboutir le run du ticket 14 (mode `tdd`), empilé sur la branche du ticket 13, jusqu'à sa PR
brouillon, après correction des deux erreurs du check `analyse`.

## Contexte à charger
à lire      `openspec/changes/011-apercu-et-publication/tickets/14-options-d-un-champ-a-choix-publiees.md` — le ticket
à lire      `openspec/changes/011-apercu-et-publication/` — le change (proposal, specs, design, ADR-0026)

## Acquis
- Le run parallèle `wf_56527fa6-1a7` a arrêté le 14 en `blocked-quality`. Le code et les deux tests
  neufs sont restés **non commités** dans le worktree ci-dessus, conservé. La ceinture était passée.
- Sortie rejouée à la main dans le worktree après le run :

```
src/core/publication/depot.ts
  126:23  error  Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed  sonarjs/cognitive-complexity

tests/unit/publication/plan-formulaires.test.ts
  76:10  error  This assertion is unnecessary since the receiver accepts the original type of the expression  @typescript-eslint/no-unnecessary-type-assertion

✖ 2 problems (2 errors, 0 warnings)
```

- La première erreur n'est pas du ticket 14 : elle vient du commit `d7c70ec` du ticket 13. Sa quality
  gate était passée ; la correction de review `securite-F-1` (refus `chemin-refuse` avant tout appel
  au dépôt), appliquée après la gate, a porté `deposerImages` à 19. La CI de la PR #217 échoue sur
  la même ligne.
- Deux constats d'avis, examinés et non imputables au ticket : `dup` est un faux positif dû au
  décalage d'une ligne (import ajouté ligne 14 de `src/platform/formulaires/magasin.ts`) ; knip
  signale `selectionnerImages` sans appelant, venu du ticket 13, que le ticket 15 doit brancher.

## Prochaine étape
1. Sur la branche du ticket 13, ramener la complexité de `deposerImages` sous 15 sans changer son
   comportement (sortir le calcul et la vérification des chemins dans une fonction à part), pousser.
2. Dans le worktree, replacer la branche sur la branche 13 à jour :
   `git rebase --autostash --onto origin/impl/deposer-les-images-publiees-13 d7c70ec`.
3. Retirer ` as InstantanePublication` ligne 76 du test : le type de retour du helper suffit.
4. Reprendre, `rerun: step.rerun` ajouté dans la copie de l'orchestrateur :
   `chains: [{ id: "14", tickets: [{ ticket: "14", base: "impl/deposer-les-images-publiees-13",
   oldBase: "impl/deposer-les-images-publiees-13", rerun: "2" }] }]`, `resumeFromRunId: "wf_56527fa6-1a7"`.

## Écarté
- Corriger `depot.ts` dans le ticket 14 : fichier du ticket 13, hors de la ligne `**Fichiers :**`.
- Déplacer l'import pour faire taire `dup` : tromperait la mesure sans changer le code.
- `eslint --fix` laissé sans regard sur le test : la retouche est d'une ligne, elle se fait lue.
