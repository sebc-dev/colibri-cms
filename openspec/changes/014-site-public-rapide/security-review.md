## Surface

- **Décodage d'images pendant la construction (nouveau).** Aujourd'hui, la construction recopie les
  octets des images sans les lire. Avec ce change, chaque image publiée est décodée par libvips (via
  `sharp`) sur la machine de construction : Workers Builds, ou un poste local. Ces octets viennent de
  la branche `media` du dépôt du client. Ils y entrent par la publication, après le contrôle d'en-tête
  de l'ingestion (JPEG, PNG ou WebP, reconnus sur les octets ; SVG refusé). Quiconque a le droit
  d'écrire sur ce dépôt peut aussi les y déposer directement.
- **Noms de fichiers dérivés.** L'étape écrit `medias/variantes/<id>-<largeur>.<ext>`, où `<id>` est
  tiré du nom du fichier lu dans `./medias`.
- **Aucune entrée nouvelle à l'exécution.** Le change n'ajoute ni route, ni lecture de requête, ni
  script. Les variantes sont des fichiers statiques de la même origine. La politique de sécurité du
  site public et celle de l'administration ne changent pas.

## Menaces

1. **Image piégée contre le décodeur.** Une image construite pour exploiter une faille de libvips,
   libwebp, libjpeg ou libpng (par exemple CVE-2023-4863 dans libwebp) pourrait exécuter du code sur la
   machine de construction. De là, l'attaquant pourrait **altérer le site produit**, par exemple en y
   glissant un script, ce qui serait un XSS de même origine contre le cookie de l'administration. Il
   pourrait aussi lire les secrets présents dans l'environnement de construction.
2. **Bombe de décompression.** Un petit fichier dont l'en-tête annonce des dimensions énormes :
   l'ingestion admet un en-tête JPEG jusqu'à 65 535 × 65 535. Il épuiserait la mémoire (8 Go) et ferait
   échouer chaque construction, ce qui bloquerait toutes les publications suivantes.
3. **Fichier qui n'est pas une image.** Un fichier déposé directement sur la branche `media` sous un
   nom `.png`, mais d'un autre format que libvips sait ouvrir (TIFF, PDF, SVG…), élargirait la surface
   de décodage au-delà des trois formats admis.
4. **Chemin d'écriture.** Un nom de fichier forgé (`..`, séparateur) pourrait faire écrire une variante
   hors de `medias/variantes/`.

## Mitigations

1. **Liste blanche relue avant décodage.** Avant d'appeler `sharp`, l'étape relit l'en-tête de chaque
   fichier avec le même lecteur que l'ingestion (`src/core/medias/ingestion.ts`). Un fichier hors JPEG,
   PNG ou WebP n'est ni décodé ni recopié : il n'a aucune variante, et l'exigence « Une page publiée
   n'affiche jamais d'image manquante » fait échouer la construction en le nommant. Ce cas ne naît que
   d'un dépôt modifié hors du produit. Le repli « servie telle que déposée » (design D6) ne s'applique
   qu'à un fichier dont l'en-tête est admis.
2. **Dépendance tenue à jour.** `sharp` est figée par le verrou, avec contrôle d'intégrité par `npm ci`,
   et suivie par le contrôle SCA de la CI (OSV). Une CVE de libvips ou de libwebp se corrige en montant
   `sharp`. Le change n'élargit pas la liste des formats admis.
3. **Limite de pixels conservée.** La limite par défaut de `sharp` (`limitInputPixels`) n'est jamais
   relevée. Une image qui la dépasse tombe dans le repli (D6) au lieu d'épuiser la mémoire. Le
   parallélisme est borné par le nombre de cœurs (D9).
4. **Noms stricts.** L'étape ne traite que les noms de base de la forme `^[A-Za-z0-9-]+\.(png|jpe?g|webp)$`.
   Les identifiants produits par le magasin sont des UUID, et les fixtures suivent la même forme. Les
   chemins d'écriture sont construits par `path.join` sur ce nom validé.

## Données

- **Amélioration partielle : les pages ne citent plus de métadonnées.** Aujourd'hui, l'original est
  servi tel que déposé, avec ses métadonnées EXIF : position GPS de la prise de vue, appareil, date. Une
  photo prise dans l'atelier de l'éditrice peut donc publier son adresse. Les variantes sont écrites
  sans métadonnées (D2), et aucune page ne cite plus l'original. Deux résidus restent :
  - l'original reste dans le site (design D1, la publication et la bibliothèque le lisent). Quiconque
    connaît son adresse peut le télécharger avec ses métadonnées. Cette adresse porte une empreinte du
    contenu (`/_astro/<id>.<empreinte>.<ext>`) : aucune page ne la cite, et elle ne se devine pas sans
    le fichier ;
  - une image servie telle que déposée par le repli (D6) garde ses métadonnées dans la page.

  Ces résidus sont signalés ici, sans être traités dans ce change. Retirer l'original du site
  demanderait de changer la publication (design D1, alternatives écartées).
- Aucune donnée de visiteur n'est touchée.

## Observation hors périmètre — la route `/_image`

Le Worker bâti porte déjà une route serveur `/_image` (`prerender: false`), injectée par Astro avec le
point d'accès `image-passthrough-endpoint` de `@astrojs/cloudflare` 14.3.0. Elle a été relevée dans
`dist/server/chunks/server_*.mjs` le 2026-11-01. Elle n'est protégée par aucune session et répond sur
l'origine publique. Elle sert, depuis les fichiers statiques du site, toute ressource de même origine
dont le type est `image/*`, et refuse toute autre origine faute de domaine autorisé. Aucune page
publique ne la référence, et ce change ne la sollicite pas. Elle reste pourtant un traitement serveur
atteignable sur le site public, ce qui est un signal d'alerte au regard de FR-096. Elle mérite une fiche
de chantier : peut-on la retirer, ou la neutraliser par la configuration ?
