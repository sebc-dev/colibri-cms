## MODIFIED Requirements

### Requirement: Cadre de navigation de l'administration

L'administration SHALL présenter, autour de chaque écran servi derrière la garde, un cadre portant le
logo du produit et le menu des rubriques (« Mes pages », Médias, Réglages, Formulaires, Demandes),
« Mes pages », « Médias », « Réglages » et « Formulaires » étant les rubriques actives et servies
(« Médias » menant à l'`Écran : Médias`, « Réglages » à l'`Écran : Réglages`, « Formulaires » à
l'`Écran : Formulaires`) ; Demandes situe la navigation sans mener à aucun écran. Le cadre DOIT porter
aussi, hors du menu des rubriques et toujours visible, le geste **« Publier »**, qui mène à l'`Écran :
Publier`, et l'**état de la dernière publication** dès la première confirmation (« publication en
cours » tant qu'une publication ou une relance dépose, puis « en cours de mise en ligne », « en ligne »,
« n'a pas abouti »). Le cadre DOIT être présent dès l'affichage de l'écran, sans
attendre qu'un script s'exécute.
Sur un écran large, le menu est une barre latérale qui DOIT pouvoir se replier en un rail d'icônes et
se redéployer, l'état replié/déployé étant une préférence retenue sur l'appareil sans effet serveur ;
sur un écran étroit, le menu DOIT devenir un tiroir, fermé par défaut, qu'un bouton ouvre, le geste
« Publier » restant visible hors du tiroir. Aucun terme de développeur ne DOIT paraître, et le menu
n'offre aucun geste de structure (FR-024/025, FR-117).

#### Scenario: La barre latérale porte les cinq rubriques
- **WHEN** l'`Écran : Cadre de l'administration` est affiché
- **THEN** la barre latérale montre les cinq rubriques, la rubrique de l'écran courant marquée active (« Mes pages » sur la liste des pages et sur l'éditeur d'une page, « Médias » sur la bibliothèque et sur la fiche d'une image, « Réglages » sur l'écran des réglages, « Formulaires » sur la liste des formulaires et sur l'écran d'un formulaire)

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

#### Scenario: Aucune autre rubrique n'est servie et aucun geste de structure n'est offert
- **WHEN** l'éditrice parcourt le menu du cadre, en barre ou en tiroir
- **THEN** aucune rubrique autre que « Mes pages », « Médias », « Réglages » et « Formulaires » ne mène à un écran servi, et le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page

#### Scenario: Aucun terme de développeur dans le cadre
- **WHEN** l'éditrice lit le menu, le geste « Publier », l'état de la dernière publication et les libellés du cadre
- **THEN** aucun terme de développeur n'y paraît (FR-117)

#### Scenario: Le cadre est servi sous CSP stricte
- **WHEN** le cadre est servi
- **THEN** il l'est sous les en-têtes réels (CSP stricte de l'administration, ADR-0004 + ADR-0008 ; tolérance des attributs `style="…"`, ADR-0010), sans script en ligne ni directive `client:*` (ADR-0006)

### Requirement: Éditeur d'une page et ses emplacements

Ouvrir une page depuis la liste SHALL présenter ses emplacements dans l'ordre posé par l'intégrateur,
chacun présenté selon sa nature (texte riche, lien de vidéo, bouton d'action, **image, galerie,
carrousel**) **et par son nom quand l'intégrateur lui en a donné un** (« Texte riche — Présentation »), et
montrant son contenu courant — **son brouillon s'il en porte un, sa dernière version publiée sinon** —,
avec un fil de retour vers « Mes pages » et un geste **« Voir l'aperçu »** qui ouvre l'aperçu de cette
page. Un emplacement sans nom DOIT se présenter par sa nature seule, jamais par son identifiant. Cet écran
porte la présentation par nature ; le moyen d'édition fonctionnel de chaque nature — barre de mise en
forme du texte riche, champ de lien de vidéo, champs du bouton d'action, **sélecteur d'image pour les
emplacements d'image, de galerie et de carrousel** — est livré par la correction de cette nature
(requirements suivants), non par cet écran seul. L'éditeur ne DOIT offrir aucun geste d'ajout, de
retrait, de déplacement ni de renommage d'un emplacement — **son nom compris** — (FR-024/025), ni aucun
terme de développeur (FR-117).

#### Scenario: Ouvrir une page depuis la liste
- **WHEN** l'éditrice clique une page de l'`Écran : Liste des pages`
- **THEN** son `Écran : Éditeur de page` s'ouvre

#### Scenario: Les emplacements paraissent dans l'ordre posé, par nature
- **WHEN** l'éditeur d'une page est affiché
- **THEN** les emplacements paraissent dans l'ordre posé, chacun présenté selon sa nature (texte riche, lien de vidéo, bouton d'action, image, galerie, carrousel) — le moyen d'édition fonctionnel de chaque nature venant avec sa correction

#### Scenario: Un emplacement nommé se présente par sa nature et son nom
- **WHEN** l'éditeur d'une page est affiché et qu'un de ses emplacements porte le nom « Présentation » déclaré par l'intégrateur
- **THEN** cet emplacement se présente par sa nature suivie de son nom (« Texte riche — Présentation »), au-dessus de son contenu

#### Scenario: Un emplacement sans nom se présente par sa nature seule
- **WHEN** l'éditeur d'une page est affiché et qu'un de ses emplacements ne porte pas de nom
- **THEN** cet emplacement se présente par sa nature seule (« Galerie »), et son identifiant n'apparaît nulle part à l'écran

#### Scenario: Un nom est affiché tel quel, jamais interprété
- **WHEN** l'intégrateur a donné à un emplacement un nom contenant des caractères de balisage (`<`, `>`, `&`, guillemets)
- **THEN** l'éditeur affiche ces caractères comme du texte, sans qu'aucune balise ne soit interprétée

#### Scenario: Chaque emplacement montre son contenu courant
- **WHEN** l'éditeur d'une page est affiché
- **THEN** chaque emplacement présente le contenu courant de la page : son brouillon s'il en porte un, sa dernière version publiée sinon

#### Scenario: Hors brouillon, l'éditeur montre la dernière version publiée
- **WHEN** l'éditeur d'une page est affiché après la publication d'une correction de son bouton d'action, la page ne portant plus de brouillon
- **THEN** le bouton d'action présente le libellé et la destination publiés, et non ceux du contenu de départ

#### Scenario: Voir l'aperçu depuis l'éditeur
- **WHEN** l'éditrice actionne « Voir l'aperçu » depuis l'éditeur d'une page
- **THEN** l'aperçu de cette page s'ouvre, présentant son contenu courant

#### Scenario: Le fil de retour ramène à la liste
- **WHEN** l'éditrice actionne le fil de retour
- **THEN** l'`Écran : Liste des pages` est de nouveau affiché

#### Scenario: Aucun geste de structure dans l'éditeur
- **WHEN** l'éditrice parcourt l'éditeur d'une page
- **THEN** aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement — ni ne change son nom —, et rien ne l'offre à l'écran (FR-024/025)

#### Scenario: Aucun terme de développeur dans l'éditeur
- **WHEN** l'éditrice lit l'éditeur d'une page
- **THEN** aucun terme de développeur n'y paraît
