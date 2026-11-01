# 01 — La première image de la page paraît sans attendre

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/core/rendu/page.ts`, `src/render/Image.astro`, `tests/unit/rendu/premiere-image.test.ts`, `tests/static/premiere-image-statique.test.ts`, `tests/static/fixtures/site-jetable-images/content/`, `tests/unit/rendu/images.test.ts` (dérogation, voir plus bas), `tests/static/images-publiques-statique.test.ts` (dérogation, voir plus bas)

## Ce que ça livre

Le haut de chaque page publique s'affiche plus tôt : sa **première image** est demandée dès la lecture du
document, en priorité haute, au lieu d'attendre son tour comme les autres. Toutes les autres images de la
page continuent de se charger à l'approche de l'écran, comme aujourd'hui. L'**aperçu** passe par la même
composition et le même composant (I3, ADR-0024) : il marque la même image.

**Ce qu'est la première image :**
- c'est la première image posée dans l'ordre des emplacements ;
- quand elle se trouve dans une galerie ou un carrousel, c'est la première image de cet ensemble ;
- un emplacement vide ne compte pas, et un texte, un bouton ou un formulaire placés avant non plus ;
- une page ne porte jamais plus d'une image prioritaire, et une page sans image n'en porte aucune ;
- une même image posée deux fois n'est prioritaire qu'à sa première occurrence.

**Décisions à respecter (design D5 ; I2, I3, I16) :**
- **La composition marque l'image.** `composerPage` (`src/core/rendu/page.ts`) parcourt les emplacements
  composés dans l'ordre. Elle pose `prioritaire: true` sur la première image posée et `false` sur toutes
  les autres. Un composant Astro est rendu sans connaître ses voisins : compter dans le gabarit y mettrait
  un état qu'aucun test unitaire n'atteint. La composition est pure, déjà testée et partagée par l'aperçu.
- **La marque vit sur l'image composée.** Elle est posée sur un nouvel objet. Les images connues
  (`ImagesConnues`, partagées entre les emplacements, et ce qui les fournit : `imagesPubliees()` et la
  route d'aperçu) ne la portent pas. Une même image posée deux fois ne doit pas devenir prioritaire deux
  fois.
- **Le composant écrit la priorité.** `src/render/Image.astro` lit la marque :
  - image prioritaire : `fetchpriority="high"`, sans attribut `loading` ni `decoding`, donc un
    chargement immédiat ;
  - autres images : `loading="lazy"` et `decoding="async"`, comme aujourd'hui.

  `Galerie.astro` et `Carrousel.astro` n'ont rien à compter.
- Aucun script ni îlot n'entre dans le site public (I16).

**Les tests :**
- SC-01b à SC-01e se prouvent sur `composerPage`, avec des pages composées à la main : exactement une
  image porte `prioritaire: true`, et c'est celle attendue.
- SC-01a se prouve aussi sur le HTML bâti. L'Accueil du site de démo ne pose qu'une image : il prouve la
  moitié « demandée sans attendre » (`fetchpriority="high"`, aucun attribut `loading`). La moitié « les
  autres images attendent » demande une page bâtie qui pose une image, puis une galerie de plusieurs
  images. Elle s'ajoute comme **nouvelle page** de la fixture `tests/static/fixtures/site-jetable-images/`,
  sans toucher à son accueil : le cas « Sécurité (mitigation 3) » y compte une seule `<img>`.
- Cas limites à couvrir : page sans image ; emplacement d'image vide puis galerie ; la même image posée
  deux fois ; un formulaire ou un texte avant la première image.

**Dérogation déclarée — deux tests existants à mettre à jour.** Le delta exige désormais une image
prioritaire par page. Deux tests existants décrivent les images sans cette marque :
- `tests/unit/rendu/images.test.ts` (ticket 06 du change 011) compare les images composées à
  l'identique (`toEqual`) : SC-06b (ligne 55), SC-06d (lignes 76 à 79) et SC-06g (lignes 114 à 117). Ce
  ticket est **autorisé** à ajouter la marque à ces seules valeurs attendues : `prioritaire: true` sur la
  première image de la page, `prioritaire: false` sur les autres. Les cas, les entrées et les autres
  assertions restent intacts.
- `tests/static/images-publiques-statique.test.ts`, cas « Sécurité (mitigation 3) », ligne 144 : la
  liste attendue des attributs de l'unique `<img>` du site jetable à images. Cette image est la première
  de sa page. Ce ticket est **autorisé** à remplacer, dans cette seule liste, `'loading'` et `'decoding'`
  par `'fetchpriority'`, à la place où le composant l'écrit. Les autres assertions du cas (une seule
  `<img>`, aucun `<script>`, le texte de remplacement piégé resté du texte) restent intactes.

Arbitré par l'humain à la décomposition. Si la vérification finale bloque malgré la dérogation, la
retouche est commitée seule sur la branche du ticket, puis le run est repris.

**Hors périmètre :**
- les variantes réduites et `srcset` (ticket 02) ;
- la place annoncée au navigateur, `sizes` (tickets 02 et 04) ;
- le préchargement par `<link rel="preload">`, et toute image posée en CSS.

## Critères
- [ ] Quand la page « Accueil » pose une image de tête, puis une galerie de 45 photos, l'image de tête est demandée sans attendre et en priorité haute, et les 45 photos de la galerie se chargent à l'approche de l'écran   (SC-01a)
- [ ] Quand le premier emplacement d'images d'une page est une galerie de trois images, suivie d'un emplacement d'image, seule la première image de la galerie est prioritaire, et les deux autres images de la galerie comme l'image suivante se chargent à l'approche de l'écran   (SC-01b)
- [ ] Quand le premier emplacement d'images d'une page est un carrousel de trois images, seule la première image du carrousel est prioritaire, et les deux autres se chargent à l'approche de l'écran   (SC-01c)
- [ ] Quand une page pose un emplacement d'image sans image, puis une galerie de deux images, la première image de la galerie est prioritaire   (SC-01d)
- [ ] Quand une page pose deux galeries de trois images chacune, seule la première image de la première galerie est prioritaire, et les cinq autres se chargent à l'approche de l'écran   (SC-01e)
