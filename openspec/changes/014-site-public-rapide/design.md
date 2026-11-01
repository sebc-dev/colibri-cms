## Context

Voir `proposal.md` § Why pour la motivation. Le design part de l'état suivant, relevé sur `main` à
`ef60358` et sur le dernier build local.

- **Rendu.** `src/render/Image.astro` écrit un `<img>` simple : `src` vaut l'adresse de l'original,
  avec `loading="lazy"` et `decoding="async"` sur toutes les images. Il n'écrit ni `srcset` ni `sizes`.
  `Galerie.astro` et `Carrousel.astro` appellent ce même composant pour chaque image. Sur le build
  local, la page d'accueil porte
  `<img src="/_astro/media-fixture-hero.CGcAvttI.png" width="1280" height="640" … loading="lazy">`.
- **Empaquetage.** `src/platform/contenu/medias.ts` empaquette
  `import.meta.glob('/medias/*.{png,jpg,jpeg,webp}', { query: '?no-inline' })`. Chaque original sort
  donc en un fichier `/_astro/<id>.<empreinte>.<ext>`. Le paramètre `?no-inline` empêche Vite d'écrire
  un petit fichier en `data:` dans la page, ce que la politique `img-src` du site refuserait. Le dossier
  `./medias` est rempli avant le build par `scripts/recuperer-images-publiees.mjs` (`prebuild`), qui le
  vide puis y extrait la branche `media` du dépôt.
- **Configuration Astro.** `astro.config.ts` déclare `imageService: 'compile'`, `image.layout:
  'constrained'` et `image.breakpoints: [640, 960, 1280]`. Aucun fichier de `src/` n'importe
  `astro:assets` : ces réglages n'agissent sur rien.
- **Aperçu.** `src/pages/admin/apercu/[...slug].astro` s'exécute à la demande dans le Worker. Il
  reprend `imagesPubliees()` pour les images que le site empaquette déjà. Pour toute autre image, il
  pose la source `/admin/medias/<id>/octets`.
- **Constructions.** Plusieurs chemins appellent `astro build` : `npm run build` (avec `prebuild`),
  `scripts/batir-site-jetable.mjs` (quatre sites jetables de test, sans `prebuild`), le site factice de
  recette, la mutation (`stryker.conf.json`) et Workers Builds. Tous lisent `astro.config.ts`.
- **Limites de Workers Builds** (palier gratuit, documentation Cloudflare relue le 2026-11-01) :
  2 vCPU, 8 Go, 20 minutes par build, 3 000 minutes par mois. Le cache de construction, à activer dans
  le tableau de bord, conserve `node_modules/.astro` pour Astro et le purge 7 jours après sa dernière
  lecture.
- **Mesure locale** (2026-11-01, 46 photos lourdes de la recette, JPEG 2 000 × 1 500 d'environ
  1 085 Kio chacune, sharp 0.35.4, 12 cœurs, traitement séquentiel avec un décodage par largeur) :

  | Largeur WebP | Poids médian (qualité 80) | Poids médian (qualité 70) |
  |---|---|---|
  | 360 px | 24 Kio | 16 Kio |
  | 720 px | 150 Kio | 122 Kio |
  | 1 080 px | 407 Kio | 340 Kio |

  Les trois largeurs prennent 322 ms par photo, soit 14,8 s pour les 46 photos. Les photos de la
  recette sont du bruit généré : c'est le pire cas pour la compression, et une vraie photo pèse moins.

## Goals / Non-Goals

**Goals :**
- Décliner chaque image publiée en variantes WebP de 360, 720 et 1 080 px, au moment de la construction
  et dans chacun de ses chemins.
- Faire écrire au rendu partagé (I3) `srcset`, `sizes` selon la nature de l'emplacement, et la priorité
  de la première image. Le site publié et l'aperçu passent par le même composant et la même
  composition.
- Ne plus servir l'original. Ne jamais faire échouer une construction pour une image impossible à
  réduire.
- Mesurer SC-005 sur la variante photos-lourdes, et mesurer le coût des variantes par photo pour la
  promotion de l'ADR.

**Non-Goals :**
- Réduire l'image au dépôt, ou changer le plafond de 2 Mio de `src/core/medias/ingestion.ts`.
- Un deuxième format d'image (AVIF, ou JPEG de repli).
- Un cache des variantes entre deux constructions de Workers Builds (voir Open Questions).
- Corriger les dimensions déclarées des photos portrait que l'orientation EXIF fait pivoter (voir
  Risks : comportement actuel conservé).
- Changer la mise en page du site (`src/site/site.css`).
- Retirer la route `/_image` qu'Astro injecte (voir `security-review.md`).

