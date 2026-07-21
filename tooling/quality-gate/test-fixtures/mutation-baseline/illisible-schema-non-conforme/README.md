# Fixture — `illisible-schema-non-conforme` (FR-029)

Scénario isolé : `mutation-survivors.baseline.json` contient un JSON
**syntaxiquement valide** (le parseur `JSON.parse` réussit) mais qui ne
respecte pas `survivorBaselineSchema` — l'unique entrée du tableau n'a ni
champ `mutateur` ni champ `ligne`.

Le contrat de `chargerBaseline` défini par ce lot (FR-029) englobe sous
l'état `illisible` **deux** causes distinctes : JSON invalide (cf. fixture
`illisible`) OU schéma non conforme (cette fixture). `chargerBaseline` doit
rapporter `etat: "illisible"` dans les deux cas, jamais laisser
`survivorBaselineSchema.parse` lever une exception non interceptée vers
l'appelant.
