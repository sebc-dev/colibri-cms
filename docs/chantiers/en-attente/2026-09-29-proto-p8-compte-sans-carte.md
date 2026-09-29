# Prototype P8 — comportements du compte sans carte

Portée : hors-cycle
Ouvert le 2026-09-29 · Actualisé le 2026-09-29 · branche `proto/rust` · HEAD `ffd8a86`
Bloqué par : le compte Cloudflare jetable (créé en P2)

## Objectif
Constater sur le compte sans moyen de paiement : `send_email` vers une adresse non vérifiée,
dépassement de quota D1 (alerte e-mail), tentative de souscription sans carte. Critère : blocages
confirmés, aucune facture, même à 0 $.

## Contexte à charger
à extraire  `docs/prototype-rust/decision.md` › § 8. Plan du prototype, ligne P8 et le paragraphe sur les tests de quota lourds
à extraire  `docs/prototype-rust/decision.md` › § 2. Décisions, D1 — ne jamais souscrire Workers Paid

## Acquis
- Les tests de quota lourds (3 000 minutes de build, 501e build, 100 000 requêtes DO) étaient
  facultatifs : ils ne touchent que la disponibilité.

## Prochaine étape
Tenter un `send_email` vers une adresse non vérifiée et noter la réponse exacte.

## Écarté
Rien pour l'instant.
