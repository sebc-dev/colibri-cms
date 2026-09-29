## Why

Sur une page chargée, l'éditrice ne distingue deux emplacements de même nature que par leur contenu :
l'éditeur les présente par leur nature seule (« Texte riche », « Galerie »), et la fiche d'une image
les désigne par leur nature suivie d'un rang (« Accueil — 2e galerie »). Le change 005 promet pourtant
que chaque emplacement se présente « avec son libellé » (`mise-en-page-administration`, « L'éditeur
d'une page passe sur une colonne » ; maquette « Texte riche — Présentation ») — et ce libellé n'existe
pas : la déclaration d'un emplacement ne porte qu'un identifiant technique, une nature et un rang
(ADR-0012). Arbitrage humain sur la review du ticket 08 de 005 : le libellé est un **nom propre à
chaque emplacement, posé par l'intégrateur** ; SC-08a de 005 reste ouvert jusqu'à ce change.

Sert **Epic A — Entrer et éditer** (`docs/roadmap.md`), en complément de **003 — Remplir et corriger
les emplacements d'une page** (FR-015→026) et de **004 — Bibliothèque de médias** (FR-032, FR-035) ;
tenu par FR-024/025 (l'éditrice ne renomme rien) et FR-117 (aucun terme de développeur). Juge SC-003 et
SC-015 : une éditrice qui retrouve seule, du premier coup, l'emplacement qu'elle veut corriger. La
story **006 — Nom des emplacements** reste à inscrire dans `docs/roadmap.md` (Epic A) à l'archivage.

## What Changes

- **L'intégrateur peut nommer chaque emplacement** dans la déclaration de sa page : un nom court, écrit
  pour l'éditrice (« Présentation », « Nos réalisations »). Le nom est **facultatif** : une page
  déclarée sans nom reste valide et se présente comme aujourd'hui.
- **L'éditeur d'une page présente chaque emplacement par sa nature et son nom**
  (« Texte riche — Présentation ») ; un emplacement sans nom se présente par sa nature seule.
- **La bibliothèque désigne un emplacement par son nom quand il en a un** : la liste « Posée dans » de
  la fiche d'une image et la liste préalable à la suppression d'une image montrent
  « Accueil — Nos réalisations » ; sans nom, la désignation actuelle (nature en français, suivie de son
  rang dès qu'il y a plusieurs emplacements de même nature) reste le repli.
- **Le nom n'est jamais tiré de l'identifiant technique** : un emplacement sans nom ne montre jamais son
  identifiant, même mis en forme (FR-117).
- **L'éditrice ne crée, ne change ni ne retire aucun nom** : il appartient à la structure posée par
  l'intégrateur, comme la nature et l'ordre (FR-024/025).
- **Les pages de démonstration reçoivent des noms**, pour montrer les deux présentations (avec et sans
  nom) côte à côte.

Hors-périmètre :
- Tout outil de saisie de la déclaration pour l'intégrateur (la déclaration reste écrite à la main).
- Le site public : le nom est un repère d'administration, il n'est jamais rendu aux visiteurs.
- Nommer les pages (elles ont déjà un titre) ou les images (nom d'affichage de 004).
- L'habillage de la carte d'emplacement elle-même (change 005) : ce change ne décide que ce qu'elle dit.

## Capabilities

### New Capabilities
<!-- aucune -->

### Modified Capabilities
- `pages-et-emplacements` : la déclaration d'un emplacement admet un **nom** facultatif, lu en `core/` ;
  l'éditeur d'une page présente chaque emplacement par sa nature **et son nom**, avec la nature seule
  pour repli.
- `bibliotheque-de-medias` : la désignation d'un emplacement dans « Posée dans » et dans la liste
  préalable à la suppression utilise **le nom de l'emplacement** quand il existe, la nature et son rang
  sinon.

## Impact

- **Code** : `src/core/pages/declaration.ts` (le champ `nom` dans le modèle et sa lecture) ; l'éditeur
  `src/pages/admin/pages/[slug].astro` (titre de chaque carte) ; la désignation des emplacements de la
  bibliothèque (`src/admin/ilots-svelte-5/emplacements-media.ts`, `placeEmplacement`) et la fiche
  `src/pages/admin/medias/[id].astro`.
- **Contenu** : `content/pages/*/page.json` des trois pages de démonstration.
- **Décisions** : ADR-0012 tenu — le nom est un champ de plus dans le `page.json`, lu en `core/`, jamais
  écrit depuis l'administration, et l'identifiant stable reste la seule clé du brouillon.
- **Dépendance** : le titre de carte de l'éditeur est posé par le ticket 08 du change 005 ; les tickets
  de ce change qui touchent l'éditeur s'empilent sur lui tant qu'il n'est pas fusionné.
- **Politique de sécurité, données D1, routes d'écriture** : inchangées.
