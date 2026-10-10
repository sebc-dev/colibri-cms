## Purpose

Permettre à l'éditrice de régler seule les formulaires de devis posés sur son site par l'intégrateur —
libellés, prix et liste des options de chaque champ à choix — vers le brouillon propre à chaque
formulaire, sans jamais toucher à la structure du formulaire ni au site public avant la publication.
Couvre FR-045→051, sous FR-117 et UX-3.

## ADDED Requirements

### Requirement: Déclaration des formulaires par l'intégrateur

Les formulaires de devis du site SHALL être déclarés par l'intégrateur, hors administration, dans un
répertoire de contenu des formulaires, à côté de ceux des pages et des réglages, à raison d'un
sous-répertoire par formulaire. Chaque formulaire déclaré porte un **identifiant stable**, un **nom**
écrit pour l'éditrice et une liste **ordonnée** de champs. Chaque champ porte un **identifiant stable**
unique dans son formulaire, un **libellé**, une **nature** et une marque **obligatoire** (absente :
non obligatoire). Les natures sont : **choix unique** et **choix multiple** (les **champs à choix**),
**texte d'une ligne**, **texte long**, **adresse e-mail** et **téléphone**. Un champ à choix porte en
outre une marque **avec prix** ou **sans prix** et une liste ordonnée d'options ; chaque option porte un
identifiant stable unique dans son champ, un libellé et, dans un champ avec prix seulement, un prix en
centimes d'euro. Le noyau `core/` DOIT lire cette déclaration, sans jamais l'écrire ; les formulaires
sont rangés dans l'ordre alphabétique de leurs identifiants, les champs et les options dans l'ordre de
la déclaration. Une entrée mal formée DOIT être écartée sans empêcher la lecture des autres :
- un formulaire sans identifiant, sans nom, dont l'identifiant répète celui d'un autre, ou qui ne garde
  aucun champ lisible ;
- un champ sans identifiant, sans libellé, d'une nature inconnue, ou dont l'identifiant répète celui
  d'un champ du même formulaire ;
- une option sans identifiant, sans libellé, dont l'identifiant répète celui d'une option du même champ,
  ou dont le prix manque ou sort des bornes dans un champ avec prix ;
- un champ à choix qui ne garde aucune option lisible.
Un prix porté par une option d'un champ sans prix DOIT être ignoré. Aucun nom ni libellé NE DOIT être
fabriqué à partir d'un identifiant (FR-117).

#### Scenario: Les formulaires déclarés sont lus dans l'ordre de leurs identifiants
- **WHEN** en `core/`, le répertoire des formulaires porte deux formulaires valides d'identifiants `devis-gateau` puis `devis-atelier`, chacun avec des champs à choix et des champs sans option
- **THEN** les deux sont lus, `devis-atelier` d'abord, chacun avec son identifiant, son nom et ses champs dans l'ordre de la déclaration, et les options de chaque champ à choix dans leur ordre

#### Scenario: Un champ avec prix porte un prix par option, un champ sans prix n'en porte aucun
- **WHEN** en `core/`, un formulaire déclare un champ « Parfum » avec prix dont les options valent 800 et 1200 centimes, et un champ « Occasion » sans prix dont une option porte malgré tout un prix
- **THEN** les options de « Parfum » sont lues avec leur prix, et celles d'« Occasion » sans aucun prix

#### Scenario: Une entrée mal formée est écartée sans bloquer les autres
- **WHEN** en `core/`, un formulaire déclare, à côté de champs valides, un champ d'une nature inconnue, un champ dont l'identifiant répète un autre, et un champ avec prix dont une option n'a pas de prix à côté d'options valides
- **THEN** le champ de nature inconnue et le champ répété sont écartés, l'option sans prix est écartée, les autres entrées sont lues, et la lecture n'échoue pas

