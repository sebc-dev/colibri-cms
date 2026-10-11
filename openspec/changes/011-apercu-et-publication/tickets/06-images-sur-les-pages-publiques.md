# 06 — Les pages publiques présentent leurs images

**Bloqué par :** 02, 04, 05
**Vérif :** test
**Fichiers :** `src/core/rendu/page.ts`, `src/render/index.ts`, `src/render/Image.astro`, `src/render/Galerie.astro`, `src/render/Carrousel.astro`, `src/site/site.css`, `src/pages/[...slug].astro`, `tests/unit/rendu/images.test.ts`, `tests/static/images-publiques-statique.test.ts`

## Ce que ça livre

Les emplacements d'image, de galerie et de carrousel paraissent sur les pages publiques :
- une **image** paraît avec sa **description** comme texte de remplacement (FR-039), et avec ses
  dimensions déclarées pour que la page ne saute pas au chargement ;
- une image sans description est marquée décorative ;
- une **galerie** présente ses images dans l'ordre de l'emplacement ;
- un **carrousel** présente les siennes dans son ordre, en une bande qui défile horizontalement au
  doigt, sans script ;
- un emplacement sans image ne dessine rien : jamais une image manquante.

Les pages sont alors complètes : la page d'accueil porte le contenu de tous ses emplacements, dans
l'ordre posé.

Une page publiée ne doit jamais afficher d'image manquante (FR-091, SC-010). La construction du site
**échoue** donc en nommant l'image et la page en cause dès que le contenu publié pose une image dont
les octets ne sont pas parmi les images publiées. Le site en service reste alors tel qu'il était.

**Décisions à respecter :**
- Une image entre dans le rendu comme `{ source, largeur, hauteur, description }`. La `source` est :
  - pour une image publiée, la métadonnée d'une image empaquetée (`src/platform/contenu/medias.ts`,
    ticket 02), traitée par `<Image>` à la construction du site ;
  - pour une image en brouillon, l'adresse gardée `/admin/medias/<id>/octets`, dans l'aperçu
    seulement (ticket 09).

  Le **même** composant reçoit les deux : deux jeux de composants contrediraient I3 (ADR-0024).
- Description → texte de remplacement ; sans description, texte de remplacement vide (image
  décorative). Largeur et hauteur posées.
- Galerie en grille ; carrousel en bande `overflow-x` avec `scroll-snap`, sans script. Images à
  largeur de colonne.
- La route publique échoue à la construction, avec un message qui nomme l'image et la page, quand une
  image posée n'a ni fiche ni octets parmi les images empaquetées.
- Aucun `set:html` ; aucune ressource d'une autre origine.
- **Tests** : le contenu de démonstration n'a ni image sans description, ni galerie vide, ni image
  manquante. Le test les apporte **sans modifier `content/`** : sur la composition pure, et sur une
  construction lancée sur un contenu jetable (outil posé au ticket 04), qui doit échouer pour l'image
  manquante.

**Hors périmètre :** les images en brouillon dans l'aperçu (ticket 09) ; les variantes fines et la
rapidité mesurée (story « Site public rapide et complet ») ; le dépôt des images par la publication
(tickets 13 et 15).

## Critères
- [ ] Un visiteur qui demande `/` reçoit la page « Accueil », titrée « Accueil », portant le contenu de ses emplacements dans l'ordre posé   (SC-06a)
- [ ] Un emplacement d'image publié qui pose une image dont la description est « Gâteau d'anniversaire à la fraise » paraît avec ce texte de remplacement et ses dimensions   (SC-06b)
- [ ] Un emplacement d'image publié qui pose une image sans description la présente marquée décorative, avec un texte de remplacement vide   (SC-06c)
- [ ] Quand une galerie publiée pose trois images et qu'un carrousel publié pose les mêmes dans l'ordre inverse, la galerie les présente dans son ordre, et le carrousel dans le sien, en une bande qui défile sans script   (SC-06d)
- [ ] Un emplacement d'image sans image, ou une galerie qui n'en porte aucune, ne dessine rien sur la page, et aucune image manquante ne paraît   (SC-06e)
- [ ] Quand la reconstruction du site trouve une page dont un emplacement pose une image absente des images publiées, elle échoue en nommant cette image et cette page, et aucun site n'est produit   (SC-06f)
- [ ] Quand la reconstruction du site trouve, pour chaque image posée par le contenu publié, ses octets parmi les images publiées, le site est produit, et chaque page présente ses images   (SC-06g)
