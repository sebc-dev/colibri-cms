# Proposer le change du moyen de reprise

Portée : hors-cycle
Ouvert le 2026-11-08 · branche `main` · HEAD `12c2064`

## Objectif
Ouvrir le change OpenSpec de la story « Moyen de reprise » de l'Epic C (FR-009→012 · SC-020) par
`/opsx:propose`, maintenant que le change 015 est clos.

## Contexte à charger
à lire      `docs/adr/_candidates/moyen-de-reprise-code-128-bits-hache.md` — la décision candidate à partir de laquelle proposer (87 l.)
à extraire  `docs/vision.md` › FR-009 à FR-012, SC-020 — 306 l., seules ces lignes comptent
à extraire  `docs/roadmap.md` › « Moyen de reprise » — la story à cocher en fin de change
à extraire  `docs/adr/0001-auth-implementation-maison-sur-d1.md` › « moyen de reprise » — ce que l'auth maison prévoit déjà
à extraire  `docs/security.md` › « moyen de reprise » — l'exigence de sécurité qui le vise
à situer    PR #313, #314, #315 — recette, archivage et corrections du 015, fusionnées, ne pas relire

## Acquis
- J'ai décidé avec l'humain, le 2026-11-08, de corriger d'abord les défauts relevés pendant le 015
  (faits, #315), puis d'enchaîner sur ce change.
- Le candidat d'ADR n'est pas figé : la proposition peut le contredire, en le disant.

## Prochaine étape
Lancer `/opsx:propose` pour le moyen de reprise, en partant du candidat d'ADR et des exigences
FR-009→012 ; faire valider le proposal avant tout ticket.

## Écarté
- Corriger la fermeture tardive de la confirmation de suppression après un clic extérieur : la
  course vient de bits-ui 2.19.0 (clic traité après 10 ms), fenêtre de 10 à 30 ms, jugée négligeable
  (commentaire sur #315).
- Ouvrir le change avant de clore 015 : l'archivage et la recette passaient d'abord.
