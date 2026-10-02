## Purpose

Donner à tous les écrans de l'administration une présentation commune, lisible et utilisable seule
par l'éditrice, sur un ordinateur comme sur un téléphone : l'identité Colibri, des couleurs qui disent
l'état de ce qu'elle modifie, une lisibilité garantie, et un parcours complet sur écran étroit.

Dans cette spec, un **écran étroit** est un affichage de moins de 768 px de large, et un **écran
large** un affichage de 768 px ou plus. Les **écrans servis** sont la connexion, « Mes pages »,
l'éditeur d'une page, « Médias » et la fiche d'une image.

## ADDED Requirements

### Requirement: Identité visuelle commune à tous les écrans

Chaque écran servi SHALL se présenter selon le thème Colibri (ADR-0015) : fond de page en neutre
chaud, jamais en blanc pur ; cartes et panneaux en surface claire ; texte courant en Instrument Sans,
titres d'écran en Fraunces, adresses de pages en JetBrains Mono ; une seule couleur pour les actions
(`plumage`) ; un seul thème, clair. Aucun écran ne DOIT conserver la présentation grise du registre
de composants.

#### Scenario: Un écran servi porte le thème Colibri
- **WHEN** l'un des écrans servis est affiché
- **THEN** son fond de page est le neutre chaud du thème, son titre est en Fraunces, son texte courant en Instrument Sans
- **AND** son action principale, s'il en a une, est présentée en `plumage`

#### Scenario: « Mes pages » montre l'adresse de chaque page
- **WHEN** l'écran « Mes pages » est affiché
- **THEN** chaque ligne porte, sous le titre de la page, son adresse sur le site, en JetBrains Mono

#### Scenario: Le thème ne suit pas le réglage sombre de l'appareil
- **WHEN** un écran servi est affiché sur un appareil réglé en apparence sombre
- **THEN** il se présente dans le thème clair, à l'identique

### Requirement: Polices et ressources servies par le site lui-même

Les polices, le logo et les icônes de l'administration SHALL être servis par le site lui-même
(ADR-0016) ; aucun écran ne DOIT solliciter une autre origine pour s'afficher. Si une police ne se
charge pas, l'écran DOIT rester lisible dans sa police de repli.

#### Scenario: Aucun appel à une autre origine
- **WHEN** un écran servi est affiché dans un navigateur, sous ses en-têtes réels
- **THEN** toutes les ressources qu'il charge — feuilles, polices, logo, icônes, scripts — viennent de la même origine que l'écran
- **AND** la console ne rapporte aucune violation de la politique de sécurité

#### Scenario: Les trois familles sont effectivement appliquées
- **WHEN** l'écran « Mes pages », qui porte un titre, du texte courant et des adresses de pages, est affiché
- **THEN** le navigateur rend le titre en Fraunces, le texte en Instrument Sans et l'adresse en JetBrains Mono

#### Scenario: Une police absente laisse l'écran lisible
- **WHEN** un fichier de police ne peut pas être chargé
- **THEN** le texte concerné s'affiche dans sa police de repli, sans texte invisible ni mise en page cassée

### Requirement: Couleurs d'état constantes

L'état d'une page qui porte un **brouillon** SHALL être signalé partout de la même façon, en `gorge`,
avec un libellé écrit — jamais par la seule couleur. `gorge` NE DOIT servir à rien d'autre, et
jamais à une action. Un refus ou une erreur présentés à l'éditrice DOIVENT l'être en `danger`, avec
leur texte.

#### Scenario: Un brouillon se lit pareil dans la liste et dans l'éditeur
- **WHEN** une page porte une correction non publiée
- **THEN** sa ligne dans « Mes pages » et le titre de son éditeur portent la même marque de brouillon, en `gorge`, avec un libellé écrit

#### Scenario: Une marque de brouillon apparue sans recharger garde la même présentation
- **WHEN** l'éditrice enregistre une correction et que la marque de brouillon apparaît sans recharger l'écran
- **THEN** cette marque est identique à celle qu'affiche l'écran rechargé

#### Scenario: Aucune action n'emprunte la couleur du brouillon
- **WHEN** l'éditrice parcourt un écran servi
- **THEN** aucun bouton ni lien n'est présenté en `gorge`

#### Scenario: Un refus se lit comme un refus
- **WHEN** un geste de l'éditrice est refusé (code refusé, image refusée au téléversement, correction non enregistrée)
- **THEN** le message s'affiche en `danger`, près du geste concerné, avec son texte

### Requirement: Lisibilité et navigation au clavier garanties

