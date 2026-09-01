# Décisions figées — index et correspondance des numérotations

> **Ce fichier n'est pas un ADR.** Il se modifie ; les ADR, non. Il existe pour une raison
> précise : **deux espaces de numérotation cohabitent dans ce dépôt**, et sans cette table un
> renvoi se lit de travers.

## Pourquoi deux espaces

Les ADR du cycle `1.x` sont archivés dans [`docs/1.x/adr/`](../1.x/adr/) avec leurs numéros
d'origine. La reprise vers `2.x` a tranché que **cette numérotation ne survit pas** : chaque
décision promue reçoit un `NNNN` neuf, attribué dans l'ordre croissant des numéros 1.x.

Le corps de chaque ADR promu est repris **verbatim**. Il cite donc les autres décisions **par
leur numéro 1.x** — c'est voulu, un ADR ne se réécrit pas pour suivre une renumérotation. La
règle de lecture tient en une ligne :

> **Un `ADR-00NN` cité DANS le corps d'un ADR promu désigne le numéro 1.x.**
> Le numéro 2.x est celui du nom de fichier.

## Correspondance

| 2.x | 1.x | Décision |
|---|---|---|
| [0001](./0001-auth-implementation-maison-sur-d1.md) | 0006 | Authentification maison sur D1, quatre mécanismes |
| [0002](./0002-acheminement-email-routing-send-email.md) | 0009 | Acheminement par Email Routing, courriel inerte |
| [0003](./0003-tests-vitest-dans-workerd.md) | 0013 | Tests — Vitest dans `workerd`, Playwright pour les parcours |
| [0004](./0004-en-tetes-de-reponse-deux-porteurs.md) | 0015 | En-têtes de réponse — deux porteurs |
| [0005](./0005-configuration-d-instance-quatre-lieux.md) | 0020 | Configuration d'instance — quatre lieux |
| [0006](./0006-administration-sans-directive-client.md) | 0024 | Administration sans directive `client:*` |
| [0007](./0007-garde-de-session-par-import-et-surface-publique-close.md) | 0026 | Garde de session par l'import, surface publique close |
| [0008](./0008-en-tetes-d-administration-poses-par-un-middleware.md) | — | En-têtes d'administration posés par un middleware |
| [0009](./0009-base-de-composants-des-ilots-shadcn-svelte.md) | — | Base de composants des îlots d'administration — shadcn-svelte |

`ADR-0008` n'a pas d'antécédent 1.x : il a été déposé en candidat le 2026-08-19 par le plan de
la feature `002-connexion-par-code`, et promu directement. `ADR-0009` non plus : décision neuve,
introduite en session `/scd-sdd:vision` le 2026-09-01 (base de composants des îlots
d'administration).

## Ce qui n'est pas encore promu

**26 décisions du cycle 1.x attendent encore** dans
[`docs/adr/_candidates/`](./_candidates/). Elles restent des candidats : `CLAUDE.md` dit « ne
pas contredire un ADR accepté », et un candidat n'en est pas un. Un renvoi vers un numéro 1.x
absent de la table ci-dessus pointe donc vers une décision **non promue** — la lire dans
l'archive, ne pas la traiter comme figée.

La promotion se fait par `/scd-sdd:adr`, et c'est sa seule voie.

## Deux gestes qui restent à la main

- **Les brouillons promus ne sont pas supprimés.** Les huit fichiers correspondants subsistent
  dans `_candidates/` et se représenteront en candidats à la passe suivante. Ils sont à retirer.
- **Le registre de `docs/ci.md`** (§ *Registre des ADR vérifiés en CI*) cite encore les numéros
  1.x. Il pointe vers l'archive, donc il résout — mais il désigne des décisions désormais
  promues sous d'autres numéros. À reprendre quand la promotion sera complète.
