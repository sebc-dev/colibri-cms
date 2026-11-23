# Run bloqué — ticket 10 : l'instance maintient la clé d'écriture en vie chaque semaine

Portée : 020-deploiement-instance-client · ticket 10
Ouvert le 2026-11-19 · branche `impl/l-instance-maintient-la-cle-d-ecriture-en-vie-chaque-semaine-10` · HEAD `0b7980a`

## Objectif
J'allais mener le ticket 10 jusqu'à sa PR par `/scd-spec-dev:run-parallel 01 10` (mode tdd), empilé
sur la branche du ticket 01 parce que les deux tickets modifient `wrangler.jsonc`.

## Contexte à charger
à lire      `openspec/changes/020-deploiement-instance-client/tickets/10-l-instance-maintient-la-cle-d-ecriture-en-vie-chaque-semaine.md` — le contrat du ticket
à lire      `openspec/changes/020-deploiement-instance-client/` (proposal, design, specs) — le change

## Acquis
- Le run `wf_3c85537d-fef` s'est arrêté en `blocked-red` sur le ticket 10, après deux passes de
  l'implémenteur, avant la quality gate et la review. Le ticket 01 a abouti (PR #367, CI verte).
- **Tout le travail du ticket 10 est dans le worktree, non commité** — c'est son seul exemplaire :
  `/home/negus/projets/colibri-cms/.git/scd-worktrees/l-instance-maintient-la-cle-d-ecriture-en-vie-chaque-semaine-10`
  - neufs : `src/entree-worker.ts`, `src/platform/publication/maintien-de-la-cle.ts`,
    `tests/integration/maintien-de-la-cle.test.ts` ;
  - modifiés : `wrangler.jsonc`, `wrangler.astro.jsonc`, `docs/architecture/context.c4`,
    `docs/architecture/model.c4`.
- `npm test` dans ce worktree : 1528 verts, 2 rouges, tous deux dans le test neuf — SC-10c (401) et
  SC-10c (403). Typecheck et lint propres.
- Cause, relevée dans le test : il se contredit lui-même.
  - ligne 29 : `const CLE = 'ghp_cle-secrete-de-maintien-0123456789';`
  - ligne 31 : `const MESSAGE = '[maintien] clé du dépôt';`
  - ligne 163 : la trace ne doit contenir aucun fragment de 8 caractères de `CLE`.
  Le fragment de l'indice 19 est `maintien`, et le message imposé le contient. Aucun code de
  production ne peut satisfaire les deux à la fois ; le code ne consigne que `{ issue }`.

```
AssertionError: fragment de la clé à 19: expected '[["[maintien] clé du dépôt",{"issue":…' not to contain 'maintien'
```

- Empreinte du test au moment du blocage :
  `9f961cf980771a8ff5611a8168a2ca2857177ba96b0ef473a3c2fe2ff56f2873`.

## Prochaine étape
Retouche humaine de la ligne 29 du test neuf : une clé qui ne partage aucun fragment de 8 caractères
avec le message, par exemple `'ghp_cle-secrete-du-depot-0123456789'`. La retouche ne change pas ce
que le test vérifie. Puis `git -C <worktree> add tests/integration/maintien-de-la-cle.test.ts`, et
reprise dans la session qui a lancé le run, sur la seule chaîne, avec le jeton `rerun` transmis au
ticket 10 (la copie de `implement-parallel.js` doit porter `rerun: step.rerun`) :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-parallel.463549.js",
         resumeFromRunId: "wf_3c85537d-fef",
         args: { changeDir: "openspec/changes/020-deploiement-instance-client",
                 implPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.463549.js",
                 chains: [ { id: "01->10", tickets: [ { ticket: "01" },
                   { ticket: "10", base: "impl/le-fichier-d-instance-n-admet-que-des-champs-connus-01",
                     oldBase: "impl/le-fichier-d-instance-n-admet-que-des-champs-connus-01", rerun: "2" } ] } ] })
```

Après un `/clear`, la reprise n'existe plus : commiter la retouche et le travail du worktree sur la
branche du ticket, puis relancer `/scd-spec-dev:run 10`.

## Écarté
- Changer le message de la trace côté code : le test filtre le journal sur ce message exact.
- Reprise nue sans jeton `rerun` : elle resservirait le même échec depuis le cache.
- Supprimer le worktree : il porte le seul exemplaire du travail.

## Issue
La ligne 29 du test neuf a été retouchée sur décision humaine (clé factice
`ghp_cle-secrete-du-depot-0123456789`), sans changer ce que le test vérifie. La reprise `rerun: "2"`
a mené le ticket jusqu'au commit `15c4eb6`, puis s'est arrêtée en
`blocked-tests-touched-after-verify` : le correcteur de la review avait ajouté deux tests après la
ceinture (finding coverage-F-1). L'ajout a été audité par `test-edit-validator` contre la version de
la ceinture, retrouvée dans les objets git non référencés (sha256 `6f20ef2a…`) : verdict `ok`,
purement additif. Typecheck, lint, analyse et `npm test` (1532 verts) rejoués à la main, puis PR #368
ouverte à la main le 2026-11-19, en brouillon, empilée sur la branche du ticket 01.
La PR #368 a été fusionnée dans `main` le 2026-11-23 (commit `ab56f08`), tous checks verts. Fermé le
2026-11-23.
