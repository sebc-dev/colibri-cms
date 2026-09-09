# 08 — Poser et remplacer une image dans un emplacement d'image

**Bloqué par :** 03, 04, 06
**Vérif :** test
**Fichiers :** `src/pages/admin/pages/[slug]/emplacements/[id].ts` (embranchement par nature, étendu à la nature image), `src/platform/brouillons/magasin.ts` (enregistrement de la pose au brouillon de la page), `src/core/pages/brouillon.ts` (pose et remplacement, livrés au ticket 03), `src/admin/ilots-svelte-5/` (le sélecteur d'image monté dans l'éditeur), `src/admin/ilots-svelte-5/monter.ts`, `tests/integration/`

Motif du mode `test` : la pose s'enregistre dans le brouillon de la page dans la vraie base locale par la couture HTTP — un couplage d'entrées/sorties vérifié après coup.

## Ce que ça livre
Depuis l'éditeur d'une page, l'éditrice pose dans un emplacement d'image une image déjà présente dans la réserve : un sélecteur ouvre sur la bibliothèque, elle choisit, et le brouillon de la page référence cette image par son identité — sans nouveau téléversement. Elle remplace de la même façon l'image posée par une autre. Chaque geste va au brouillon, l'état publié n'est jamais touché, et la page bascule à « brouillon » sans que l'éditrice quitte l'écran. Aucun terme de développeur ne paraît.

## Critères
- [ ] Par la couture HTTP, poser dans un emplacement d'image une image déjà présente fait référencer cette image par son identité dans le brouillon de la page ; l'état publié reste intact, la page bascule à « brouillon », et aucun téléversement n'a lieu.   (SC-08a)
- [ ] Par la couture HTTP, remplacer l'image posée par une autre image de la réserve fait référencer la nouvelle image à la place de l'ancienne dans le brouillon ; l'état publié reste intact et la page bascule à « brouillon ».   (SC-08b)
- [ ] Aucun terme de développeur ne paraît dans le sélecteur d'image ni à la pose.   (SC-08c)
