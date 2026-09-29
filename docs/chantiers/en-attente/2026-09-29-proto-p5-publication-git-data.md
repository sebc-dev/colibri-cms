# Prototype P5 — publication par Git Data

Portée : hors-cycle
Ouvert le 2026-09-29 · Actualisé le 2026-09-29 · branche `proto/rust` · HEAD `ffd8a86`
Bloqué par : P2 (Worker et D1 en place)

## Objectif
Enregistrer un brouillon (texte riche en AST et 2 images), puis le publier en un commit Git Data qui
déclenche Workers Builds. Critère : moins de 50 sous-requêtes, un seul build, CPU sous 10 ms.

## Contexte à charger
à extraire  `docs/prototype-rust/decision.md` › § 2. Décisions, D5, D7 à D9 — texte riche, publication, images, contrat
à extraire  `docs/prototype-rust/decision.md` › § 5. Architecture cible — le flux de publication (4 sous-requêtes)
à extraire  `docs/prototype-rust/decision.md` › § 7. Questions ouvertes, Q1 — le binaire dans le dépôt du site
à extraire  `docs/prototype-rust/decision.md` › § 8. Plan du prototype, ligne P5

## Acquis
Rien pour l'instant.

## Prochaine étape
Créer un dépôt GitHub de site client minimal branché sur Workers Builds dans le compte jetable.

## Écarté
Rien pour l'instant.
