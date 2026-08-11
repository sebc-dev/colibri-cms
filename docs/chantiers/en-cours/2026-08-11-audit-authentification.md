# Audit de l'authentification, sur les seules pièces déjà au dépôt

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `b6b47c8`

## Objectif

Passer l'authentification au crible qui a servi au Brief↔PRD puis à la stack. L'audit est rendu
(`docs/audit-auth.md`) ; j'arbitrais les constats un par un, chacun refermé par un texte au PRD,
à la Stack ou à un candidat ADR, et par sa ligne aux « arbitrages rendus ».

## Contexte à charger

à extraire  `docs/audit-auth.md` › le constat `AU-nn` en cours et ses lignes des deux
            récapitulatifs ; la ligne `AU-01` des « arbitrages rendus » est le gabarit —
            un constat à la fois, jamais le document entier
à extraire  `docs/prd.md` › cas limites « perd l'accès à sa boîte » et « boîte compromise »,
            `FR-009`–`FR-014`, exclusions « Révocation » et « Seconde adresse »
à extraire  `docs/stack.md` › §§ « `FR-013` et `FR-014` n'ont aucun porteur », « La cinquième
            porte », « Ce que cette phase dépose » — les trois dettes PRD pour le premortem
à extraire  `docs/audit-brief-prd.md` › `A-02` et sa ligne de récapitulatif — le moyen de
            reprise, ses écartés et leurs motifs
à situer    `docs/research/` — aucun rapport ne porte sur l'auth ; ne pas y chercher

## Acquis

- **AU-01 et AU-12 arbitrés le 11/08** (commit `b6b47c8`) : e-mail acheminé inerte et étiqueté
  côté Stack, dissociation des deux adresses écartée sur rejeu de `A-02`, `AU-12` requalifié en
  constat accepté. Tout le raisonnement vit dans la ligne `AU-01` des « arbitrages rendus ».
- **Deux conclusions d'instruction à ne pas refaire** : une demande ne porte aucun texte libre
  (le visiteur n'écrit que ses coordonnées) ; le verrou `FR-005`/`FR-014` tient au binding
  `send_email` (destination vérifiée via Cloudflare), indépendant du nombre d'adresses.
- **La racine est nommée** au pied du récapitulatif des constats : la fusion des deux adresses
  au glossaire du Brief produit 4 des 12 constats ; c'est elle qui commande l'ordre.
- Un acquis antérieur est ressorti **faux** : la passkey n'est pas la seule forme survivant au
  lecteur de boîte — le TOTP remis sur papier survit aussi (`AU-04`).
- **L'ordre a été inversé le 11/08** : L4 consommera ces arbitrages, et non l'inverse.

## Prochaine étape

Arbitrer `AU-02` : le remède du cas limite « boîte compromise » repose sur `FR-013`, resté sans
porteur depuis `S-05`. Décider ce que le PRD cesse de promettre ou ce qu'il porte autrement, et
ce qui part au premortem — puis la ligne aux « arbitrages rendus ».

## Écarté

- **Refaire l'étude des six décisions D1-D6** — rendue le 11/08 et portée dans `stack.md`.
- **Sourcer ou mesurer quoi que ce soit** — la demande porte sur les pièces déjà au dépôt.
- **Ouvrir une feature** — aucun constat ne descend en code.
- **Fermer `AU-04` en écartant le TOTP d'emblée** — ses coûts (un secret récupérable, friction
  contre `SC-003`/`SC-015`) sont recevables ; c'est l'unicité de la passkey qui est fausse.
