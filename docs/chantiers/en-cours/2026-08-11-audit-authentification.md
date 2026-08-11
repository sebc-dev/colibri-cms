# Audit de l'authentification, sur les seules pièces déjà au dépôt

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `4e631d1`

## Objectif

Passer l'authentification au crible qui a servi au Brief↔PRD puis à la stack. L'audit est rendu
(`docs/audit-auth.md`) ; j'arbitrais les constats un par un, chacun refermé par un texte au PRD,
à la Stack ou à un candidat ADR, et par sa ligne aux « arbitrages rendus ».

## Contexte à charger

à extraire  `docs/audit-auth.md` › le constat `AU-nn` en cours, ses lignes des deux
            récapitulatifs, et la colonne « Où ça se répare » qui nomme les pièces à ouvrir —
            un constat à la fois, jamais le document entier
à extraire  `docs/audit-auth.md` › lignes `AU-01` et `AU-02` des « arbitrages rendus » — les
            gabarits, et les conclusions d'instruction déjà rendues
à situer    `docs/research/` — aucun rapport ne porte sur l'auth ; ne pas y chercher

## Acquis

- **AU-01, AU-02 et AU-12 arbitrés le 11/08** (commits `b6b47c8`, `f154708`). La racine — la
  fusion des deux adresses au glossaire du Brief — est épuisée : ses quatre retombées sont
  traitées, l'ordre des neuf constats restants redevient libre.
- **AU-02** : l'éviction était réelle (session opaque) mais sans porteur au PRD — `FR-012`
  amendé, cas limite « boîte compromise » réécrit (éviction et rien de plus), exclusion
  « Révocation » précisée (conséquence automatique ≠ fonction). `FR-013` reste le remède
  durable nommé ; son portage demeure au dépôt de `S-05` pour le premortem socle, avec le cas
  voisin « perd l'accès à sa boîte », qui repose sur les mêmes `FR-013`/`FR-014`.
- **Conclusions d'instruction à ne pas refaire** : une demande ne porte aucun texte libre ; le
  verrou `FR-005`/`FR-014` tient au binding `send_email` (destination vérifiée via Cloudflare),
  indépendant du nombre d'adresses.
- Un acquis antérieur est ressorti **faux** : la passkey n'est pas la seule forme survivant au
  lecteur de boîte — le TOTP remis sur papier survit aussi (`AU-04`).
- **L'ordre a été inversé le 11/08** : L4 consommera ces arbitrages, et non l'inverse.
- **AU-03 arbitré le 11/08** (commit `4e631d1`) : moyen de reprise chiffré à **128 bits**
  (26 caractères base32, groupés), **aucun frein par secret** — l'entropie rend la devinette
  sans objet dans les trois régimes (en ligne distribué, quota, hors ligne sur fuite de la
  base), le hachage n'étant algorithmé nulle part. Le dernier recours ne pend plus à
  l'empreinte de `S-02` : note portée au traitement, sa charge est **allégée** et non alourdie
  comme la piste le prévoyait. Nuance versée : « réémis à l'emploi » rend l'usage tiers
  détectable au papier mort — tard, cas limite déjà assumé.

## Prochaine étape

Choisir le prochain constat parmi les huit restants (`AU-04` à `AU-11`), puis l'arbitrer :
instruction sur pièces, options matérialisées avec rejeu adverse, texte porté, ligne aux
« arbitrages rendus ». `AU-04` ouvre la liste — le secret TOTP remis à la livraison, jamais
examiné ; ses coûts sont recevables, ne pas l'écarter d'emblée.

## Écarté

- **Refaire l'étude des six décisions D1-D6** — rendue le 11/08 et portée dans `stack.md`.
- **Sourcer ou mesurer quoi que ce soit** — la demande porte sur les pièces déjà au dépôt.
- **Ouvrir une feature** — aucun constat ne descend en code.
- **Fermer `AU-04` en écartant le TOTP d'emblée** — ses coûts sont recevables ; c'est
  l'unicité de la passkey qui est fausse.
- **Dissocier les deux adresses au PRD** — écartée sur rejeu de `A-02` (`AU-01`) ; ne pas rouvrir.
- **Rouvrir le frein par secret du moyen de reprise** — refus temporisé (déni de service adouci
  sur le dernier recours) et temporisation par tentative (redondante à 128 bits) écartés en
  `AU-03` ; l'entropie porte tout.