#### Scenario: Un champ à choix sans option lisible et un formulaire sans champ lisible sont écartés
- **WHEN** en `core/`, un champ à choix ne porte que des options mal formées, et un autre formulaire ne porte que des champs mal formés
- **THEN** le champ est écarté de son formulaire, le formulaire sans champ lisible est écarté de la liste, et les autres formulaires sont lus

### Requirement: Liste des formulaires

La rubrique « Formulaires » SHALL mener à un `Écran : Formulaires`, servi derrière la garde de session
dans le cadre de l'administration, la rubrique « Formulaires » y étant marquée active. L'écran DOIT
présenter tous les formulaires déclarés, dans l'ordre de leurs identifiants, chacun sous son nom,
chacun menant à son écran et portant la marque de brouillon quand il en porte un (FR-045). Sans
formulaire déclaré, l'écran DOIT le dire, sans aucun geste de création. L'écran N'offre aucun geste d'ajout, de retrait, de
renommage ni de déplacement de formulaire. Sans session, l'écran DOIT renvoyer à l'écran de connexion.
Aucun terme de développeur ni aucun identifiant ne DOIT paraître (FR-117).

#### Scenario: Ouvrir la liste des formulaires depuis le menu
- **WHEN** l'éditrice, en session, choisit « Formulaires » dans le menu du cadre, sur un site qui déclare les formulaires « Devis gâteau » (identifiant `devis-gateau`) et « Devis atelier » (identifiant `devis-atelier`)
- **THEN** l'`Écran : Formulaires` s'ouvre dans le cadre, « Formulaires » marquée active, et présente « Devis atelier » puis « Devis gâteau », chacun menant à son écran

#### Scenario: La liste marque les formulaires qui portent un brouillon
- **WHEN** l'`Écran : Formulaires` est affiché alors que seul « Devis atelier » porte un brouillon
- **THEN** « Devis atelier » porte la marque de brouillon et « Devis gâteau » ne la porte pas

#### Scenario: Aucun formulaire déclaré
- **WHEN** l'`Écran : Formulaires` est affiché sur un site qui ne déclare aucun formulaire
- **THEN** l'écran dit qu'aucun formulaire n'est prévu pour le site, et n'offre aucun geste de création

#### Scenario: Sans session, la liste renvoie à la connexion
- **WHEN** l'`Écran : Formulaires` est demandé sans session ouverte
- **THEN** la réponse renvoie à l'écran de connexion, sans rien montrer des formulaires

### Requirement: Écran d'un formulaire

Chaque formulaire déclaré SHALL avoir son `Écran : Formulaire`, servi derrière la garde de session dans
le cadre, la rubrique « Formulaires » marquée active, titré par le nom du formulaire. L'écran DOIT
présenter les **champs à choix** du formulaire dans l'ordre de la déclaration, chacun sous son libellé,
avec ses options courantes — celles du brouillon du formulaire s'il en porte un pour ce champ, celles de
la déclaration sinon — et, dans un champ avec prix, le prix de chaque option en euros. L'écran DOIT
porter la marque de brouillon quand le formulaire en porte un, et un seul bouton « Enregistrer » pour tout
le formulaire. Les champs sans option NE DOIVENT offrir aucun geste. L'écran NE DOIT offrir aucun moyen
d'ajouter, de retirer, de renommer ni de réordonner un champ (FR-050, UX-3). Un formulaire non déclaré
DOIT donner une réponse « introuvable » ; sans session, l'écran DOIT renvoyer à l'écran de connexion.
Aucun terme de développeur ni aucun identifiant ne DOIT paraître (FR-117).

#### Scenario: L'écran présente les champs à choix et leurs options
- **WHEN** l'éditrice ouvre « Devis gâteau », qui déclare les champs « Parfum » (avec prix : Vanille 8 €, Chocolat 9 €, Fraise 10 €), « Occasion » (sans prix) et « Votre adresse e-mail »
- **THEN** l'écran présente « Parfum » avec ses trois options et leurs prix, puis « Occasion » avec ses options sans prix, et n'offre aucun geste sur « Votre adresse e-mail »

