# 03 — L'adresse autorisée fait partir un code

**Bloqué par :** 01
**Vérif :** test
**Fichiers :** `migrations/` (adresse autorisée, codes), `src/core/auth/code.ts`, `src/platform/auth/magasin.ts`, `src/platform/email/`, `src/pages/admin/connexion.astro`, `src/admin/`, `wrangler.jsonc` (liaison d'expédition), tests

## Ce que ça livre

L'éditrice saisit sur l'écran de connexion l'adresse qu'elle utilise déjà et la soumet : un code
court est engendré, la base n'en garde qu'une empreinte salée, et son expédition est demandée à la
plateforme. Toute autre adresse soumise n'écrit rien et ne demande rien.

L'identifiant d'appareil est posé ici, à **l'affichage** du formulaire et seulement s'il manque.
Posé à la soumission, il ne le serait que pour l'adresse autorisée et sa seule présence la
trahirait ; réémis à chaque affichage, deux onglets ouverts s'annuleraient l'un l'autre.

**Ce que ce ticket ne prouve pas.** Ses critères s'arrêtent au bord de l'expédition : qu'un message
parte réellement, vers qui, et dans quelle forme, ne se constate pas dans le moteur de test — c'est
le ticket 09 (le parcours joué contre le serveur local) qui l'établit, et la spec l'a arbitré ainsi.

## Critères

- [x] afficher l'écran pose un identifiant d'appareil s'il manque, et laisse intact celui qui est déjà là
- [x] la durée de vie de cet identifiant n'est pas plus courte que celle d'un code
- [x] soumettre l'adresse autorisée écrit un code et demande son expédition à la plateforme
- [x] soumettre toute autre adresse n'écrit aucun code et ne demande aucune expédition
- [x] le code fait huit signes d'un alphabet de trente-deux caractères sans confusables
- [x] la base ne conserve du code qu'une empreinte salée — le code tel qu'il a été engendré ne s'y retrouve pas
- [x] le code écrit porte l'identifiant d'appareil de la soumission qui l'a demandé
