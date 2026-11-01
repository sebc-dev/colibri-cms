## Why

Le site public perd la rapidité promise dès que l'éditrice pose de vraies photos. SC-005 exige un score
Lighthouse Performance ≥ 95 en mobile, mesuré sur le HTML réellement bâti des pages publiées. Le
2026-11-01 (Lighthouse 13.6.0, mobile, médiane de 3 passes), l'Accueil du site de recette obtient 97 avec
des images légères de 147 Kio. Il tombe à **75** (plus grand élément affiché au bout de 17,2 s en médiane)
sur la variante « photos-lourdes » du site factice : une photo de tête et une galerie de 45 photos
d'environ 1 Mio, des fichiers que le dépôt accepte puisque son plafond est de 2 Mio. Chaque image part
entière vers le visiteur, quelle que soit la taille de son écran. La première image de la page attend
son tour comme les autres, ce qui retarde l'affichage du haut de la page.

Sert l'**Epic B — Convertir le visiteur**, story « Site public rapide et complet » (`docs/roadmap.md`) ;
couvre **SC-005** et achève FR-095 → FR-097 (`docs/vision.md`) : le document servi reste complet et
statique, et seul l'envoi d'une demande déclenche un traitement serveur.

## What Changes

- À chaque reconstruction du site, chaque image publiée est déclinée en **variantes réduites** au
  format WebP, à trois largeurs fixes. Une image n'est jamais agrandie.
- Chaque page publique propose ces variantes au navigateur et lui dit quelle place l'image occupe selon
  la nature de l'emplacement : **image**, **galerie** ou **carrousel**. Le navigateur charge alors la
  plus petite variante qui suffit à l'écran du visiteur.
- Le fichier déposé par l'éditrice (l'**original**) n'est plus envoyé aux visiteurs. Il reste la
  référence que la publication dépose (budget de 42 images par publication inchangé), et la
  reconstruction en tire les variantes. Le site le garde, à une adresse qu'aucune page ne cite : la
  publication y relit l'original d'une image posée au départ, et l'administration en tire ses
  vignettes.
- La **première image de la page** est demandée dès la lecture du document, en priorité haute. Toutes
  les autres images se chargent à l'approche de l'écran, comme aujourd'hui.
- Une image que la reconstruction ne sait pas réduire paraît quand même, telle que déposée. La
  reconstruction ne bloque jamais une publication pour une raison de rapidité.
- L'**aperçu** passe par le même composant et la même composition (I3, ADR-0024). Une image déjà
  publiée y paraît avec les mêmes variantes que sur le site. Une image pas encore publiée y paraît
  entière, servie par l'administration comme aujourd'hui.
- La preuve de SC-005 est mesurée sur la variante photos-lourdes : 3 passes en mobile, médiane ≥ 95 sur
  chaque page.

## Points tranchés

Le détail et les chiffres sont dans `design.md` § Decisions.