#### Scenario: L'écran montre le contenu du brouillon
- **WHEN** l'écran de « Devis gâteau » est affiché alors que son brouillon passe « Vanille » à 10 €
- **THEN** l'option « Vanille » y paraît à 10 €, et l'écran porte la marque de brouillon

#### Scenario: Aucun geste de structure sur les champs
- **WHEN** l'éditrice parcourt l'écran d'un formulaire
- **THEN** aucun moyen ne lui est offert d'ajouter, de retirer, de renommer ou de réordonner un champ

#### Scenario: Un formulaire non déclaré est introuvable
- **WHEN** en session, l'écran d'un formulaire est demandé pour un identifiant qu'aucun formulaire déclaré ne porte
- **THEN** la réponse dit « introuvable », sans rien montrer d'autre

#### Scenario: Sans session, l'écran d'un formulaire renvoie à la connexion
- **WHEN** l'écran d'un formulaire déclaré est demandé sans session ouverte
- **THEN** la réponse renvoie à l'écran de connexion, sans rien montrer du formulaire

#### Scenario: Un texte saisi ou déclaré est affiché tel quel, jamais interprété
- **WHEN** l'écran d'un formulaire ou la liste des formulaires est affiché alors qu'un nom de formulaire, un libellé de champ ou un libellé d'option contient les caractères `<`, `>`, `&` ou des guillemets
- **THEN** ces caractères paraissent comme du texte, et aucun balisage n'est interprété

#### Scenario: Aucun terme de développeur sur les écrans des formulaires
- **WHEN** l'éditrice lit la liste des formulaires, l'écran d'un formulaire, ses champs et leurs messages
- **THEN** aucun terme de développeur ni aucun identifiant n'y paraît (FR-117)

### Requirement: Correction des options d'un champ à choix

Sur l'écran d'un formulaire, l'éditrice SHALL pouvoir, pour chaque champ à choix : corriger le libellé
de chaque option (FR-046) ; dans un champ avec prix, corriger le prix de chaque option (FR-047) ;
ajouter une option en fin de liste (FR-048) ; retirer une option (FR-049) ; monter ou descendre une
option dans la liste. Enregistrer soumet en un geste les options de tous les champs à choix du
formulaire. La soumission DOIT être vérifiée en `core/` contre la **déclaration** — l'existence du
formulaire, la liste de ses champs à choix et la marque avec prix / sans prix de chacun sont toujours
celles de la déclaration, jamais celles qu'annonce la soumission :
- **libellé d'option** : espaces de début et de fin retirés, de 1 à 80 caractères, sans saut de ligne ;
- **prix** (champ avec prix seulement) : un montant en euros d'au moins 0 € et d'au plus 99 999,99 €,
  au centime près ; la saisie admet la virgule ou le point décimal et au plus deux décimales (« 12 »,
  « 12,5 », « 12,50 », « 12.50 ») ; une saisie vide, négative, à plus de deux décimales ou qui n'est pas
  un nombre est refusée ;
- **nombre d'options** : au moins 1 et au plus 30 par champ ;
- deux options d'un même champ NE DOIVENT pas porter le même libellé, à la casse près ;
- une option d'un champ sans prix NE DOIT porter aucun prix ;
- un champ que la déclaration ne porte pas, un champ qui n'est pas à choix, ou un champ à choix déclaré
  absent de la soumission DOIT faire refuser la soumission.
Une option conservée garde son identifiant ; une option ajoutée reçoit un identifiant neuf, stable
ensuite, qui ne reprend celui d'aucune autre option du champ. Un seul refus refuse toute la soumission,
qui n'écrit alors rien ; chaque refus désigne le champ et l'option fautifs et dit ce qui est attendu,
la saisie de l'éditrice restant affichée.

#### Scenario: Changer le prix d'une option
- **WHEN** par la couture HTTP, en session, l'éditrice soumet « Devis gâteau » avec « Vanille » à « 10 » au lieu de 8 €, toutes les autres options inchangées
- **THEN** le brouillon de « Devis gâteau » porte « Vanille » à 10 €, les autres options inchangées

