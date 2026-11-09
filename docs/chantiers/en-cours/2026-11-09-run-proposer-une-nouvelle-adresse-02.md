# Run bloqué — ticket 02 « Proposer une nouvelle adresse »

Portée : 017-remplacement-adresse-autorisee · ticket 02
Ouvert le 2026-11-09 · branche `impl/proposer-une-nouvelle-adresse-02` · HEAD `9ecf53c`

## Objectif
J'allais faire aboutir le run tdd du ticket 02, empilé sur `impl/ecran-adresse-e-mail-01` (PR #331
non fusionnée), jusqu'à sa PR.

## Contexte à charger
à lire      `openspec/changes/017-remplacement-adresse-autorisee/tickets/02-proposer-une-nouvelle-adresse.md` — le contrat du ticket
à lire      `openspec/changes/017-remplacement-adresse-autorisee/` — le change (proposal, deltas, design)

## Acquis
- Le run `wf_71262fd6-daf` s'est arrêté en `blocked-quality` après tests rouges, code et ceinture :
  le code, la migration et les deux tests neufs sont restés non commités sur la branche.
- Sortie de la gate, non tronquée :
  `analyse` blocking fail — 2 erreurs eslint (config analyse), locationsNature `test` :
  `tests/integration/adresse-e-mail-proposer.test.ts:301:26 no-confusing-void-expression (arrow shorthand retourne une expression void)` ;
  `tests/integration/double-api-adresses.ts:75:21 restrict-template-expressions (type number dans un template literal)`.
  Les 9 autres checks étaient passés.

## Prochaine étape
Retoucher les deux seules lignes de test (accolades autour de l'`expect` du `vi.waitFor` ;
`String(numero)` dans le gabarit), les vérifier, `git add` des deux tests, puis reprendre dans la
session qui a lancé le run :
`Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.3243580.js", resumeFromRunId: "wf_71262fd6-daf", args: { changeDir: "openspec/changes/017-remplacement-adresse-autorisee", ticket: "02", base: "impl/ecran-adresse-e-mail-01", oldBase: "impl/ecran-adresse-e-mail-01", rerun: "2" })`.
Hors de cette session : commiter la correction puis relancer `/scd-spec-dev:run 017 02`.

## Écarté
- Reprise nue sans `rerun` — elle resservirait le même échec depuis le cache.