1. **Un seul format, WebP.** Toutes les variantes sont en WebP. Aucun navigateur courant ne le refuse,
   et un deuxième format doublerait les fichiers sans gain sur SC-005. Une photo produit au plus
   **4 fichiers** sur le site (3 variantes et l'original, point 5), contre 1 aujourd'hui. Le plafond
   de la plateforme (20 000 fichiers) est donc atteint vers 5 000 photos, et l'alerte à 15 000 fichiers
   vers 3 750 photos.
2. **Largeurs : 360, 720 et 1 080 pixels.** Elles sont calculées sur la mise en page réelle du site
   (`src/site/site.css`) et sur l'écran du test mobile de Lighthouse (412 px, densité 1,75). Une case
   de galerie demande 322 pixels réels, servis par la variante à 360 px. Une image ou un carrousel
   demandent 665 pixels réels, servis par la variante à 720 px. La variante à 1 080 px sert les
   téléphones de densité 3 et les écrans d'ordinateur haute densité.
3. **Une seule image prioritaire par page : la première dans l'ordre des emplacements.** Quand cette
   première image est dans une galerie ou un carrousel, seule la première image de cet ensemble est
   prioritaire. Les autres images de l'ensemble se chargent à l'approche de l'écran. Un emplacement vide
   ne compte pas.
4. **Aperçu.** Les variantes sont produites avant que le site ne soit assemblé, puis empaquetées comme
   les originaux le sont aujourd'hui. L'aperçu, qui s'exécute à la demande, retrouve donc les variantes
   de toute image déjà publiée. Une image pas encore publiée n'a pas de variante : elle paraît entière,
   avec les mêmes dimensions déclarées. C'est déjà la seule différence que la spec `apercu` admet pour
   les images.
5. **L'original reste dans le site, sans qu'aucune page ne le cite.** L'intégrateur livre chaque site
   avec des images posées au départ, que la bibliothèque inscrit sans en garder les octets. La première
   publication les dépose toutes sur la branche des images, et elle relit leur original dans le site
   en service. Sans l'original, cette première publication s'arrêterait faute d'octets, ou déposerait
   une variante réduite à la place du fichier d'origine, alors que la spec `publication` exige des
   octets inchangés. La bibliothèque tire aussi ses vignettes de cet original. Le visiteur ne le charge
   jamais, puisqu'aucune page ne le cite. Le prix est un quatrième fichier par photo (point 1) et des
   métadonnées encore téléchargeables à l'adresse de l'original (`security-review.md`).

## Préalable aux tickets — geste humain

Le candidat `docs/adr/_candidates/pipeline-d-images-variantes-au-build.md` doit être **promu** dans
`docs/adr/`. Il faut l'amender des points tranchés ci-dessus avant de le promouvoir. Le candidat décrit
aujourd'hui les réglages d'images d'Astro (`image.layout: 'constrained'`, `breakpoints: [640, 960, 1280]`,
composant `<Image>`). Ce change produit les variantes par une étape de construction propre au projet,
en WebP seul, à 360, 720 et 1 080 px, sans original cité par les pages, avec au plus 4 fichiers par
photo (3 variantes et l'original). Promu tel quel, l'ADR serait contredit par ce design. La promotion
doit aussi reprendre le coût de production des variantes mesuré en local (`design.md` § Context), qui
remplace la réserve « minutes de build bornées par rien de mesuré ». Le numéro 2.x est attribué à la
promotion. Ce change ne l'écrit pas.

Un ADR accepté ne se modifie plus. Les chiffres que la recette relèvera après la promotion (coût par
photo sur Workers Builds, qualité WebP retenue) sont donc consignés dans le cahier de recette, pas dans
l'ADR. Si le coût mesuré sur Workers Builds dépasse 0,5 s par photo, un nouvel ADR remplace celui-ci.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `site-public` : trois exigences ajoutées — chaque image publiée est servie en variantes réduites
  adaptées à la nature de son emplacement ; la première image de la page est demandée sans attendre ;
  chaque page publique atteint le score Lighthouse ≥ 95 en mobile même avec des photos lourdes (SC-005).
  Aucune exigence existante ne change. Les images gardent leur description, leurs dimensions déclarées
  et leur ordre.

La capacité `apercu` ne change pas. Son exigence « Même rendu que la page publique » admet déjà, pour
une image que le site en service ne porte pas encore, une autre adresse pour ses octets.

Les capacités `publication` et `bibliotheque-de-medias` ne changent pas non plus : elles lisent toujours
l'original, que le site garde (point tranché 5).

## Impact

- **Construction du site** : une étape nouvelle produit les variantes avant l'assemblage, dans toute
  construction qui passe par `astro.config.ts` : `npm run build`, les sites jetables des tests, le site
  factice, Workers Builds. Elle s'appuie sur `sharp`, qui devient une dépendance de développement
  directe. Il est déjà installé dans l'arbre comme dépendance optionnelle d'Astro, en version 0.35.4.
- **Code** : `src/platform/contenu/medias.ts` empaquette les variantes en plus des originaux. Les
  originaux ne servent plus qu'à l'administration et à la publication, qui ne changent pas.
  `src/core/rendu/page.ts` porte les variantes de chaque image et marque la première image posée.
  `src/render/Image.astro`, `Galerie.astro` et `Carrousel.astro` écrivent les variantes, la place de
  l'image selon la nature de l'emplacement, et la priorité. `src/pages/admin/apercu/[...slug].astro`
  garde ses sources. `astro.config.ts` reçoit l'étape de construction, et son bloc `image`, devenu
  sans effet, est retiré.
- **Tests** : `tests/static/images-publiques-statique.test.ts`, `tests/unit/rendu/*` et
  `scripts/batir-site-jetable.mjs` (les fixtures d'images doivent sortir en variantes). Deux tests
  existants sont à retoucher (`design.md` § Risks, « Tests existants ») : la liste exacte des attributs
  de `<img>` (`tests/static/images-publiques-statique.test.ts`, ligne 144) et les images composées
  comparées à l'identique (`tests/unit/rendu/images.test.ts`).
- **Durée de construction** : environ 0,3 s par photo mesurée en local. Ce coût s'ajoute au délai de
  mise en ligne (SC-004 : moins de 5 minutes). Il se mesure sur Workers Builds pendant la recette.
- **Hors périmètre** : réduire l'image au dépôt (le plafond de 2 Mio est inchangé), un deuxième format
  d'image, un cache des variantes entre deux constructions, l'orientation EXIF des photos portrait
  (comportement actuel inchangé), et la route `/_image` qu'Astro injecte déjà dans le Worker
  (signalée dans `security-review.md`).