#### Scenario: Corriger le libellé d'une option
- **WHEN** par la couture HTTP, en session, l'éditrice soumet « Devis gâteau » avec l'option « Fraise » renommée « Fraise des bois »
- **THEN** le brouillon porte « Fraise des bois », au même rang et avec le même identifiant que « Fraise »

#### Scenario: Ajouter un parfum
- **WHEN** par la couture HTTP, en session, l'éditrice soumet « Devis gâteau » avec une option nouvelle « Pistache » à « 12 » ajoutée en fin du champ « Parfum »
- **THEN** le brouillon porte quatre parfums, « Pistache » en dernier à 12 €, avec un identifiant neuf distinct de ceux des trois autres

#### Scenario: Retirer une option
- **WHEN** par la couture HTTP, en session, l'éditrice soumet « Devis gâteau » sans l'option « Chocolat »
- **THEN** le brouillon porte « Vanille » puis « Fraise », et aucune option « Chocolat »

#### Scenario: Changer l'ordre des options
- **WHEN** à l'écran de « Devis gâteau », l'éditrice monte « Fraise » de deux rangs puis enregistre
- **THEN** le brouillon porte « Fraise », « Vanille », « Chocolat » dans cet ordre

#### Scenario: Les montants saisis sont lus au centime près
- **WHEN** en `core/`, les saisies de prix « 12 », « 12,5 », « 12,50 », « 12.50 », « 0 » et « 99999,99 » sont lues
- **THEN** elles valent respectivement 12 €, 12,50 €, 12,50 €, 12,50 €, 0 € et 99 999,99 €

#### Scenario: Un prix hors des bornes ou mal écrit est refusé
- **WHEN** en `core/`, une option d'un champ avec prix est soumise avec, tour à tour, un prix vide, « -1 », « 12,505 », « douze » et « 100000 »
- **THEN** chaque soumission est refusée sur le prix de cette option, et rien n'est écrit

#### Scenario: Retirer la dernière option d'un champ est refusé
- **WHEN** en `core/`, un champ à choix est soumis sans aucune option
- **THEN** la soumission est refusée sur ce champ, qui doit garder au moins une option, et rien n'est écrit

#### Scenario: Un champ ne dépasse pas 30 options
- **WHEN** en `core/`, un champ à choix est soumis avec 30 options valides, puis avec 31
- **THEN** la soumission à 30 options est acceptée, celle à 31 est refusée sur ce champ

#### Scenario: Un libellé vide, trop long, sur plusieurs lignes ou en double est refusé
- **WHEN** en `core/`, une option est soumise avec un libellé fait seulement d'espaces, un libellé de 81 caractères, un libellé portant un saut de ligne, ou un libellé identique à la casse près à celui d'une autre option du même champ
- **THEN** chaque soumission est refusée sur le libellé de cette option, et un libellé de 80 caractères est accepté

#### Scenario: La marque avec prix vient de la déclaration
- **WHEN** en `core/`, une soumission porte un prix sur une option d'un champ déclaré sans prix, ou omet le prix d'une option d'un champ déclaré avec prix
- **THEN** la soumission est refusée sur cette option, et rien n'est écrit

#### Scenario: Une soumission ne touche pas la structure du formulaire
- **WHEN** en `core/`, une soumission porte un champ que la déclaration ne porte pas, des options pour un champ sans option, ou omet un champ à choix déclaré
- **THEN** la soumission est refusée, et rien n'est écrit

#### Scenario: Un refus désigne le fautif et garde la saisie
- **WHEN** à l'écran d'un formulaire, l'éditrice enregistre avec le prix d'une option écrit « douze »
- **THEN** l'option fautive est désignée avec ce qui est attendu (un montant en euros), toute la saisie reste affichée, et le formulaire ne prend pas la marque de brouillon s'il ne la portait pas

