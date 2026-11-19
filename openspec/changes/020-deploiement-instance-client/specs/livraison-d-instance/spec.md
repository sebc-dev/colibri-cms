## Purpose

Mettre en service une instance entièrement dans les comptes du client, par des gestes écrits et
outillés, de sorte qu'elle ne coûte rien, ne dépende d'aucun identifiant ni d'aucun traitement de
l'intégrateur, et continue de servir, d'ouvrir l'administration et de publier après le retrait de
tous ses accès (FR-098 à FR-104, SC-001, SC-012, SC-013).

## ADDED Requirements

### Requirement: Le dépôt du client est préparé depuis une version du produit

L'outil de livraison SHALL préparer le dépôt d'un client à partir d'une version désignée du produit
et d'un fichier d'instance. Le dépôt préparé porte les fichiers de cette version qui servent à
construire le site, le fichier d'instance fourni, un contenu de départ, et la branche des images dans
l'état que ce contenu demande. Il ne porte ni automatisation de la forge, ni l'outillage et la
documentation de travail de l'intégrateur. Rejouée avec la même version sur un dépôt déjà préparé,
la préparation NE DOIT toucher ni au contenu du site, ni à la branche des images.

#### Scenario: Un dépôt vide reçoit le produit, l'instance et un contenu de départ
- **WHEN** la préparation est lancée sur un dépôt vide, avec une version du produit et un fichier d'instance
- **THEN** le dépôt porte les fichiers de cette version et le fichier d'instance fourni
- **AND** il porte un contenu de départ

#### Scenario: La branche des images est amorcée
- **WHEN** la préparation est lancée sur un dépôt vide
- **THEN** la branche des images existe et porte chaque image que le contenu de départ désigne
- **AND** une construction du site depuis ce dépôt aboutit

#### Scenario: Aucune automatisation de la forge n'est déposée
- **WHEN** la préparation est terminée
- **THEN** le dépôt ne porte aucun fichier d'automatisation de la forge

#### Scenario: L'outillage de l'intégrateur n'est pas déposé
- **WHEN** la préparation est terminée
- **THEN** le dépôt ne porte ni l'outillage de recette, ni les documents de travail de l'intégrateur

#### Scenario: Rejouer la préparation garde le contenu
- **WHEN** la préparation est rejouée, avec la même version du produit, sur un dépôt dont le contenu a déjà changé
- **THEN** le contenu du site et la branche des images sont inchangés

#### Scenario: Un fichier d'instance refusé arrête la préparation
- **WHEN** la préparation est lancée avec un fichier d'instance que la construction refuserait
- **THEN** la préparation s'arrête en nommant le champ en cause
- **AND** le dépôt n'est pas modifié

### Requirement: La mise en ligne met la base à niveau, puis déploie

La mise en ligne d'une instance SHALL être une commande unique, identique d'un client à l'autre, qui
s'exécute dans le compte du client à chaque changement de la branche principale de son dépôt. Elle
met d'abord la base au niveau de la version, puis déploie cette version. Si la mise à niveau de la
base échoue, rien n'est déployé et le site en ligne reste celui d'avant (FR-102, FR-104).

#### Scenario: Une base neuve est mise à niveau avant le premier déploiement
- **WHEN** la mise en ligne s'exécute pour la première fois, sur une base vide
- **THEN** toutes les mises à niveau de la base sont appliquées, dans l'ordre
- **AND** la version est déployée ensuite

#### Scenario: Une base déjà à niveau n'est pas touchée
- **WHEN** la mise en ligne s'exécute sur une base déjà au niveau de la version
- **THEN** aucune mise à niveau n'est appliquée
- **AND** les brouillons, le contenu publié, les demandes et l'adresse autorisée sont inchangés

#### Scenario: Une mise à niveau qui échoue ne déploie rien
- **WHEN** une mise à niveau de la base échoue pendant la mise en ligne
- **THEN** la version n'est pas déployée
- **AND** le site en ligne reste celui d'avant
- **AND** les mises à niveau déjà appliquées restent appliquées

#### Scenario: Une publication de l'éditrice déclenche la même commande
- **WHEN** l'éditrice publie et que le dépôt du client reçoit le contenu publié
- **THEN** la même commande de mise en ligne s'exécute, sans geste de personne

#### Scenario: Les images ne déclenchent rien seules
- **WHEN** seule la branche des images change
- **THEN** aucune mise en ligne ne s'exécute

### Requirement: La base de l'instance est créée une seule fois, dans le compte du fichier d'instance

L'outil de livraison SHALL créer la base de l'instance dans le compte de la plateforme que désigne
le fichier d'instance du dépôt du client, quand ce compte n'en porte pas. Il NE DOIT jamais en créer
une seconde. Chaque geste de l'outil qui agit sur la plateforme vise ce compte et aucun autre : quand
la connexion de la personne qui livre n'y donne pas accès, ou que le fichier d'instance ne désigne
aucun compte, le geste échoue sans rien écrire.

