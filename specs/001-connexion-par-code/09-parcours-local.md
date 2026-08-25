# 09 — Le parcours joué contre le serveur local

**Bloqué par :** 02, 05, 07, 08
**Vérif :** observé — motif : la liaison d'expédition n'existe pas dans le moteur de test, dont les liaisons sont locales (ADR-0003) ; et une égalité de **durées** ne se juge pas sur une assertion. Les deux se constatent sur le serveur local, au prix d'une vérification lente. Arbitré par la spec le 2026-08-25.

**Fichiers :** `scripts/verif-connexion.sh`

## Ce que ça livre

Le seul endroit du projet où la vraie liaison d'expédition est éprouvée. Un script rejouable conduit
le parcours entier contre le serveur local — de l'écran de connexion à l'accueil — et capture la
preuve de ce qu'aucun test ne peut constater : qu'un message **part**, vers la seule adresse
autorisée, dans la forme voulue ; que les deux branches de la soumission ne se distinguent pas par
leur temps de réponse ; et que pas un mot de développeur ne paraît sur le chemin que l'éditrice
emprunte.

La mesure des temps a une condition qu'il ne faut pas rater : les deux cents soumissions se
conduisent **hors plafond, la fenêtre vidée entre les salves**. Sans ça, la branche autorisée
bascule au sixième tir sur le chemin qui ne travaille pas — les deux branches deviennent le même
code, et la mesure ne prouve plus rien.

Ce qui se constate ici est le **départ** du message, jamais son arrivée : la réception réelle est
hors du périmètre de la feature.

## Critères

- [ ] le parcours joué contre le serveur local conduit de l'écran de connexion jusqu'à l'accueil, sans intervention manuelle
- [ ] soumettre l'adresse autorisée fait partir un message ; soumettre une autre adresse n'en fait partir aucun
- [ ] le message part en texte seul, sans HTML, et porte un objet fixe posé par le produit
- [ ] deux cents soumissions, conduites hors plafond et la fenêtre vidée entre les salves, ne laissent pas distinguer les deux branches par leur temps de réponse
- [ ] la relecture des textes du parcours — connexion, saisie, refus, plafond, accueil — et du message n'y trouve aucun terme de développeur
- [ ] la preuve est capturée et datée : la sortie du script est rejouable telle quelle
