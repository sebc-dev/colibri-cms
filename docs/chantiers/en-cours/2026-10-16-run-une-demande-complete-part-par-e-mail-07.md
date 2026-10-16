# Run bloqué — 07, une demande complète part par e-mail

Portée : 012-envoi-des-demandes-de-devis · ticket 07
Ouvert le 2026-10-16 · branche `impl/une-demande-complete-part-par-e-mail-07` · HEAD `4647996`

## Objectif
Faire aboutir le run `wf_455c061f-bcc` du ticket 07 jusqu'à la PR.

## Contexte à charger
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/tickets/07-une-demande-complete-part-par-e-mail.md` — le ticket à honorer
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/` — le change (proposal, delta, design)

## Acquis
- Le run s'est arrêté en `blocked-quality`, mode `tdd`, après la ceinture et avant la review.
  Le code et les tests du ticket sont restés NON commités sur la branche.
- La gate avait corrigé un clone neuf de `src/render/formulaire/module.ts` (check `dup`).
- Le check bloquant `analyse` avait fini rouge, l'agent `quality-analyse` ayant rendu
  `applicable: false` parce qu'une erreur tombait dans un test neuf. Sortie de `npm run analyse` :

```
src/core/formulaires/courriel.ts
  10:18  error  Rename interface "CourrielComposé" to match the regular expression ^\$?[A-Z][a-zA-Z0-9]*$  sonarjs/class-name
src/core/formulaires/demande.ts
  18:21  error  Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking  sonarjs/super-linear-regex
tests/integration/envoi-d-une-demande.test.ts
  158:31  error  Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically  sonarjs/no-alphabetical-sort
✖ 3 problems (3 errors, 0 warnings)
```

- Corrections proposées par l'agent, vérifiées par lui à `eslint --stdin` :
  `CourrielComposé` → `CourrielCompose` (l. 10 et 62) ; `FORME_EMAIL` →
  `/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/` (la forme de `src/core/reglages/coordonnees.ts:39`) ;
  `Object.keys(message).sort((a, b) => a.localeCompare(b))` au test, l. 158.

## Prochaine étape
J'allais faire corriger la ligne 158 du test par l'humain, indexer les tests (`git add`, sinon
l'implémenteur rejoué annule la retouche), puis reprendre dans la session qui a lancé le run :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.324929.js",
         resumeFromRunId: "wf_455c061f-bcc",
         args: { changeDir: "openspec/changes/012-envoi-des-demandes-de-devis", ticket: "07",
                 oldBase: "impl/l-apercu-montre-le-formulaire-et-n-envoie-rien-06", rerun: "2" })
```

Hors de cette session : commiter la correction, puis relancer `/scd-spec-dev:run 012-envoi-des-demandes-de-devis 07`.
Après le run, vérifier que le test commité porte bien `localeCompare` à la ligne 158.

## Écarté
- Laisser un agent corriger le test : aucun n'en a le droit (pas d'`applier` déclaré au projet).
