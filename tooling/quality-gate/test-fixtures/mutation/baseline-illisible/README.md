# Fixture — `baseline-illisible` (FR-029, intégration `mutationCheck`)

Scénario isolé : `packages/core` existe (fonction pure sans aucun opérateur
mutable, donc zéro survivant réel possible) et `mutation-survivors.baseline.json`
existe à la racine du scénario mais contient un JSON syntaxiquement invalide.

Le contrôle `mutation` (`checks/mutation.ts`) doit rapporter `statut: "échoué"`
— jamais `"passé"` — car une base illisible ne peut jamais tolérer un
survivant par défaut (FR-029), et ce indépendamment du nombre réel de
survivants (ici zéro), ce qui isole l'assertion sur l'état de la base plutôt
que sur le calcul des survivants non couverts (déjà couvert par FR-025).
