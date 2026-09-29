# Prototype P7 — CSP stricte sur l'administration

Portée : hors-cycle
Ouvert le 2026-09-29 · Actualisé le 2026-09-29 · branche `proto/rust` · HEAD `ffd8a86`
Bloqué par : P2 (une page d'administration servie par le Worker)

## Objectif
Poser une CSP stricte en `Report-Only` sur l'administration avec Tiptap et HTMX. Critère : zéro
violation avec le schéma éditorial restreint.

## Contexte à charger
à extraire  `docs/prototype-rust/decision.md` › § 2. Décisions, D4 et D5 — îlot Tiptap, schéma éditorial restreint
à extraire  `docs/prototype-rust/decision.md` › § 8. Plan du prototype, ligne P7

## Acquis
- Au cycle TypeScript, les tests workerd n'appliquaient aucune CSP : une page verte côté serveur
  cassait au navigateur (connect-src manquant). La mesure devait se faire dans un vrai navigateur.

## Prochaine étape
Monter l'îlot Tiptap (Vite) servi en asset sur la page d'administration de P2.

## Écarté
Rien pour l'instant.
