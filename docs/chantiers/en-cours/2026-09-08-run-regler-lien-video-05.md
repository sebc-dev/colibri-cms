# Run bloqué — Régler un emplacement de lien de vidéo

Portée : 003-remplir-emplacements · ticket 05
Ouvert le 2026-09-08 · branche `impl/regler-lien-video-05` · HEAD `fdf11c7`
Bloqué par : décision humaine sur le contrat de reconnaissance (SC-05a)

## Objectif
Implémenter le ticket 05 (mode `test`) : reconnaissance pure d'un lien de vidéo en `core/`,
écriture au brouillon via la route de 04, refus au champ d'un lien non reconnu.

## Contexte à charger
à lire  `openspec/changes/003-remplir-emplacements/tickets/05-regler-lien-video.md` — le ticket
à lire  `openspec/changes/003-remplir-emplacements/` — le change (proposal + specs deltas + design)

## Acquis
- Le run s'est arrêté en `blocked-arbitrage` en pré-flight : AUCUN code écrit, aucune PR, aucune case cochée.
- 4 critères sur 5 passent le triage (`proceed`, mode `test` confirmé par ré-invocation de strategie-verif) :
  SC-05b/c (couture HTTP intégration), SC-05d/e (vérifiés sur le HTML servi, ADR-0006 rend l'îlot côté serveur).
- 1 critère escaladé : **SC-05a a un oracle ambigu.** « lien de vidéo reconnu » n'est défini nulle part —
  FR-022 dit seulement « vidéo désignée par un lien externe » ; le delta spec est circulaire ; design.md,
  security-review et le précédent 04 (liste blanche de *schémas* d'URL, pas de nature vidéo) ne le fixent pas.
  Sous mode `test`, l'agent inventerait ET satisferait seul l'oracle → seul motif d'arrêt-pour-décision.

## Prochaine étape
Faire trancher par l'humain le contrat de reconnaissance (question ci-dessous), puis reporter la
disambiguïsation dans le delta du change et re-générer le ticket via `/scd-spec-dev:tickets` (ou en
nouveau ticket) — jamais éditer le critère à la main. Puis relancer `/scd-spec-dev:run 003 05`.

Question : « lien de vidéo reconnu » = quel contrat exact la fonction pure de `core/` applique-t-elle ?
- Lecture A — tout lien https externe bien formé (validation de forme seule) ; peu de refus, risque d'une « vidéo » qui n'en est pas.
- Lecture B — liste blanche d'hébergeurs connus (YouTube, Vimeo…), motif par hébergeur ; refus clair, il faut fixer la liste.
- Lecture C — ressource vidéo embarquable (heuristique de forme oEmbed/extension), sans réseau ; à cadrer par exemples.

## Écarté
- Relancer le run sans fixer le contrat : rejouerait le même `blocked-arbitrage` (triage en pré-flight, avant toute écriture).
- Éditer SC-05a à la main dans le ticket vivant : voie non supportée — la disambiguïsation repasse par le delta du change.
