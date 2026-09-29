# Prototype P3 — opt-level "3" contre "s"

Portée : hors-cycle
Ouvert le 2026-09-29 · Actualisé le 2026-09-29 · branche `proto/rust` · HEAD `ffd8a86`
Bloqué par : P2 (le Worker mesurable)

## Objectif
Refaire la mesure de P2 en `opt-level = "3"` puis `"s"`, et retenir le meilleur CPU tant que le
démarrage reste sous 1 s.

## Contexte à charger
à extraire  `docs/prototype-rust/decision.md` › § 3. Contradictions, C1 — le profil release et la règle de choix
à extraire  `docs/prototype-rust/decision.md` › § 8. Plan du prototype, ligne P3

## Acquis
Rien pour l'instant.

## Prochaine étape
Construire le Worker de P2 dans les deux profils et relever CPU, taille et démarrage de chacun.

## Écarté
Rien pour l'instant.
