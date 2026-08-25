# 01 — La porte close

**Bloqué par :** rien — démarrable
**Vérif :** test
**Fichiers :** `src/pages/admin/index.astro`, `src/pages/admin/connexion.astro`, `src/platform/session/index.ts`, `src/admin/` (gabarit d'administration et sa feuille de style liée), premier fichier de test du dépôt

## Ce que ça livre

L'administration est fermée et elle a une porte. Qui vise l'accueil sans session valide est renvoyé
vers l'écran de connexion ; cet écran-là, lui, se sert avec ou sans session — il n'est pas une route
d'administration, c'est ce qui rend la porte atteignable. L'accueil existe derrière la garde et ne
porte aucune fonction : il est le point d'arrivée du parcours, rien de plus.

À ce stade **aucune session ne peut exister** : le garde refuse tout, et c'est correct, pas
provisoire. C'est le ticket 06 (le code recopié ouvre la session) qui lui apprendra à reconnaître une
session valide.

Ce ticket écrit le premier test du dépôt : une requête HTTP contre le produit, dans son vrai moteur
et contre la vraie base locale. La couture de test n'existe pas encore, et `vitest.config.ts` est
dans le périmètre protégé de la session — si la faire tenir demande de le modifier, ça passe par un
commit humain.

## Critères

- [x] `/admin/` demandé sans cookie de session rend un renvoi vers l'écran de connexion, et jamais le contenu de l'accueil
- [x] l'écran de connexion se rend avec comme sans cookie de session, et porte son champ d'adresse
- [x] un chemin inconnu sous `/admin/` rend un refus, sans rien laisser voir de l'administration
- [x] l'écran d'accueil existe et ne porte aucune fonction — ni lien vers un autre écran, ni action ; aucune requête ne l'atteint tant qu'aucune session ne peut s'ouvrir
- [x] `src/pages/admin/index.astro` et `src/pages/admin/connexion.astro` importent tous deux le garde `src/platform/session/index.ts` (ADR-0007)
- [x] aucun gabarit sous `src/admin/` ne porte de directive `client:*` ni de bloc `<style>` — la feuille de style est un asset lié (ADR-0006, ADR-0008)
- [x] aucun terme de développeur ne paraît dans les textes rendus
