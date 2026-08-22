# Gate 002-connexion-par-code — 1 Critical · 2 Major

Portée : 002-connexion-par-code · gate
Ouvert le 2026-08-21 · Actualisé le 2026-08-22 · branche `main` · HEAD `2a10645`

## Objectif
Passer la gate de conformité de 002-connexion-par-code : zéro Critical.

## Contexte à charger
à lire  `specs/002-connexion-par-code/spec.md` — porte FR-025, FR-030, SC-007, la Légende
à lire  `specs/002-connexion-par-code/plan.md` — porte l'étape 3o et le § Schéma D1
à lire  `specs/002-connexion-par-code/tasks.md` — porte l'en-tête d'ordonnancement, R3, T38, T57, T59

## À corriger
### Critical (1)
- [FR-030 × FR-025/SC-007] `spec.md` — la mention imposée par `FR-030` porte le mot *session*, premier des dix-huit termes que la Légende interdit sur l'écran de saisie du code depuis que `FR-025` couvre cet écran ; `T38` exige la mention, `T39` et `T59` exigent zéro occurrence → reformuler la mention, ou écrire l'exception en Légende. Phase : `specify`, puis `plan` et `tasks`

### Major (2)
- [étape o] `plan.md`+`tasks.md` — `T57` exige que les lignes survivent « parce que **o** doit encore les trouver », mais le § Schéma D1 fait effacer les lignes mortes à chaque écriture suivante, et il y en a une dizaine entre **f** et **o** → exclure la ligne du ramassage, ou faire porter **o** sur une ligne dont la survie est garantie. Phase : `plan` puis `tasks`
- [R3] `tasks.md` — l'en-tête justifie `[P]` par « ses fichiers sont disjoints de tout le reste », que les lignes `Fichiers :` démentent pour les trois (`regles.ts` → R8/R9/R10 · `session/index.ts` → R1/R7 · `session/magasin.ts` → R1) → retirer `[P]` et sa justification, ou restreindre R3 à des fichiers propres. Phase : `tasks`

## Prochaine étape
Corriger le Critical par `/scd-sdd:specify 002`, les deux Major par `/scd-sdd:plan 002` puis
`/scd-sdd:tasks 002`. Puis **commiter les corrections en signant** (voir Outillage) et relancer
`/scd-sdd:analyze 002` — issue « une passe de plus », arbitrée le 2026-08-22 sur une trajectoire
de 18 findings à 3, sans régression.

## Signalements hors gate
- **Socle** : `.github/scripts/arch-invariants.sh` rend `I8` par un `grep -nF` en sous-chaîne
  (l. 171), si bien qu'une adresse hébergée sur le domaine d'instance le fait rougir. La décision 9
  du plan a rétabli `destination_address` et **signale** le défaut plutôt que de le contourner ; il
  reste vrai, et rougira chez toute cliente dont la boîte est sur son propre domaine.
  → `/scd-sdd:audit archi`.
- **Outillage** : la gate ne peut pas remplir sa précondition de passe delta (§D39) — commiter les
  corrections —, `specs-integrity` exigeant un commit **signé** pour `spec.md`, `plan.md` et le
  texte de `tasks.md`. La manœuvre qui marche a été trouvée le 2026-08-22 : l'humain commite
  lui-même l'état jugé (`2a10645`), et la gate suivante prend **ce** commit pour ancre au lieu de
  la ligne `HEAD` de cette fiche, qui est prise avant lui. À refaire à chaque passe, sans quoi le
  delta recouvre le contrat entier.

## Écarté
_(aucun arbitrage — décliné à la passe 1, sans préférence à la passe 2 ; les deux Major de la
passe 3 ont été soumis le 2026-08-22 et renvoyés à la correction)_
