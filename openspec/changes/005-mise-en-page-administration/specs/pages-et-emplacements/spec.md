## MODIFIED Requirements

### Requirement: Cadre de navigation de l'administration

L'administration SHALL présenter, autour de chaque écran servi derrière la garde, un cadre portant le
logo du produit et le menu des rubriques (« Mes pages », Médias, Réglages, Formulaires, Demandes),
« Mes pages » et « Médias » étant les rubriques actives et servies (« Médias » menant à
l'`Écran : Médias`) ; Réglages, Formulaires et Demandes situent la navigation sans mener à aucun
écran. Le cadre DOIT être présent dès l'affichage de l'écran, sans attendre qu'un script s'exécute.
Sur un écran large, le menu est une barre latérale qui DOIT pouvoir se replier en un rail d'icônes et
se redéployer, l'état replié/déployé étant une préférence retenue sur l'appareil sans effet serveur ;
sur un écran étroit, le menu DOIT devenir un tiroir, fermé par défaut, qu'un bouton ouvre. Aucun terme
de développeur ne DOIT paraître, et le menu n'offre aucun geste de structure (FR-024/025, FR-117).

#### Scenario: La barre latérale porte les cinq rubriques
- **WHEN** l'`Écran : Cadre de l'administration` est affiché
- **THEN** la barre latérale montre les cinq rubriques, la rubrique de l'écran courant marquée active (« Mes pages » sur la liste des pages et sur l'éditeur d'une page, « Médias » sur la bibliothèque et sur la fiche d'une image)

#### Scenario: Le cadre est présent dès l'affichage
- **WHEN** un écran servi derrière la garde est demandé
- **THEN** la réponse porte déjà le logo, le menu des cinq rubriques avec la rubrique courante marquée, et le contenu de l'écran à l'intérieur du cadre
- **AND** ni le menu ni le contenu n'attendent l'exécution d'un script pour exister

#### Scenario: Replier la barre en un rail d'icônes
- **WHEN** sur un écran large, l'éditrice actionne le bouton de repli
- **THEN** la barre se réduit à un rail d'icônes seules, la rubrique active y reste marquée, et la zone de contenu s'élargit d'autant

#### Scenario: Redéployer la barre
- **WHEN** l'éditrice redéploie la barre repliée
- **THEN** les libellés reparaissent à côté des icônes

#### Scenario: L'état replié/déployé est retenu sur l'appareil
- **WHEN** l'écran est rechargé après un choix de repli ou de déploiement
- **THEN** le dernier état choisi est conservé, sans requête serveur pour le porter

#### Scenario: Sur écran étroit, le menu est un tiroir
- **WHEN** l'écran est affiché sur un appareil étroit
- **THEN** le menu est fermé et le contenu occupe toute la largeur
- **AND** un bouton de menu, toujours visible en haut de l'écran, ouvre le tiroir portant les cinq rubriques

#### Scenario: Le tiroir se referme de lui-même
- **WHEN** le tiroir est ouvert et l'éditrice choisit une rubrique, touche en dehors du tiroir, ou appuie sur la touche Échap
- **THEN** le tiroir se referme
- **AND** le focus revient au bouton de menu quand la fermeture ne mène pas à un autre écran

#### Scenario: Aucune autre rubrique n'est servie et aucun geste de structure n'est offert
- **WHEN** l'éditrice parcourt le menu du cadre, en barre ou en tiroir
- **THEN** aucune rubrique autre que « Mes pages » et « Médias » ne mène à un écran servi, et le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page

#### Scenario: Aucun terme de développeur dans le cadre
- **WHEN** l'éditrice lit le menu et les libellés du cadre
- **THEN** aucun terme de développeur n'y paraît (FR-117)

#### Scenario: Le cadre est servi sous CSP stricte
- **WHEN** le cadre est servi
- **THEN** il l'est sous les en-têtes réels (CSP stricte de l'administration, ADR-0004 + ADR-0008 ; tolérance des attributs `style="…"`, ADR-0010), sans script en ligne ni directive `client:*` (ADR-0006)
