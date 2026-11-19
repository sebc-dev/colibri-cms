## ADDED Requirements

### Requirement: La clé d'écriture est maintenue en vie

Une fois par semaine, sans geste de personne, l'instance SHALL faire au dépôt du client un appel en
lecture qui emploie la clé d'écriture, pour que le dépôt ne la retire pas faute d'usage (FR-101).
La construction du site n'emploie aucune clé du dépôt : une instance où l'on n'a pas publié depuis
plus d'un an construit encore.
L'appel n'écrit rien dans le dépôt et ne touche à aucun brouillon, aucune publication en cours ni
aucune session. Chaque passage SHALL laisser dans les journaux de la plateforme une trace qui dit son
issue — clé acceptée, accès refusé, dépôt introuvable, dépôt injoignable, dépôt non configuré — sans
la clé ni aucune partie d'elle.

#### Scenario: L'appel hebdomadaire emploie la clé
- **WHEN** l'échéance hebdomadaire survient sur une instance dont le dépôt et la clé d'écriture sont configurés
- **THEN** un appel en lecture part vers le dépôt du client avec la clé d'écriture
- **AND** une trace dit que la clé a été acceptée

#### Scenario: L'appel n'écrit rien
- **WHEN** l'échéance hebdomadaire survient
- **THEN** aucune écriture ne part vers le dépôt
- **AND** ni les brouillons, ni l'état de la publication, ni les sessions ne changent

#### Scenario: Une clé refusée est consignée
- **WHEN** l'échéance hebdomadaire survient et que le dépôt refuse la clé
- **THEN** une trace est écrite dans les journaux de la plateforme
- **AND** elle dit que l'accès a été refusé, sans la clé ni aucune partie d'elle

#### Scenario: Un dépôt injoignable est consigné
- **WHEN** l'échéance hebdomadaire survient et que le dépôt ne répond pas
- **THEN** une trace dit que le dépôt est injoignable
- **AND** le passage se termine sans autre effet

#### Scenario: Sans dépôt ni clé, aucun appel ne part
- **WHEN** l'échéance hebdomadaire survient sur une instance sans dépôt de publication configuré, ou sans clé d'écriture
- **THEN** aucun appel ne part
- **AND** une trace dit que le dépôt n'est pas configuré

#### Scenario: La construction récupère les images sans clé du dépôt
- **WHEN** la construction du site récupère les images publiées d'un dépôt privé, sans qu'aucune clé du dépôt lui soit confiée
- **THEN** elle les récupère et aboutit

#### Scenario: Une publication en cours n'est pas gênée
- **WHEN** l'échéance hebdomadaire survient pendant qu'une publication est en cours
- **THEN** la publication se poursuit et aboutit comme sans cet appel
