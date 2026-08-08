# ADR-0012 : Stratégie de test à trois étages, portail bloquant sur le code nouveau
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le Brief pose que **le code entrant n'est pas relu ligne à ligne**. Ce qui atteste de la
qualité doit donc s'exécuter, pas se déclarer.

Or les promesses centrales du produit ne sont pas vérifiables par un test unitaire :

- `SC-011` — dans un environnement neuf, sans aucun accès, la procédure produit le site
  complet, médias compris. C'est un clone, un build et une comparaison.
- `SC-012` — après révocation de tous les accès d'Isometria, le site est servi, l'admin
  s'ouvre, une publication aboutit.
- `SC-014` — un prestataire tiers redéploie et publie sans poser de question.

Ce sont des **procédures qu'on exécute et dont la sortie est une pièce datée** — le socle
de livraison (`docs/socle-de-livraison.md` §5) le dit déjà de l'épreuve de réversibilité :
« la sortie de la commande est une pièce ». Elles ne peuvent ni se simuler, ni se jouer à
chaque commit.

À l'autre bout, un seuil de couverture global peut se dégrader lentement sans que rien ne
refuse : chaque contribution baisse la moyenne d'un peu, et aucune n'est individuellement
fautive.

Exigences concernées : `SC-011`, `SC-012`, `SC-014` · contrainte « code non relu ligne à
ligne » du Brief · invariants `I3`, `I6` · contraintes `C6`, `C10`.

## Décision

Nous vérifierons le produit par **trois étages** :

1. **Tests unitaires et d'intégration** — la correction du code, à chaque commit ;
2. **Tests de bout en bout** — les parcours du produit, à chaque commit ;
3. **Épreuves d'invariant rejouables** — `SC-011`, `SC-012`, `SC-014` et les contraintes
   `C6`, `C10` du socle de livraison, exécutées comme des procédures dont la **sortie est
   conservée comme pièce**, à la livraison puis à cadence propre.

Nous rendrons le portail de qualité **bloquant sur le code nouveau** (*clean as you code*)
plutôt que sur un seuil global : ce sont les lignes ajoutées ou modifiées qui doivent
satisfaire les seuils.

## Conséquences

**Positives**

- Un seuil global ne peut plus se dégrader sans que rien ne refuse : chaque contribution
  est jugée sur ce qu'elle apporte.
- `SC-011`, `SC-012` et `SC-014` cessent d'être des intentions et deviennent des pièces
  datées, opposables au client — ce qui est exactement l'argument du socle de livraison.
- Le portail s'exécute **hors de l'agent qui code** : c'est ce qui distingue une
  vérification d'une déclaration de bonne foi.

**Négatives — ce que ce choix coûte**

- **Les épreuves d'invariant ont une cadence propre, pas celle des commits.** Il existe
  donc une fenêtre — entre deux exécutions — pendant laquelle une régression sur `SC-011`
  ou `SC-012` n'est détectée par rien. C'est le coût direct du choix : ces épreuves sont
  lentes et exigent un environnement neuf.
- **Le régime « code nouveau » ne rattrape jamais l'existant.** Une dette antérieure à la
  mise en place du portail reste sous ses seuils d'origine indéfiniment ; seul un geste
  délibéré la traite.
- **Trois étages, c'est trois outillages à installer, à comprendre et à maintenir**, sur
  un projet mené seul.
- Le portail n'est réellement bloquant que s'il est **exigé côté forge**, sous protection
  de branche : tant que ce n'est pas fait, il n'est qu'un contrôle local qu'on peut
  contourner sans le savoir.

## Alternatives considérées

- **Les parcours de bout en bout seuls** : écartée parce qu'ils sont trop grossiers pour
  localiser un défaut dans un code que personne ne relit ligne à ligne — ils disent que
  quelque chose est cassé, pas où, et le diagnostic retombe alors sur la relecture
  qu'on cherchait précisément à éviter.
- **Un seuil de couverture global bloquant** : écartée parce qu'il autorise la dégradation
  lente — aucune contribution n'est individuellement fautive, et le seuil finit par être
  abaissé plutôt que tenu.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 12 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
