## MODIFIED Requirements

### Requirement: Emplacements où une image est posée

La bibliothèque SHALL indiquer, pour une image, les **emplacements où elle est posée** (FR-032). Au stade
brouillon, la pose se lit dans les brouillons d'emplacements des pages ; l'état publié n'a pas encore de
représentation et ne contribue donc à aucune référence. Un emplacement y est désigné par sa page et sa
place ; la place DOIT être **le nom de l'emplacement** quand l'intégrateur lui en a donné un, et à défaut
la nature de l'emplacement en français suivie de son rang parmi les emplacements de même nature — jamais
son identifiant (FR-117). La même désignation DOIT servir dans la liste préalable à la suppression d'une
image.

#### Scenario: Indiquer les emplacements posant une image
- **WHEN** l'éditrice consulte la fiche d'une image posée dans un ou plusieurs emplacements
- **THEN** la liste des emplacements qui la posent est présentée, désignés par leur page et leur place, sans terme de développeur (FR-117)
- **AND** la page est désignée par son titre, et la place par le **nom de l'emplacement** quand il en a un (« Accueil — Nos réalisations »)
- **AND** à défaut de nom, la place est la **nature de l'emplacement en français** (« image », « galerie », « carrousel ») — jamais son identifiant —, suivie de son rang parmi les emplacements de même nature de la page (« 1re galerie », « 2e galerie ») dès qu'il y en a plusieurs

#### Scenario: Nommés et non nommés se côtoient
- **WHEN** l'éditrice consulte la fiche d'une image posée dans un emplacement nommé d'une page et dans un emplacement sans nom d'une autre page
- **THEN** le premier est désigné par son nom, le second par sa nature (et son rang s'il y a lieu), dans la même liste

#### Scenario: La liste préalable à la suppression désigne les emplacements de la même façon
- **WHEN** l'éditrice demande la suppression d'une image posée dans un emplacement nommé
- **THEN** la liste des emplacements concernés, présentée avant toute application, désigne cet emplacement par sa page et son nom, comme la fiche

#### Scenario: Une image posée nulle part
- **WHEN** l'éditrice consulte la fiche d'une image qu'aucun emplacement ne pose
- **THEN** la fiche indique qu'elle n'est posée dans aucun emplacement
