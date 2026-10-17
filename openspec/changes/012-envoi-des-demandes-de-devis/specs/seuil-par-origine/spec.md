## Purpose

Borner, sans compte visiteur, ce qu'une même origine peut solliciter des deux surfaces publiques du
produit — l'envoi d'une demande et l'écran de connexion — sans que la protection crée un fichier des
visiteurs. Couvre la mécanique commune de FR-007 et FR-062, sous SEC-2 et DAT-3.

## ADDED Requirements

### Requirement: Comptage par origine sur une fenêtre d'une heure

Le produit SHALL compter, pour chaque origine, les sollicitations qu'elle adresse à chacune des deux
surfaces publiques, sur une **fenêtre d'une heure** : l'origine d'une sollicitation est l'adresse IP que la
plateforme attribue à la requête. Chaque sollicitation reçue compte, qu'elle aboutisse ou non. Les deux
surfaces ont chacune leur seuil et leur compte, indépendants l'un de l'autre : **5 demandes** et **20
tentatives de connexion** par origine et par fenêtre ; la sollicitation qui dépasse le seuil de sa surface
DOIT être refusée, et toutes les suivantes jusqu'à la fin de la fenêtre. Une nouvelle fenêtre repart de
zéro. Le seuil d'une origine NE DOIT jamais atteindre une autre origine. Le comptage NE DOIT exiger ni
compte, ni session, ni cookie. Une sollicitation que la base ne permet pas de compter DOIT être refusée :
la protection ne s'ouvre pas sur une panne. Ce refus NE DOIT pas se présenter comme un seuil atteint :
chaque surface l'annonce comme un échec passager, à réessayer dans quelques instants (capacités
`demande-de-devis` et `connexion-par-code`).

#### Scenario: La sixième demande d'une heure est refusée
- **WHEN** une même origine envoie six demandes complètes dans la même fenêtre
- **THEN** les cinq premières sont acceptées, la sixième est refusée

#### Scenario: Une autre origine n'est pas touchée
- **WHEN** une origine a atteint le seuil des demandes, et qu'une autre origine envoie une demande complète dans la même fenêtre
- **THEN** la demande de l'autre origine est acceptée

#### Scenario: Une nouvelle fenêtre repart de zéro
- **WHEN** une origine a été refusée pour seuil atteint, et qu'elle envoie une demande complète dans la fenêtre suivante
- **THEN** la demande est acceptée

#### Scenario: Les deux surfaces comptent séparément
- **WHEN** une origine a atteint le seuil des demandes, puis soumet une adresse à l'écran de connexion dans la même fenêtre
- **THEN** la soumission de connexion est traitée comme sous son propre seuil

#### Scenario: Une sollicitation refusée pour un autre motif compte aussi
- **WHEN** une origine envoie cinq demandes refusées pour un champ manquant, puis une sixième, complète, dans la même fenêtre
- **THEN** la sixième est refusée pour seuil atteint

#### Scenario: Le comptage ne pose aucun cookie
- **WHEN** une sollicitation est comptée
- **THEN** la réponse ne pose aucun cookie lié au comptage

#### Scenario: Une panne du compteur refuse la sollicitation
- **WHEN** une sollicitation arrive et que la base refuse de la compter
- **THEN** la sollicitation est refusée, rien de ce qu'elle demande n'est fait, et la trace de l'échec ne porte ni son adresse IP, ni la clé de la fenêtre, ni son empreinte

#### Scenario: Une panne ne se dit pas comme un seuil atteint
- **WHEN** une sollicitation arrive et que la base refuse de la compter
- **THEN** la réponse ne porte pas le refus pour seuil atteint, et invite à réessayer dans quelques instants

### Requirement: Le compteur ne garde aucune origine en clair

Le compteur SHALL ne retenir d'une origine qu'une **empreinte** calculée avec une **clé tirée au hasard par
le produit pour la seule fenêtre en cours** (DAT-3) : aucune adresse IP NE DOIT être écrite en clair dans la
base, dans une réponse ni dans un journal. La clé NE DOIT être ni configurée, ni remise, ni lisible dans une
réponse ou un journal : le produit la fabrique et la jette. Au premier comptage d'une nouvelle fenêtre, la
clé de la fenêtre précédente et toutes ses empreintes DOIVENT être effacées **ensemble**, en une seule
opération indivisible, avant que rien ne soit compté ; aucune empreinte NE DOIT jamais être comptée sous
la clé d'une autre fenêtre. La base ne porte donc, à tout instant, que la clé et les empreintes d'une seule
fenêtre.

#### Scenario: Aucune adresse IP en clair dans la base
- **WHEN** des sollicitations de plusieurs origines ont été comptées
- **THEN** aucune des adresses IP de ces origines ne figure, sous aucune forme lisible, dans la base

#### Scenario: Le changement de fenêtre efface la clé et les empreintes ensemble
- **WHEN** une première sollicitation arrive dans une nouvelle fenêtre, alors que la base porte la clé et les empreintes de la fenêtre précédente
- **THEN** la clé et toutes les empreintes de la fenêtre précédente ont disparu de la base, et seules la nouvelle clé et l'empreinte de cette sollicitation y figurent

#### Scenario: Deux fenêtres n'ont jamais la même clé
- **WHEN** des sollicitations d'une même origine sont comptées dans deux fenêtres successives
- **THEN** les deux fenêtres ont des clés différentes, et l'empreinte de cette origine diffère d'une fenêtre à l'autre

#### Scenario: Ni l'origine ni la clé ne paraissent dans un journal ou une réponse
- **WHEN** une sollicitation est comptée, puis refusée pour seuil atteint
- **THEN** ni son adresse IP, ni la clé de la fenêtre, ni son empreinte ne figurent dans la réponse ni dans les journaux
