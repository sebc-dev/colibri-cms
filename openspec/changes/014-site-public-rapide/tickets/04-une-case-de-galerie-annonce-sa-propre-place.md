# 04 — Une case de galerie annonce sa propre place

**Bloqué par :** 02
**Vérif :** tdd
**Fichiers :** `src/render/places.ts`, `src/render/Image.astro`, `src/render/Galerie.astro`, `src/render/Carrousel.astro`, `tests/unit/rendu/places.test.ts`, `tests/static/places-statique.test.ts`, `tests/static/fixtures/site-jetable-images/content/`

## Ce que ça livre

Sur un téléphone, une case de galerie n'occupe qu'une fraction de l'écran. La page le dit désormais au
navigateur, qui charge alors une variante plus petite : celle de 360 px au lieu de celle de 720 px, à
l'écran du test mobile de Lighthouse. Une galerie de 45 photos pèse ainsi plusieurs fois moins.

Chaque image annonce la place qu'elle occupe à l'écran (attribut `sizes`) selon la nature de son
emplacement :
- **image** et **carrousel** annoncent toute la largeur du contenu de la page, car une case de
  carrousel occupe toute cette largeur ;
- **galerie** annonce la largeur d'une case de sa grille.

**Décisions à respecter (design D4 ; I3) :**
- **Les valeurs**, tirées de `src/site/site.css` : `main` a une largeur maximale de 70ch (environ
  38,5rem dans la police `system-ui` à 16 px) et un padding de 1rem, avec `box-sizing: border-box` ; la
  galerie est une grille `repeat(auto-fill, minmax(10rem, 1fr))` avec un espacement de 0,75rem. Le
  nombre de colonnes vaut `⌊(C + 0,75rem) / 10,75rem⌋`, où `C` est la largeur du contenu.
  - image et carrousel : `(min-width: 38.5rem) 36.5rem, calc(100vw - 2rem)` (la valeur que le ticket 02
    pose pour toutes les natures) ;
  - galerie : `(min-width: 38.5rem) 11.7rem, (min-width: 33.5rem) calc(33.34vw - 1.17rem), (min-width: 22.75rem) calc(50vw - 1.375rem), calc(100vw - 2rem)`.
- **Un seul module.** Les valeurs vivent dans `src/render/places.ts`, posé par le ticket 02, sous une
  forme structurée (seuil, part de l'écran, retrait) que le rendu sérialise. Le module renvoie à
  `src/site/site.css` (« à modifier ensemble »). Il reste interne à `src/render/` :
  `src/render/index.ts` demeure le seul chemin importé depuis l'extérieur (I3).
- **La nature passe au composant.** `Galerie.astro` et `Carrousel.astro` disent leur nature à
  `Image.astro`. Un emplacement d'image garde la nature « image ».
- **Mieux vaut surestimer.** Une place surestimée de quelques pour cent coûte au pire une variante plus
  lourde ; une place sous-estimée rend l'image floue. La largeur `ch` varie de ±5 % avec la police ; les
  marges des largeurs choisies (8 % pour l'image, 12 % pour la galerie) l'absorbent.
- Ce ticket ne change que la **valeur** de `sizes` pour la galerie. La liste des attributs de `<img>`
  reste celle du ticket 02 : aucun test existant n'est à retoucher.

**Les tests :**
- Unité : la forme structurée, évaluée pour un écran de 412 px avec 1rem = 16 px, donne 380 px pour
  l'image et le carrousel, et moins de 190 px pour la galerie.
- Statique : une page bâtie pose la même image dans un emplacement d'image, dans une galerie et dans un
  carrousel. Elle porte, pour chaque nature, la chaîne que le rendu sérialise depuis cette forme. La page
  s'ajoute à la fixture `tests/static/fixtures/site-jetable-images/`, ailleurs que sur son accueil.

**Hors périmètre :**
- changer la mise en page du site (`src/site/site.css`) ;
- une place exacte au pixel près, ou d'autres tailles d'écran que celles que fixent les règles CSS.

## Critères
- [ ] Quand une même image est posée dans un emplacement d'image, dans une galerie et dans un carrousel d'une page publiée, l'image et le carrousel annoncent toute la largeur du contenu de la page, la galerie annonce celle d'une case de sa grille, et, pour un écran de 412 pixels de large, la place annoncée par la galerie est inférieure à la moitié de celle annoncée par l'image   (SC-04a)
