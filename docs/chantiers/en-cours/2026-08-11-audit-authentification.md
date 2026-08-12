# Audit de l'authentification, sur les seules pièces déjà au dépôt

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `0b24ebb`

## Objectif

Passer l'authentification au crible qui a servi au Brief↔PRD puis à la stack. L'audit est rendu
(`docs/audit-auth.md`) ; j'arbitrais les constats un par un, chacun refermé par un texte au PRD,
à la Stack ou à un candidat ADR, et par sa ligne aux « arbitrages rendus ».

## Contexte à charger

à extraire  `docs/audit-auth.md` › le constat `AU-nn` en cours, ses lignes des deux
            récapitulatifs, et la colonne « Où ça se répare » qui nomme les pièces à ouvrir —
            un constat à la fois, jamais le document entier
à extraire  `docs/audit-auth.md` › lignes `AU-01` à `AU-05` des « arbitrages rendus » — les
            gabarits, et les conclusions d'instruction déjà rendues
à situer    `docs/research/` — aucun rapport ne porte sur l'auth ; ne pas y chercher

## Acquis

- **Huit constats arbitrés (11-12/08)** — `AU-01` à `AU-08`, plus `AU-12` requalifié en constat
  accepté (commits `b6b47c8` → `0b24ebb`). Le détail de chacun — texte porté, écartés, motifs —
  vit à sa ligne des « arbitrages rendus » ; y renvoyer plutôt que refaire.
- **Faits établis, à ne pas re-dériver** (détail à la ligne du constat) : demande sans texte
  libre ; verrou `FR-005`/`FR-014` au binding `send_email`, indépendant du nombre d'adresses ;
  moyen de reprise à 128 bits, l'entropie porte tout ; session bornée 7 j / 30 j (`FR-118`),
  expiration automatique ; pas de repli sous-domaine pour la 4ᵉ porte ; le `force: false` de
  `S-03` rend le contenu indestructible (git garde tout) ; état d'auth (D1) non durable par
  choix, réparé par réamorçage `FR-119`.
- **L'ordre a été inversé le 11/08** : L4 consommera ces arbitrages, et non l'inverse.

## Prochaine étape

Choisir le prochain constat parmi les trois restants (`AU-09` à `AU-11`), puis l'arbitrer :
instruction sur pièces, options matérialisées avec rejeu adverse, texte porté, ligne aux
« arbitrages rendus ». `AU-09` ouvre la liste — `FR-006` désigne l'adresse autorisée que
`FR-008` veut cacher (« Où ça se répare » : prd, rédaction de `FR-008`).

## Écarté

- **Refaire l'étude des six décisions D1-D6** — rendue le 11/08 et portée dans `stack.md`.
- **Sourcer ou mesurer quoi que ce soit** — la demande porte sur les pièces déjà au dépôt.
- **Ouvrir une feature** — aucun constat ne descend en code.
- **Rouvrir un point tranché aux « arbitrages rendus »** — dissociation des deux adresses
  (`AU-01`), frein par secret du moyen de reprise (`AU-03`), TOTP et unicité de la passkey
  (`AU-04`), bornes de session et leurs valeurs 7 j / 30 j (`AU-05`), définition de la CSP par
  ses interdits et absence de repli (`AU-06`), énumération du rayon d'une session compromise et
  ses trois écartés (`AU-07`), non-durabilité de l'état d'auth et réamorçage (`AU-08`) : chaque
  ligne porte ses écartés et leurs motifs, ne pas rouvrir.
