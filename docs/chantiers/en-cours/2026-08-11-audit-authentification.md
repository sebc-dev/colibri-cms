# Audit de l'authentification, sur les seules pièces déjà au dépôt

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `0445712`

## Objectif

Passer l'authentification au crible qui a servi au Brief↔PRD puis à la stack. L'audit est rendu
(`docs/audit-auth.md`) ; j'arbitrais les constats un par un, chacun refermé par un texte au PRD,
à la Stack ou à un candidat ADR, et par sa ligne aux « arbitrages rendus ».

## Contexte à charger

à extraire  `docs/audit-auth.md` › le constat `AU-nn` en cours, ses lignes des deux
            récapitulatifs, et la colonne « Où ça se répare » qui nomme les pièces à ouvrir —
            un constat à la fois, jamais le document entier
à extraire  `docs/audit-auth.md` › lignes `AU-01` à `AU-04` des « arbitrages rendus » — les
            gabarits, et les conclusions d'instruction déjà rendues
à situer    `docs/research/` — aucun rapport ne porte sur l'auth ; ne pas y chercher

## Acquis

- **AU-01, AU-02, AU-03, AU-12 arbitrés le 11/08** (commits `b6b47c8`, `f154708`, `4e631d1`).
  La racine — la fusion des deux adresses au glossaire du Brief — est épuisée ; détail aux
  « arbitrages rendus ».
- **AU-04 arbitré le 11/08** (commit `0445712`) : l'unicité de la passkey était fausse — le
  TOTP remis à la livraison survit aussi au lecteur de boîte — et le TOTP est **écarté sur ses
  coûts propres** : graine vérifiable seulement en clair (le régime hors ligne d'`AU-03` la
  livrerait telle quelle), friction contre `SC-003`/`SC-015` et « par sa seule adresse
  e-mail », gain partiel — la boîte reste la clé de voûte (récupération des comptes tiers).
  Le glossaire ne bouge pas. Résidu au dépôt `S-05` : la connexion en lecture seule est le
  chemin le plus discret, le TOTP l'aurait fermé.
- **Conclusions d'instruction à ne pas refaire** : une demande ne porte aucun texte libre ; le
  verrou `FR-005`/`FR-014` tient au binding `send_email` (destination vérifiée via Cloudflare),
  indépendant du nombre d'adresses ; le moyen de reprise est à 128 bits, l'entropie porte tout.
- **L'ordre a été inversé le 11/08** : L4 consommera ces arbitrages, et non l'inverse.

## Prochaine étape

Choisir le prochain constat parmi les sept restants (`AU-05` à `AU-11`), puis l'arbitrer :
instruction sur pièces, options matérialisées avec rejeu adverse, texte porté, ligne aux
« arbitrages rendus ». `AU-05` ouvre la liste — aucune borne à la durée de session, l'objection
qui a tué la rémanence longue en `A-02` jamais rejouée contre la session retenue.

## Écarté

- **Refaire l'étude des six décisions D1-D6** — rendue le 11/08 et portée dans `stack.md`.
- **Sourcer ou mesurer quoi que ce soit** — la demande porte sur les pièces déjà au dépôt.
- **Ouvrir une feature** — aucun constat ne descend en code.
- **Dissocier les deux adresses au PRD** — écartée sur rejeu de `A-02` (`AU-01`) ; ne pas rouvrir.
- **Rouvrir le frein par secret du moyen de reprise** — écarté en `AU-03` ; l'entropie porte tout.
- **Retenir le TOTP, ou rouvrir l'unicité de la passkey** — tranché en `AU-04` sur coûts
  propres ; le glossaire ne bouge pas, ne pas rouvrir.