#### Scenario: Un compte sans base reçoit la sienne
- **WHEN** la création de la base est lancée sur un compte qui n'en porte pas
- **THEN** la base existe dans ce compte, sous le nom commun à toutes les instances

#### Scenario: Un compte qui a déjà sa base n'en reçoit pas une seconde
- **WHEN** la création de la base est relancée sur un compte qui porte déjà la base de l'instance
- **THEN** aucune base n'est créée
- **AND** l'outil dit que la base existe déjà

#### Scenario: Les gestes visent le compte du fichier d'instance
- **WHEN** un geste de l'outil qui agit sur la plateforme est lancé
- **THEN** il s'adresse au compte que désigne le fichier d'instance, quel que soit le compte par défaut de la connexion

#### Scenario: Une connexion sans accès à ce compte n'écrit rien
- **WHEN** un geste est lancé alors que la connexion de la personne qui livre ne donne pas accès au compte du fichier d'instance
- **THEN** le geste échoue en le disant
- **AND** rien n'est écrit, dans aucun compte

#### Scenario: Sans compte désigné, aucun geste ne part
- **WHEN** un geste qui agit sur la plateforme est lancé alors que le fichier d'instance ne porte pas l'identifiant du compte
- **THEN** le geste échoue en nommant le champ manquant
- **AND** aucune commande ne part vers la plateforme

### Requirement: La première adresse autorisée est semée une seule fois

L'outil de livraison SHALL inscrire la première adresse autorisée d'une instance qui n'en a aucune.
Il NE DOIT jamais remplacer ni ajouter une adresse sur une instance qui en a déjà une : la remplacer
est un geste de l'éditrice dans l'administration (capacité `remplacement-adresse-autorisee`).

#### Scenario: Une instance sans adresse reçoit la sienne
- **WHEN** le semis est lancé avec une adresse bien formée sur une instance qui n'a aucune adresse autorisée
- **THEN** cette adresse devient l'adresse autorisée
- **AND** l'écran de connexion lui envoie un code quand elle le demande

#### Scenario: Une instance déjà semée est refusée
- **WHEN** le semis est lancé avec une autre adresse sur une instance qui a déjà une adresse autorisée
- **THEN** le semis est refusé en le disant
- **AND** l'adresse autorisée est inchangée

#### Scenario: Semer la même adresse deux fois ne change rien
- **WHEN** le semis est relancé avec l'adresse déjà autorisée
- **THEN** l'instance garde une seule adresse autorisée, la même

#### Scenario: Une adresse mal formée est refusée
- **WHEN** le semis est lancé avec une adresse vide ou mal formée
- **THEN** le semis est refusé en le disant
- **AND** rien n'est écrit dans la base

### Requirement: L'inventaire de livraison liste chaque liaison et chaque identifiant, sans valeur

L'outil de livraison SHALL produire un inventaire daté de l'instance. Il liste chaque liaison de la
plateforme, chaque clé que l'instance emploie à l'exécution ou à la construction, chaque raccordement
entre deux comptes, chaque compte ouvert pour l'instance, et les personnes qui ont accès à ces
comptes au moment où il est produit. Pour chaque clé et chaque raccordement, il dit son lieu, le nom
au titre duquel il existe et où sa valeur est rangée ; ces deux dernières mentions sont un constat de
la personne qui livre, que seule l'épreuve du retrait des accès prouve. Il est produit avant ce
retrait. Il NE DOIT porter aucune valeur de clé, aucune partie d'une valeur, ni aucune donnée sur le
moyen de reprise (SC-013, FR-011).

#### Scenario: Chaque clé que le produit sait lire figure à l'inventaire
- **WHEN** l'inventaire est produit
- **THEN** il porte une ligne pour chaque clé que le produit lit à l'exécution ou à la construction
- **AND** une ligne pour chaque liaison de la configuration de déploiement effective

#### Scenario: L'inventaire ne porte aucune valeur
- **WHEN** l'inventaire est produit sur une instance dont les clés sont posées
- **THEN** il ne porte la valeur d'aucune clé, ni aucune partie d'elle

#### Scenario: L'inventaire ne dit rien du moyen de reprise
- **WHEN** l'inventaire est produit sur une instance dont le code de secours est en place
- **THEN** il ne porte ni le code, ni son empreinte, ni aucune donnée qui aide à le reconstituer

#### Scenario: Une clé posée que le produit ne connaît pas est signalée
- **WHEN** une clé que le produit ne lit pas est posée sur l'instance
- **THEN** l'inventaire la signale comme inconnue du produit

#### Scenario: Une clé attendue mais absente est signalée
- **WHEN** une clé que le produit sait lire n'est pas posée sur l'instance
- **THEN** l'inventaire la signale comme absente, avec le geste que son absence refuse

