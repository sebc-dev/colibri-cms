# Run bloqué — la fiche d'une image habillée

Portée : 005-mise-en-page-administration · ticket 11
Ouvert le 2026-09-27 · Clos le 2026-09-27 · branche `impl/fiche-image-habillee-11` (worktree, aucun commit) · HEAD `fe5cd67`

## Objectif
Habiller la fiche d'une image au thème Colibri : prévisualisation à gauche et colonne de 320 px à
droite sur écran large, une seule colonne sur téléphone, sur-couches qui tiennent dans l'écran. Aucun
geste ne change. Le ticket a été lancé en `run-parallel` avec les tickets 04 et 10 (run
`wf_163537a5-59c`).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/11-fiche-image-habillee.md` — le ticket
à situer    `.git/scd-worktrees/fiche-image-habillee-11/` — le SEUL exemplaire du travail (non commité : `FicheMedia.svelte` modifié)
à situer    `docs/chantiers/en-cours/2026-09-27-run-repli-et-tiroir-04.md` — le ticket 04, dont SC-11d dépend

## Acquis
- Le run s'est arrêté en `blocked-verify`. SC-11a, b, c, e et f sont **prouvés** dans Chromium sur
  l'artefact bâti, sous la vraie CSP : la sur-couche tient à 360 px et la fermeture reste visible, rien
  ne bouge avec reduced-motion, les polices et `plumage` sont les bonnes, les cibles font au moins
  44 × 44 et le plus petit contraste est de 5,16:1. `npm test` passe (216/216) ; typecheck, lint et
  build aussi.
- **SC-11d échoue pour deux raisons :**
  1. **Défaut du ticket, à 1280 px** : la colonne de droite (`flex-1 … md:w-80 md:shrink-0
     md:grow-0`) calcule 0 px de large, car `flex-1` (basis 0 %) annule `md:w-80`. Le champ Nom fait
     22 px et « Posée dans » s'affiche une lettre par ligne. Il faut une base `md:basis-80`, ou retirer
     `flex-1` à partir de `md`.
  2. **Hors du ticket, à 360 px** : la barre latérale de 224 px du ticket 03 reste affichée sur
     téléphone, puisque le tiroir du ticket 04 n'est pas dans la base. Une fois le menu masqué à la
     main, la fiche tient bien sur une colonne (scrollWidth = 360). Le ticket 11 dépend donc, en
     pratique, du 04, bien que son `**Bloqué par :**` ne cite que le 03.
- Cas limite relevé : à 360 × 200 avec un nom de 127 caractères, le titre de la sur-couche occupe
  toute la hauteur et le corps tombe à 0 px.

## Prochaine étape
Corriger la colonne de 320 px dans le worktree et la re-mesurer à 1280 px. Commiter, puis ouvrir la PR
en laissant SC-11d ouvert jusqu'à la fusion du ticket 04 (recontrôle à 360 px, nom long, au cahier de
recette). Autre voie : attendre le 04, puis relancer `/scd-spec-dev:run 005-mise-en-page-administration 11`.

## Issue
Repris à la main dans le worktree. La colonne de droite passe à `md:w-80 md:shrink-0`, sans
`flex-1` : elle mesure 320 px à 1280 et à 768 px. La prévisualisation prend le reste de la largeur,
dans la limite de `max-w-xl`. « Supprimer… » reçoit son contour `danger`. SC-11d a été re-mesuré sur
une combinaison temporaire 04 + 11 : scrollWidth = 360, une seule colonne, rien de coupé, nom de
127 caractères et image orpheline compris. La PR du ticket 11 se merge après celle du 04 (#118). Le
cas limite 360 × 200 (titre de la sur-couche qui mange la hauteur) n'a pas été traité.
