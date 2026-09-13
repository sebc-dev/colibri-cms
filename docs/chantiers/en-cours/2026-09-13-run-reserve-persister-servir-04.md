# Run bloqué — la réserve : téléverser, persister, servir (ticket 04)

Portée : 004-bibliotheque-de-medias · ticket 04
Ouvert le 2026-09-13 · branche `impl/reserve-persister-servir-04` · HEAD `8971f5d`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/reserve-persister-servir-04` —
**seul exemplaire du travail**, rien n'est commité ni poussé.

## Objectif
Faire passer la quality gate du ticket 04 puis reprendre le run là où il s'est arrêté (review,
PR) — le comportement, lui, était vérifié.

## Contexte à charger
à lire      `openspec/changes/004-bibliotheque-de-medias/tickets/04-reserve-persister-servir.md` — les critères et le mode `test` (24 l.)
à lire      `openspec/changes/004-bibliotheque-de-medias/proposal.md` — le change que le ticket honore

## Acquis
- Run `run-parallel` (wf_7d0edec2-c05) arrêté en `blocked-quality` après la gate : les 4 critères
  avaient été vérifiés par le `verifier` en contexte frais (ceinture propre, suite complète verte).
- Le seul échec **bloquant** était `typecheck`, entièrement dans le test neuf, non suivi
  (`tests/integration/reserve-persister-servir.test.ts`) — aucun agent n'a le droit de l'éditer
  (aucun `applier` déclaré dans `.claude/quality.json`), d'où l'arrêt. Sortie réelle :
  ```
  tests/integration/reserve-persister-servir.test.ts(180,31): error TS2322: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'.
    Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'ArrayBufferView<ArrayBuffer>'.
      Types of property 'buffer' are incompatible.
        Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
          Type 'SharedArrayBuffer' is missing the following properties from type 'ArrayBuffer': resizable, resize, detached, transfer, transferToFixedLength
  (idem aux lignes 289,29 et 313,31)
  ```
  Cause diagnostiquée en amont des symptômes : les helpers `construireEnTetePng` (l. 98) et
  `construireEnTeteJpeg` (l. 121) déclarent un retour `Uint8Array`, passé ensuite à `new File([…])`.
- Échec **en avis** `dup` : le port `interface DB` duck-typé de `src/platform/medias/magasin.ts`
  recopie celui de `brouillons/magasin.ts` — patron déjà en ligne de base (`brouillons` ↔ `session`),
  à acter en review comme duplication assumée.

## Prochaine étape
Resserrer l'annotation de retour des deux helpers du test en `Uint8Array<ArrayBuffer>` (l. 98 et
121, rien d'autre), rejouer `npm run typecheck` dans le worktree, puis relancer
`/scd-spec-dev:run 004-bibliotheque-de-medias 04` depuis ce worktree.

## Écarté
- Faire corriger le test par un agent du run — interdit par le contrat (producteur ≠ vérificateur,
  aucun `applier` déclaré) ; c'est un geste humain.
- Extraire un port D1 partagé sous `src/platform/` pour résorber `dup` — inaugurerait le premier
  import intra-`platform/`, contre la convention des trois magasins ; relèverait d'un ADR dédié.
- Renommer les types de l'interface pour faire taire `jscpd` — déplace la duplication sans la
  supprimer.
