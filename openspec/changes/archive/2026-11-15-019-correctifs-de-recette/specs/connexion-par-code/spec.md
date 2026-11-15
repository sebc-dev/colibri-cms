## MODIFIED Requirements

### Requirement: L'envoi d'un code à l'adresse autorisée

La soumission de l'adresse autorisée SHALL engendrer un code court, n'en conserver en base qu'une empreinte salée, et demander son expédition à la plateforme, depuis l'adresse d'expéditeur déclarée par l'instance et jamais depuis l'adresse autorisée ; toute autre adresse soumise n'écrit rien et ne demande rien. L'adresse soumise est reconnue sans tenir compte des majuscules ni des espaces en bord de saisie, et le message part à l'adresse autorisée telle qu'elle est enregistrée, jamais à la saisie. Un identifiant d'appareil est posé à l'affichage du formulaire, seulement s'il manque.

#### Scenario: L'adresse autorisée fait écrire un code et demander son expédition
- **WHEN** l'adresse autorisée est soumise
- **THEN** un code est écrit
- **AND** son expédition est demandée à la plateforme

#### Scenario: Une majuscule dans l'adresse autorisée ne change rien
- **WHEN** l'adresse autorisée est soumise avec une ou plusieurs lettres en majuscule
- **THEN** un code est écrit
- **AND** son expédition est demandée vers l'adresse autorisée telle qu'elle est enregistrée

#### Scenario: Des espaces en bord de saisie ne changent rien
- **WHEN** l'adresse autorisée est soumise précédée ou suivie d'espaces
- **THEN** un code est écrit
- **AND** son expédition est demandée vers l'adresse autorisée telle qu'elle est enregistrée

#### Scenario: Une adresse enregistrée avec des majuscules est reconnue
- **WHEN** l'adresse autorisée est enregistrée avec des majuscules et qu'elle est soumise en minuscules
- **THEN** un code est écrit
- **AND** son expédition est demandée vers l'adresse autorisée telle qu'elle est enregistrée

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

#### Scenario: Le champ d'adresse demande le clavier d'adresse e-mail
- **WHEN** l'écran de connexion est affiché
- **THEN** le champ de l'adresse demande explicitement à l'appareil un clavier d'adresse e-mail