## Decisions

### D1 — Les variantes sont produites par une étape de construction du projet, avant l'assemblage

Une intégration Astro inscrite dans `astro.config.ts`, à côté de `sondeDev()` et `entetesAdmin()`,
produit les variantes au hook `astro:config:setup`, pour les commandes `build` et `dev`. Elle lit
`./medias/*.{png,jpg,jpeg,webp}` et écrit `./medias/variantes/<id>-<largeur>.webp`. Ce hook s'exécute
avant que Vite ne résolve les `import.meta.glob`. Tout chemin qui appelle `astro build` produit donc les
variantes sans câblage supplémentaire, y compris les sites jetables, la mutation, le site factice et
Workers Builds.

- **Règle pure dans `core`.** Le calcul des largeurs d'une image, la formation du nom d'une variante et
  sa lecture vivent dans un module pur, par exemple `src/core/medias/variantes.ts`. Ce module est le
  seul porteur de la liste `[360, 720, 1080]` et se teste dans `workerd` sans plateforme (I2).
- **Adaptateur dans `platform`.** Les appels à `sharp` et au système de fichiers vivent dans un module
  de `src/platform/medias/`, importé par `astro.config.ts` seul. C'est le patron déjà suivi par
  `src/platform/publication/forge-github.ts` et `src/platform/instance/expediteur.ts`. Aucun code du
  Worker ne l'importe.
