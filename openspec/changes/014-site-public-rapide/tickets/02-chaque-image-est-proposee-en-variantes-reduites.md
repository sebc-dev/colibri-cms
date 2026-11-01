# 02 — Chaque image publiée est proposée en variantes réduites

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/core/medias/variantes.ts`, `src/platform/medias/variantes.ts`, `astro.config.ts`, `src/platform/contenu/medias.ts`, `src/core/rendu/page.ts`, `src/render/Image.astro`, `src/render/places.ts`, `src/pages/admin/apercu/[...slug].astro`, `docs/architecture/context.c4`, `package.json`, `package-lock.json`, `tests/unit/medias/variantes.test.ts`, `tests/static/variantes-statique.test.ts`, `tests/static/fixtures/site-jetable-images/`, `tests/integration/apercu-variantes.test.ts`, `tests/unit/rendu/images.test.ts` (dérogation, voir plus bas), `tests/static/images-publiques-statique.test.ts` (dérogation, voir plus bas)

## Ce que ça livre

À chaque construction du site, chaque image publiée est déclinée en **variantes réduites** : des copies
WebP de 360, 720 et 1 080 pixels de large, qui gardent ses proportions et ne l'agrandissent jamais.
Chaque page publique propose ces variantes au navigateur, qui charge la plus petite qui suffit à l'écran
du visiteur. Une photo de 1 Mio n'arrive donc plus entière sur un téléphone.

Le fichier déposé par l'éditrice (l'**original**) n'est plus cité par aucune page publique. Le site le
garde pourtant, à une adresse qu'aucune page ne cite : la publication y relit l'original des images
posées au départ par l'intégrateur, pour les déposer sur la branche des images, et l'administration en
tire ses vignettes. Sans lui, la première publication d'un site livré s'arrêterait.

**La règle des largeurs (design D3).** Pour une image de largeur `L`, les largeurs produites sont
`{ w ∈ [360, 720, 1080] | w < L } ∪ { min(L, 1080) }`. Les hauteurs sont proportionnelles, arrondies,
jamais nulles. Exemples : 2 000 → 360, 720, 1 080 ; 1 080 → 360, 720, 1 080 ; 960 → 360, 720, 960 ;
720 → 360, 720 ; 300 → 300. Une image produit au plus 3 variantes.

**Préalable :** l'ADR candidat `docs/adr/_candidates/pipeline-d-images-variantes-au-build.md` est promu
dans `docs/adr/` (`proposal.md`, § Préalable). Le commentaire d'`astro.config.ts` cite son numéro.

**Décisions à respecter (design D1, D2, D7, D8, D10 ; I1, I2, I3) :**
- **Une étape de construction du projet.** Une intégration Astro, inscrite dans `astro.config.ts` à côté
  de `sondeDev()` et `entetesAdmin()`, produit les variantes au hook `astro:config:setup`, pour les
  commandes `build` et `dev`. Elle lit `./medias/*.{png,jpg,jpeg,webp}` et écrit
  `./medias/variantes/<id>-<largeur>.webp`. Ce hook s'exécute avant que Vite ne résolve les
  `import.meta.glob`. Tout chemin qui appelle `astro build` produit donc les variantes sans autre
  câblage : `npm run build`, les sites jetables, la mutation, le site factice, Workers Builds. Un dossier
  `./medias` absent (site jetable sans image) n'est pas une erreur : il n'y a rien à produire.
  `/medias/` est déjà ignoré par git.
- **La règle pure dans `core`.** `src/core/medias/variantes.ts`, sans framework ni plateforme (I2), est
  le seul porteur de la liste `[360, 720, 1080]`. Il calcule les largeurs et les hauteurs d'une image,
  forme le nom d'une variante et le relit. Exemple : `media-fixture-hero-720.webp` donne l'identifiant
  `media-fixture-hero` et la largeur 720 ; un nom sans largeur, ou avec une largeur non entière, est
  ignoré. Il choisit aussi la source par défaut : la plus grande variante qui ne dépasse pas 720 px, à
  défaut la plus petite.
- **L'adaptateur dans `platform`.** `src/platform/medias/variantes.ts` porte les appels à `sharp` et au
  système de fichiers. Seul `astro.config.ts` l'importe, comme
  `src/platform/publication/forge-github.ts` et `src/platform/instance/expediteur.ts`. Aucun code du
  Worker ne l'importe. Chaque variante est en WebP à la qualité par défaut de `sharp` (80). Elle est
  orientée selon l'EXIF avant sa réduction (`rotate()` sans argument), puis écrite sans métadonnées. La
  transparence d'un PNG est conservée. Les photos sont traitées une à une : l'optimisation du coût
  appartient au ticket 05.
- **Les protections de la revue de sécurité, avant tout décodage** (`security-review.md`, mitigations 1,
  3 et 4) :
  - seuls les noms de la forme `^[A-Za-z0-9-]+\.(png|jpe?g|webp)$` sont traités ;
  - l'en-tête est relu par le lecteur de `src/core/medias/ingestion.ts` : JPEG, PNG ou WebP seuls ;
  - un fichier refusé n'a aucune variante, et la construction échoue en le nommant (exigence existante
    « Une page publiée n'affiche jamais d'image manquante ») ;
  - la limite de pixels de `sharp` (`limitInputPixels`) n'est jamais relevée ;
  - les chemins d'écriture sont construits par `path.join` sur le nom validé.
- **L'empaquetage.** `src/platform/contenu/medias.ts` garde le motif des originaux **inchangé** :
  `adressesOriginalesEmpaquetees()` et ses six lecteurs (bibliothèque, fiche d'une image, éditeur de
  page, publication) ne changent pas. Il lui ajoute le motif `/medias/variantes/*.{webp,png,jpg,jpeg}`,
  toujours en `?no-inline`, et soustrait à la mutation comme les autres motifs. `imagesPubliees()`, que
  lisent les pages publiques et l'aperçu, ne tire plus ses sources que des variantes. `ImageRendue` gagne
  `variantes: readonly { adresse: string; largeur: number }[]`, triées par largeur croissante. `source`
  devient la source par défaut. Une image publiée sans aucune variante est traitée comme une image sans
  octets : la construction échoue en la nommant.
- **Le rendu.** Quand l'image a des variantes, `src/render/Image.astro` écrit :
  - `srcset`, qui annonce chaque variante avec sa largeur (`<adresse> <largeur>w`) ;
  - `sizes`, qui annonce la largeur du contenu de la page pour toutes les natures d'emplacement :
    `(min-width: 38.5rem) 36.5rem, calc(100vw - 2rem)`.

  Cette valeur vit dans un module interne, `src/render/places.ts`. Elle y prend une forme structurée
  (seuil, part de l'écran, retrait) que le rendu sérialise. Le module renvoie à `src/site/site.css`
  (« à modifier ensemble »). Le ticket 04 y ajoutera la place propre à la galerie. Une image sans
  variante (image de l'aperçu pas encore publiée) n'a ni `srcset` ni `sizes`. Le texte de remplacement,
  les dimensions déclarées et la marque de priorité (ticket 01) ne changent pas. `src/render/index.ts`
  reste le seul chemin importé depuis l'extérieur (I3).
- **L'aperçu (D7).** `src/pages/admin/apercu/[...slug].astro` recopie `variantes` quand il reconstruit
  l'objet d'une image connue. Une image pas encore empaquetée garde la source
  `/admin/medias/<id>/octets`, avec `variantes: []`. Le rendu de l'aperçu coïncide ainsi avec celui de
  la page publique (exigence `apercu` « Même rendu que la page publique », inchangée).
- **`astro.config.ts` (D8).** Le bloc `image: { layout, breakpoints }` est retiré : rien ne le lit.
  `imageService: 'compile'` est conservé, car le défaut `cloudflare-binding` exigerait une liaison
  `IMAGES` sur le compte client. Son commentaire est récrit : il renvoie au numéro de l'ADR promu, et
  n'affirme plus que ce réglage produit les variantes.
- **`sharp` (D10)** devient une dépendance de développement directe, figée sur la version 0.35.4, déjà
  au verrou comme dépendance optionnelle d'Astro. Il ne s'exécute qu'à la construction et n'entre jamais
  dans le Worker. Le verrou se modifie avec npm 11 (`npx --yes npm@11 install …`) : le npm 10 local
  retire des champs de `package-lock.json`.
- **Le modèle.** Dans `docs/architecture/context.c4`, le libellé de
  `workers-builds -> colibri-cms.worker` devient « bâtit, récupère les images, en produit les variantes,
  déploie », et la description de `workers-builds` reçoit la même précision. Aucune relation n'est
  ajoutée. Validation : `likec4 validate --no-layout --json --project colibri-cms docs/architecture`.

**Les tests :**
- **Unité (`core`)** :
  - largeurs aux bornes : L = 1, 300, 359, 360, 361, 719, 720, 721, 1 079, 1 080, 1 081 et 2 000 ;
    360 → [360], 361 → [360, 361], 720 → [360, 720], 1 080 et 1 081 → [360, 720, 1080] ;
  - hauteurs : 1 280 × 640 → 360 × 180 ; 1 000 × 333 → 360 × 120 ; jamais 0 ;
  - noms : identifiant à tirets, nom sans largeur, largeur non entière ;
  - source par défaut : [360, 720, 1080] → 720 ; [360] → 360 ; [300] → 300.
- **Statique, sur un site bâti** :
  - des fixtures légères (couleur unie) de 2 000 × 1 500, 960 × 640 et 300 px de large s'ajoutent à
    `tests/static/fixtures/site-jetable-images/` (octets dans `medias/`, fiches dans `content/medias/`) ;
  - elles sont posées sur une page de cette fixture autre que l'accueil, dont le cas « Sécurité
    (mitigation 3) » compte une seule `<img>` ;
  - le `srcset` de la page bâtie annonce les largeurs attendues ;
  - chaque fichier annoncé est un WebP dont les dimensions, lues par le lecteur d'en-tête de
    `src/core/medias/ingestion.ts`, sont celles attendues.
- **SC-02d** se prouve sur le site de démo servi par le worker de test (`.wrangler/test-worker/client`) :
  aucune page ne cite l'original `media-fixture-hero.<empreinte>.png`, et chaque adresse de `src` et de
  `srcset` est une variante WebP.
- **Cas limites de format** : un PNG transparent garde son canal alpha ; un JPEG orienté par l'EXIF donne
  une variante orientée, sans métadonnées.
- **Non-régression** :
  - l'aperçu d'une page dont une image est empaquetée et l'autre non : la première porte ses variantes,
    à l'adresse où le site les sert, et la seconde garde `/admin/medias/<id>/octets`, sans `srcset`. La
    base se sème comme dans `tests/integration/apercu-avec-brouillons.test.ts` ;
  - les tests existants de la publication et `tests/integration/images-publiees-bibliotheque.test.ts`
    restent verts sans retouche.
- Aucun double de `sharp` : l'étape tourne pour de vrai dans les constructions jetables.

**Dérogation déclarée — deux tests existants à mettre à jour.** Le delta exige désormais des variantes
pour chaque image :
- `tests/unit/rendu/images.test.ts`, lignes 19 à 21 : les images d'exemple `GATEAU`, `SANS_TEXTE` et
  `TARTE` sont des `ImageRendue` sans `variantes`. Ce ticket est **autorisé** à leur ajouter
  `variantes: []`, et rien d'autre.
- `tests/static/images-publiques-statique.test.ts`, cas « Sécurité (mitigation 3) », ligne 144 : la
  liste attendue des attributs de l'unique `<img>` du site jetable à images. Ce ticket est **autorisé** à
  y ajouter `'srcset'` et `'sizes'`, à la place où le composant les écrit. Les autres assertions du cas
  restent intactes.

Arbitré par l'humain à la décomposition. Si la vérification finale bloque malgré la dérogation, la
retouche est commitée seule sur la branche du ticket, puis le run est repris.

**Hors périmètre :**
- le repli d'une image impossible à réduire (ticket 03). Jusque-là, une image admise que `sharp` ne sait
  pas décoder fait échouer la construction ;
- la place propre à une case de galerie (ticket 04) ;
- l'optimisation du coût de construction et sa ligne de bilan (ticket 05) ;
- un cache des variantes entre deux constructions, un deuxième format d'image, la réduction au dépôt ;
- les dimensions déclarées des photos portrait que l'EXIF fait pivoter ;
- la route `/_image` qu'Astro injecte (`security-review.md`).

## Critères
- [ ] Quand une image de 2 000 × 1 500 pixels est publiée et posée dans un emplacement d'image, la page propose trois variantes WebP de 360 × 270, 720 × 540 et 1 080 × 810 pixels, chacune annoncée avec sa largeur, et aucune variante plus large   (SC-02a)
- [ ] Quand une image de 960 pixels de large est publiée et posée, la page propose ses variantes de 360, 720 et 960 pixels de large, et aucune plus large que 960   (SC-02b)
- [ ] Quand une image de 300 pixels de large est publiée et posée, la page en propose une seule variante WebP, de 300 pixels de large   (SC-02c)
- [ ] Quand le site est reconstruit avec des images publiées que la reconstruction sait réduire, aucune page publique ne référence le fichier déposé de ces images, et chacune n'y est proposée que par ses variantes   (SC-02d)
