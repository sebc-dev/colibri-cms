## MODIFIED Requirements

### Requirement: Éditeur d'une page et ses emplacements

Ouvrir une page depuis la liste SHALL présenter ses emplacements dans l'ordre posé par l'intégrateur,
chacun présenté selon sa nature (texte riche, lien de vidéo, bouton d'action, **image, galerie,
carrousel**) et montrant son contenu courant, avec un fil de retour vers « Mes pages ». Cet écran porte la
présentation par nature ; le moyen d'édition fonctionnel de chaque nature — barre de mise en forme du texte
riche, champ de lien de vidéo, champs du bouton d'action, **sélecteur d'image pour les emplacements d'image,
de galerie et de carrousel** — est livré par la correction de cette nature (requirements suivants), non par
cet écran seul. L'éditeur ne DOIT offrir aucun geste d'ajout, de retrait, de déplacement ni de renommage
d'un emplacement (FR-024/025), ni aucun terme de développeur (FR-117).

#### Scenario: Ouvrir une page depuis la liste
- **WHEN** l'éditrice clique une page de l'`Écran : Liste des pages`
- **THEN** son `Écran : Éditeur de page` s'ouvre

#### Scenario: Les emplacements paraissent dans l'ordre posé, par nature
- **WHEN** l'éditeur d'une page est affiché
- **THEN** les emplacements paraissent dans l'ordre posé, chacun présenté selon sa nature (texte riche, lien de vidéo, bouton d'action, image, galerie, carrousel) — le moyen d'édition fonctionnel de chaque nature venant avec sa correction

#### Scenario: Chaque emplacement montre son contenu courant
- **WHEN** l'éditeur d'une page est affiché
- **THEN** chaque emplacement présente le contenu courant de la page

#### Scenario: Le fil de retour ramène à la liste
- **WHEN** l'éditrice actionne le fil de retour
- **THEN** l'`Écran : Liste des pages` est de nouveau affiché

#### Scenario: Aucun geste de structure dans l'éditeur
- **WHEN** l'éditrice parcourt l'éditeur d'une page
- **THEN** aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement, et rien ne l'offre à l'écran (FR-024/025)

#### Scenario: Aucun terme de développeur dans l'éditeur
- **WHEN** l'éditrice lit l'éditeur d'une page
- **THEN** aucun terme de développeur n'y paraît

## ADDED Requirements

### Requirement: Pose et remplacement d'une image dans un emplacement d'image

Un emplacement de nature **image** (FR-019) SHALL permettre à l'éditrice de **poser une image déjà présente**
dans la bibliothèque, sans nouveau téléversement (FR-033), et de **remplacer** l'image posée par une autre
image de la bibliothèque (FR-034). La pose et le remplacement passent par l'application d'une correction au
**brouillon** de la page — le brouillon référence l'image par son identité stable —, sans jamais toucher
l'état publié (FR-026), et la page bascule à « brouillon ». Le noyau `core/` DOIT refuser une pose qui
viserait un emplacement non déclaré ou d'une autre nature, au titre de la garde de structure (FR-024/025).
Aucun terme de développeur ne DOIT paraître (FR-117).

#### Scenario: Poser une image déjà présente sans nouveau téléversement
- **WHEN** par la couture HTTP, l'éditrice pose dans un emplacement d'image une image déjà présente dans la bibliothèque
- **THEN** le brouillon de la page référence cette image par son identité, l'état publié reste intact, la page bascule à « brouillon », et aucun téléversement n'a lieu

#### Scenario: Remplacer l'image posée dans un emplacement
- **WHEN** par la couture HTTP, l'éditrice remplace l'image posée dans un emplacement d'image par une autre image de la bibliothèque
- **THEN** le brouillon de la page référence la nouvelle image à la place de l'ancienne, l'état publié reste intact, et la page bascule à « brouillon »

#### Scenario: Une pose visant un emplacement non déclaré ou d'une autre nature est refusée
- **WHEN** en `core/`, une correction poserait une image dans un emplacement non déclaré, ou dans un emplacement d'une nature autre qu'image / galerie / carrousel
- **THEN** elle est refusée (FR-024/025), aucun brouillon n'est écrit

#### Scenario: Aucun terme de développeur dans la pose d'image
- **WHEN** l'éditrice pose ou remplace une image et lit le sélecteur d'image
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: Composition d'un emplacement de galerie ou de carrousel

Un emplacement de nature **galerie** (FR-020) ou **carrousel** (FR-021) SHALL porter un **ensemble ordonné**
d'images de la bibliothèque, que l'éditrice compose en posant plusieurs images déjà présentes, en les
ordonnant et en en retirant. Composer, ordonner ou retirer une image de l'ensemble est une modification du
**contenu** de l'emplacement — non de la structure de la page (FR-024/025) —, enregistrée dans le brouillon
de la page par référence aux identités stables des images, sans toucher l'état publié (FR-026) ; la page
bascule à « brouillon ». Aucun terme de développeur ne DOIT paraître (FR-117).

#### Scenario: Composer une galerie ou un carrousel à partir de plusieurs images
- **WHEN** par la couture HTTP, l'éditrice pose plusieurs images de la bibliothèque dans un emplacement de galerie ou de carrousel, dans un ordre choisi
- **THEN** le brouillon de la page référence l'ensemble ordonné de ces images par leurs identités, l'état publié reste intact, et la page bascule à « brouillon »

#### Scenario: Réordonner ou retirer une image de l'ensemble est une modification de contenu
- **WHEN** par la couture HTTP, l'éditrice réordonne ou retire une image d'une galerie ou d'un carrousel
- **THEN** le brouillon reflète le nouvel ensemble ordonné, sans que ce soit traité comme un geste de structure (FR-024/025), et la page bascule à « brouillon »

#### Scenario: Le modèle de core reconnaît les trois natures d'image
- **WHEN** en `core/`, la déclaration d'une page porte des emplacements de nature image, galerie ou carrousel
- **THEN** chacun est reconnu et présenté selon sa nature avec son contenu courant (identités d'images référencées), une entrée mal formée étant écartée comme pour les autres natures