Chaque texte d'un écran servi SHALL atteindre un contraste d'au moins 4,5:1 sur son fond, et chaque
élément qu'on peut atteindre au clavier DOIT montrer, quand il reçoit le focus, un contour visible
d'au moins 3:1 sur son fond. Les mouvements d'interface DOIVENT s'abstenir quand l'appareil demande
de réduire les animations.

#### Scenario: Le contraste des textes est suffisant
- **WHEN** on mesure le contraste des textes d'un écran servi, marques d'état et messages compris
- **THEN** chaque texte atteint au moins 4,5:1 sur son fond

#### Scenario: Le focus se voit partout
- **WHEN** l'éditrice parcourt un écran servi à la touche Tab
- **THEN** chaque élément atteint montre un contour de focus visible, jamais masqué par un autre élément

#### Scenario: Les animations se retiennent sur demande
- **WHEN** l'appareil demande de réduire les animations
- **THEN** l'ouverture du tiroir, le repli de la barre et l'apparition des sur-couches se font sans mouvement

### Requirement: Chaque écran s'utilise sur une seule colonne

Sur écran étroit, chaque écran servi SHALL se lire et s'utiliser sur une seule colonne, sans
défilement horizontal de la page, jusqu'à 360 px de large ; aucune action n'y est retirée par rapport
à l'écran large.

#### Scenario: Aucun défilement horizontal à 360 px
- **WHEN** chacun des écrans servis est affiché à 360 px de large
- **THEN** la page ne défile pas horizontalement et aucun contenu n'est coupé

#### Scenario: L'éditeur d'une page passe sur une colonne
- **WHEN** l'éditeur d'une page est affiché sur écran étroit
- **THEN** les emplacements se suivent sur une seule colonne, chacun avec son libellé au-dessus de son contenu
- **AND** chaque geste offert sur écran large (corriger, enregistrer, poser, remplacer, composer une galerie ou un carrousel) reste disponible

#### Scenario: La grille des médias s'adapte à la largeur
- **WHEN** l'écran « Médias » est affiché sur écran étroit
- **THEN** la grille se resserre à la largeur disponible, chaque vignette entière et lisible
- **AND** la recherche et le téléversement restent accessibles sans défilement horizontal

#### Scenario: Les sur-couches tiennent dans l'écran
- **WHEN** une sur-couche s'ouvre sur écran étroit (choix d'une image, confirmation de suppression, liste des emplacements concernés)
- **THEN** elle tient dans la largeur de l'écran, son contenu défile verticalement si besoin, et son bouton de fermeture reste visible

### Requirement: Gestes au doigt sur écran étroit

Sur écran étroit, chaque élément qu'on touche SHALL offrir une cible d'au moins 44 × 44 px, et les
champs de saisie DOIVENT s'afficher sans que le navigateur agrandisse la page au moment de la saisie.
Les champs DOIVENT appeler le clavier adapté à ce qu'ils attendent.

#### Scenario: Les cibles tactiles sont assez grandes
- **WHEN** on mesure les éléments actionnables d'un écran servi affiché sur écran étroit
- **THEN** chacun offre une zone de toucher d'au moins 44 × 44 px

#### Scenario: La saisie ne fait pas sauter la page
- **WHEN** l'éditrice touche un champ de saisie sur un téléphone
- **THEN** la page ne s'agrandit pas d'elle-même, le champ reste visible au-dessus du clavier

#### Scenario: Le clavier suit le champ
- **WHEN** l'éditrice touche le champ d'adresse puis le champ de code de l'écran de connexion
- **THEN** le téléphone propose un clavier d'adresse e-mail pour le premier, et pour le second le code reçu en suggestion quand l'appareil sait le proposer

### Requirement: Écran de connexion habillé

L'écran de connexion SHALL se présenter comme une carte centrée portant le logo, un titre, et ses
deux étapes — recevoir un code, puis le saisir — distinguées visuellement ; chaque champ porte un
libellé visible, et chaque message de refus ou d'attente s'affiche près de l'étape qu'il concerne.
Aucun texte ni aucun comportement de la connexion ne change.

#### Scenario: La connexion porte l'identité et ses deux étapes
- **WHEN** l'écran de connexion est affiché
- **THEN** il présente le logo, le titre « Connexion », l'étape d'adresse et l'étape de code, chacune avec son libellé visible et son bouton

#### Scenario: Le plafond atteint se présente comme un message d'attente
- **WHEN** l'écran de connexion est affiché alors que le plafond de demandes est atteint
- **THEN** le message d'attente s'affiche dans la carte, en ton d'avertissement, sans champ ni bouton
