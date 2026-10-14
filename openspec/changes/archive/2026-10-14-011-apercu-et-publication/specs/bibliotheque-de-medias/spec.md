## MODIFIED Requirements

### Requirement: Grille des images du site

La rubrique **Médias** SHALL présenter toutes les images du site sous forme de **grille**, servie dans le
cadre de navigation de l'administration sous CSP stricte : les images en brouillon comme les images
**publiées** — celles que l'éditrice a publiées et celles que l'intégrateur a posées au départ —, chacune
avec sa vignette, y compris quand ses octets ne sont plus gardés par le produit et sont servis par le site
lui-même. Une bibliothèque vide DOIT montrer un message d'état vide. Aucun terme de développeur ne DOIT y
paraître (FR-117).

#### Scenario: La grille montre toutes les images du site
- **WHEN** l'`Écran : Médias` est affiché pour une bibliothèque porteuse d'images
- **THEN** toutes les images du site paraissent dans une grille

#### Scenario: Une image publiée reste dans la grille
- **WHEN** une image a été publiée et que le site en service la porte
- **THEN** elle paraît dans la grille avec sa vignette, comme avant sa publication

#### Scenario: Une image posée au départ par l'intégrateur paraît dans la grille
- **WHEN** le contenu de départ pose une image que l'éditrice n'a jamais téléversée
- **THEN** cette image paraît dans la grille avec sa vignette, son nom et sa description

#### Scenario: État vide de la bibliothèque
- **WHEN** aucune image n'est présente
- **THEN** l'écran affiche un message d'état vide

#### Scenario: La grille est servie dans le cadre de l'administration sous CSP stricte
- **WHEN** l'`Écran : Médias` est servi
- **THEN** il l'est dans le cadre de l'administration (« Médias » marquée active), sous les en-têtes réels (CSP stricte, `script-src 'self'`, ADR-0004 + ADR-0008 + ADR-0010), sans script en ligne ni directive `client:*` (ADR-0006)

#### Scenario: Aucun terme de développeur dans la grille
- **WHEN** l'éditrice lit la grille et le message d'état vide
- **THEN** aucun terme de développeur n'y paraît

### Requirement: Emplacements où une image est posée

La bibliothèque SHALL indiquer, pour une image, les **emplacements où elle est posée** (FR-032). Un
emplacement pose une image quand son **contenu courant** la porte — son brouillon s'il en porte un, sa
dernière version publiée sinon. Un emplacement y est désigné par sa page et sa place ; la place DOIT être
**le nom de l'emplacement** quand l'intégrateur lui en a donné un, et à défaut la nature de l'emplacement
en français suivie de son rang parmi les emplacements de même nature de la page — jamais son identifiant
(FR-117). La même désignation DOIT servir dans la liste préalable à la suppression d'une image.

#### Scenario: Indiquer les emplacements posant une image
- **WHEN** l'éditrice consulte la fiche d'une image posée dans un ou plusieurs emplacements
- **THEN** la liste des emplacements qui la posent est présentée, désignés par leur page et leur place, sans terme de développeur (FR-117)
- **AND** la page est désignée par son titre, et la place par le **nom de l'emplacement** quand il en a un (« Accueil — Nos réalisations »)
- **AND** à défaut de nom, la place est la **nature de l'emplacement en français** (« image », « galerie », « carrousel ») — jamais son identifiant —, suivie de son rang parmi les emplacements de même nature de la page (« 1re galerie », « 2e galerie ») dès qu'il y en a plusieurs

#### Scenario: Une image posée par une version publiée est indiquée
- **WHEN** l'éditrice consulte la fiche d'une image que la dernière version publiée d'un emplacement pose, cet emplacement ne portant pas de brouillon
- **THEN** cet emplacement figure dans la liste des emplacements qui la posent

#### Scenario: Un brouillon qui remplace l'image l'emporte sur la version publiée
- **WHEN** la dernière version publiée d'un emplacement pose une image, et que son brouillon la remplace par une autre
- **THEN** cet emplacement ne figure pas dans la liste des emplacements qui posent la première image

