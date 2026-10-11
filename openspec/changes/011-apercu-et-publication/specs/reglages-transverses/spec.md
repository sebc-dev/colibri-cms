## MODIFIED Requirements

### Requirement: Écran des réglages

La rubrique « Réglages » SHALL mener à un `Écran : Réglages`, servi derrière la garde de session dans le
cadre de l'administration, la rubrique « Réglages » y étant marquée active. L'écran DOIT présenter trois
cartes, dans cet ordre : **Coordonnées**, **Réseaux sociaux**, **Mention d'information** ; chaque carte
montre le contenu courant de son réglage — son brouillon s'il en porte un, sa **dernière version publiée**
sinon, qui est son contenu de départ tant que le réglage n'a jamais été publié —, porte son propre bouton
« Enregistrer » et sa propre marque de brouillon. Sans session, l'écran DOIT renvoyer à l'écran de
connexion. Aucun terme de développeur ne DOIT paraître sur l'écran (FR-117).

#### Scenario: Ouvrir les réglages depuis le menu
- **WHEN** l'éditrice, en session, choisit « Réglages » dans le menu du cadre
- **THEN** l'`Écran : Réglages` s'ouvre dans le cadre, « Réglages » marquée active, et présente les cartes Coordonnées, Réseaux sociaux et Mention d'information dans cet ordre

#### Scenario: Sans session, l'écran renvoie à la connexion
- **WHEN** l'`Écran : Réglages` est demandé sans session ouverte
- **THEN** la réponse renvoie à l'écran de connexion, sans rien montrer des réglages

#### Scenario: Chaque carte montre le contenu courant de son réglage
- **WHEN** l'`Écran : Réglages` est affiché alors que seul le réglage Réseaux sociaux porte un brouillon, et qu'aucun réglage n'a jamais été publié
- **THEN** la carte Réseaux sociaux montre la liste du brouillon, et les cartes Coordonnées et Mention d'information montrent leur contenu de départ

#### Scenario: Hors brouillon, une carte montre la dernière version publiée
- **WHEN** l'`Écran : Réglages` est affiché après la publication d'une nouvelle mention d'information, la mention ne portant plus de brouillon
- **THEN** la carte Mention d'information montre la mention publiée, sans marque de brouillon, et non la mention de départ

#### Scenario: Un texte saisi est affiché tel quel, jamais interprété
- **WHEN** l'`Écran : Réglages` est affiché alors qu'une valeur de coordonnée, un nom de lien ou un nom de coordonnée déclaré contient les caractères `<`, `>`, `&` ou des guillemets
- **THEN** ces caractères paraissent comme du texte, et aucun balisage n'est interprété

#### Scenario: Aucun terme de développeur sur l'écran des réglages
- **WHEN** l'éditrice lit l'écran des réglages, ses cartes, ses champs et leurs messages
- **THEN** aucun terme de développeur n'y paraît (FR-117)
