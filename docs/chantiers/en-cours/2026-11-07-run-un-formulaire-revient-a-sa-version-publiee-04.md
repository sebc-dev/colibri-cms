# Run bloqué : un formulaire revient à sa version publiée

Portée : 015-restauration · ticket 04
Ouvert le 2026-11-07 · branche `impl/un-formulaire-revient-a-sa-version-publiee-04` · HEAD `cb942d2`

## Objectif
Faire aboutir le run du ticket 04 jusqu'à sa PR : il s'est arrêté en `blocked-quality`.

## Contexte à charger
à lire      `openspec/changes/015-restauration/tickets/04-un-formulaire-revient-a-sa-version-publiee.md` — le contrat du ticket
à lire      `openspec/changes/015-restauration/` — le change (proposal, design, deltas)

## Acquis
- Le workflow a écrit le code et les tests, non commités dans l'arbre de la branche : il s'est arrêté avant le record.
- La ceinture a tenu (`failed: 0`). Le check `analyse` a échoué sur les deux seuls tests neufs ci-dessous ; `quality-analyse` a rendu `applicable: false`, aucun agent n'ayant le droit de toucher un test.
- `dup` a aussi remonté 2 clones, en advisory : non bloquant.
- Le compteur `numeros_options` a demandé `lotSiAucunePublicationEnCours` dans `src/platform/publication/magasin.ts`, et l'implémenteur a ajouté `src/admin/MontageRevenirFormulaire.astro` : deux fichiers que le ticket ne liste pas.

Sortie d'erreur complète :

```
/home/negus/projets/colibri-cms/tests/integration/revenir-garde-fous.test.ts
  87:146  error  Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed  sonarjs/cognitive-complexity

/home/negus/projets/colibri-cms/tests/unit/formulaires/numeros-options.test.ts
  88:12  error  Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined  @typescript-eslint/no-unnecessary-condition

✖ 2 problems (2 errors, 0 warnings)
```

## Prochaine étape
J'allais retoucher les deux tests après accord de l'humain, puis `git add` des trois tests du ticket :
- `revenir-garde-fous.test.ts` : sortir la collecte des messages de SC-04c dans une fonction `messagesDuGeste()` de niveau module, sans retirer d'assertion.
- `numeros-options.test.ts:88` : `expect(numeros).toEqual({ parfum: 0 })`, et l'intitulé du test devient « est rendu à zéro ».

Puis reprendre, dans la session qui a lancé le run seulement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.35217.js", resumeFromRunId: "wf_5d3f3f58-dbf", args: { changeDir: "openspec/changes/015-restauration", ticket: "04", oldBase: "impl/un-reglage-revient-a-sa-version-publiee-03", rerun: "2" })
```

Après un `/clear` : commiter d'abord la correction, puis relancer `/scd-spec-dev:run 015-restauration 04` ; le run repart du début, écriture des tests comprise.

## Écarté
- Passer le retour de `numerosDuBrouillon` en `Partial<Record<string, number>>` : la signature actuelle est exacte, ce changement la déformerait pour satisfaire un test.
- Toucher à `eslint.config.analyse.js` ou poser un escape-hatch : le calibrage des règles n'est pas en cause.
