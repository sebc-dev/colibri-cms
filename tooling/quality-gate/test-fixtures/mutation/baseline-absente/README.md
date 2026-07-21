# Fixture — `baseline-absente` (FR-029, intégration `mutationCheck`)

Scénario isolé : `packages/core` existe (fonction pure sans aucun opérateur
mutable, donc zéro survivant réel possible) mais **aucun**
`mutation-survivors.baseline.json` n'existe à la racine du scénario.

Le contrôle `mutation` (`checks/mutation.ts`) doit rapporter `statut: "échoué"`
— jamais `"passé"` — car une base absente ne peut jamais tolérer un survivant
par défaut (FR-029), et ce indépendamment du nombre réel de survivants
(ici zéro), ce qui isole l'assertion sur l'état de la base plutôt que sur le
calcul des survivants non couverts (déjà couvert par FR-025).
