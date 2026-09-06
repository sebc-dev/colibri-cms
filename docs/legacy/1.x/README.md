# Archive du cycle `1.x`

**Déposée le 2026-08-23** par `/scd-sdd:migrate`, à la reprise de `scd-sdd` **2.1.0**.

Ce répertoire porte l'intégralité des documents produits sous le cycle précédent. **Rien n'a été
supprimé, rien n'a été réécrit** : chaque pièce est ici telle qu'elle était sur `main` au commit
qui précède la reprise. Elle reste lisible, greppable et datée.

**Plus aucune commande ne lit ce répertoire.** Les artefacts du cycle courant — `SPEC.md` et les
tickets `NN-slug.md` par feature, `docs/adr/`, `docs/ci.md`, `CLAUDE.md` — se réécrivent depuis
ces documents comme matière première, par les commandes qui connaissent leur format.

## Ce qui est ici

| Pièce | Ce qu'elle portait | Lue par (commande retirée) |
|---|---|---|
| `brief.md` (376 l.) | le problème, le territoire commercial, les 6 invariants de livraison `I1`–`I6`, le périmètre v1 et ses exclusions, `SC-001` à `SC-015` | `/scd-sdd:brief` |
| `prd.md` (838 l.) | 14 user stories, **122 exigences `FR-xxx`**, **21 critères `SC-xxx`**, les cas limites, la frontière de périmètre | `/scd-sdd:prd` |
| `stack.md` (1475 l.) | les choix de fondation domaine par domaine, leurs faits sourcés et datés, les 20 candidats ADR, les 8 points « à constater en recette », les 9 contrôles mécaniques exigés | `/scd-sdd:stack` |
| `archi.md` (207 l.) | la table des invariants d'architecture `I1`–`I10`, ce que le code s'interdit | `/scd-sdd:archi` |
| `adr/` (**32 ADR** + 2 candidats) | les décisions figées, immuables une fois acceptées | `/scd-sdd:adr` — la commande existe encore, mais elle lit `docs/adr/` |
| `audit-brief-prd.md` (251 l.) | 11 constats de cohérence Brief ↔ PRD, tous arbitrés le 2026-08-10 | `/scd-sdd:audit` |
| `audit-stack.md` (425 l.) | les constats `S-01` à `S-20` sur la phase Stack, chacun avec son arbitrage | `/scd-sdd:audit` |
| `audit-auth.md` (433 l.) | 12 constats `AU-01` à `AU-12` sur la chaîne d'authentification | `/scd-sdd:audit` |
| `journal/` (3 fichiers, **83 lignes**) | la chronologie des phases : `socle.md` (26), `001-scaffold-projet.md` (37), `002-connexion-par-code.md` (20) | `/scd-sdd:status` |
| `specs/001-scaffold-projet/` | `spec.md` (401 l.), `plan.md` (418 l.), `tasks.md` (266 l., **2 lots**, 41 cases cochées sur 42) | `specify` · `clarify` · `plan` · `tasks` · `analyze` |
| `specs/002-connexion-par-code/` | `spec.md` (520 l.), `plan.md` (981 l.), `tasks.md` (551 l., **11 lots**, **0 case cochée sur 68**) | idem |

## Ce que rien ne reconstitue

Ces faits n'ont laissé de trace ni sur le disque ni dans `git`. Ils sont perdus à la reprise, et
c'est écrit ici pour qu'on ne les cherche pas.

- **Les verdicts de gate.** `002-connexion-par-code` était en cours de gate au moment de la
  reprise — 4 Critical et 8 Major, consignés dans `docs/chantiers/en-cours/2026-08-23-gate-002-connexion-par-code.md`,
  qui reste en place. La commande qui les produisait (`/scd-sdd:analyze`) n'existe plus, et il n'y
  a pas de verdict `PRÊT` à retrouver.
- **Les premortems appliqués.** Le cycle de `002` avait été rouvert par le premortem du
  2026-08-23, qui a touché les trois documents après un `PRÊT`. Ce qu'il a changé se lit dans le
  `git log`, mais le raisonnement qui l'a produit n'a jamais été écrit ailleurs que dans la
  conversation.
- **Les issues des lots `Rn`.** Le journal note qu'un lot est passé, jamais ce qu'il a coûté ni
  ce qui a été écarté en route.

Les **cases cochées** de `specs/*/tasks.md` restent la seule source de vérité de ce qui a été
livré : 001 est livré à une case près, 002 ne l'est pas du tout.

## Ce qui n'est PAS ici

`docs/socle-de-livraison.md`, `docs/preuves/`, `docs/research/` et `docs/chantiers/` sont restés
dans l'arbre vivant — les trois derniers sont des artefacts du cycle courant, et le premier est un
document du projet que le plugin n'a jamais produit.

⚠️ **Leurs liens relatifs vers `./brief.md`, `./prd.md`, `./stack.md` et `./archi.md` pointent
désormais dans le vide.** Ces documents sont ici, sous `docs/1.x/`.
