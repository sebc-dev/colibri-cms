## MODIFIED Requirements

### Requirement: Cadre de navigation de l'administration

L'administration SHALL présenter, autour de chaque écran servi derrière la garde, un cadre portant le
logo du produit et le menu des rubriques (« Mes pages », Médias, Réglages, Formulaires, Demandes), les
cinq étant des rubriques actives et servies (« Médias » menant à l'`Écran : Médias`, « Réglages » à
l'`Écran : Réglages`, « Formulaires » à l'`Écran : Formulaires`, « Demandes » à l'`Écran : Demandes`). Le
cadre DOIT porter aussi, hors du menu des rubriques et toujours visible, le geste **« Publier »**, qui mène
à l'`Écran : Publier`, et l'**état de la dernière publication** dès la première confirmation
(« publication en cours » tant qu'une publication ou une relance dépose, puis « en cours de mise en
ligne », « en ligne », « n'a pas abouti »). Le cadre DOIT être présent dès l'affichage de l'écran, sans
attendre qu'un script s'exécute.
Sur un écran large, le menu est une barre latérale qui DOIT pouvoir se replier en un rail d'icônes et
se redéployer, l'état replié/déployé étant une préférence retenue sur l'appareil sans effet serveur ;
sur un écran étroit, le menu DOIT devenir un tiroir, fermé par défaut, qu'un bouton ouvre, le geste
« Publier » restant visible hors du tiroir. Aucun terme de développeur ne DOIT paraître, et le menu
n'offre aucun geste de structure (FR-024/025, FR-117).

#### Scenario: La barre latérale porte les cinq rubriques
- **WHEN** l'`Écran : Cadre de l'administration` est affiché
- **THEN** la barre latérale montre les cinq rubriques, la rubrique de l'écran courant marquée active (« Mes pages » sur la liste des pages et sur l'éditeur d'une page, « Médias » sur la bibliothèque et sur la fiche d'une image, « Réglages » sur l'écran des réglages, « Formulaires » sur la liste des formulaires et sur l'écran d'un formulaire, « Demandes » sur la liste des demandes et sur le détail d'une demande)

#### Scenario: Le cadre est présent dès l'affichage
- **WHEN** un écran servi derrière la garde est demandé
- **THEN** la réponse porte déjà le logo, le menu des cinq rubriques avec la rubrique courante marquée, le geste « Publier », et le contenu de l'écran à l'intérieur du cadre
- **AND** ni le menu, ni le geste « Publier », ni le contenu n'attendent l'exécution d'un script pour exister

#### Scenario: Le geste Publier mène au récapitulatif depuis tout écran
- **WHEN** l'éditrice actionne « Publier » depuis n'importe quel écran servi derrière la garde
- **THEN** l'`Écran : Publier` s'ouvre, portant le récapitulatif de ce qui va partir, sans que rien ne soit encore mis en ligne

#### Scenario: L'état de la dernière publication paraît dans le cadre
- **WHEN** une publication a été déposée, et que l'éditrice ouvre n'importe quel écran servi derrière la garde
- **THEN** le cadre dit si cette publication est en cours de mise en ligne, en ligne, ou si elle n'a pas abouti

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
- **AND** le geste « Publier » reste visible en haut de l'écran, tiroir fermé

#### Scenario: Le tiroir se referme de lui-même
- **WHEN** le tiroir est ouvert et l'éditrice choisit une rubrique, touche en dehors du tiroir, ou appuie sur la touche Échap
- **THEN** le tiroir se referme
- **AND** le focus revient au bouton de menu quand la fermeture ne mène pas à un autre écran

#### Scenario: La rubrique Demandes mène à la liste des demandes
- **WHEN** l'éditrice actionne « Demandes » dans le menu du cadre, en barre ou en tiroir
- **THEN** l'`Écran : Demandes` s'ouvre, la rubrique « Demandes » marquée active

#### Scenario: Aucune autre rubrique n'est servie et aucun geste de structure n'est offert
- **WHEN** l'éditrice parcourt le menu du cadre, en barre ou en tiroir
- **THEN** chacune des cinq rubriques mène à son écran, aucune autre entrée du menu ne mène à un écran, et le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page

#### Scenario: Aucun terme de développeur dans le cadre
- **WHEN** l'éditrice lit le menu, le geste « Publier », l'état de la dernière publication et les libellés du cadre
- **THEN** aucun terme de développeur n'y paraît (FR-117)

#### Scenario: Le cadre est servi sous CSP stricte
- **WHEN** le cadre est servi
- **THEN** il l'est sous les en-têtes réels (CSP stricte de l'administration, ADR-0004 + ADR-0008 ; tolérance des attributs `style="…"`, ADR-0010), sans script en ligne ni directive `client:*` (ADR-0006)
