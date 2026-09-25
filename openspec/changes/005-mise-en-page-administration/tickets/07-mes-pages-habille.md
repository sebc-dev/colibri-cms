# 07 — « Mes pages » habillé, avec l'adresse de chaque page

**Bloqué par :** 05
**Vérif :** test
**Fichiers :** `src/pages/admin/mes-pages.astro`, `src/admin/navigation-liste-des-pages.ts`, `tests/integration/mes-pages-habille.test.ts`

## Ce que ça livre

L'écran « Mes pages » présente, sous son titre, une carte portant une ligne par page, dans l'ordre posé
par l'intégrateur : le titre de la page, **son adresse sur le site juste en dessous** (en JetBrains
Mono, par exemple `/` ou `/nos-tartes`), et la marque de brouillon s'il y a lieu. Toute la ligne ouvre
l'éditeur de la page, comme aujourd'hui. Sur téléphone, la marque de brouillon passe sous le titre et
chaque ligne fait au moins 44 px de haut. Quand aucune page n'est déclarée, le message d'état vide
existant s'affiche dans la carte, en texte atténué (`ink-muted`).

**Décisions à respecter :**
- L'adresse d'une page est dérivée de son identifiant déclaré (celui que la liste connaît déjà), sans
  lecture nouvelle ; elle est rendue échappée (interpolation d'Astro, jamais `set:html`).
- Le balisage que les tests existants lisent reste compatible : `<h1>Mes pages</h1>` sans attribut ;
  chaque ligne est un `<li>` **sans attribut** qui **commence par le titre** de la page (plusieurs tests
  cherchent `<li>Accueil…</li>`) ; l'attribut `data-pastille-brouillon` de la marque reste. L'habillage
  passe par l'élément parent (variantes Tailwind sur la liste) ou par la couche de base.
- La marque de brouillon est celle du composant `MarqueBrouillon.astro`, telle quelle.
- La navigation au clic (`activerNavigationListeDesPages`) reste le geste d'ouverture ; aucun geste
  d'ajout, de retrait, de déplacement ni de renommage n'apparaît.
- Tokens seulement (`I14`) ; aucune directive `client:*` (`I4`) ; message d'état vide inchangé.

**Préalable :** le test « une ligne par page déclarée, dans l'ordre posé » de
`tests/integration/liste-des-pages.test.ts` (qui exigeait qu'une ligne contienne exactement le titre)
a été retiré par une PR directe, avant ce ticket. Le test de SC-07a en reprend la garantie d'ordre, avec
l'adresse. Ce ticket **n'ajoute** que des tests.

**Preuve attendue (partie aspect) :** sur l'artefact bâti (`npm run build` puis `wrangler dev`),
captures à 1280 px et à 360 px (liste avec brouillon, liste vide, titre de page long) ;
`document.fonts` et police calculée du titre, d'une ligne et d'une adresse ; mesure du contraste ;
`scrollWidth` à 360 px ; boîte de chaque ligne à 360 px.

**Hors périmètre :** création de page, tableau de bord, bandeau de publication.

## Critères
- [ ] Chaque ligne de « Mes pages » porte, sous le titre de la page, son adresse sur le site, en JetBrains Mono ; les lignes suivent l'ordre posé   (SC-07a)
- [ ] Le navigateur rend le titre de l'écran en Fraunces, le texte des lignes en Instrument Sans et l'adresse en JetBrains Mono   (SC-07b)
- [ ] « Mes pages » porte le thème Colibri : fond neutre chaud, titre en Fraunces, texte en Instrument Sans   (SC-07c)
- [ ] Affiché à 360 px de large, « Mes pages » ne défile pas horizontalement et aucun contenu n'est coupé, titre de page long compris   (SC-07d)
- [ ] Sur écran étroit, chaque ligne et chaque élément actionnable de « Mes pages » offre une zone de toucher d'au moins 44 × 44 px   (SC-07e)
- [ ] Chaque texte de « Mes pages », marque de brouillon et message d'état vide compris, atteint un contraste d'au moins 4,5:1 sur son fond   (SC-07f)
