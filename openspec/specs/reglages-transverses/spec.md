# Réglages transverses Specification

## Purpose

Permettre à l'éditrice de corriger seule les réglages communs à tout le site — les coordonnées de
contact posées par l'intégrateur, la liste de ses liens vers les réseaux sociaux et la mention
d'information présentée avec les formulaires — chacun vers son propre brouillon, sans aucun effet sur le
site public avant la publication. Couvre FR-041→044, sous FR-117.

## Requirements

### Requirement: Déclaration des coordonnées par l'intégrateur

Les coordonnées de contact du site SHALL être déclarées par l'intégrateur, hors administration, dans un
répertoire de contenu des réglages, à côté de celui des pages. Chaque coordonnée déclarée porte un
**identifiant stable**, une **nature** parmi « texte d'une ligne », « téléphone », « adresse e-mail » et
« adresse postale », un **nom** facultatif écrit pour l'éditrice, et sa **valeur de départ**. Le noyau
`core/` DOIT lire cette déclaration, sans jamais l'écrire ; l'ordre des coordonnées est celui de la
déclaration. Une entrée mal formée — sans identifiant, d'une nature inconnue, ou dont l'identifiant
répète un identifiant déjà lu — DOIT être écartée sans empêcher la lecture des autres. Un nom absent ou
vide une fois ses espaces de début et de fin retirés DOIT être traité comme absent, et un nom NE DOIT
jamais être fabriqué à partir de l'identifiant (FR-117). Le répertoire des réglages porte aussi la liste
de départ des liens vers les réseaux sociaux et le texte de départ de la mention d'information.

#### Scenario: Les coordonnées déclarées sont lues dans l'ordre posé
- **WHEN** en `core/`, la déclaration des réglages porte trois coordonnées valides
- **THEN** les trois sont lues dans l'ordre de la déclaration, chacune avec son identifiant, sa nature, son nom et sa valeur de départ

#### Scenario: Une entrée mal formée est écartée sans bloquer les autres
- **WHEN** en `core/`, la déclaration porte une coordonnée d'une nature inconnue, une coordonnée sans identifiant, et une coordonnée dont l'identifiant répète celui d'une précédente, à côté d'une coordonnée valide
- **THEN** seule la coordonnée valide est lue, et la lecture n'échoue pas

#### Scenario: Une coordonnée sans nom ne reçoit pas de nom fabriqué
- **WHEN** en `core/`, une coordonnée est déclarée sans nom, ou avec un nom fait seulement d'espaces
- **THEN** elle est lue sans nom, et rien ne lui en fabrique un à partir de son identifiant

#### Scenario: Les valeurs de départ des trois réglages sont lues
- **WHEN** en `core/`, le répertoire des réglages porte des coordonnées, une liste de liens et une mention de départ
- **THEN** la lecture rend, pour chacun des trois réglages, son contenu de départ

### Requirement: Écran des réglages

La rubrique « Réglages » SHALL mener à un `Écran : Réglages`, servi derrière la garde de session dans le
cadre de l'administration, la rubrique « Réglages » y étant marquée active. L'écran DOIT présenter trois
cartes, dans cet ordre : **Coordonnées**, **Réseaux sociaux**, **Mention d'information** ; chaque carte
montre le contenu courant de son réglage — son brouillon s'il en porte un, son contenu de départ sinon —,
porte son propre bouton « Enregistrer » et sa propre marque de brouillon. Sans session, l'écran DOIT
renvoyer à l'écran de connexion. Aucun terme de développeur ne DOIT paraître sur l'écran (FR-117).

#### Scenario: Ouvrir les réglages depuis le menu
- **WHEN** l'éditrice, en session, choisit « Réglages » dans le menu du cadre
- **THEN** l'`Écran : Réglages` s'ouvre dans le cadre, « Réglages » marquée active, et présente les cartes Coordonnées, Réseaux sociaux et Mention d'information dans cet ordre

#### Scenario: Sans session, l'écran renvoie à la connexion
- **WHEN** l'`Écran : Réglages` est demandé sans session ouverte
- **THEN** la réponse renvoie à l'écran de connexion, sans rien montrer des réglages

#### Scenario: Chaque carte montre le contenu courant de son réglage
- **WHEN** l'`Écran : Réglages` est affiché alors que seul le réglage Réseaux sociaux porte un brouillon
- **THEN** la carte Réseaux sociaux montre la liste du brouillon, et les cartes Coordonnées et Mention d'information montrent leur contenu de départ

