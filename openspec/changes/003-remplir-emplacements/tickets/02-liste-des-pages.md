# 02 — La liste des pages

**Bloqué par :** 01
**Vérif :** test (couture HTTP réelle, comme 001) — la mise en page se constate à l'écran
**Fichiers :** `src/pages/admin/` (route « Mes pages »), `src/admin/` (l'écran de liste), `src/core/` (lecture de la structure déclarée), `tests/integration/`

## Ce que ça livre
La rubrique « Mes pages » devient un vrai point d'entrée : elle affiche toutes les pages du site
déclarées par l'intégrateur, dans l'ordre posé, une ligne par page. Une instance où aucune page n'est
déclarée montre un message disant qu'il n'y a rien à éditer — et aucun geste de création n'est offert,
puisque l'éditrice ne crée aucune page. La liste lit la déclaration ; elle ne l'écrit jamais. La
pastille de brouillon n'apparaît pas encore : elle naît avec la première correction (ticket 04).

## Critères
- [ ] L'`Écran : Liste des pages` affiche les pages déclarées dans l'ordre posé, une ligne par page.   (SC-02a)
- [ ] Une instance sans aucune page déclarée affiche le message d'état vide et n'offre aucun geste de création de page.   (SC-02b)
- [ ] La liste ne présente aucun geste d'ajout, de retrait, de déplacement ni de renommage de page (FR-024/025).   (SC-02c)
- [ ] Aucun terme de développeur ne paraît dans la liste ni dans le message d'état vide.   (SC-02d)
