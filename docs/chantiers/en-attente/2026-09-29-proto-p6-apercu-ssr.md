# Prototype P6 — aperçu par Worker Astro SSR

Portée : hors-cycle
Ouvert le 2026-09-29 · Actualisé le 2026-09-29 · branche `proto/rust` · HEAD `ffd8a86`
Bloqué par : un site Astro minimal portant la page la plus lourde du futur gabarit

## Objectif
Rendre la page la plus lourde avec un Worker Astro SSR dédié et mesurer le CPU par rendu.
Régulièrement sous 10 ms → option C ; sinon option A (build d'aperçu protégé). Tranche Q3.

## Contexte à charger
à extraire  `docs/prototype-rust/decision.md` › § 5. Architecture cible — le paragraphe Aperçu (options A, B, C)
à extraire  `docs/prototype-rust/decision.md` › § 7. Questions ouvertes, Q3
à extraire  `docs/prototype-rust/decision.md` › § 8. Plan du prototype, ligne P6

## Acquis
- Cette étape ne dépendait pas du workspace Rust : elle pouvait avancer en parallèle de P1 à P5.

## Prochaine étape
Choisir la page la plus lourde du futur gabarit et la reproduire dans un site Astro minimal.

## Écarté
Rien pour l'instant.