#### Scenario: Un texte saisi est affiché tel quel, jamais interprété
- **WHEN** l'`Écran : Réglages` est affiché alors qu'une valeur de coordonnée, un nom de lien ou un nom de coordonnée déclaré contient les caractères `<`, `>`, `&` ou des guillemets
- **THEN** ces caractères paraissent comme du texte, et aucun balisage n'est interprété

#### Scenario: Aucun terme de développeur sur l'écran des réglages
- **WHEN** l'éditrice lit l'écran des réglages, ses cartes, ses champs et leurs messages
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: Brouillon propre à chaque réglage

Chacun des trois réglages — Coordonnées, Réseaux sociaux, Mention d'information — SHALL porter son
**propre brouillon**. Enregistrer un réglage DOIT écrire son brouillon et lui seul, sans jamais écrire le
répertoire de contenu des réglages ni toucher le site public (FR-044). L'état « porte un brouillon » d'un
réglage DOIT être dérivé de la présence de son brouillon : vrai dès qu'un enregistrement a abouti, faux
sinon. Les brouillons DOIVENT être portés par une table D1 créée par une migration versionnée additive.
Une écriture refusée NE DOIT rien enregistrer. Une écriture sans session ouverte DOIT être refusée, et une
écriture forgée depuis une autre origine NE DOIT pas aboutir : la session `SameSite=Strict` n'est pas
attachée à une requête cross-site (ADR-0011), sans jeton anti-forgerie dédié.

#### Scenario: Enregistrer un réglage n'en marque que lui
- **WHEN** par la couture HTTP, l'éditrice enregistre une correction de la mention d'information
- **THEN** la mention porte un brouillon, les réglages Coordonnées et Réseaux sociaux n'en portent pas, et le répertoire de contenu des réglages est inchangé

#### Scenario: La marque de brouillon paraît sans quitter l'écran
- **WHEN** à l'`Écran : Réglages`, l'éditrice enregistre une carte avec succès
- **THEN** la carte porte aussitôt la marque de brouillon, sans changement d'écran, et les autres cartes gardent leur état

#### Scenario: Un réglage jamais enregistré ne porte pas de brouillon
- **WHEN** l'`Écran : Réglages` est affiché sur une instance où aucun réglage n'a été enregistré
- **THEN** aucune des trois cartes ne porte la marque de brouillon

#### Scenario: Table D1 des brouillons de réglages versionnée
- **WHEN** la table D1 des brouillons de réglages est mise en place
- **THEN** elle est créée par une migration versionnée additive, sans toucher aucune table existante

#### Scenario: Une écriture sans session est refusée
- **WHEN** par la couture HTTP, une correction d'un réglage est soumise sans session ouverte
- **THEN** elle est refusée et aucun brouillon n'est écrit

#### Scenario: Une soumission illisible ou démesurée n'écrit rien
- **WHEN** par la couture HTTP, en session, une correction d'un réglage est soumise avec un corps qui n'est pas du JSON, dont la forme n'est pas celle attendue, ou de plus de 64 Kio
- **THEN** elle est refusée sans erreur du serveur, et aucun brouillon n'est écrit

#### Scenario: Une écriture forgée cross-site n'aboutit pas
- **WHEN** une écriture d'un réglage est forgée depuis une autre origine
- **THEN** elle n'aboutit pas, la session `SameSite=Strict` n'étant pas attachée à une requête cross-site (ADR-0011)

### Requirement: Correction des coordonnées

La carte Coordonnées SHALL présenter un champ par coordonnée déclarée, dans l'ordre de la déclaration,
chacun présenté par son nom quand il en a un et par le libellé de sa nature sinon (« Téléphone »),
jamais par son identifiant. L'éditrice DOIT pouvoir corriger la valeur de chaque champ ou la vider ; elle
NE DOIT pouvoir ajouter, retirer, renommer ni déplacer aucune coordonnée. Enregistrer la carte soumet
toutes ses valeurs en un geste. La valeur de chaque champ, espaces de début et de fin retirés, DOIT être
vérifiée en `core/` selon la nature **déclarée** — jamais selon une nature annoncée par la soumission :
- **texte d'une ligne** : au plus 120 caractères, sans saut de ligne ;
- **téléphone** : uniquement des chiffres, espaces, points, tirets et parenthèses, avec au plus un « + »
  en tête, et de 6 à 15 chiffres ;
- **adresse e-mail** : sans espace, un seul « @ », une partie non vide avant lui, un nom de domaine
  portant au moins un point après lui, au plus 254 caractères ;
