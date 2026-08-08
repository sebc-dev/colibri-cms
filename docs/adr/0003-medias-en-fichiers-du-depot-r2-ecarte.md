# ADR-0003 : Médias en fichiers statiques du dépôt, dérivés générés au build — R2 écarté
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le site est une vitrine riche en photographies : les médias sont le poste dominant du
produit, en volume comme en nombre de fichiers. Ils doivent être téléversés (`FR-017`),
remplacés sans toucher aux emplacements (`FR-021`), réemployés sans re-téléversement
(`FR-022`, `SC-010`), déposés chez la cliente à chaque publication (`FR-038`) avec leur
inventaire — nom, dimensions, description (`FR-039`).

Un stockage d'objets dédié était techniquement le meilleur choix : hors du décompte de
fichiers de la plateforme, dépôt qui ne gonfle pas, suppression réellement physique.
**Cloudflare R2 a pourtant été écarté sur un motif qui n'est pas technique** : son
activation passe par un parcours de souscription qui exige un moyen de paiement sur le
compte. Or `I5` du socle de livraison (`docs/socle-de-livraison.md`) pose que ce qui rend
un prélèvement impossible n'est pas le plan gratuit mais **l'absence de moyen de paiement
enregistré** ; `C9` en fait un critère de recette, `FR-101` une exigence produit, `SC-001`
un critère de succès, et la clause §4.1 du clausier une promesse écrite au client.
Enregistrer une carte pour activer R2 rend ces quatre lignes fausses d'un coup.

Le fait « l'activation de R2 exige un moyen de paiement » est un **fait daté**, relevé le
6 août 2026 et consigné dans `docs/stack.md`. Il est la seule raison de cette décision.

Exigences concernées : `FR-017`, `FR-021`, `FR-022`, `FR-026`, `FR-038`, `FR-039`,
`FR-087`, `FR-101`, `SC-001`, `SC-010` · invariants `I5` · contraintes `C5`, `C9`.

## Décision

Nous stockerons les médias publiés en **fichiers statiques du dépôt de la cliente**, aux
côtés du contenu, et nous générerons leurs **dérivés responsive au build** plutôt qu'à la
demande.

Nous n'utiliserons pas Cloudflare R2, ni aucun stockage d'objets dont l'activation ou
l'usage suppose un moyen de paiement enregistré sur le compte de la cliente.

Nous câblerons dans le build le garde-fou de `C5` : compter les fichiers produits et
**alerter à 15 000**, soit 75 % du plafond de 20 000 fichiers par version de Worker relevé
en annexe A du socle de livraison.

## Conséquences

**Positives**

- `I5`, `C9`, `FR-101` et `SC-001` restent vrais sans clause d'exception, et la promesse
  §4.1 du clausier reste écrivable telle quelle.
- Les médias suivent exactement le même chemin que le contenu : un seul geste de dépôt, un
  seul déclencheur de build, et `SC-011` couvre les médias sans traitement particulier —
  ce que `US12` exige littéralement (« le site complet, médias compris »).
- Le réemploi sans re-téléversement (`FR-022`) est une simple référence de chemin.

**Négatives — ce que ce choix coûte**

- **Les dérivés responsive entrent dans le décompte des 20 000 fichiers par version de
  Worker.** C'est la limite qui mord en premier, à l'ordre de 1 600 à 5 000 photographies
  selon le nombre de formats générés (annexe A). Le produit s'engage donc à `FR-087` — et
  cette alerte n'est pas un confort, c'est le seul signal avant refus de publication.
- **Le dépôt ne maigrit jamais.** Une image supprimée (`FR-026`) quitte l'arbre de travail
  et reste dans l'historique : la suppression est logique, jamais physique. C'est le prix
  assumé du renoncement à R2. Sans effet sur `SC-010`, mais la taille du dépôt croît de
  façon monotone et une médiathèque volumineuse finit par peser sur le clone qu'exige
  `SC-011`.
- **Le temps de build croît avec la médiathèque**, sous un plafond de 20 minutes par build
  (annexe A). Une instance riche en photographies rapproche ce plafond à chaque
  publication, et `SC-004` (visible en ligne en moins de 5 minutes) s'en trouve
  directement exposé.
- Un fichier de plus de 25 Mio est refusé par la plateforme : le téléversement doit le
  refuser en amont, avec un message que l'éditrice comprend.

## Alternatives considérées

- **Cloudflare R2** : écartée **sur ce seul motif** — l'activation exige un moyen de
  paiement sur le compte, ce qui rend faux `I5`, `C9`, `FR-101`, `SC-001` et la clause
  §4.1. Techniquement supérieure sur les trois points qui coûtent ici (décompte de
  fichiers, taille du dépôt, suppression honnête). **À rouvrir si Cloudflare change cette
  condition d'entrée** — c'est le seul ADR de ce socle dont la raison d'être peut
  disparaître sans que le produit change.
- **Génération des dérivés à la demande dans le Worker** plutôt qu'au build : écartée
  parce que le budget de 10 ms de CPU par invocation (annexe A) l'interdit, et parce
  qu'elle réintroduirait un traitement serveur sur la consultation d'une page publiée, ce
  que `FR-046` et `US10` excluent.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 3 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
