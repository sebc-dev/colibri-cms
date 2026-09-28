## ADDED Requirements

### Requirement: Nom d'un emplacement déclaré

La déclaration d'un emplacement SHALL admettre un **nom** facultatif, posé par l'intégrateur et écrit
pour l'éditrice (« Présentation », « Nos réalisations »). Le noyau `core/` DOIT lire ce nom avec la
déclaration, sans jamais l'écrire. Un nom absent, qui n'est pas du texte, ou vide une fois ses espaces de
début et de fin retirés DOIT être traité comme **absent** — l'emplacement reste présenté, jamais écarté
pour cette seule raison. Un emplacement sans nom NE DOIT jamais recevoir un nom fabriqué à partir de son
identifiant (FR-117). Le nom ne DOIT servir ni de clé au brouillon, ni à viser un emplacement : seul
l'identifiant stable le fait (ADR-0012).

#### Scenario: Un nom déclaré est lu avec l'emplacement
- **WHEN** en `core/`, la déclaration d'une page porte un emplacement dont le nom est « Présentation »
- **THEN** l'emplacement lu porte le nom « Présentation », ses espaces de début et de fin retirés

#### Scenario: Un emplacement sans nom reste présenté
- **WHEN** en `core/`, la déclaration d'une page porte un emplacement sans nom
- **THEN** l'emplacement est lu comme tous les autres, sans nom, et rien ne lui en fabrique un à partir de son identifiant

#### Scenario: Un nom mal formé est traité comme absent
- **WHEN** en `core/`, le nom déclaré d'un emplacement n'est pas du texte, ou n'est fait que d'espaces
- **THEN** l'emplacement est lu sans nom, et il n'est pas écarté de la page

#### Scenario: Le nom ne vise pas l'emplacement
- **WHEN** en `core/`, deux déclarations successives d'une même page changent le nom d'un emplacement sans changer son identifiant
- **THEN** le brouillon de cet emplacement lui reste rattaché, par son identifiant

## MODIFIED Requirements

### Requirement: Éditeur d'une page et ses emplacements

Ouvrir une page depuis la liste SHALL présenter ses emplacements dans l'ordre posé par l'intégrateur,
chacun présenté selon sa nature (texte riche, lien de vidéo, bouton d'action, **image, galerie,
carrousel**) **et par son nom quand l'intégrateur lui en a donné un** (« Texte riche — Présentation »), et
montrant son contenu courant, avec un fil de retour vers « Mes pages ». Un emplacement sans nom DOIT se
présenter par sa nature seule, jamais par son identifiant. Cet écran porte la présentation par nature ; le
moyen d'édition fonctionnel de chaque nature — barre de mise en forme du texte riche, champ de lien de
vidéo, champs du bouton d'action, **sélecteur d'image pour les emplacements d'image, de galerie et de
carrousel** — est livré par la correction de cette nature (requirements suivants), non par cet écran seul.
L'éditeur ne DOIT offrir aucun geste d'ajout, de retrait, de déplacement ni de renommage d'un emplacement
— **son nom compris** — (FR-024/025), ni aucun terme de développeur (FR-117).

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
- **THEN** chaque emplacement présente le contenu courant de la page

#### Scenario: Le fil de retour ramène à la liste
- **WHEN** l'éditrice actionne le fil de retour
- **THEN** l'`Écran : Liste des pages` est de nouveau affiché

#### Scenario: Aucun geste de structure dans l'éditeur
- **WHEN** l'éditrice parcourt l'éditeur d'une page
- **THEN** aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement — ni ne change son nom —, et rien ne l'offre à l'écran (FR-024/025)

#### Scenario: Aucun terme de développeur dans l'éditeur
- **WHEN** l'éditrice lit l'éditeur d'une page
- **THEN** aucun terme de développeur n'y paraît