- **adresse postale** : au plus 5 lignes et 300 caractères.
Une valeur vide est admise pour toute nature. Si une seule valeur est refusée, ou si la soumission vise
une coordonnée non déclarée, rien n'est enregistré ; chaque champ refusé le dit en indiquant ce qui est
attendu, sans terme de développeur (FR-117). Au brouillon, une valeur est rattachée à sa coordonnée par
son identifiant stable ; une valeur dont la coordonnée n'est plus déclarée est ignorée, et une coordonnée
déclarée sans valeur au brouillon garde sa valeur de départ.

#### Scenario: Les champs suivent la déclaration, présentés par leur nom
- **WHEN** la carte Coordonnées est affichée pour une déclaration portant « Téléphone de l'atelier » (téléphone) puis une adresse e-mail sans nom
- **THEN** deux champs paraissent dans cet ordre, intitulés « Téléphone de l'atelier » et « Adresse e-mail », et aucun identifiant n'apparaît à l'écran

#### Scenario: Aucun geste de structure sur les coordonnées
- **WHEN** l'éditrice parcourt la carte Coordonnées
- **THEN** aucun geste d'ajout, de retrait, de renommage ni de déplacement d'une coordonnée n'est offert

#### Scenario: Des valeurs valides sont enregistrées au brouillon
- **WHEN** par la couture HTTP, l'éditrice enregistre un téléphone « +33 1 23 45 67 89 », une adresse e-mail « atelier@exemple.fr » et une adresse postale de trois lignes
- **THEN** le brouillon des coordonnées porte ces trois valeurs, espaces de début et de fin retirés, et le réglage Coordonnées porte un brouillon

#### Scenario: Vider un champ est admis
- **WHEN** par la couture HTTP, l'éditrice enregistre une valeur vide pour une coordonnée
- **THEN** le brouillon porte cette valeur vide pour cette coordonnée

#### Scenario: Vérification d'un téléphone en `core/`
- **WHEN** en `core/`, on vérifie des valeurs de téléphone
- **THEN** « 01 23 45 67 89 », « +33 (0)1.23.45.67.89 » et « 123456 » sont acceptés ; « 12345 » (5 chiffres), seize chiffres, « 01 23 AB » et « 01 + 23 45 67 » sont refusés

#### Scenario: Vérification d'une adresse e-mail en `core/`
- **WHEN** en `core/`, on vérifie des adresses e-mail
- **THEN** « atelier@exemple.fr » est acceptée ; « atelier@exemple », « @exemple.fr », « atelier exemple@exemple.fr », « a@b@exemple.fr » et une adresse de 255 caractères sont refusées

#### Scenario: Vérification d'un texte d'une ligne et d'une adresse postale en `core/`
- **WHEN** en `core/`, on vérifie un texte d'une ligne et une adresse postale
- **THEN** un texte de 120 caractères est accepté, un texte de 121 caractères ou portant un saut de ligne est refusé ; une adresse de 5 lignes est acceptée, une adresse de 6 lignes ou de plus de 300 caractères est refusée

#### Scenario: Une seule valeur refusée n'enregistre rien
- **WHEN** par la couture HTTP, l'éditrice enregistre un téléphone valide et une adresse e-mail mal formée
- **THEN** aucun brouillon n'est écrit, et la réponse désigne le champ de l'adresse e-mail comme refusé

#### Scenario: La nature déclarée fait foi
- **WHEN** par la couture HTTP, la soumission annonce « texte d'une ligne » pour une coordonnée déclarée téléphone et lui donne la valeur « bonjour »
- **THEN** la valeur est vérifiée comme un téléphone, refusée, et rien n'est enregistré

#### Scenario: Une coordonnée non déclarée est refusée
- **WHEN** par la couture HTTP, la soumission porte une valeur pour un identifiant qu'aucune coordonnée déclarée ne porte
- **THEN** la soumission est refusée et rien n'est enregistré

#### Scenario: Un champ refusé dit ce qui est attendu
- **WHEN** à l'`Écran : Réglages`, l'éditrice enregistre un téléphone mal formé
- **THEN** le champ du téléphone est marqué en erreur avec un message qui dit ce qui est attendu, sans terme de développeur, et la carte ne porte pas de nouvelle marque de brouillon

#### Scenario: Une valeur au brouillon suit l'identifiant, pas la déclaration courante
- **WHEN** en `core/`, le brouillon porte une valeur pour une coordonnée qui n'est plus déclarée, et une coordonnée déclarée n'a pas de valeur au brouillon
- **THEN** la valeur orpheline est ignorée, et la coordonnée sans valeur au brouillon garde sa valeur de départ

### Requirement: Composition de la liste des réseaux sociaux

