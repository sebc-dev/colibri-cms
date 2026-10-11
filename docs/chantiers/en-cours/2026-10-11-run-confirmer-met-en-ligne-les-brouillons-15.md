# Run bloqué — ticket 15, confirmer met en ligne les brouillons

Portée : 011-apercu-et-publication · ticket 15
Ouvert le 2026-10-11 · branche `impl/confirmer-met-en-ligne-les-brouillons-15` · HEAD `50e9d53`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/confirmer-met-en-ligne-les-brouillons-15`

## Objectif
Faire aboutir le run du ticket 15 (mode `test`) jusqu'à sa PR, empilée sur celle du ticket 11
(`impl/recapitulatif-des-images-11`).

## Contexte à charger
à lire      `openspec/changes/011-apercu-et-publication/tickets/15-confirmer-met-en-ligne-les-brouillons.md` — le ticket
à lire      `openspec/changes/011-apercu-et-publication/` — le change (proposal, specs, design)

## Acquis
- Le run parallèle `wf_4ca90c1a-225` a arrêté le 15 en `blocked-after-fix`, après la review. Le code
  et les tests neufs sont restés **non commités** dans le worktree ci-dessus, conservé. La ceinture
  était passée ; SC-15b et SC-15f étaient remontés comme constats humains.
- Le triage de la review a retenu cinq corrections. Le correcteur en a appliqué deux, côté `src/`
  seulement, et laissé les trois qui ne demandent que des tests :
  - `error-handling-F-2` : la première publication retirait de la branche `media` les deux images de
    départ, inscrites sans octets. Correction : relire l'originale empaquetée par la liaison `ASSETS`.
    `poursuivrePublication` prend un 5e paramètre obligatoire, `lireOriginale`.
  - `error-handling-F-1` : un échec de `finaliser`, après le dépôt réussi de la branche principale,
    libérait le verrou et affichait « Votre site n'a pas changé ». Correction : le `try/catch` ne couvre
    plus que la phase avant le dépôt principal ; raison `a-finaliser`, statut 503,
    `TEXTE_PUBLICATION_INACHEVEE`.
  - `coverage-F-1`, `coverage-F-2`, `coverage-F-3` : tests non écrits (panne du dépôt, gardes 401 et
    routes de `/admin/publication/suite`, message « déjà en cours » de l'îlot).
- Le 5e paramètre casse les quatre appels des tests neufs du ticket. Le correcteur a relevé
  `Test Files 2 failed | 97 passed (99) ; Tests 5 failed | 714 passed (719)`. Typage rejoué à la main
  dans le worktree après le run :

```
tests/integration/finalisation-de-la-publication.test.ts(44,23): error TS2554: Expected 5 arguments, but got 4.
tests/integration/finalisation-de-la-publication.test.ts(84,23): error TS2554: Expected 5 arguments, but got 4.
tests/integration/publier-en-un-geste.test.ts(55,23): error TS2554: Expected 5 arguments, but got 4.
tests/integration/publier-en-un-geste.test.ts(146,23): error TS2554: Expected 5 arguments, but got 4.
```

## Prochaine étape
J'allais passer `lecteurDesOriginalesEmpaquetees(env.ASSETS)` en 5e argument aux quatre appels
ci-dessus, retouche additive des tests neufs sans retirer d'assertion, puis écrire les tests de
`coverage-F-1`, `coverage-F-2` et `coverage-F-3`. Leurs consignes complètes sont dans l'entrée du
triage (`review-validator`) du journal `subagents/workflows/wf_4ca90c1a-225/journal.jsonl`, ligne 115.
Ensuite, reprendre dans la session de lancement — la copie de l'orchestrateur transmet `rerun` :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-parallel.973170.js",
         resumeFromRunId: "wf_4ca90c1a-225",
         args: { changeDir: "openspec/changes/011-apercu-et-publication",
                 implPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.973170.js",
                 chains: [{ id: "11->15", tickets: [
                   { ticket: "15", base: "impl/recapitulatif-des-images-11",
                     oldBase: "impl/recapitulatif-des-images-11", rerun: "2" } ] }] })
```

Hors de cette session : commiter le travail dans le worktree, puis relancer
`/scd-spec-dev:run 011-apercu-et-publication 15` depuis ce worktree.

## Écarté
- Retirer le 5e paramètre pour revenir au vert : cela annulerait `error-handling-F-2`, un défaut réel
  sur le chemin critique (les images de départ disparaîtraient du site à la première publication).
