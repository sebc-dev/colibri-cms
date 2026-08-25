# 08 — La session s'éteint d'elle-même

**Bloqué par :** 06
**Vérif :** test
**Fichiers :** `src/platform/session/index.ts`, `src/core/auth/regles.ts`, tests

## Ce que ça livre

Une session se ferme après sept jours sans usage, et après trente jours quoi qu'il arrive. C'est ce
qui traite l'ordinateur partagé et l'appareil perdu, puisque le produit n'offre aucune déconnexion
explicite et aucun écran pour constater ce qui reste ouvert ailleurs.

Le rafraîchissement de l'échéance glissante **n'écrit pas à chaque requête** : le budget d'écriture
de la base est cinquante fois plus serré que celui de lecture, et l'administration la lit déjà à
chaque écran (ADR-0001).

Rien ne compte ni ne ferme les sessions simultanées — elles expirent, et c'est tout. Ce ticket ne
livre donc aucune fonction visible par l'éditrice : ce qu'il livre, c'est qu'une porte laissée
ouverte finit par se refermer seule.

## Critères

- [ ] une session restée sept jours sans usage ne donne plus accès à l'accueil, et la demande est renvoyée vers l'écran de connexion — jugé à instant injecté
- [ ] une session de plus de trente jours ne donne plus accès, même utilisée chaque jour depuis son ouverture — jugé à instant injecté
- [ ] un usage à l'intérieur de la fenêtre repousse l'échéance des sept jours
- [ ] le rafraîchissement n'écrit pas en base à chaque requête
- [ ] plusieurs sessions ouvertes coexistent sans que rien ne les compte ni ne les ferme