#### Scenario: L'inventaire nomme chaque personne qui a accès aux comptes
- **WHEN** l'inventaire est produit, avant le retrait des accès
- **THEN** il porte les membres du compte de la plateforme et les collaborateurs du dépôt, tels que relevés dans ces comptes
- **AND** il désigne chacun de ceux qui ne sont pas le client comme à retirer

#### Scenario: Après le retrait, il ne reste que le client
- **WHEN** les accès de l'intégrateur ont été retirés, et que les membres du compte de la plateforme et les collaborateurs du dépôt sont consultés depuis une session du client
- **THEN** aucun de ceux que l'inventaire désignait comme à retirer n'y figure

### Requirement: Tout objet attaché à une identité existe au nom du client

À la livraison, chaque clé et chaque raccordement dont le fonctionnement dépend de la personne qui
l'a créé SHALL avoir été créé dans une session du client : la clé du dépôt, la clé des adresses
e-mail, la clé de construction, et le raccordement du dépôt à la construction. Aucun traitement
nécessaire au fonctionnement de l'instance ne s'exécute hors des comptes du client (FR-098, FR-102).
La preuve en est l'effet : l'exigence « L'instance survit au retrait des accès de l'intégrateur ».

#### Scenario: La procédure attribue chaque objet d'identité à une session du client
- **WHEN** la procédure de livraison est lue
- **THEN** la création de la clé du dépôt, de la clé des adresses e-mail, de la clé de construction et du raccordement du dépôt y est placée dans une session du client

#### Scenario: La mise en ligne s'exécute dans le compte du client
- **WHEN** le dépôt du client change et qu'une mise en ligne s'exécute
- **THEN** elle s'exécute dans le compte du client, sans poste ni service de l'intégrateur

### Requirement: L'instance survit au retrait des accès de l'intégrateur

Après le retrait de tous les accès de l'intégrateur aux comptes du client, l'instance SHALL continuer
de servir le site public, d'ouvrir une session d'administration et de mener une publication jusqu'en
ligne (FR-099, FR-100, FR-101, SC-012).

#### Scenario: Le site reste servi
- **WHEN** tous les accès de l'intégrateur ont été retirés
- **THEN** les pages du site public répondent comme avant

#### Scenario: L'administration s'ouvre
- **WHEN** tous les accès de l'intégrateur ont été retirés, et que l'éditrice demande un code à l'écran de connexion
- **THEN** le code arrive à l'adresse autorisée
- **AND** il ouvre une session

#### Scenario: Une publication aboutit jusqu'en ligne
- **WHEN** tous les accès de l'intégrateur ont été retirés, et que l'éditrice publie une correction
- **THEN** la publication aboutit
- **AND** la correction est visible sur le site public

#### Scenario: Une demande est toujours acheminée
- **WHEN** tous les accès de l'intégrateur ont été retirés, et qu'un visiteur envoie une demande
- **THEN** la demande arrive à l'adresse autorisée et figure dans la liste des demandes

#### Scenario: La clé d'écriture est toujours acceptée à l'échéance hebdomadaire
- **WHEN** tous les accès de l'intégrateur ont été retirés, et que l'échéance hebdomadaire survient
- **THEN** la trace du passage dit que la clé a été acceptée

### Requirement: L'instance ne coûte rien et n'enregistre aucun moyen de paiement

Une instance livrée SHALL fonctionner sans service payant ni abonnement, et sans moyen de paiement
enregistré sur le compte de la plateforme ni sur le compte du dépôt (FR-103, SC-001). Le nom de
domaine du client est un prérequis de la livraison, acheté par le client hors de ces deux comptes.

#### Scenario: Aucun moyen de paiement à la livraison
- **WHEN** le compte de la plateforme et le compte du dépôt sont consultés à la livraison
- **THEN** aucun moyen de paiement n'y est enregistré

#### Scenario: Le nom de domaine n'est pas acheté dans le compte de la plateforme
- **WHEN** le compte de la plateforme est consulté à la livraison
- **THEN** le nom de domaine y est géré, sans y avoir été acheté ni y être renouvelé

#### Scenario: Aucun service payant n'est employé
- **WHEN** l'inventaire d'une instance livrée est lu
- **THEN** aucune de ses liaisons ne relève d'un service payant ou d'un abonnement

### Requirement: Le moyen de reprise est en place à la livraison, créé par l'éditrice

La livraison SHALL se terminer avec un code de secours en place, créé par l'éditrice depuis sa propre
session, ouverte par l'adresse autorisée. Ni l'intégrateur ni l'outil de livraison ne créent, ne
voient, ne transmettent ce code (FR-009, FR-011, ADR-0032).

#### Scenario: Un code de secours est en place à la fin de la livraison
- **WHEN** la livraison est terminée
- **THEN** l'écran « Code de secours » dit qu'un code est en place

#### Scenario: L'outil de livraison n'offre aucun geste sur le code de secours
- **WHEN** les gestes de l'outil de livraison sont énumérés
- **THEN** aucun ne crée, ne lit ni ne remplace le code de secours
