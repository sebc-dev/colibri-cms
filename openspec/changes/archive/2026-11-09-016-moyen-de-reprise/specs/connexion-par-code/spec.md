## MODIFIED Requirements

### Requirement: La porte de l'administration et son accueil

Toute route d'administration demandée sans session valide SHALL être refusée et renvoyée vers l'écran de connexion ; l'écran de connexion et l'écran de saisie du code de secours, eux, SHALL rester servis avec ou sans session, car ce ne sont pas des routes d'administration (le garde de session est tenu par l'import, ADR-0007). L'accueil, derrière la garde, ne présente rien de lui-même : il SHALL mener à « Mes pages », de sorte que l'éditrice n'arrive jamais sur un écran sans suite.

#### Scenario: L'accueil sans session renvoie vers la connexion
- **WHEN** l'accueil `/admin/` est demandé sans cookie de session valide
- **THEN** la réponse est un renvoi vers l'écran de connexion
- **AND** le contenu de l'accueil n'est jamais rendu

#### Scenario: L'écran de connexion se sert dans les deux cas
- **WHEN** l'écran de connexion est demandé avec ou sans cookie de session
- **THEN** il se rend dans les deux cas
- **AND** il porte son champ d'adresse

#### Scenario: L'écran de saisie du code de secours se sert dans les deux cas
- **WHEN** l'écran de saisie du code de secours est demandé avec ou sans cookie de session
- **THEN** il se rend dans les deux cas
- **AND** il porte son champ de code

#### Scenario: Un chemin inconnu ne laisse rien voir
- **WHEN** un chemin inconnu sous `/admin/` est demandé
- **THEN** la réponse est un refus
- **AND** rien de l'administration n'est laissé voir

#### Scenario: L'accueil mène à « Mes pages »
- **WHEN** l'accueil `/admin/` est demandé avec une session valide
- **THEN** la réponse est un renvoi vers l'écran « Mes pages »
- **AND** aucun contenu propre à l'accueil n'est rendu

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
