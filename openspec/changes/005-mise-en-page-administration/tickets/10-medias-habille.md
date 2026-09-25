# 10 — L'écran « Médias » habillé

**Bloqué par :** 03
**Vérif :** observé
**Fichiers :** `src/admin/ilots-svelte-5/BibliothequeMedias.svelte`, `src/admin/ilots-svelte-5/VignetteMedia.svelte`, `src/admin/ilots-svelte-5/EcranMedias.svelte`, `src/pages/admin/medias.astro`

## Ce que ça livre

L'écran « Médias » présente son titre (Fraunces) avec le bouton « Téléverser » en action principale
(`plumage`), le champ de recherche, puis la grille des vignettes (coins tenus). Une image orpheline se
signale en ambre, avec son libellé écrit. Une image refusée au téléversement s'affiche en rouge
(`danger`), près du geste, avec son texte. Sur téléphone, le bouton de téléversement passe sous le titre
en pleine largeur, la grille se resserre à deux vignettes par rangée, chaque vignette entière et
lisible, et la recherche comme le téléversement restent accessibles sans défilement horizontal.

**Décisions à respecter :**
- **Aucun geste ne change** : rechercher, téléverser, ouvrir la fiche d'une image restent identiques,
  par les mêmes routes, avec les mêmes messages et les mêmes états (vide, recherche vide,
  téléversement, refus, orpheline). Les tests existants de la bibliothèque doivent rester verts tels
  quels.
- Le cadre est déjà rendu par le serveur (`GabaritCadre`, rubrique « Médias ») ; ce ticket n'habille
  que le contenu.
- `VignetteMedia.svelte` est habillé ici ; l'éditeur d'une page le réutilisera tel quel.
- Composants de base disponibles : `input`, `alert`, `button`, `badge`.
- Sur écran étroit, vignettes et contrôles offrent une cible d'au moins 44 × 44 px ; champ de recherche
  à 16 px sous 768 px (règle commune déjà posée).
- Tokens seulement (`I14`) ; aucune directive `client:*` (`I4`) ; noms d'images rendus échappés.

**Preuve attendue :** sur l'artefact bâti (`npm run build` puis `wrangler dev`), captures à 1280 px et
à 360 px : grille pleine, vide, recherche vide, refus au téléversement, orpheline, nom d'image long ;
`scrollWidth` à 360 px ; boîtes des vignettes et contrôles ; mesure du contraste.

**Hors périmètre :** la fiche d'une image ; tout geste nouveau sur les médias.

## Critères
- [ ] Sur écran étroit, la grille des médias se resserre à la largeur disponible, chaque vignette entière et lisible, et la recherche et le téléversement restent accessibles sans défilement horizontal   (SC-10a)
- [ ] Une image refusée au téléversement s'affiche en `danger`, près du geste, avec son texte   (SC-10b)
- [ ] « Médias » porte le thème Colibri : fond neutre chaud, titre en Fraunces, texte en Instrument Sans, bouton « Téléverser » en `plumage`   (SC-10c)
- [ ] Affiché à 360 px de large, « Médias » ne défile pas horizontalement et aucun contenu n'est coupé, nom d'image long compris   (SC-10d)
- [ ] Sur écran étroit, chaque vignette et chaque élément actionnable de « Médias » offre une zone de toucher d'au moins 44 × 44 px   (SC-10e)
- [ ] Chaque texte de « Médias », signalement d'orpheline et messages compris, atteint un contraste d'au moins 4,5:1 sur son fond   (SC-10f)
