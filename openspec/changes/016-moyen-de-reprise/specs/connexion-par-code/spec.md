## MODIFIED Requirements

### Requirement: La fin de session automatique

Une session SHALL se fermer après sept jours sans usage, et après trente jours quoi qu'il arrive. L'échéance glissante se rafraîchit sans écrire en base à chaque requête (ADR-0001), et rien ne compte les sessions simultanées. Elles coexistent et expirent d'elles-mêmes, sauf quand le code de secours est créé, remplacé ou employé : toutes les sessions sont alors fermées, hormis celle qui a fait le geste ou que le code vient d'ouvrir (capacité `moyen-de-reprise`, FR-012).

#### Scenario: Sept jours sans usage ferment la session
- **WHEN** une session est restée sept jours sans usage
- **THEN** elle ne donne plus accès à l'accueil
- **AND** la demande est renvoyée vers l'écran de connexion

#### Scenario: Trente jours ferment la session quoi qu'il arrive
- **WHEN** une session dépasse trente jours, même utilisée chaque jour depuis son ouverture
- **THEN** elle ne donne plus accès

#### Scenario: Un usage dans la fenêtre repousse l'échéance
- **WHEN** une session est utilisée à l'intérieur de la fenêtre des sept jours
- **THEN** l'échéance des sept jours est repoussée

#### Scenario: Le rafraîchissement n'écrit pas à chaque requête
- **WHEN** une session est utilisée requête après requête
- **THEN** le rafraîchissement de l'échéance n'écrit pas en base à chaque requête

#### Scenario: Les sessions simultanées coexistent
- **WHEN** plusieurs sessions sont ouvertes en même temps, et que le code de secours n'est ni créé, ni remplacé, ni employé
- **THEN** elles coexistent sans que rien ne les compte ni ne les ferme

#### Scenario: Le code de secours ferme les autres sessions
- **WHEN** plusieurs sessions sont ouvertes, puis que le code de secours est créé, remplacé ou employé
- **THEN** seule reste ouverte la session qui a fait le geste, ou celle que le code vient d'ouvrir