La carte Réseaux sociaux SHALL présenter la liste des liens de l'éditrice dans son ordre, chaque lien
portant un **nom affiché** et une **adresse web**. L'éditrice DOIT pouvoir ajouter un lien, corriger le nom
ou l'adresse d'un lien, retirer un lien et déplacer un lien d'un rang vers le haut ou vers le bas ;
enregistrer la carte soumet la liste entière en un geste, et son ordre est celui de la soumission. La
liste DOIT être vérifiée en `core/` :
- au plus **12** liens ; une liste vide est admise ;
- le nom, espaces de début et de fin retirés, est non vide, sans saut de ligne, et d'au plus 40 caractères ;
- l'adresse est une adresse web sécurisée (`https`) portant un nom d'hôte, d'au plus 2048 caractères ;
  tout autre schéma (`http`, `mailto`, `javascript`…) est refusé.
Si un seul lien est refusé, rien n'est enregistré ; chaque champ refusé le dit en indiquant ce qui est
attendu, et le geste d'ajout n'est plus offert quand la liste compte 12 liens. Aucun terme de
développeur ne DOIT paraître (FR-117).

#### Scenario: Ajouter, corriger, retirer et déplacer des liens
- **WHEN** à l'`Écran : Réglages`, l'éditrice ajoute un lien, corrige le nom d'un autre, en retire un troisième et monte le dernier d'un rang, puis enregistre
- **THEN** la carte montre la liste résultante dans le nouvel ordre et porte la marque de brouillon

#### Scenario: Une liste valide est enregistrée dans l'ordre soumis
- **WHEN** par la couture HTTP, l'éditrice enregistre trois liens « Instagram », « Facebook », « Mon blog » dans cet ordre, aux adresses `https`
- **THEN** le brouillon des réseaux sociaux porte ces trois liens dans cet ordre

#### Scenario: Une liste vide est admise
- **WHEN** par la couture HTTP, l'éditrice enregistre une liste sans aucun lien
- **THEN** le brouillon des réseaux sociaux porte une liste vide

#### Scenario: Vérification de la liste en `core/`
- **WHEN** en `core/`, on vérifie des listes de liens
- **THEN** une liste de 12 liens valides est acceptée ; une liste de 13 liens, un lien au nom vide, un nom de 41 caractères, une adresse `http://exemple.fr`, une adresse `javascript:alert(1)`, une adresse `mailto:a@exemple.fr` et une chaîne qui n'est pas une adresse web sont refusés

#### Scenario: Un seul lien refusé n'enregistre rien
- **WHEN** par la couture HTTP, l'éditrice enregistre deux liens valides et un lien dont l'adresse est en `http`
- **THEN** aucun brouillon n'est écrit, et la réponse désigne l'adresse de ce lien comme refusée

#### Scenario: Le geste d'ajout disparaît à 12 liens
- **WHEN** la carte Réseaux sociaux compte 12 liens
- **THEN** aucun geste d'ajout n'est offert, et un message dit que la liste est complète

### Requirement: Correction de la mention d'information

La carte Mention d'information SHALL permettre à l'éditrice de corriger le texte de la mention
présentée aux visiteurs avec les formulaires, avec le même éditeur de texte riche que les emplacements
des pages : gras, italique, lien, liste et titre se posent sans écrire de balise. Le contenu DOIT être
sérialisé en Markdown restreint avec les **mêmes règles** que le texte riche des pages — seules les
marques retenues survivent, seuls les schémas d'URL `https`, `mailto`, `tel` et les chemins relatifs sont
admis dans un lien. Une mention vide, une fois ses espaces retirés, DOIT être refusée, puisque chaque
formulaire la présente au visiteur (FR-056). Aucun terme de développeur ne DOIT paraître (FR-117).

#### Scenario: Enregistrer la mention persiste le Markdown restreint
- **WHEN** par la couture HTTP, l'éditrice enregistre une mention portant du gras et un lien `https`
- **THEN** le brouillon de la mention porte ce texte en Markdown restreint, et la mention porte un brouillon

#### Scenario: Un lien au schéma non admis est rejeté dans la mention
- **WHEN** en `core/`, une mention porte un lien `javascript:` ou `http:`
- **THEN** le lien est rejeté selon les mêmes règles que le texte riche des pages

#### Scenario: Une mention vide est refusée
- **WHEN** par la couture HTTP, l'éditrice enregistre une mention vide ou faite seulement d'espaces
- **THEN** rien n'est enregistré, et le champ dit que la mention ne peut pas rester vide

#### Scenario: La barre de mise en forme de la mention pose les marques sans balise
- **WHEN** à l'`Écran : Réglages`, l'éditrice actionne la barre de mise en forme de la mention
- **THEN** gras, italique, lien, liste et titre se posent sans qu'elle écrive de balise
