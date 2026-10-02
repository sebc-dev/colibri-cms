## MODIFIED Requirements

### Requirement: L'envoi d'un code à l'adresse autorisée

La soumission de l'adresse autorisée SHALL engendrer un code court, n'en conserver en base qu'une empreinte salée, et demander son expédition à la plateforme, depuis l'adresse d'expéditeur déclarée par l'instance et jamais depuis l'adresse autorisée ; toute autre adresse soumise n'écrit rien et ne demande rien. Un identifiant d'appareil est posé à l'affichage du formulaire, seulement s'il manque.

#### Scenario: L'adresse autorisée fait écrire un code et demander son expédition
- **WHEN** l'adresse autorisée est soumise
- **THEN** un code est écrit
- **AND** son expédition est demandée à la plateforme

#### Scenario: Toute autre adresse ne fait rien
- **WHEN** une adresse autre que l'adresse autorisée est soumise
- **THEN** aucun code n'est écrit
- **AND** aucune expédition n'est demandée

#### Scenario: Le code respecte sa forme
- **WHEN** un code est engendré
- **THEN** il fait huit signes d'un alphabet de trente-deux caractères sans confusables

#### Scenario: La base ne conserve qu'une empreinte salée
- **WHEN** un code a été écrit
- **THEN** le code tel qu'il a été engendré ne se retrouve pas en base
- **AND** seule une empreinte salée en est conservée

#### Scenario: L'identifiant d'appareil est posé à l'affichage
- **WHEN** l'écran de connexion est affiché
- **THEN** un identifiant d'appareil est posé s'il manque, et celui qui est déjà là reste intact
- **AND** la durée de vie de cet identifiant n'est pas plus courte que celle d'un code

#### Scenario: Le code porte l'identifiant d'appareil de sa demande
- **WHEN** un code est écrit à la suite d'une soumission
- **THEN** il porte l'identifiant d'appareil de la soumission qui l'a demandé

#### Scenario: Le message part en texte seul avec un objet fixe
- **WHEN** un message portant un code part vers l'adresse autorisée
- **THEN** il part en texte seul, sans HTML
- **AND** il porte un objet fixe posé par le produit

#### Scenario: Le message part depuis l'adresse d'expéditeur de l'instance
- **WHEN** un message portant un code part vers l'adresse autorisée
- **THEN** son expéditeur est l'adresse d'expéditeur déclarée par l'instance
- **AND** son expéditeur n'est jamais l'adresse autorisée

#### Scenario: Le message arrive dans la boîte de l'adresse autorisée
- **WHEN** l'adresse autorisée est soumise sur une instance livrée, dont l'acheminement d'e-mail est activé sur le domaine de l'adresse d'expéditeur
- **THEN** un message portant le code arrive dans la boîte de l'adresse autorisée

#### Scenario: Une instance sans adresse d'expéditeur valide ne se bâtit pas
- **WHEN** le fichier d'instance ne déclare pas d'adresse d'expéditeur, ou en déclare une qui n'est pas une adresse e-mail
- **THEN** la construction du site échoue en nommant le champ manquant ou invalide

### Requirement: L'indiscernabilité des deux branches de soumission

Sur une soumission donnée, l'écran de connexion SHALL rendre la même réponse — même corps, mêmes champs d'en-tête, même moment — que l'adresse soumise soit l'adresse autorisée ou n'importe quelle autre. La réponse n'est rendue qu'au terme d'un délai plancher gelé en source, et l'expédition est remise à la plateforme après que la réponse est partie. Une expédition qui échoue est consignée dans les journaux de la plateforme, réservés à l'exploitation, sans que la réponse en soit changée.

#### Scenario: Le corps de réponse est identique pour les deux branches
- **WHEN** une même soumission est jouée pour l'adresse autorisée puis pour toute autre adresse
- **THEN** le corps de la réponse est identique dans les deux branches

#### Scenario: Les champs d'en-tête sont identiques pour les deux branches
- **WHEN** une même soumission est jouée pour l'adresse autorisée puis pour toute autre adresse
- **THEN** les champs d'en-tête de la réponse sont identiques dans les deux branches

#### Scenario: La réponse attend un délai plancher constant
- **WHEN** une soumission est reçue
- **THEN** la réponse n'est rendue qu'au terme d'un délai plancher
- **AND** ce délai est une constante des sources

#### Scenario: L'expédition est remise après le rendu
- **WHEN** une soumission de l'adresse autorisée est traitée
- **THEN** l'expédition est remise à la plateforme après que la réponse est rendue, jamais avant

#### Scenario: Une expédition qui échoue ne change rien
- **WHEN** l'expédition demandée échoue
- **THEN** ni le corps, ni les champs d'en-tête, ni le moment de la réponse ne changent

#### Scenario: Une expédition qui échoue est consignée pour l'exploitation
- **WHEN** l'expédition demandée échoue
- **THEN** une trace de l'échec est écrite dans les journaux de la plateforme
- **AND** cette trace ne porte pas le code

#### Scenario: Une expédition qui aboutit ne laisse aucune trace d'échec
- **WHEN** l'expédition demandée aboutit
- **THEN** aucune trace d'échec n'est écrite

#### Scenario: Une instance non semée se comporte de même
- **WHEN** aucune adresse autorisée n'est enregistrée et une adresse est soumise
- **THEN** la réponse reste la même — l'écran ne se comporte pas autrement

#### Scenario: Les temps de réponse ne distinguent pas les branches
- **WHEN** deux cents soumissions sont conduites hors plafond, la fenêtre vidée entre les salves, sur l'adresse autorisée et sur d'autres adresses
- **THEN** les deux branches ne se laissent pas distinguer par leur temps de réponse