### Requirement: Brouillon propre à chaque formulaire

Chaque formulaire SHALL porter son **propre brouillon**. Enregistrer un formulaire DOIT écrire son
brouillon et lui seul, sans jamais écrire le répertoire de contenu des formulaires ni toucher le site
public (FR-051), et sans marquer d'autre formulaire ni aucun réglage. L'état « porte un brouillon » d'un
formulaire DOIT être dérivé de la présence de son brouillon : vrai dès qu'un enregistrement a abouti,
faux sinon. Les brouillons DOIVENT être portés par une table D1 créée par une migration versionnée
additive. Quand la déclaration change sous un brouillon, le brouillon se rattache par les identifiants
stables : le brouillon d'un formulaire ou d'un champ que la déclaration ne porte plus est ignoré, un
champ dont le brouillon ne s'accorde plus à la déclaration (nature, marque avec prix / sans prix) montre
les options de la déclaration, et un champ à choix nouvellement déclaré montre ses options de départ —
jamais une erreur. Une écriture refusée NE DOIT rien enregistrer. Une écriture sans session ouverte DOIT
être refusée, et une écriture forgée depuis une autre origine NE DOIT pas aboutir : la session
`SameSite=Strict` n'est pas attachée à une requête cross-site (ADR-0011), sans jeton anti-forgerie
dédié.

#### Scenario: Enregistrer un formulaire n'en marque que lui
- **WHEN** par la couture HTTP, en session, l'éditrice enregistre une correction de « Devis gâteau »
- **THEN** « Devis gâteau » porte un brouillon, « Devis atelier » et les réglages n'en portent pas de nouveau, et le répertoire de contenu des formulaires est inchangé

#### Scenario: La marque de brouillon paraît sans quitter l'écran
- **WHEN** à l'écran d'un formulaire, l'éditrice enregistre avec succès
- **THEN** l'écran porte aussitôt la marque de brouillon, sans changement d'écran, et la saisie reste affichée

#### Scenario: Un formulaire jamais enregistré ne porte pas de brouillon
- **WHEN** la liste des formulaires est affichée sur une instance où aucun formulaire n'a été enregistré
- **THEN** aucun formulaire ne porte la marque de brouillon

#### Scenario: Le brouillon survit à un changement de la déclaration
- **WHEN** en `core/`, un brouillon porte les options d'un champ que la déclaration ne porte plus, et la déclaration ajoute un champ à choix que le brouillon ne connaît pas
- **THEN** la lecture ignore les options du champ disparu, montre les options de départ du champ nouveau, garde les autres champs du brouillon, et n'échoue pas

#### Scenario: Table D1 des brouillons de formulaires versionnée
- **WHEN** la table D1 des brouillons de formulaires est mise en place
- **THEN** elle est créée par une migration versionnée additive, sans toucher aucune table existante

#### Scenario: Une écriture sans session est refusée
- **WHEN** par la couture HTTP, une correction d'un formulaire est soumise sans session ouverte
- **THEN** elle est refusée et aucun brouillon n'est écrit

#### Scenario: Une écriture pour un formulaire non déclaré est refusée
- **WHEN** par la couture HTTP, en session, une correction est soumise pour un identifiant qu'aucun formulaire déclaré ne porte
- **THEN** la réponse dit « introuvable », et aucun brouillon n'est écrit

#### Scenario: Une soumission illisible ou démesurée n'écrit rien
- **WHEN** par la couture HTTP, en session, une correction d'un formulaire est soumise avec un corps qui n'est pas du JSON, dont la forme n'est pas celle attendue, ou de plus de 64 Kio
- **THEN** elle est refusée sans erreur du serveur, et aucun brouillon n'est écrit

#### Scenario: Une écriture forgée cross-site n'aboutit pas
- **WHEN** une écriture d'un formulaire est forgée depuis une autre origine
- **THEN** elle n'aboutit pas, la session `SameSite=Strict` n'étant pas attachée à une requête cross-site (ADR-0011)
