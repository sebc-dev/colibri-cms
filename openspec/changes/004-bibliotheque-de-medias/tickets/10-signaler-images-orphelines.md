# 10 — Signaler les images orphelines

**Bloqué par :** 02, 05, 08
**Vérif :** observé
**Fichiers :** `src/admin/ilots-svelte-5/` (la marque d'orphelin sur la vignette et sur la fiche), `src/platform/medias/magasin.ts` (dérivation de l'orphelinat à partir des références lues), `src/core/medias/references.ts` (règle livrée au ticket 02)

Motif du mode `observé` : le signalement est une marque visuelle dans la grille et sur la fiche, hydratée côté navigateur ; sa présence se constate à l'œil (preuve capturée). La règle qui décide qu'une image n'est plus référencée est, elle, éprouvée en amont (ticket 02).

## Ce que ça livre
Dans la grille et sur la fiche, une image que plus aucun emplacement ne référence est signalée comme vouée à l'effacement à la prochaine publication — la marque qui prévient l'éditrice avant qu'une image inutilisée ne disparaisse. Une image encore posée dans au moins un emplacement ne porte pas cette marque. Aucun terme de développeur ne paraît dans le signalement.

## Critères
- [ ] Une image que plus aucun emplacement ne référence est signalée, dans la grille comme sur sa fiche, comme vouée à l'effacement à la prochaine publication, sans terme de développeur.   (SC-10a)
- [ ] Une image posée dans au moins un emplacement n'est pas signalée comme orpheline.   (SC-10b)