#### Scenario: Nommés et non nommés se côtoient
- **WHEN** l'éditrice consulte la fiche d'une image posée dans un emplacement nommé d'une page et dans un emplacement sans nom d'une autre page
- **THEN** le premier est désigné par son nom, le second par sa nature (et son rang s'il y a lieu), dans la même liste

#### Scenario: La liste préalable à la suppression désigne les emplacements de la même façon
- **WHEN** l'éditrice demande la suppression d'une image posée dans un emplacement nommé
- **THEN** la liste des emplacements concernés, présentée avant toute application, désigne cet emplacement par sa page et son nom, comme la fiche

#### Scenario: Une image posée nulle part
- **WHEN** l'éditrice consulte la fiche d'une image qu'aucun emplacement ne pose
- **THEN** la fiche indique qu'elle n'est posée dans aucun emplacement

### Requirement: Comptage de références et effacement définitif à la publication

Le noyau `core/` SHALL dériver, pour une image, si elle est **référencée** par au moins un emplacement :
un emplacement la référence quand son contenu courant la pose — son brouillon s'il en porte un, sa
dernière version publiée sinon. Une image est **effaçable définitivement** si et seulement si **aucun**
emplacement ne la référence ainsi (FR-037). La publication **exécute** cet effacement (capacité
`publication`) : l'image effaçable quitte la bibliothèque à la publication, et ses octets le dépôt du
client au plus tard à la publication suivante.

#### Scenario: Une image référencée n'est pas effaçable
- **WHEN** en `core/`, on dérive l'effaçabilité d'une image que le contenu courant d'au moins un emplacement pose
- **THEN** elle n'est pas effaçable

#### Scenario: Une image que plus aucun emplacement ne référence est effaçable
- **WHEN** en `core/`, on dérive l'effaçabilité d'une image qu'aucun emplacement ne pose, ni par son brouillon, ni par sa dernière version publiée
- **THEN** elle est effaçable

#### Scenario: Une image remplacée par un brouillon devient effaçable
- **WHEN** en `core/`, une image n'est posée que par la dernière version publiée d'un emplacement dont le brouillon la remplace
- **THEN** elle est effaçable

#### Scenario: Une image posée par une version publiée sans brouillon n'est pas effaçable
- **WHEN** en `core/`, une image n'est posée que par la dernière version publiée d'un emplacement qui ne porte pas de brouillon
- **THEN** elle n'est pas effaçable

### Requirement: Suppression d'une image — liste préalable puis retrait de tous les emplacements

Supprimer une image SHALL d'abord présenter la **liste des emplacements concernés** avant toute application
(FR-035). À l'application, la suppression DOIT retirer l'image de **tous** ses emplacements — ceux dont le
brouillon la pose comme ceux dont la dernière version publiée la pose sans brouillon —, **chaque retrait
enregistré dans le brouillon de la page concernée** (FR-036) — sans jamais toucher l'état publié, et sans
qu'une page publiée puisse afficher une image manquante (SC-010). Après le retrait de tous ses emplacements,
l'image devient orpheline (voir « Signalement des images orphelines ») et sera effacée à la prochaine
publication (FR-037), qui exécute l'effacement.

#### Scenario: La liste des emplacements concernés est présentée avant l'application
- **WHEN** l'éditrice demande la suppression d'une image posée dans un ou plusieurs emplacements
- **THEN** la liste des emplacements concernés lui est présentée avant toute application (FR-035)

#### Scenario: Appliquer la suppression retire l'image de tous ses emplacements dans les brouillons concernés
- **WHEN** par la couture HTTP, l'éditrice confirme la suppression d'une image posée dans plusieurs emplacements de pages différentes
- **THEN** l'image est retirée de chacun de ces emplacements, chaque retrait enregistré dans le brouillon de la page concernée, l'état publié restant intact, et chaque page touchée bascule à « brouillon »

#### Scenario: Supprimer une image posée par une version publiée
- **WHEN** par la couture HTTP, l'éditrice confirme la suppression d'une image que seule la dernière version publiée d'un emplacement pose, la page ne portant pas de brouillon
- **THEN** le brouillon de cette page retire l'image de cet emplacement, la page bascule à « brouillon », la page publique présente toujours l'image, et l'image devient orpheline

#### Scenario: Supprimer une image posée nulle part
- **WHEN** l'éditrice supprime une image qu'aucun emplacement ne pose
- **THEN** aucun brouillon d'emplacement n'est touché et l'image devient orpheline

#### Scenario: Aucun terme de développeur dans le flux de suppression
- **WHEN** l'éditrice lit la liste préalable et la confirmation de suppression
- **THEN** aucun terme de développeur n'y paraît (FR-117)
