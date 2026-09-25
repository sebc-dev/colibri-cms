# 09 — L'éditeur d'une page habillé, emplacements d'image

**Bloqué par :** 08, 10
**Vérif :** observé
**Fichiers :** `src/admin/ilots-svelte-5/EmplacementImage.svelte`, `src/admin/ilots-svelte-5/EmplacementComposition.svelte`

## Ce que ça livre

Dans l'éditeur d'une page, les emplacements d'**image**, de **galerie** et de **carrousel** prennent la
présentation de leur carte : l'image ou les vignettes posées, le compte d'images, et les gestes —
poser, remplacer, composer. La sur-couche de choix d'une image tient dans l'écran : sur téléphone, elle
occupe l'écran moins 16 px de marge, montre deux vignettes par rangée, son contenu défile verticalement
si besoin, et son bouton de fermeture reste visible en tête. Un enregistrement refusé s'affiche en
rouge (`danger`) dans la carte concernée. Quand l'appareil demande de réduire les animations, la
sur-couche apparaît sans mouvement.

**Décisions à respecter :**
- **Aucun geste ne change** : poser, remplacer, composer une galerie ou un carrousel restent identiques,
  par les mêmes routes ; les messages restent ceux de `message-erreur-correction.ts` et de
  `libelle-compte-images.ts`. Les tests existants de ces gestes doivent rester verts tels quels.
- La carte d'emplacement est déjà posée par l'éditeur (ticket précédent) ; ce ticket n'habille que le
  contenu des deux îlots.
- Les vignettes réutilisent `VignetteMedia.svelte` tel qu'habillé par l'écran « Médias » ; ce ticket ne
  le modifie pas.
- Sur-couche : composant `dialog` de base (sous `src/admin/composants/ui/`) ou élément `<dialog>` natif ;
  transitions sous `motion-safe:` ; sous la CSP réelle (seule tolérance : les attributs `style`,
  ADR-0010).
- Sur écran étroit, vignettes et contrôles offrent une cible d'au moins 44 × 44 px.
- Tokens seulement (`I14`) ; aucune directive `client:*` (`I4`) ; noms et descriptions d'images rendus
  échappés.

**Preuve attendue :** sur l'artefact bâti (`npm run build` puis `wrangler dev`), captures à 1280 px et
à 360 px d'une page portant image, galerie et carrousel : au repos, sur-couche de choix ouverte (avec
beaucoup d'images), refus ; `scrollWidth` à 360 px ; boîtes des contrôles ; émulation
`prefers-reduced-motion` ; mesure du contraste.

**Hors périmètre :** les emplacements de texte ; la bibliothèque des médias elle-même.

## Critères
- [ ] Sur écran étroit (jusqu'à 360 px, sans défilement horizontal), poser et remplacer une image et composer une galerie ou un carrousel restent disponibles dans l'éditeur   (SC-09a)
- [ ] Sur écran étroit, la sur-couche de choix d'une image tient dans la largeur de l'écran, son contenu défile verticalement si besoin, et son bouton de fermeture reste visible   (SC-09b)
- [ ] Quand l'appareil demande de réduire les animations, la sur-couche de choix d'une image apparaît sans mouvement   (SC-09c)
- [ ] Un enregistrement refusé d'un emplacement d'image, de galerie ou de carrousel s'affiche en `danger`, dans la carte concernée, avec son texte   (SC-09d)
- [ ] Sur écran étroit, chaque vignette et chaque contrôle des emplacements d'image offre une zone de toucher d'au moins 44 × 44 px   (SC-09e)
- [ ] Chaque texte des emplacements d'image et de la sur-couche de choix atteint un contraste d'au moins 4,5:1 sur son fond   (SC-09f)
