## Purpose

Faire tenir dans le seul fichier d'instance, avec le contenu, tout ce qui distingue le site d'un
client de celui d'un autre, et refuser avant la mise en service une instance incomplète, porteuse
d'un secret ou d'un identifiant de l'intégrateur (FR-098, FR-104, SC-013).

## ADDED Requirements

### Requirement: Le fichier d'instance est la seule différence entre deux instances

Hors du contenu du site, les fichiers versionnés du dépôt d'un client SHALL être identiques d'un client
à l'autre pour une même version du produit, à la seule exception du fichier d'instance. Ce sont ceux
de cette version, hors ce que la préparation du dépôt n'y dépose pas (capacité
`livraison-d-instance`). Les fichiers de
configuration de déploiement versionnés NE DOIVENT porter ni identifiant de compte, ni identifiant de
base, ni nom de domaine, ni adresse e-mail propre à une instance (FR-104).

#### Scenario: Deux instances ne diffèrent que par le fichier d'instance et le contenu
- **WHEN** le dépôt de deux clients est préparé depuis la même version du produit, avec deux fichiers d'instance différents
- **THEN** les deux dépôts ne diffèrent que par le fichier d'instance et par le contenu du site

#### Scenario: La configuration de déploiement versionnée ne porte aucune valeur d'instance
- **WHEN** les fichiers de configuration de déploiement versionnés du produit sont lus
- **THEN** ils ne portent ni identifiant de compte, ni identifiant de base, ni nom de domaine, ni adresse e-mail propre à une instance

### Requirement: Le fichier d'instance n'admet que des champs connus et bien formés

La construction du site SHALL s'arrêter, en nommant le champ en cause, quand le fichier d'instance
porte un champ que le produit ne connaît pas, ou un champ connu dont la valeur est mal formée. Les
champs connus sont : le nom de domaine, l'adresse d'expéditeur, le dépôt de publication et
l'identifiant du compte de la plateforme. Aucun d'eux n'est un secret. Seuls le nom de domaine et
l'adresse d'expéditeur sont exigés pour construire ; les deux autres peuvent manquer, et les gestes
qui en dépendent se refusent alors comme leurs capacités le disent déjà.

#### Scenario: Un champ inconnu arrête la construction
- **WHEN** le fichier d'instance porte un champ que le produit ne connaît pas
- **THEN** la construction s'arrête
- **AND** le message nomme le champ inconnu

#### Scenario: Un champ mal formé arrête la construction
- **WHEN** l'identifiant du compte, le dépôt de publication, le nom de domaine ou l'adresse d'expéditeur est présent mais mal formé
- **THEN** la construction s'arrête
- **AND** le message nomme le champ en cause

#### Scenario: Le champ de l'ancien test de présence humaine n'est plus admis
- **WHEN** le fichier d'instance porte encore la clé publique de l'ancien test de présence humaine
- **THEN** la construction s'arrête en nommant ce champ

#### Scenario: Les champs facultatifs peuvent manquer
- **WHEN** le fichier d'instance ne porte que le nom de domaine et l'adresse d'expéditeur, bien formés
- **THEN** la construction aboutit

### Requirement: La configuration de déploiement effective est dérivée du fichier d'instance

La construction SHALL produire une configuration de déploiement effective qui sert le nom de domaine
du fichier d'instance et n'ouvre aucune autre adresse publique. La base de l'instance y est rattachée
par son nom, le même pour toutes les instances : aucun identifiant de base n'est écrit, ni dans le
fichier d'instance, ni dans un fichier versionné.

#### Scenario: Le domaine passe dans la configuration effective
- **WHEN** le site est construit avec un fichier d'instance qui porte un nom de domaine
- **THEN** la configuration de déploiement effective sert ce nom de domaine

#### Scenario: Aucune autre adresse publique n'est ouverte
- **WHEN** le site est construit
- **THEN** la configuration de déploiement effective n'ouvre ni l'adresse par défaut de la plateforme ni des adresses d'aperçu

#### Scenario: La base est rattachée par son nom
- **WHEN** la configuration de déploiement effective est produite
- **THEN** elle désigne la base par son nom, sans identifiant

#### Scenario: Les liaisons du produit sont conservées
- **WHEN** la configuration de déploiement effective est dérivée
- **THEN** elle porte les mêmes liaisons que celle du produit, sans en ajouter ni en retirer

