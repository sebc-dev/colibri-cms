# Run bloqué — Régler un emplacement de lien de vidéo

Portée : 003-remplir-emplacements · ticket 05
Ouvert le 2026-09-08 · Actualisé le 2026-09-08 · branche `main` · HEAD `9316b66`

## Objectif
Implémenter le ticket 05 (mode `test`) : reconnaissance pure d'un lien de vidéo en `core/`,
écriture au brouillon via la route de 04, refus au champ d'un lien non reconnu.

## Contexte à charger
à lire   `openspec/changes/003-remplir-emplacements/tickets/05-regler-lien-video.md` — le ticket (27 l.)
à lire   `openspec/changes/003-remplir-emplacements/specs/pages-et-emplacements/spec.md` — le delta où recadrer SC-05a (209 l.)
à lire   `openspec/changes/003-remplir-emplacements/design.md` — décision « reconnaissance pure de core/ » (83 l.)
à situer `openspec/changes/003-remplir-emplacements/proposal.md` — le pourquoi, déjà distillé ici (59 l.)

## Acquis
- Le run s'est arrêté en `blocked-arbitrage` en pré-flight : AUCUN code écrit, aucune PR, aucune case cochée.
- Le triage a validé 4 critères sur 5 (`proceed`, mode `test`) : SC-05b/c (couture HTTP), SC-05d/e (HTML servi, ADR-0006 rend l'îlot côté serveur). Seul SC-05a était escaladé (oracle ambigu : « lien reconnu » non défini dans la spec).
- **J'ai fait trancher SC-05a → liste blanche d'hébergeurs de vidéo.** `core/` accepte un lien ssi son hôte ∈ liste blanche selon un motif par hébergeur ; hors liste → refus au champ. Hébergeurs par défaut proposés YouTube + Vimeo ; **liste exacte restée à confirmer** (Dailymotion ? autre ?).
- Écart ticket↔code (relevé par le briefer, pas un arbitrage) : la route de 04 (`openspec`/`src/pages/admin/pages/[slug]/emplacements/[id].ts`) aiguille en dur vers le bouton d'action → un embranchement par nature est à ajouter ; les `Fichiers :` du ticket (`src/core/emplacements/…`, `src/admin/emplacements/…`) ne collent pas à l'existant (04 a posé `src/core/pages/brouillon.ts`, îlots sous `src/admin/ilots-svelte-5/`).

## Prochaine étape
Reporter la liste blanche dans le delta du change (`/opsx:update` → skill `openspec-update-change`) :
SC-05a passe de « reconnu/non reconnu » à « accepté ssi hôte ∈ {liste} selon motif par hébergeur »,
+ exemples accepté/rejeté, en recalant au passage les `Fichiers :` et l'embranchement par nature.
Puis `/scd-spec-dev:tickets 003-remplir-emplacements` (SC-05a récupère id + mode), puis
`/scd-spec-dev:run 003-remplir-emplacements 05`.

## Écarté
- Relancer le run sans fixer le contrat : rejouerait le même `blocked-arbitrage` (triage en pré-flight).
- Éditer SC-05a à la main dans le ticket vivant : voie non supportée — la disambiguïsation repasse par le delta.
- Lectures SC-05a non retenues : « tout https externe générique » (peu de refus, une non-vidéo passerait) et « ressource embarquable / heuristique » (plus flou) — écartées au profit de la liste blanche, qui rend SC-05d clair.
