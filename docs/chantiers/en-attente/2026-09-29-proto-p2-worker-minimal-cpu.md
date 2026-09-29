# Prototype P2 — Worker minimal et CPU par requête

Portée : hors-cycle
Ouvert le 2026-09-29 · Actualisé le 2026-09-29 · branche `proto/rust` · HEAD `ffd8a86`
Bloqué par : P1 (le workspace)

## Objectif
Un Worker axum + askama + D1 qui rend une page d'administration listant 20 éléments, et mesurer le
CPU par requête, la taille du binaire et le temps de démarrage. Critère : CPU p99 nettement sous
10 ms, démarrage sous 1 s.

## Contexte à charger
à extraire  `docs/prototype-rust/decision.md` › § 8. Plan du prototype, ligne P2 — mesures et critère
à extraire  `docs/prototype-rust/decision.md` › § 3. Contradictions, C1 et C4 — profil release, budget de 50 requêtes D1
à extraire  `docs/prototype-rust/decision.md` › § 2. Décisions, D2 à D4 et D6

## Acquis
- Le prototype devait tourner sur un compte Cloudflare jetable, sans moyen de paiement (§8).
  Ce compte n'était pas encore créé : c'est un geste humain.

## Prochaine étape
Créer le compte Cloudflare jetable sans moyen de paiement, puis la base D1 du prototype.

## Écarté
Rien pour l'instant.
