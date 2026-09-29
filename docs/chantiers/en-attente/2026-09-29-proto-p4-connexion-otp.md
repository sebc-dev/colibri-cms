# Prototype P4 — connexion OTP complète

Portée : hors-cycle
Ouvert le 2026-09-29 · Actualisé le 2026-09-29 · branche `proto/rust` · HEAD `ffd8a86`
Bloqué par : P2 (Worker et D1 en place)

## Objectif
Faire tourner la connexion de bout en bout : génération du code, HMAC/SHA, stockage D1, envoi par
`send_email` vers une adresse vérifiée. Critère : CPU sous 10 ms et e-mail reçu.

## Contexte à charger
à extraire  `docs/prototype-rust/decision.md` › § 2. Décisions, D10 et D11 — e-mail et authentification
à extraire  `docs/prototype-rust/decision.md` › § 4. Raccords, R2 — l'aléa et l'horloge passent par des ports
à extraire  `docs/prototype-rust/decision.md` › § 8. Plan du prototype, ligne P4

## Acquis
Rien pour l'instant.

## Prochaine étape
Vérifier une adresse de destination dans le compte jetable, puis écrire l'envoi `send_email` seul.

## Écarté
Rien pour l'instant.
