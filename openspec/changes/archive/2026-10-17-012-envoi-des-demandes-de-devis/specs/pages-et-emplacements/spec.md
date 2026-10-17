## MODIFIED Requirements

### Requirement: Éditeur d'une page et ses emplacements

Ouvrir une page depuis la liste SHALL présenter ses emplacements dans l'ordre posé par l'intégrateur,
chacun présenté selon sa nature (texte riche, lien de vidéo, bouton d'action, **image, galerie,
carrousel, formulaire**) **et par son nom quand l'intégrateur lui en a donné un** (« Texte riche —
Présentation »), et montrant son contenu courant — **son brouillon s'il en porte un, sa dernière version
publiée sinon** —, avec un fil de retour vers « Mes pages » et un geste **« Voir l'aperçu »** qui ouvre
l'aperçu de cette page. Un emplacement sans nom DOIT se présenter par sa nature seule, jamais par son
identifiant ; un emplacement de formulaire se présente comme le dit l'exigence qui lui est propre. Cet
écran porte la présentation par nature ; le moyen d'édition fonctionnel de chaque nature — barre de mise en
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
- **THEN** les emplacements paraissent dans l'ordre posé, chacun présenté selon sa nature (texte riche, lien de vidéo, bouton d'action, image, galerie, carrousel, formulaire) — le moyen d'édition fonctionnel de chaque nature venant avec sa correction

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

## ADDED Requirements

### Requirement: Emplacement de formulaire

L'intégrateur SHALL pouvoir poser un formulaire sur une page par un emplacement de nature **formulaire**,
déclaré dans la page comme les autres — identifiant stable, rang — et qui désigne un formulaire déclaré par
son identifiant. Un même formulaire PEUT être posé sur plusieurs pages. Un emplacement de formulaire qui
ne désigne aucun formulaire DOIT être ignoré à la lecture, comme toute entrée mal formée. Dans l'éditeur
de la page, un emplacement de formulaire DOIT se présenter par sa nature suivie du **nom du formulaire**
qu'il désigne (« Formulaire — Devis gâteau »), avec une phrase qui dit que ses options et ses prix se
règlent dans l'écran Formulaires et un lien vers l'écran de ce formulaire ; il NE DOIT offrir aucun moyen de
le modifier ni de changer le formulaire qu'il désigne. Toute correction qui viserait un emplacement de
formulaire DOIT être refusée comme une correction de structure (FR-025), sans rien écrire.

#### Scenario: L'emplacement de formulaire se présente par le nom du formulaire
- **WHEN** l'éditrice ouvre l'éditeur de « Contact », dont un emplacement désigne le formulaire « Devis gâteau »
- **THEN** cet emplacement se présente comme « Formulaire — Devis gâteau », à son rang parmi les autres, avec la phrase qui renvoie à l'écran Formulaires

#### Scenario: Le lien mène à l'écran du formulaire
- **WHEN** l'éditrice actionne le lien de cet emplacement
- **THEN** l'écran du formulaire « Devis gâteau » s'ouvre

#### Scenario: Aucun moyen de modifier l'emplacement de formulaire
- **WHEN** l'éditrice parcourt l'emplacement de formulaire dans l'éditeur de la page
- **THEN** aucun champ ni aucun geste n'en modifie le contenu ni ne change le formulaire désigné

#### Scenario: Une correction visant un emplacement de formulaire est refusée
- **WHEN** une correction parvient pour un emplacement de formulaire
- **THEN** elle est refusée, et aucun brouillon n'est écrit

#### Scenario: Un emplacement de formulaire sans formulaire désigné est ignoré
- **WHEN** l'intégrateur déclare un emplacement de nature formulaire qui ne désigne aucun formulaire
- **THEN** cet emplacement est ignoré à la lecture, et les autres emplacements de la page paraissent normalement
