# 11 — Voir où une image est posée, et la supprimer partout

**Bloqué par :** 02, 07, 08
**Vérif :** test
**Fichiers :** `src/pages/admin/medias/[id]/supprimer.ts` (route de suppression : retrait de tous les emplacements), `src/platform/brouillons/magasin.ts` + `src/platform/medias/magasin.ts` (lecture des emplacements posant une image, retrait de chacun), `src/admin/ilots-svelte-5/` (la liste des emplacements sur la fiche, la liste préalable et la confirmation), `tests/integration/`

Motif du mode `test` : la suppression retire l'image de tous ses emplacements en écrivant dans les brouillons des pages concernées, dans la vraie base locale par la couture HTTP — un effet multi-pages dont l'oracle se vérifie après coup contre la base réelle. La forme visuelle de la liste préalable relève de la même preuve observable que la fiche ; la donnée qu'elle présente (quels emplacements sont concernés) est, elle, vérifiable par la couture.

## Ce que ça livre
Sur la fiche d'une image, l'éditrice voit où l'image est posée : la liste des emplacements qui la référencent, désignés par leur page et leur place ; si aucun ne la pose, la fiche le dit. Pour supprimer une image, la liste des emplacements concernés lui est d'abord présentée ; à la confirmation, l'image est retirée de tous ses emplacements à la fois, chaque retrait enregistré dans le brouillon de la page concernée — sans jamais toucher l'état publié, et sans qu'une page publiée puisse un jour montrer une image absente. Chaque page touchée bascule à « brouillon », et l'image, n'étant plus posée nulle part, devient orpheline. Supprimer une image que rien ne pose ne touche aucun brouillon.

## Critères
- [ ] La fiche d'une image posée présente la liste des emplacements qui la posent, désignés par leur page et leur place, sans terme de développeur.   (SC-11a)
- [ ] La fiche d'une image posée dans aucun emplacement indique qu'elle n'est posée nulle part.   (SC-11b)
- [ ] Demander la suppression d'une image présente d'abord la liste des emplacements concernés, avant toute application.   (SC-11c)
- [ ] Par la couture HTTP, confirmer la suppression d'une image posée dans plusieurs emplacements de pages différentes la retire de chacun, chaque retrait enregistré dans le brouillon de la page concernée ; l'état publié reste intact et chaque page touchée bascule à « brouillon ».   (SC-11d)
- [ ] Supprimer une image posée dans aucun emplacement ne touche aucun brouillon, et l'image devient orpheline.   (SC-11e)
- [ ] Aucun terme de développeur ne paraît dans la liste préalable ni dans la confirmation de suppression.   (SC-11f)
