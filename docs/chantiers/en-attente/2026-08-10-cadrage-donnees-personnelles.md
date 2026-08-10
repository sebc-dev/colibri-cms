# Cadrage des données personnelles avant la première mise en ligne

Portée : socle
Ouvert le 2026-08-10 · Actualisé le 2026-08-10 · branche `work/reprise-socle-v2` · HEAD `b83c557`
Bloqué par : la relecture juridique prévue au socle de livraison, qui ne couvre aujourd'hui que le clausier

## Objectif

Refermer l'obligation que le Brief déclare bloquante **avant la première mise en ligne** :
information du visiteur, durée de rétention, effacement. Le traitement de l'audit a mis le
PRD hors du chemin ; il n'a pas fait le cadrage lui-même.

## Contexte à charger

à lire      `docs/brief.md` § Questions ouvertes — « Données personnelles des demandes de devis » (5 l.)
à déléguer  `docs/research/2026-08-10-retention-donnees-demandes-devis.md` — 135 l., demander D1, D2 et la table des durées circulantes
à situer    `docs/audit-brief-prd.md` § A-04 — l'arbitrage rendu, ne pas rejouer
à situer    `docs/socle-de-livraison.md` — c'est là que le volet D2 atterrira

## Acquis

- J'avais établi qu'aucun texte n'impose de purge automatique au logiciel : le PRD n'exige
  donc rien, et surtout n'interdit plus rien — l'exigence qui bannissait tout effacement à
  l'initiative du système a été rétrécie à ce qu'elle visait vraiment, l'interdiction d'une
  cascade (aujourd'hui `FR-079`).
- J'avais retenu que le comptage d'une demande retirée survit à l'effacement de son contenu,
  précisément pour que l'issue du cadrage ne casse pas le relevé.
- J'avais noté que la copie e-mail échappe au produit : aucune fonction logicielle ne peut à
  elle seule couvrir ce second support.

## Prochaine étape

Porter à la relecture juridique les deux volets que la recherche a laissés ouverts : l'acte
de sous-traitance entre l'intégrateur et la cliente (à inscrire dans le clausier de
`docs/socle-de-livraison.md`), et le texte de la mention d'information que `FR-043` rend
éditable et que `FR-056` présente au visiteur.

## Écarté

- **Purge automatique dans le produit** — aucune obligation ne la fonde, et elle
  préempterait le cadrage au lieu de l'attendre.
- **Purge en option désactivable**, recommandée par le rapport — un mécanisme, un réglage et
  un écran pour une obligation qui n'existe pas.
- **Filtre par date sur la liste des demandes** — la date portée par chaque demande, la
  présentation antéchronologique et le retrait groupé suffisaient à rendre le ménage
  praticable.
- **Décider une durée à l'estime** — c'eût été refaire en sens inverse l'erreur que l'audit
  reprochait au PRD.
