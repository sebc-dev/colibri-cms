## REMOVED Requirements

### Requirement: La porte de l'administration
**Reason**: L'accueil « vide de fonction » laissait l'éditrice, juste après sa connexion, sur un écran sans aucune suite — une impasse contraire à UX-2 et à SC-003. Toute la règle de garde est reprise telle quelle ; seul le sort de l'accueil change.
**Migration**: Remplacée par « La porte de l'administration et son accueil » : mêmes scénarios de garde, et l'accueil, derrière la garde, renvoie vers « Mes pages ». Le test qui figeait un accueil sans lien est remplacé par celui du renvoi.

### Requirement: L'ouverture de session par le code recopié
**Reason**: Le scénario « L'accueil s'affiche sans fonction » décrivait l'impasse retirée ci-dessus. Tout le reste de la règle — code à usage unique, quinze minutes, saisie normalisée, cookie verrouillé — est repris tel quel.
**Migration**: Remplacée par « L'ouverture de session par le code recopié, jusqu'à « Mes pages » » : mêmes scénarios, sauf le dernier arrêt, qui est désormais « Mes pages ».

## ADDED Requirements

### Requirement: La porte de l'administration et son accueil

Toute route d'administration demandée sans session valide SHALL être refusée et renvoyée vers l'écran de connexion ; l'écran de connexion, lui, SHALL rester servi avec ou sans session, car il n'est pas une route d'administration (le garde de session est tenu par l'import, ADR-0007). L'accueil, derrière la garde, ne présente rien de lui-même : il SHALL mener à « Mes pages », de sorte que l'éditrice n'arrive jamais sur un écran sans suite.

#### Scenario: L'accueil sans session renvoie vers la connexion
- **WHEN** l'accueil `/admin/` est demandé sans cookie de session valide
- **THEN** la réponse est un renvoi vers l'écran de connexion
- **AND** le contenu de l'accueil n'est jamais rendu

#### Scenario: L'écran de connexion se sert dans les deux cas
- **WHEN** l'écran de connexion est demandé avec ou sans cookie de session
- **THEN** il se rend dans les deux cas
- **AND** il porte son champ d'adresse

#### Scenario: Un chemin inconnu ne laisse rien voir
- **WHEN** un chemin inconnu sous `/admin/` est demandé
- **THEN** la réponse est un refus
- **AND** rien de l'administration n'est laissé voir

#### Scenario: L'accueil mène à « Mes pages »
- **WHEN** l'accueil `/admin/` est demandé avec une session valide
- **THEN** la réponse est un renvoi vers l'écran « Mes pages »
- **AND** aucun contenu propre à l'accueil n'est rendu

### Requirement: L'ouverture de session par le code recopié, jusqu'à « Mes pages »

Un code recopié sur l'appareil qui l'a demandé, une seule fois et dans les quinze minutes, SHALL ouvrir une session opaque en base et renvoyer vers l'accueil. La saisie se normalise, et le cookie ne porte rien qui se lise.

#### Scenario: Le code recopié ouvre la session
- **WHEN** le code est recopié sur l'appareil qui l'a demandé, dans les quinze minutes
- **THEN** une session s'ouvre
- **AND** la réponse renvoie vers l'accueil

#### Scenario: L'ouverture de session conduit à « Mes pages »
- **WHEN** la session vient de s'ouvrir et l'éditrice suit le renvoi vers l'accueil
- **THEN** elle arrive sur l'écran « Mes pages »
- **AND** elle ne traverse aucun écran sans suite

#### Scenario: La saisie est normalisée
- **WHEN** le code est saisi avec des majuscules, des séparateurs ou des confusables
- **THEN** la casse est indifférente, les séparateurs sont ignorés et les confusables sont ramenés à leur signe

#### Scenario: Le même code ne s'utilise pas deux fois
- **WHEN** un code déjà utilisé est présenté une seconde fois
- **THEN** il n'ouvre pas de session

#### Scenario: Un code trop vieux n'ouvre pas de session
- **WHEN** un code est présenté au-delà de quinze minutes après sa demande
- **THEN** il n'ouvre pas de session

#### Scenario: Le cookie de session est verrouillé et opaque
- **WHEN** une session s'ouvre
- **THEN** le cookie porte le préfixe `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict` et `Path=/`
- **AND** rien de la session ne se lit dans le cookie

#### Scenario: L'écran de saisie dit la durée de validité
- **WHEN** l'écran de saisie du code est rendu
- **THEN** il dit combien de temps le code reste bon
- **AND** aucun terme de développeur n'y paraît

