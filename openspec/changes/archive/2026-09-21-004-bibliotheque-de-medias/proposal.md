## Why

Gérer ses images est le second geste du produit après remplir ses pages (SC-010 : remplacer une image
sans la re-téléverser, et aucune image manquante après suppression ; SC-018 : une description saisie
servie avec l'image) ; or l'administration, après 003, sait présenter et corriger les emplacements de
texte, de lien de vidéo et de bouton, mais **aucun emplacement d'image** — 003 a renvoyé ici les
emplacements porteurs d'image (FR-019/020/021) faute de bibliothèque pour les alimenter. Sert Epic A
« Entrer et éditer » (docs/roadmap.md, feature « Bibliothèque de médias ») ; couvre FR-027→040 et, hérités
de 003, FR-019/020/021, sous FR-117. Tout ce change vit dans le monde du **brouillon** : aujourd'hui
l'état publié n'a aucune représentation (migration 0004), et « Aperçu et publication » est la feature
suivante.

## What Changes

- Une **bibliothèque de médias** : téléverser une image (FR-027), la présenter dans une **grille** de
  toutes les images du site (FR-028), la **rechercher** par nom et description (FR-029), la **renommer**
  (FR-030), saisir et modifier sa **description** (FR-031).
- Le téléversement **refuse** hors des bornes de **format** — liste blanche fermée JPEG / PNG / WebP
  reconnue sur les **octets d'en-tête** (jamais l'extension ni le `Content-Type` déclaré), SVG refusé —
  et de **poids** — 2 Mo, borne d'une ligne D1 — en disant à l'éditrice ce qui a été refusé (FR-040),
  sans terme de développeur (FR-117).
- L'**éditeur d'une page** (capacité `pages-et-emplacements`) gagne les trois natures d'emplacement
  d'image : **image** (FR-019), **galerie** (FR-020), **carrousel** (FR-021). L'éditrice **pose** dans un
  tel emplacement une image **déjà présente** dans la bibliothèque, sans nouveau téléversement (FR-033),
  et **remplace** l'image posée (FR-034). Chaque pose ou remplacement va au **brouillon** de la page et la
  bascule à « brouillon », sans effet sur le site public (FR-026, hérité).
- La bibliothèque **indique**, pour chaque image, les emplacements où elle est posée (FR-032), et
  **signale** les images qu'aucun emplacement ne référence plus, vouées à l'effacement à la prochaine
  publication (FR-038).
- **Supprimer** une image présente d'abord la liste des emplacements concernés avant d'appliquer (FR-035),
  puis retire l'image de **tous** ses emplacements, chaque retrait enregistré dans le brouillon concerné
  (FR-036).
- Aucun geste ne crée, ne supprime ni ne renomme une page ou un emplacement ; la structure reste figée
  (FR-024/025, hérité). Aucun terme de développeur ne paraît dans le parcours (FR-117).

Hors-périmètre — délégué, avec sa **règle** posée ici comme contrat vivant mais son **exécution** dans une
feature ultérieure :
- **FR-037** — l'effacement **définitif** d'une image à la publication, ssi plus aucun emplacement
  (publié ou brouillon) ne la référence : la règle et le modèle de comptage de références sont posés ici ;
  l'effacement lui-même (élagage de la branche `media` en `force: true`) part avec « Aperçu et publication ».
- **FR-039** — servir la description avec l'image sur toute page **publiée** : la description est saisie et
  stockée ici (FR-031) ; son rendu sur la page publiée part avec le site public.
- Le **rendu** partagé publié/aperçu d'un emplacement d'image (`render/`) et le **pipeline de variantes au
  build** (candidat `pipeline-d-images-variantes-au-build`) : nés avec l'aperçu et le site public.
- Le magasin **publié** des médias (branche orpheline `media`, candidat `medias-deux-magasins-un-par-etat`) :
  ce change ne touche que le magasin **brouillon** (D1).

## Capabilities

### New Capabilities
- `bibliotheque-de-medias` : téléverser une image dans le magasin brouillon sous liste blanche de format et
  borne de poids, présenter la grille des images du site, rechercher / renommer / décrire une image,
  indiquer ses emplacements de pose, présenter la liste des emplacements concernés puis retirer une image
  de tous ses emplacements-brouillons, signaler les images orphelines vouées à l'effacement ; et poser la
  règle de comptage de références qui gouvernera l'effacement définitif à la publication (exécution
  déléguée). Le tout dans le cadre de navigation de l'administration, sous CSP stricte.

### Modified Capabilities
- `pages-et-emplacements` : l'éditeur d'une page présente désormais aussi les emplacements de nature
  **image**, **galerie** et **carrousel** (FR-019/020/021) ; l'éditrice y pose une image déjà présente
  dans la bibliothèque (FR-033) et remplace l'image posée (FR-034), chaque geste allant au brouillon de la
  page. Le modèle d'emplacement de `core/` et sa lecture de la déclaration gagnent ces trois natures.

## Impact

- `src/core/` : les trois natures d'emplacement d'image dans le modèle et la lecture de la déclaration
  (`pages/declaration.ts`) ; l'ingestion d'un média — reconnaissance du format sur les octets d'en-tête,
  bornes de format/poids, lecture des dimensions (FR-108, déjà payé), déduction du `Content-Type` depuis la
  liste blanche (candidat `ingestion-des-medias-liste-blanche-sur-octets`) ; la pose / le remplacement d'une
  image dans le brouillon d'un emplacement ; le comptage de références (emplacements posant une image) et la
  dérivation de l'état « orpheline » ; le retrait d'une image de tous ses brouillons. Logique pure, sans
  base ni HTTP (candidat `core-sans-framework-ni-plateforme`, ARCH-5).
- `src/platform/` : persistance D1 du média en brouillon (binaire en `BLOB`, candidat
  `medias-deux-magasins-un-par-etat` — volet brouillon) ; requêtes de la grille, de la recherche, des
  références de pose.
- `migrations/` : nouvelle table des médias en brouillon (identité, nom d'origine, nom d'affichage,
  description, dimensions, type déduit, binaire), migration versionnée additive — ne touche ni
  `brouillons_emplacements` (dont les lignes d'image réutilisent le schéma `(page_slug, id_emplacement,
  nature, contenu)`) ni l'auth.
- `src/pages/admin/` : écran Médias (grille, recherche, téléversement, fiche d'une image, flux de
  suppression) ; **route de service des octets d'un média en brouillon**, sous le garde de session (I6,
  ADR-0007) — origine commune, `Content-Type` déduit de la liste blanche et `X-Content-Type-Options: nosniff`
  (SEC-5, ADR-0004) ; routes d'écriture (téléversement, renommage, description, pose/remplacement, retrait).
  Aucune surface publique nouvelle (FR-097).
- `src/admin/` : îlot Médias (grille, recherche, téléversement, fiche) et le sélecteur d'image monté dans
  l'éditeur d'emplacement d'image — sous CSP stricte, sans `client:*` (ADR-0006), `script-src 'self'`
  (I12) : aucun script tiers, tout embarqué dans le bundle de l'îlot.
- Rubrique « Médias » de la barre latérale : aujourd'hui inerte (003), rendue active et servie.
