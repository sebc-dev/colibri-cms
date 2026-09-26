# Run bloqué — l'accueil mène à « Mes pages »

Portée : 005-mise-en-page-administration · ticket 01
Ouvert le 2026-09-25 · branche `impl/accueil-mene-a-mes-pages-01` (worktree, aucun commit) · HEAD `6ad044e`

## Objectif
Faire de `/admin/` un renvoi vers `/admin/mes-pages` derrière la garde de session inchangée, lancé
en `run-parallel` avec le ticket 02 (run `wf_f3929391-dcb`).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/01-accueil-mene-a-mes-pages.md` — le ticket
à lire      `openspec/changes/005-mise-en-page-administration/proposal.md` — le change
à lire      `tests/integration/fin-de-session.test.ts` — les deux cas qui sondent `/admin/` en attendant 200
à situer    `.git/scd-worktrees/accueil-mene-a-mes-pages-01/` — le SEUL exemplaire du travail (non commité)

## Acquis
- Le run s'est arrêté en `blocked-red` : le test neuf du ticket et l'implémentation de `index.astro`
  étaient écrits dans le worktree, le test du ticket passait seul, typecheck et lint étaient propres.
- La suite complète gardait 2 échecs, tous deux dans `fin-de-session.test.ts` (ticket 08 de
  `001-connexion-par-code`) : « repousse la date de dernier usage en base » et « une session valide
  reste accessible avant et après… » attendaient `GET /admin/` → 200. SC-01a exige désormais un 302 :
  les deux exigences s'excluent sur le même scénario.
- Ce fichier n'était ni dans `**Fichiers :**` du ticket ni parmi les préalables retirés par la PR #107
  (qui n'avait retiré que les tests périmés de `code-ouvre-la-session.test.ts`).

## Prochaine étape
Trancher, côté humain, comment `fin-de-session.test.ts` cesse d'utiliser `/admin/` comme sonde
« session valide → 200 » (par ex. sonder `/admin/mes-pages`), en PR directe comme #107 ; puis relancer
`/scd-spec-dev:run 005-mise-en-page-administration 01`, ou reprendre depuis le worktree.

## Écarté
- Laisser l'implementer éditer `fin-de-session.test.ts` : un test existant ne se touche jamais dans le run.
- Garder un 200 sur `/admin/` : contredit SC-01a et laisse l'impasse après la connexion.
