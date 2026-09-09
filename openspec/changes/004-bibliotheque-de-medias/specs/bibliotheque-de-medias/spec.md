## Purpose

Permettre à l'éditrice de constituer et d'entretenir la réserve d'images du site — téléverser sous
liste blanche de format et borne de poids, retrouver, renommer, décrire, voir où chaque image est posée,
et supprimer sans jamais laisser un emplacement pointer une image absente — le tout dans le brouillon, sans
effet sur le site public. Couvre FR-027→040, sous FR-117.

## ADDED Requirements

### Requirement: Téléversement d'une image sous liste blanche de format et borne de poids

Le noyau `core/` SHALL reconnaître le format d'un fichier téléversé sur ses **octets d'en-tête** seuls —
ni l'extension du nom d'origine, ni le `Content-Type` du téléversement ne DOIVENT être crus — et n'admettre
que **JPEG, PNG et WebP** (liste blanche fermée) ; tout autre format, **SVG compris**, est refusé. Un
fichier de plus de **2 Mo** (borne d'une ligne D1) est refusé. Un téléversement refusé DOIT dire à
l'éditrice ce qui a été refusé — le format ou le poids — sans terme de développeur (FR-040, FR-117). Un
téléversement admis DOIT être persisté au magasin brouillon (D1) avec son **identité**, son **nom
d'origine**, ses **dimensions** lues à l'en-tête (FR-108) et le **type déduit de la liste blanche**, jamais
recopié du téléversement.

#### Scenario: Un format de la liste blanche est reconnu sur les octets d'en-tête
- **WHEN** en `core/`, les octets d'en-tête d'un JPEG, d'un PNG ou d'un WebP sont évalués
- **THEN** le format est reconnu et le fichier admis, et le type retenu est déduit de la liste blanche

#### Scenario: Un SVG est refusé
- **WHEN** en `core/`, un fichier dont les octets d'en-tête sont ceux d'un SVG (ou de tout format hors liste) est évalué
- **THEN** il est refusé au titre du format

#### Scenario: Ni l'extension ni le Content-Type déclaré ne sont crus
- **WHEN** en `core/`, un fichier porte une extension `.png` ou un `Content-Type: image/png` mais des octets d'en-tête hors liste blanche
- **THEN** il est refusé — la reconnaissance ne s'appuie que sur les octets

#### Scenario: Un fichier au-delà de la borne de poids est refusé
- **WHEN** en `core/`, un fichier de plus de 2 Mo est évalué
- **THEN** il est refusé au titre du poids

#### Scenario: Le refus dit ce qui a été refusé sans terme de développeur
- **WHEN** un téléversement est refusé (format hors liste ou poids dépassé)
- **THEN** l'éditrice reçoit un message disant si c'est le format ou le poids qui a été refusé, sans aucun terme de développeur (FR-117)

#### Scenario: Un téléversement admis est persisté avec son identité, son nom d'origine, ses dimensions et son type déduit
- **WHEN** par la couture HTTP contre la vraie base locale, une image admise est téléversée
- **THEN** elle est persistée au magasin brouillon (D1) avec son identité, son nom d'origine, ses dimensions lues à l'en-tête et le type déduit de la liste blanche, et l'état publié reste intact

### Requirement: Service des octets d'un média en brouillon sur l'origine commune

La route qui sert les octets d'un média en brouillon SHALL être servie sur l'origine commune **sous le
garde de session de l'administration** (I6, ADR-0007) — aucune surface publique nouvelle (FR-097) — et
renvoyer un `Content-Type` **déduit du type stocké** (liste blanche), jamais recopié du téléversement,
accompagné de `X-Content-Type-Options: nosniff` (SEC-5, ADR-0004). Une requête non authentifiée ne DOIT
pas obtenir les octets.

#### Scenario: Les octets d'un média en brouillon sont servis sous garde de session
- **WHEN** par la couture HTTP, une session ouverte demande les octets d'un média en brouillon
- **THEN** les octets sont servis avec le `Content-Type` déduit de la liste blanche et l'en-tête `X-Content-Type-Options: nosniff`

#### Scenario: Une requête non authentifiée n'obtient pas les octets
- **WHEN** par la couture HTTP, une requête sans session valide demande les octets d'un média en brouillon
- **THEN** elle est refusée par le garde de session et n'obtient aucun octet

#### Scenario: Le type servi n'est jamais celui du téléversement
- **WHEN** un média a été téléversé avec un `Content-Type` déclaré différent de son format réel reconnu
- **THEN** la route sert le type déduit de la liste blanche, jamais le `Content-Type` du téléversement

### Requirement: Grille des images du site

La rubrique **Médias** SHALL présenter toutes les images du site sous forme de **grille**, servie dans le
cadre de navigation de l'administration sous CSP stricte. Une bibliothèque vide DOIT montrer un message
d'état vide. Aucun terme de développeur ne DOIT y paraître (FR-117).

#### Scenario: La grille montre toutes les images du site
- **WHEN** l'`Écran : Médias` est affiché pour une bibliothèque porteuse d'images
- **THEN** toutes les images du site paraissent dans une grille

#### Scenario: État vide de la bibliothèque
- **WHEN** aucune image n'est présente
- **THEN** l'écran affiche un message d'état vide

#### Scenario: La grille est servie dans le cadre de l'administration sous CSP stricte
- **WHEN** l'`Écran : Médias` est servi
- **THEN** il l'est dans le cadre de l'administration (« Médias » marquée active), sous les en-têtes réels (CSP stricte, `script-src 'self'`, ADR-0004 + ADR-0008 + ADR-0010), sans script en ligne ni directive `client:*` (ADR-0006)

#### Scenario: Aucun terme de développeur dans la grille
- **WHEN** l'éditrice lit la grille et le message d'état vide
- **THEN** aucun terme de développeur n'y paraît

### Requirement: Recherche d'une image

La bibliothèque SHALL permettre de **rechercher** une image par son **nom** et sa **description**, la
grille se restreignant aux images correspondantes. Une recherche sans correspondance DOIT montrer un état
vide propre à la recherche, distinct de la bibliothèque vide.

#### Scenario: Rechercher restreint la grille aux images correspondantes
- **WHEN** l'éditrice saisit un terme de recherche
- **THEN** la grille se restreint aux images dont le nom ou la description contient ce terme

#### Scenario: Une recherche sans correspondance
- **WHEN** aucun nom ni aucune description ne correspond au terme
- **THEN** l'écran montre un état vide propre à la recherche, la bibliothèque restant inchangée

### Requirement: Renommer une image

La bibliothèque SHALL permettre de **renommer** une image ; le nouveau nom est persisté au magasin
brouillon. Le **nom d'origine** DOIT être conservé à part (FR-108), le renommage ne portant que sur le nom
d'affichage.

#### Scenario: Renommer une image persiste le nouveau nom
- **WHEN** par la couture HTTP, l'éditrice renomme une image
- **THEN** le nouveau nom d'affichage est persisté, et le nom d'origine reste inchangé

### Requirement: Description d'une image

La bibliothèque SHALL permettre de **saisir et modifier la description** d'une image depuis sa fiche ; la
description est persistée au magasin brouillon (FR-031, SC-018). Le **service** de cette description avec
l'image sur une page publiée (FR-039) est délégué au site public ; ce change n'en porte que la saisie et le
stockage.

#### Scenario: Saisir une description la persiste
- **WHEN** par la couture HTTP, l'éditrice saisit ou modifie la description d'une image
- **THEN** la description est persistée au magasin brouillon

#### Scenario: Aucun terme de développeur dans la fiche d'une image
- **WHEN** l'éditrice lit la fiche d'une image (nom, description)
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: Emplacements où une image est posée

La bibliothèque SHALL indiquer, pour une image, les **emplacements où elle est posée** (FR-032). Au stade
brouillon, la pose se lit dans les brouillons d'emplacements des pages ; l'état publié n'a pas encore de
représentation et ne contribue donc à aucune référence.

#### Scenario: Indiquer les emplacements posant une image
- **WHEN** l'éditrice consulte la fiche d'une image posée dans un ou plusieurs emplacements
- **THEN** la liste des emplacements qui la posent est présentée, désignés par leur page et leur place, sans terme de développeur (FR-117)

#### Scenario: Une image posée nulle part
- **WHEN** l'éditrice consulte la fiche d'une image qu'aucun emplacement ne pose
- **THEN** la fiche indique qu'elle n'est posée dans aucun emplacement

### Requirement: Comptage de références et effacement définitif à la publication

Le noyau `core/` SHALL dériver, pour une image, si elle est **référencée** par au moins un emplacement —
publié ou brouillon. Une image est **effaçable définitivement** si et seulement si **aucun** emplacement,
publié ou brouillon, ne la référence (FR-037). Ce change pose la **règle** et le comptage ; l'**exécution**
de l'effacement à la publication (élagage du magasin publié en `force: true`) est déléguée à « Aperçu et
publication ».

#### Scenario: Une image référencée n'est pas effaçable
- **WHEN** en `core/`, on dérive l'effaçabilité d'une image qu'au moins un emplacement (publié ou brouillon) référence
- **THEN** elle n'est pas effaçable

#### Scenario: Une image que plus aucun emplacement ne référence est effaçable
- **WHEN** en `core/`, on dérive l'effaçabilité d'une image qu'aucun emplacement, publié ni brouillon, ne référence
- **THEN** elle est effaçable

### Requirement: Signalement des images orphelines

La bibliothèque SHALL **signaler** dans la grille les images qu'aucun emplacement ne référence plus et qui
seront **effacées à la prochaine publication** (FR-038), sans terme de développeur (FR-117).

#### Scenario: Une image orpheline est signalée dans la grille
- **WHEN** l'`Écran : Médias` présente une image que plus aucun emplacement ne référence
- **THEN** elle est signalée comme vouée à l'effacement à la prochaine publication, sans terme de développeur (FR-117)

#### Scenario: Une image encore posée n'est pas signalée
- **WHEN** l'`Écran : Médias` présente une image posée dans au moins un emplacement
- **THEN** elle n'est pas signalée comme orpheline

### Requirement: Suppression d'une image — liste préalable puis retrait de tous les emplacements

Supprimer une image SHALL d'abord présenter la **liste des emplacements concernés** avant toute application
(FR-035). À l'application, la suppression DOIT retirer l'image de **tous** ses emplacements, **chaque retrait
enregistré dans le brouillon de la page concernée** (FR-036) — sans jamais toucher l'état publié, et sans
qu'une page publiée puisse afficher une image manquante (SC-010). Après le retrait de tous ses emplacements,
l'image devient orpheline (voir « Signalement des images orphelines ») et sera effacée à la prochaine
publication (FR-037, exécution déléguée).

#### Scenario: La liste des emplacements concernés est présentée avant l'application
- **WHEN** l'éditrice demande la suppression d'une image posée dans un ou plusieurs emplacements
- **THEN** la liste des emplacements concernés lui est présentée avant toute application (FR-035)

#### Scenario: Appliquer la suppression retire l'image de tous ses emplacements dans les brouillons concernés
- **WHEN** par la couture HTTP, l'éditrice confirme la suppression d'une image posée dans plusieurs emplacements de pages différentes
- **THEN** l'image est retirée de chacun de ces emplacements, chaque retrait enregistré dans le brouillon de la page concernée, l'état publié restant intact, et chaque page touchée bascule à « brouillon »

#### Scenario: Supprimer une image posée nulle part
- **WHEN** l'éditrice supprime une image qu'aucun emplacement ne pose
- **THEN** aucun brouillon d'emplacement n'est touché et l'image devient orpheline

#### Scenario: Aucun terme de développeur dans le flux de suppression
- **WHEN** l'éditrice lit la liste préalable et la confirmation de suppression
- **THEN** aucun terme de développeur n'y paraît (FR-117)