- **Empaquetage.** `src/platform/contenu/medias.ts` remplace le motif des originaux par
  `/medias/variantes/*.{webp,png,jpg,jpeg}`, toujours en `?no-inline`. Les extensions autres que `webp`
  servent au repli (D6). `ImageRendue` gagne `variantes: readonly { adresse: string; largeur: number }[]`,
  triées par largeur croissante. `source` devient la plus grande variante qui ne dépasse pas 720 px, ou à
  défaut la plus petite. Une image publiée sans aucune variante est traitée comme aujourd'hui une image
  sans octets : la construction échoue en la nommant (exigence « Une page publiée n'affiche jamais
  d'image manquante », inchangée).
- **Original absent du site.** Plus aucun module n'importe les originaux. Vite ne les émet donc plus
  dans `/_astro/`. La publication continue de déposer l'original seul sur la branche `media`. Le budget
  de 42 images par publication (ADR-0021) ne bouge pas.

*Alternatives écartées :*
- **Le pipeline d'images d'Astro** (`getImage()` d'`astro:assets` au prérendu, `imageService:
  'compile'`, `image.layout: 'constrained'`), c'est-à-dire la voie du candidat. Les adresses des
  variantes n'y existent que pendant le prérendu des pages publiques. L'aperçu s'exécute à la demande,
  et l'adaptateur y bascule le service d'images en `passthrough` (`normalizeImageServiceConfig`,
  `@astrojs/cloudflare` 14.3.0). L'aperçu montrerait alors l'original même pour une image déjà publiée.
  Cette différence n'est pas admise par l'exigence `apercu` « Même rendu que la page publique », et il
  faudrait modifier cette spec. Cette voie dépend aussi de mécanismes internes : la collecte des images
  par le prérendu de l'adaptateur, et la suppression des originaux non référencés. En mode
  `constrained`, chaque image demande 1× et 2× sa largeur en plus des paliers (`getWidths`,
  `astro/dist/assets/layout.js`), soit 4 à 5 fichiers par photo. Enfin `core` ne peut pas porter un
  `ImageMetadata` d'Astro (I2).
- **Variantes produites à la publication.** Le Worker ne sait pas décoder une image sans module wasm, et
  le budget de sous-requêtes tomberait de 42 à environ 14 images par publication (3 fichiers par image).
- **Réduction au dépôt.** L'original serait perdu, et le Worker n'a pas de décodeur. Ce point est hors
  périmètre.
- **Cloudflare Images ou une transformation à la demande.** Le site ferait un traitement serveur à
  chaque consultation (contraire à FR-096) et dépendrait d'un service limité du compte client.

### D2 — Un seul format : WebP, qualité 80

Toutes les variantes sont en WebP, à la qualité par défaut de `sharp` (80). La transparence d'un PNG
est conservée. Chaque variante est **orientée selon l'EXIF** avant sa réduction (`rotate()` sans
argument), puis écrite **sans métadonnées**. Le navigateur appliquait déjà l'orientation EXIF à
l'original : sans cette étape, une variante sans EXIF paraîtrait pivotée.

*Alternative écartée :* deux formats dans un `<picture>`, AVIF et WebP, ou WebP et JPEG. Il faudrait
6 fichiers par photo, et le mur des 20 000 fichiers serait atteint vers 3 300 photos. L'encodage AVIF
est aussi plusieurs fois plus lent, ce qui allonge chaque construction. WebP suffit à SC-005 : l'audit
« Improve image delivery » vise des images servies en pleine taille et dans un format ancien.

### D3 — Largeurs : 360, 720, 1 080 ; jamais d'agrandissement

Pour une image de largeur `L`, les largeurs produites sont `{ w ∈ [360, 720, 1080] | w < L } ∪
{ min(L, 1080) }`. Les hauteurs sont proportionnelles et arrondies. Exemples : 2 000 → 360, 720, 1 080 ;
1 080 → 360, 720, 1 080 ; 960 → 360, 720, 960 ; 720 → 360, 720 ; 300 → 300. Une image produit au plus
3 fichiers.

Le calcul part de `src/site/site.css`, où `box-sizing` vaut `border-box`, `main` a une largeur maximale
de 70ch et un padding de 1rem, et la galerie est `repeat(auto-fill, minmax(10rem, 1fr))` avec un
espacement de 0,75rem. Il part aussi de l'écran du test mobile de Lighthouse : 412 px de large,
densité 1,75.

| Emplacement | Place à 412 px | Pixels réels (×1,75) | Variante choisie | Marge |
|---|---|---|---|---|
| image, carrousel | 380 px | 665 | 720 | 8 % |
| galerie (2 colonnes) | 184 px | 322 | 360 | 12 % |
| image sur téléphone de densité 3 | 380 px | 1 140 | 1 080 | −5 % (acceptable) |
| image sur ordinateur de densité 2 | ≈ 584 px | ≈ 1 170 | 1 080 | −8 % (acceptable) |

*Alternatives écartées :* `[640, 960, 1280]`, la liste du candidat. Une case de galerie y recevrait
640 px pour 322 utiles, soit 4 fois les octets nécessaires, et l'image recevrait 960 px pour 665 utiles.
Une quatrième largeur à 1 440 px ajouterait 33 % de fichiers pour des écrans hors de la mesure SC-005.

### D4 — La place annoncée (`sizes`) dépend de la nature de l'emplacement

Les valeurs vivent dans un seul module de `src/render/`, à côté des composants, avec un renvoi vers
`site.css` (« à modifier ensemble »). Pour les calculs, 70ch vaut environ 38,5rem dans la police
`system-ui` à 16 px.

- **image** et **carrousel** (une case du carrousel occupe 100 % de la largeur) :
  `(min-width: 38.5rem) 36.5rem, calc(100vw - 2rem)`.
- **galerie** : le nombre de colonnes vaut `⌊(C + 0,75rem) / 10,75rem⌋`, où `C` est la largeur du
  contenu :
  `(min-width: 38.5rem) 11.7rem, (min-width: 33.5rem) calc(33.34vw - 1.17rem), (min-width: 22.75rem) calc(50vw - 1.375rem), calc(100vw - 2rem)`.

Ce choix de règle est volontaire : une place surestimée de quelques pour cent coûte un palier plus
lourd au pire, alors qu'une place sous-estimée rend une image floue. La largeur `ch` dépend de la
police, à ±5 % ; les marges de D3 l'absorbent. Le module qui porte ces valeurs est interne à
`src/render/`. I3 ne change pas : `src/render/index.ts` reste le seul chemin importé de l'extérieur.

### D5 — La première image est marquée par la composition, dans `core`

`composerPage` (`src/core/rendu/page.ts`) parcourt les emplacements composés dans l'ordre. Il marque
`prioritaire: true` sur la première image posée et `false` sur toutes les autres. Un emplacement vide
ne porte aucune image et ne compte donc pas. La marque est posée sur un nouvel objet : une même image
posée deux fois ne doit pas être prioritaire deux fois, et `ImagesConnues` est partagée.
`Image.astro` lit cette marque. Pour l'image prioritaire, il écrit `fetchpriority="high"` sans
attribut `loading`, donc un chargement immédiat. Pour les autres, il écrit `loading="lazy"` et
`decoding="async"`, comme aujourd'hui.

*Pourquoi `core` et pas le rendu :* un composant Astro est rendu sans connaître ses voisins. Compter
dans `src/site/page.astro` y mettrait un état et une logique qu'aucun test unitaire n'atteint. La
composition est pure, déjà testée (`tests/unit/rendu/page.test.ts`) et partagée par l'aperçu (I3,
ADR-0024) : l'aperçu marque donc la même image.

### D6 — Une image impossible à réduire est servie telle que déposée

L'étape de D1 ne lève jamais d'erreur pour une image. Elle se replie dans trois cas : `sharp` échoue à
décoder (fichier tronqué, ou dimensions annoncées au-delà de `limitInputPixels`, alors que l'ingestion
admet un en-tête JPEG jusqu'à 65 535 px), l'image est animée (`metadata.pages > 1` : réduire ne
garderait que la première image), ou l'écriture échoue. Dans ces cas, elle copie l'original sous
`medias/variantes/<id>-<largeur originale>.<ext>` et écrit une ligne
`[variantes] <id> servie telle que déposée : <raison>` dans la sortie de construction. La page
présente alors l'image entière, sans `srcset` à plusieurs entrées. Une image publiée reste ainsi
toujours visible. C'est la raison de ce choix : l'éditrice ne lit pas la sortie de construction et ne
saurait pas quelle image retire une publication bloquée.

Le repli ne vaut que pour un fichier admis par l'ingestion. Avant tout décodage, l'étape relit l'en-tête
avec le lecteur de `src/core/medias/ingestion.ts`. Elle ne traite que les noms de la forme
`^[A-Za-z0-9-]+\.(png|jpe?g|webp)$`. Un fichier hors de cette liste n'a aucune variante, et la
construction échoue en le nommant, par l'exigence « image manquante ». Ce cas ne naît que d'un dépôt
modifié hors du produit (voir `security-review.md`, menaces 3 et 4).

### D7 — L'aperçu garde ses sources ; seules les variantes s'y ajoutent

La route d'aperçu reprend `imagesPubliees()`. Une image déjà empaquetée y porte donc ses variantes, à
l'adresse même où le site public les sert, et le rendu de l'aperçu coïncide avec celui de la page
publique (exigence `apercu` « Même rendu », inchangée). Une image que le site ne porte pas encore
garde la source `/admin/medias/<id>/octets` avec `variantes: []`. `Image.astro` n'écrit alors ni
`srcset` ni `sizes`. Le seul changement de la route est de recopier `variantes` quand elle reconstruit
l'objet d'une image connue. Les variantes sont servies par le site lui-même, et la politique de
l'administration les admet déjà.

### D8 — `astro.config.ts`

Le bloc `image: { layout, breakpoints }` est retiré, puisque rien ne le lit. `imageService: 'compile'`
est conservé : la valeur par défaut, `cloudflare-binding`, exigerait une liaison `IMAGES` sur le compte
client. Son commentaire est récrit : il cite « ADR-0019 », un numéro 1.x, et affirme à tort que ce
réglage produit les variantes. Le nouveau commentaire renverra au numéro 2.x attribué à la promotion.

### D9 — Coût de construction maîtrisé

Chaque photo est décodée une seule fois, puis déclinée par clonage. Les photos sont traitées en
parallèle, dans la limite de `os.availableParallelism()`, soit 2 sur Workers Builds gratuit. Une
variante déjà présente et plus récente que son original n'est pas refaite. Ce cas ne se produit qu'en
développement et dans les tests, puisque `prebuild` vide `./medias`. L'étape écrit à la fin une ligne
de bilan, `[variantes] <n> photos, <f> fichiers, <s> s`, que la recette relève sur Workers Builds.

### D10 — Dépendance `sharp`

`sharp` devient une dépendance de développement directe, figée sur la version déjà présente dans le
verrou (0.35.4, aujourd'hui optionnelle sous `astro`). Elle ne s'exécute qu'à la construction et
n'entre jamais dans le Worker. Workers Builds installe les dépendances de développement (`npm ci`).

## Architecture

**Éléments touchés (FQN) :**
- `colibri-cms.worker.core` — règle des largeurs et des noms de variantes ; marque de la première image
  dans la composition.
- `colibri-cms.worker.platform` — empaquetage des variantes (`contenu/medias.ts`) ; adaptateur `sharp`
  de construction (`medias/`).
- `colibri-cms.worker.render` — `Image`, `Galerie`, `Carrousel` ; module des places annoncées.
- `colibri-cms.worker.routes` — route d'aperçu (recopie de `variantes`).
- `workers-builds` — la reconstruction produit désormais les variantes.

**Relations ajoutées / retirées :** aucune. Les arêtes utilisées existent déjà : `platform → core`,
`render → core`, `routes → platform`, `workers-builds → colibri-cms.worker`. Le libellé de la dernière,
« bâtit, récupère les images, déploie », devient « bâtit, récupère les images, en produit les
variantes, déploie ». La description de `workers-builds` reçoit la même précision. Ces deux éditions de
`docs/architecture/context.c4` sont faites par le ticket qui pose l'étape, puis validées par
`likec4 validate --no-layout --json --project colibri-cms docs/architecture`.

**Invariants vérifiés :** I1, puisque les sens de dépendance restent ceux de la matrice ; I2, puisque
`core` reste pur et que `sharp` vit dans `platform` ; I3, puisque le rendu reste unique, que
`src/render/index.ts` reste le seul chemin importé et que les deux routes gardent le gabarit ; I5,
puisqu'aucun HTML brut n'est écrit ; I16, puisqu'aucun script ni îlot n'est ajouté au site public.
FR-096 tient : les variantes sont des fichiers statiques, et aucun traitement n'a lieu à la
consultation.

## Risks / Trade-offs

- **[Durée de construction et SC-004]** Toutes les variantes sont refaites à chaque construction, donc
  pour toute la bibliothèque publiée et pas seulement pour la page modifiée. Le coût mesuré en local
  est de 0,32 s par photo pour les trois largeurs, sur 12 cœurs, en séquentiel. Avec 2 vCPU, une
  bibliothèque de quelques centaines de photos pourrait ajouter plusieurs minutes et menacer SC-004
  (mise en ligne en moins de 5 minutes) bien avant le mur des 20 minutes. → Mitigation : décodage
  unique et parallélisme (D9). La recette mesure le coût réel par photo sur Workers Builds, et ce
  chiffre est reporté dans l'ADR promu. Si le coût mesuré dépasse 0,5 s par photo, le cache (Open
  Questions) devient le change suivant.
- **[Mur des fichiers]** Une photo produit au plus 3 fichiers. L'alerte à 15 000 fichiers (`docs/ci.md`,
  job `build`) arrive vers 5 000 photos, et le mur à 20 000 vers 6 600 photos. → Mitigation : le
  garde-fou de la CI compte déjà les fichiers de `dist/`. La limite est reportée dans l'ADR promu.
- **[SC-005 manqué sur le pire cas]** La photo de tête à 720 px pèse 150 Kio en qualité 80, parce que
  les photos de la recette sont du bruit. → Leviers, dans l'ordre et sans changer les specs : qualité 70
  (122 Kio mesurés), puis une qualité propre à la variante à 720 px. La mesure décide, et la valeur
  retenue est reportée dans l'ADR.
- **[Place annoncée approximative]** 70ch varie avec la police, à ±5 %. → Les marges de D3 (8 % et
  12 %) l'absorbent. Le test vérifie la règle à 412 px, pas un pixel exact.
- **[Orientation EXIF]** L'ingestion lit les dimensions dans l'en-tête, sans tenir compte de
  l'orientation EXIF. Une photo portrait prise téléphone tourné réserve donc une place aux proportions
  inversées, puis se recale au chargement. C'est déjà le cas aujourd'hui ; les variantes orientées (D2)
  ne l'aggravent pas. → Hors périmètre, signalé.
- **[Images animées]** → Repli de D6 : l'image est servie telle que déposée et garde son animation.
- **[Tests existants]** SC-06b (`tests/static/images-publiques-statique.test.ts`) attend `src`
  contenant `media-fixture-hero`. Le nom de la variante garde l'identifiant, donc le test tient.
  SC-06e compte une seule balise `<img>`, et les variantes ne changent pas ce compte. Aucun test ne fixe
  `loading="lazy"`. → Aucun test existant à retoucher n'est attendu. Si un test devait l'être, il serait
  déclaré au ticket.

## Migration Plan

1. **Préalable humain :** promouvoir l'ADR candidat amendé (`proposal.md` § Préalable).
2. Les tickets livrent l'étape, l'empaquetage, le rendu et la priorité, sans migration de base ni de
   contenu. La branche `media` ne change pas.
3. Retour arrière : revenir au commit précédent. La construction suivante sert de nouveau les
   originaux, puisque ceux-ci n'ont jamais quitté la branche `media`.
4. À l'archivage : la phrase « la rapidité mesurée (SC-005) … reste à sa story » du `## Purpose` de
   `openspec/specs/site-public/spec.md` devient fausse et doit être actualisée à la main, car
   l'archivage ne touche pas au Purpose. Il faut aussi cocher la story dans `docs/roadmap.md`.

## Open Questions

- **Cache des variantes entre deux constructions.** Il serait rangé sous `node_modules/.astro/`,
  indexé par l'empreinte de l'original et les réglages, et conservé par le cache de Workers Builds si
  le compte client l'active. Il n'est utile que si la mesure sur Workers Builds le justifie. C'est un
  ajout qui ne change ni les specs ni l'approche, et il se décide sur le chiffre relevé en recette.
