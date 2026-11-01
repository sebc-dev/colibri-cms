## ADDED Requirements

### Requirement: Chaque image est servie à la taille de l'écran

La reconstruction du site SHALL décliner chaque image publiée en **variantes réduites** au format WebP,
aux largeurs 360, 720 et 1 080 pixels, en gardant ses proportions et sans jamais l'agrandir. Une largeur
supérieure à celle de l'image est remplacée par la largeur de l'image elle-même, et l'image n'a alors
aucune variante plus large. Les variantes naissent à la reconstruction, jamais à la publication : la
publication dépose toujours un seul fichier par image.

Une page publique DOIT proposer au navigateur toutes les variantes de chaque image qu'elle pose, chacune
annoncée avec sa largeur (attribut `srcset`). Elle DOIT annoncer la place que l'image occupe à l'écran
selon la nature de son emplacement (attribut `sizes`) : toute la largeur du contenu de la page pour une
**image** et pour un **carrousel**, la largeur d'une case de sa grille pour une **galerie**. La source
par défaut de l'image DOIT être l'une de ses variantes. Le texte de remplacement et les dimensions
déclarées restent ceux de l'image.

Le fichier déposé par l'éditrice NE DOIT être ni référencé ni chargé par aucune page publique. Le site
produit le garde, à une adresse qu'aucune page ne cite : la publication y relit l'original d'une image
posée au départ pour le déposer sur la branche des images, et l'administration en tire ses vignettes.
Une seule exception existe : une image dont la reconstruction ne sait pas réduire
les octets paraît telle que déposée. La reconstruction aboutit alors et nomme cette image dans son
compte rendu. Une image impossible à réduire NE DOIT jamais faire échouer la reconstruction.

#### Scenario: Une grande photo est proposée en trois largeurs
- **WHEN** une image de 2 000 × 1 500 pixels est publiée et posée dans un emplacement d'image
- **THEN** la page propose trois variantes WebP de 360 × 270, 720 × 540 et 1 080 × 810 pixels, chacune annoncée avec sa largeur, et aucune variante plus large

#### Scenario: Une image plus étroite que la plus grande largeur n'est jamais agrandie
- **WHEN** une image de 960 pixels de large est publiée et posée
- **THEN** la page propose ses variantes de 360, 720 et 960 pixels de large, et aucune plus large que 960

#### Scenario: Une petite image garde sa taille
- **WHEN** une image de 300 pixels de large est publiée et posée
- **THEN** la page en propose une seule variante WebP, de 300 pixels de large

#### Scenario: La place annoncée suit la nature de l'emplacement
- **WHEN** une même image est posée dans un emplacement d'image, dans une galerie et dans un carrousel d'une page publiée
- **THEN** l'image et le carrousel annoncent toute la largeur du contenu de la page, la galerie annonce celle d'une case de sa grille, et, pour un écran de 412 pixels de large, la place annoncée par la galerie est inférieure à la moitié de celle annoncée par l'image

#### Scenario: Le fichier déposé n'est jamais envoyé aux visiteurs
- **WHEN** le site est reconstruit avec des images publiées que la reconstruction sait réduire
- **THEN** aucune page publique ne référence le fichier déposé de ces images, et chacune n'y est proposée que par ses variantes

#### Scenario: Une image impossible à réduire paraît quand même
- **WHEN** la reconstruction trouve une image publiée dont les octets ne se laissent pas réduire
- **THEN** le site est produit, la page présente cette image telle que déposée, avec sa description et ses dimensions, et la reconstruction nomme cette image dans son compte rendu

### Requirement: La première image de la page paraît sans attendre

Une page publique SHALL demander sa **première image** dès la lecture du document, en priorité haute
(attribut `fetchpriority="high"`) et sans chargement différé. La première image est la première posée
dans l'ordre des emplacements. Quand elle se trouve dans une galerie ou un carrousel, c'est la première
image de cet ensemble. Toute autre image de la page DOIT se charger à l'approche de l'écran (attribut
`loading="lazy"`). Une page NE DOIT jamais porter plus d'une image prioritaire. Un emplacement vide ne
compte pas.

#### Scenario: La photo de tête est prioritaire
- **WHEN** la page « Accueil » pose une image de tête, puis une galerie de 45 photos
- **THEN** l'image de tête est demandée sans attendre et en priorité haute, et les 45 photos de la galerie se chargent à l'approche de l'écran

#### Scenario: La première image est dans une galerie
- **WHEN** le premier emplacement d'images d'une page est une galerie de trois images, suivie d'un emplacement d'image
- **THEN** seule la première image de la galerie est prioritaire, et les deux autres images de la galerie comme l'image suivante se chargent à l'approche de l'écran

#### Scenario: La première image est dans un carrousel
- **WHEN** le premier emplacement d'images d'une page est un carrousel de trois images
- **THEN** seule la première image du carrousel est prioritaire, et les deux autres se chargent à l'approche de l'écran

#### Scenario: Un emplacement vide ne compte pas
- **WHEN** une page pose un emplacement d'image sans image, puis une galerie de deux images
- **THEN** la première image de la galerie est prioritaire

#### Scenario: Une seule image prioritaire par page
- **WHEN** une page pose deux galeries de trois images chacune
- **THEN** seule la première image de la première galerie est prioritaire, et les cinq autres se chargent à l'approche de l'écran

### Requirement: Le site reste rapide avec des photos lourdes

Chaque page publique SHALL obtenir un score Lighthouse Performance d'au moins 95 en mobile, en médiane de
trois passes, mesuré sur le site réellement bâti et servi (SC-005). Le score DOIT tenir quand les images
sont des photographies proches du plafond de dépôt, d'environ 1 Mio chacune, et qu'une page en porte
plusieurs dizaines.

#### Scenario: Une page chargée de photos lourdes reste rapide
- **WHEN** on mesure trois fois, en mobile, chaque page d'un site publié dont l'accueil pose une photo de tête et une galerie de 45 photos d'environ 1 Mio chacune
- **THEN** la médiane du score Performance de chaque page est d'au moins 95
