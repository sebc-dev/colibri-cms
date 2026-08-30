# 04 — Les deux branches sont indiscernables

**Bloqué par :** 03
**Vérif :** test
**Fichiers :** `src/core/auth/regles.ts`, `src/pages/admin/connexion.astro`, tests

## Ce que ça livre

Sur une soumission donnée, l'écran de connexion rend la même réponse, au même moment, que l'adresse
soumise soit l'adresse autorisée ou n'importe quelle autre. Un inconnu qui soumet une adresse au
hasard n'apprend donc pas, de cette soumission, si c'est celle qui ouvre l'administration.

Deux mécanismes le tiennent, et ils vont ensemble : la réponse n'est rendue qu'au terme d'un **délai
plancher fixe**, et l'expédition est remise à la plateforme **après** que la réponse est partie —
c'est ce qui rend le temps de réponse indépendant du travail réellement fait. Le plancher est gelé
en source : la mesure le juge et ne le règle jamais, sinon le contrôle est circulaire.

Deux cas dégénérés comptent autant que le cas nominal, parce que ce sont eux qu'on oublie : une
expédition qui échoue, et une instance où aucune adresse autorisée n'a été enregistrée.

L'égalité des **durées** elle-même n'est pas mesurée ici — une assertion ne juge pas une durée. Ce
ticket livre les deux mécanismes et l'égalité de ce qui est rendu ; le ticket 09 (le parcours joué
contre le serveur local) mesure les temps.

## Critères

- [x] sur une soumission donnée, le corps de la réponse est identique pour l'adresse autorisée et pour toute autre
- [x] les champs d'en-tête de la réponse sont identiques pour les deux branches
- [x] la réponse n'est rendue qu'au terme d'un délai plancher, et ce délai est une constante des sources
- [x] l'expédition est remise à la plateforme après que la réponse est rendue, jamais avant
- [x] une expédition qui échoue ne change ni le corps, ni les champs d'en-tête, ni le moment de la réponse
- [x] quand aucune adresse autorisée n'est enregistrée, la réponse reste la même — l'écran ne se comporte pas autrement sur une instance non semée
