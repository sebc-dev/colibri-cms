# 11 — La fiche d'une image habillée

**Bloqué par :** 03
**Vérif :** observé
**Fichiers :** `src/admin/ilots-svelte-5/FicheMedia.svelte`, `src/admin/ilots-svelte-5/EcranFicheMedia.svelte`, `src/pages/admin/medias/[id].astro`

## Ce que ça livre

La fiche d'une image présente un retour « ‹ Médias », la prévisualisation de l'image, son nom et sa
description (champs à libellé visible), la liste des emplacements où l'image est posée, et la
suppression (bouton `danger` en contour). Sur écran large, la prévisualisation est à gauche, et les
champs et emplacements dans une colonne de 320 px à droite ; sur téléphone, tout passe sur une colonne :
prévisualisation, champs, emplacements, suppression. La confirmation de suppression est une sur-couche
qui dit ce qui va disparaître et où ; comme la liste des emplacements concernés, elle tient dans
l'écran, son contenu défile si besoin, et son bouton de fermeture reste visible. Quand l'appareil
demande de réduire les animations, les sur-couches apparaissent sans mouvement.

**Décisions à respecter :**
- **Aucun geste ne change** : renommer, décrire, voir où l'image est posée, supprimer restent
  identiques, par les mêmes routes, avec les mêmes textes et les mêmes états. Les tests existants de la
  fiche doivent rester verts tels quels.
- Le cadre est déjà rendu par le serveur (`GabaritCadre`, rubrique « Médias ») ; ce ticket n'habille
  que le contenu.
- Composants de base disponibles : `input`, `label`, `textarea`, `dialog`, `alert`, `button`.
  Sur-couches sous la CSP réelle (seule tolérance : les attributs `style`, ADR-0010) ; transitions
  sous `motion-safe:`.
- Sur écran étroit, chaque élément actionnable offre une cible d'au moins 44 × 44 px ; sur-couches en
  pleine largeur moins 16 px de marge, hauteur bornée à l'écran.
- Tokens seulement (`I14`) ; aucune directive `client:*` (`I4`) ; nom et description rendus échappés.

**Preuve attendue :** sur l'artefact bâti (`npm run build` puis `wrangler dev`), captures à 1280 px et
à 360 px : fiche d'une image posée à plusieurs endroits, confirmation de suppression ouverte, nom long ;
`scrollWidth` à 360 px ; boîtes des contrôles ; émulation `prefers-reduced-motion` ; mesure du
contraste.

**Hors périmètre :** la grille des médias ; tout geste nouveau sur une image.

## Critères
- [ ] Sur écran étroit, la confirmation de suppression et la liste des emplacements concernés tiennent dans la largeur de l'écran, leur contenu défile verticalement si besoin, et leur bouton de fermeture reste visible   (SC-11a)
- [ ] Quand l'appareil demande de réduire les animations, les sur-couches de la fiche apparaissent sans mouvement   (SC-11b)
- [ ] La fiche porte le thème Colibri : fond neutre chaud, titre en Fraunces, texte en Instrument Sans, action principale en `plumage`   (SC-11c)
- [ ] Affichée à 360 px de large, la fiche passe sur une seule colonne, ne défile pas horizontalement et ne coupe aucun contenu, nom d'image long compris   (SC-11d)
- [ ] Sur écran étroit, chaque élément actionnable de la fiche offre une zone de toucher d'au moins 44 × 44 px   (SC-11e)
- [ ] Chaque texte de la fiche, messages compris, atteint un contraste d'au moins 4,5:1 sur son fond   (SC-11f)
