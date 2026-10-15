## ADDED Requirements

### Requirement: Le seuil de vingt tentatives par origine

Au-delà de **20 tentatives de connexion par heure** depuis une même origine (FR-007, seuil et fenêtre de
la capacité `seuil-par-origine`), l'écran de connexion SHALL refuser la tentative. Toute soumission compte
comme une tentative : celle d'une adresse comme celle d'un code. Une tentative refusée NE DOIT écrire aucun
code, n'en vérifier aucun, n'ouvrir aucune session et n'envoyer aucun message. Le refus DOIT s'annoncer à
l'écran, sans terme de développeur, **identiquement quelle que soit l'adresse ou le code soumis** — ni le
texte, ni les champs d'en-tête, ni le délai de la réponse ne dépendent de ce qui a été soumis : la
soumission d'une adresse refusée respecte le même délai plancher que toute soumission d'adresse. Le seuil
d'une origine NE DOIT pas toucher les autres origines, et le plafond de cinq messages par heure reste
inchangé.

#### Scenario: La vingt-et-unième tentative est refusée
- **WHEN** une même origine soumet vingt et une fois l'écran de connexion dans la même heure, adresses et codes mêlés
- **THEN** les vingt premières soumissions sont traitées, la vingt-et-unième est refusée et l'écran l'annonce

#### Scenario: Une tentative refusée n'écrit rien et n'ouvre rien
- **WHEN** au-delà du seuil de son origine, une soumission porte l'adresse autorisée, puis une autre porte un code valide
- **THEN** aucun code n'est écrit, aucun message n'est envoyé, le code valide n'est ni consommé ni accepté, et aucune session ne s'ouvre

#### Scenario: Le refus s'annonce identiquement pour toute adresse
- **WHEN** au-delà du seuil de son origine, une soumission porte l'adresse autorisée, et une autre une adresse quelconque
- **THEN** les deux réponses portent le même texte et les mêmes champs d'en-tête, et leurs délais ne se laissent pas distinguer

#### Scenario: Une autre origine se connecte normalement
- **WHEN** une origine a atteint le seuil, et que l'éditrice soumet l'adresse autorisée depuis une autre origine dans la même heure
- **THEN** un code est écrit et envoyé à l'adresse autorisée, comme sans seuil

#### Scenario: Aucun terme de développeur dans l'annonce
- **WHEN** l'écran annonce que le seuil de l'origine est atteint
- **THEN** aucun terme de développeur n'y paraît (FR-117)

## MODIFIED Requirements

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
- **WHEN** deux cents soumissions sont conduites hors plafond et hors seuil, les fenêtres du plafond et du seuil vidées entre les salves, sur l'adresse autorisée et sur d'autres adresses
- **THEN** les deux branches ne se laissent pas distinguer par leur temps de réponse
