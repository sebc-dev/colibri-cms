# 05 — L'écran Médias : la grille, le téléversement, la recherche

**Bloqué par :** 04
**Vérif :** observé
**Fichiers :** `src/pages/admin/medias.astro` (l'écran, « Médias » rendue active), `src/admin/ilots-svelte-5/` (l'îlot de la bibliothèque : grille, vignettes, téléversement, recherche, états), `src/admin/ilots-svelte-5/monter.ts` (montage), `src/admin/textes.ts` (libellés sans terme de développeur), `src/platform/medias/magasin.ts` (requête de la liste et de la recherche)

Motif du mode `observé` : l'écran est un îlot hydraté côté navigateur sous CSP stricte ; la présence et l'agencement de la grille, des vignettes et des états vides ne se constatent pas dans la réponse d'une couture `workerd`, mais à l'œil (preuve capturée). La donnée sous-jacente — la liste des images — est, elle, servie et éprouvée au ticket 04.

## Ce que ça livre
La rubrique « Médias » devient active et ouvre sur la réserve : une grille présente toutes les images du site, une par vignette, dans le cadre de navigation de l'administration. Un bouton de téléversement ajoute une image ; un fichier hors format ou trop lourd est refusé en disant lequel des deux, sans terme de développeur ni trace technique. Une barre de recherche restreint la grille aux images dont le nom ou la description contient le terme saisi. Quand il n'y a aucune image, un message d'état vide le dit ; quand une recherche ne correspond à rien, un message propre à la recherche le dit, la réserve restant intacte. Aucun terme de développeur ne paraît nulle part.

## Critères
- [ ] La grille présente toutes les images du site, une par vignette.   (SC-05a)
- [ ] Quand la réserve ne contient aucune image, l'écran affiche un message d'état vide.   (SC-05b)
- [ ] L'écran est servi dans le cadre de l'administration (« Médias » marquée active), sous les en-têtes réels (CSP stricte, `script-src 'self'`), sans script en ligne ni directive d'hydratation d'île.   (SC-05c)
- [ ] Aucun terme de développeur ne paraît dans la grille ni dans le message d'état vide.   (SC-05d)
- [ ] Un téléversement refusé dit à l'éditrice si c'est le format ou le poids qui a été refusé, sans aucun terme de développeur.   (SC-05e)
- [ ] La recherche restreint la grille aux images dont le nom ou la description contient le terme saisi.   (SC-05f)
- [ ] Une recherche sans correspondance montre un état vide propre à la recherche, la réserve restant inchangée.   (SC-05g)
