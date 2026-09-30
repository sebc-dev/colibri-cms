# Architecture (cap durable)

> La **table des invariants opposables** — le référent de la dimension architecture de la review.
> La structure (*quoi, maintenant*) est dans le modèle LikeC4 `docs/architecture/*.c4` ; le
> *pourquoi* d'un choix structurant est un ADR (`docs/adr/`), pas ce fichier.

## Invariants

| Id | Règle | Éléments (FQN) | Classe | ADR |
|---|---|---|---|---|
| INV1 | `shop.ui` n'importe jamais `shop.orders` | shop.ui, shop.orders | 9 imports prohibés | 0003 |

> Exemple à remplacer. **Question d'admission** : une règle n'entre dans la table que si elle
> **nomme des éléments du modèle** et **laisse une trace observable** dans l'arborescence ou les
> imports (classes 1 à 11 ; les classes 12 à 15 — sémantique, runtime, holistique — n'entrent pas).
> La colonne `ADR` est remplie par `/scd-spec-dev:adr` ; une ligne sans ADR est un **candidat**,
> proposé par `/scd-spec-dev:archi` et promu par l'humain.
