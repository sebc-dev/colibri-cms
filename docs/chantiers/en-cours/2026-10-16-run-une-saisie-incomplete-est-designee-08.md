# Run bloqué — 08, une saisie incomplète est désignée

Portée : 012-envoi-des-demandes-de-devis · ticket 08
Ouvert le 2026-10-16 · branche `impl/une-saisie-incomplete-est-designee-08` · HEAD `cf62050`

## Objectif
Faire aboutir le run `wf_b088821a-ad3` du ticket 08 jusqu'à la PR.

## Contexte à charger
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/tickets/08-une-saisie-incomplete-est-designee.md` — le ticket à honorer
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/` — le change (proposal, delta, design)

## Acquis
- Le run s'est arrêté en `blocked-quality`, mode `tdd`, après la ceinture et avant la review.
  Le code et les tests du ticket sont restés NON commités sur la branche.
- La ceinture était propre (`failed: 0`, diff des tests additif seulement).
- Le check bloquant `analyse` a fini rouge, l'agent `quality-analyse` ayant rendu
  `applicable: false` parce qu'une erreur tombait dans un test neuf. Sortie rejouée par l'agent
  (`npx eslint --config eslint.config.analyse.js` sur les 8 fichiers du ticket) :

```
src/core/formulaires/saisie.ts
  41:67  error  Use concise character class syntax '\d' instead of '[0-9]'  sonarjs/concise-regex
  46:17  error  Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed  sonarjs/cognitive-complexity
src/render/formulaire/module.ts
  97:11  error  Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined  @typescript-eslint/no-unnecessary-condition
tests/unit/formulaires/saisie.test.ts
  49:45  error  Do not delete dynamically computed property keys  @typescript-eslint/no-dynamic-delete
✖ 4 problems (4 errors, 0 warnings)
```

- Corrections proposées par l'agent pour le code : `/\d/` à `saisie.ts:41` ; extraction d'un
  `motifDuChamp` à retours anticipés hors de la boucle de `verifierSaisie` ; `copie.textContent.trim()`
  sans `?? ''` à `module.ts:97`.
- Retouche du test faite à la main (même voie qu'au ticket 07) : les lignes 48-49 de
  `tests/unit/formulaires/saisie.test.ts` construisent `valeurs` par `Object.fromEntries(… .filter(([cle])
  => !retirer.includes(cle)))` au lieu du `delete`. Vérifiée : `eslint --config
  eslint.config.analyse.js` sortie 0, `eslint` sortie 0, `tsc --noEmit` sortie 0, `vitest run` 22/22.
  Les trois tests du ticket sont indexés (`git add`) ; sha256 du test retouché `a212f745…eb61`.

## Prochaine étape
Reprendre dans la session qui a lancé le run :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.797731.js",
         resumeFromRunId: "wf_b088821a-ad3",
         args: { changeDir: "openspec/changes/012-envoi-des-demandes-de-devis", ticket: "08",
                 oldBase: "impl/une-demande-complete-part-par-e-mail-07", rerun: "2" })
```

Hors de cette session : commiter la retouche, puis relancer `/scd-spec-dev:run 012-envoi-des-demandes-de-devis 08`.
Après le run, vérifier que le test commité porte bien `Object.fromEntries` à la ligne 48.

## Écarté
- Laisser un agent corriger le test : aucun n'en a le droit (pas d'`applier` déclaré au projet).
