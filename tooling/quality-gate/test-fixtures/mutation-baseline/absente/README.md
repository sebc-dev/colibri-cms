# Fixture — `absente` (FR-029)

Scénario isolé : le dossier ne contient volontairement **aucun**
`mutation-survivors.baseline.json`. `chargerBaseline` doit rapporter l'état
`absente`, jamais confondu avec une base présente et vide.