#### Scenario: Dériver deux fois donne le même résultat
- **WHEN** la dérivation est rejouée sur une configuration déjà dérivée
- **THEN** la configuration effective est inchangée

### Requirement: Le contrôle d'instance refuse une instance qui n'est pas prête

Le produit SHALL offrir un contrôle d'instance, à lancer sur le dépôt d'un client avant sa mise en
service. Il réussit seulement si le fichier d'instance porte ses quatre champs, bien formés, sans
valeur d'exemple du produit. Chaque refus nomme le champ ou le fichier en cause et dit pourquoi. Le
contrôle ne modifie rien.

#### Scenario: Une instance complète passe le contrôle
- **WHEN** le contrôle est lancé sur un dépôt dont le fichier d'instance porte ses quatre champs, bien formés et propres à l'instance
- **THEN** le contrôle réussit

#### Scenario: Un champ manquant est refusé
- **WHEN** le dépôt de publication ou l'identifiant du compte manque au fichier d'instance
- **THEN** le contrôle échoue en nommant le champ manquant

#### Scenario: Une valeur d'exemple restée en place est refusée
- **WHEN** le fichier d'instance porte encore le nom de domaine, l'adresse d'expéditeur ou l'identifiant de compte d'exemple du produit
- **THEN** le contrôle échoue en nommant le champ resté à sa valeur d'exemple

#### Scenario: L'adresse d'expéditeur hors du domaine de l'instance est refusée
- **WHEN** l'adresse d'expéditeur n'appartient ni au nom de domaine de l'instance ni à l'un de ses sous-domaines
- **THEN** le contrôle échoue en nommant l'adresse d'expéditeur

#### Scenario: Le contrôle ne modifie rien
- **WHEN** le contrôle est lancé, qu'il réussisse ou qu'il échoue
- **THEN** aucun fichier du dépôt n'est modifié

### Requirement: Le contrôle d'instance refuse tout identifiant désigné de l'intégrateur

Le contrôle d'instance SHALL recevoir, à l'appel, la liste des identifiants de l'intégrateur à
proscrire (nom de compte, nom de domaine, adresse e-mail). Il échoue quand l'un d'eux figure dans un
fichier versionné du dépôt du client, quel qu'il soit. Cette liste n'est écrite dans aucun fichier du
produit : le contrôle ne la lit que de son appel (FR-098).

#### Scenario: Un identifiant de l'intégrateur dans le fichier d'instance est refusé
- **WHEN** le contrôle est lancé en désignant un identifiant de l'intégrateur, et que le dépôt de publication du fichier d'instance le porte
- **THEN** le contrôle échoue en nommant le fichier d'instance et l'identifiant trouvé

#### Scenario: Un identifiant de l'intégrateur dans le contenu est refusé
- **WHEN** le contrôle est lancé en désignant un nom de domaine de l'intégrateur, et qu'un fichier du contenu le porte
- **THEN** le contrôle échoue en nommant ce fichier

#### Scenario: La casse ne masque pas un identifiant
- **WHEN** l'identifiant désigné figure dans le dépôt avec une autre casse
- **THEN** le contrôle échoue de la même façon

#### Scenario: Sans identifiant trouvé, ce point passe
- **WHEN** le contrôle est lancé en désignant des identifiants qui ne figurent nulle part dans le dépôt
- **THEN** aucun refus n'est émis à ce titre

### Requirement: Aucun secret ne figure dans le dépôt d'un client

Le contrôle d'instance SHALL échouer quand un fichier versionné du dépôt porte une valeur qui a la
forme d'une clé d'accès au dépôt ou à la plateforme. Le refus nomme le fichier, jamais la valeur.

#### Scenario: Une clé d'accès au dépôt dans un fichier est refusée
- **WHEN** un fichier versionné du dépôt porte une valeur de la forme d'une clé d'accès au dépôt
- **THEN** le contrôle échoue en nommant le fichier
- **AND** le message ne reproduit ni la valeur ni aucune partie d'elle

#### Scenario: Un dépôt sans clé passe ce point
- **WHEN** aucun fichier versionné ne porte de valeur de cette forme
- **THEN** aucun refus n'est émis à ce titre
