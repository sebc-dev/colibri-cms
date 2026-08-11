# Audit de l'authentification, sur les seules pièces déjà au dépôt

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `5e912f8`

## Objectif

Passer l'authentification au crible qui a servi au Brief↔PRD puis à la stack. **L'audit est
rendu** — `docs/audit-auth.md`, 12 constats, 10 majeurs. Reste à les arbitrer un par un, chacun
refermé par un texte au PRD, à la Stack ou à un candidat ADR, et par sa ligne au récapitulatif.

## Contexte à charger

à extraire  `docs/audit-auth.md` › le constat `AU-nn` en cours de traitement et sa ligne du
            § « Récapitulatif » — 412 l., un constat à la fois, jamais le document entier
à extraire  `docs/audit-stack.md` › la ligne `S-05` du § « Récapitulatif » — le gabarit d'un
            arbitrage rendu : ce qu'il tranche, ce qu'il écarte, ce qu'il porte où
à extraire  `docs/prd.md` › § « Accès à l'administration », `FR-063`/`FR-064`, les exclusions
            « Révocation » et « Seconde adresse », les cas limites de perte et de compromission
à extraire  `docs/stack.md` › lignes « Auth », « Moyen de reprise », « En-têtes de réponse » ;
            §§ « Pourquoi un code à saisir », « La quatrième porte », « `FR-013` et `FR-014` » ;
            candidats ADR n° 6, n° 15, n° 16
à extraire  `docs/brief.md` › § Vocabulaire, entrée « Authentification » — la fusion des deux
            adresses, racine de `AU-01` et `AU-12`
à extraire  `docs/audit-brief-prd.md` › `A-02` et sa ligne de récapitulatif — ses écartés sont
            à rejouer, la piste de `AU-01` les rouvre
à situer    `docs/research/` — aucun rapport ne porte sur l'auth ; ne pas y chercher

## Acquis

- **Le rendu a consommé le gros de l'acquis** — modèle de menace, deux failles parties au
  premortem, quatrième porte, trois angles jamais instruits : tout vit dans `docs/audit-auth.md`
  et n'a pas à être redit. Un seul acquis du 11/08 en est ressorti **faux**, « la passkey est la
  seule forme survivant au lecteur de boîte » : le TOTP remis sur papier survit aussi (`AU-04`).
- **La racine est nommée** : la fusion, au glossaire du Brief, de l'adresse qui authentifie et
  de celle qui reçoit les demandes produit quatre des douze constats, chaque fois découverte une
  phase plus bas et par un chemin indépendant. C'est elle qui commande l'ordre du traitement.
- **L'ordre a été inversé le 11/08, et le `Bloqué par` retiré** : **L4 consommera ces
  arbitrages**, et non l'inverse. Conséquence assumée — `stack.md` a été lu avec `S-02` et `S-01`
  non arbitrés, donc son inventaire de secrets est un état intermédiaire, pas une cible.

## Prochaine étape

Arbitrer `AU-01`, la cinquième porte : `FR-063` ouvre en écriture, à l'internet anonyme, la boîte
qui **est** le facteur d'authentification. Trancher entre dissocier les deux adresses au PRD — ce
qui referme aussi `AU-12`, `FR-013` et le verrou `FR-005`/`FR-014` — et neutraliser l'e-mail
acheminé côté Stack, puis porter la ligne au récapitulatif.

## Écarté

- **Refaire l'étude des six décisions D1-D6** — rendue le 11/08 et portée dans `stack.md`.
- **Sourcer ou mesurer quoi que ce soit** — la demande porte sur les pièces déjà au dépôt.
- **Ouvrir une feature** — aucun constat ne descend en code.
- **Fermer `AU-04` en écartant le TOTP d'emblée** — il coûte un secret récupérable à l'inventaire
  et une friction contre `SC-003`/`SC-015` ; ces motifs sont recevables. Celui qu'il faut retirer
  est l'**unicité** de la passkey, qui est fausse.
