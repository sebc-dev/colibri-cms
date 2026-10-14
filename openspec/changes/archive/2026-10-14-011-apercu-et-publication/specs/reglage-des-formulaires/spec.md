## MODIFIED Requirements

### Requirement: Écran d'un formulaire

Chaque formulaire déclaré SHALL avoir son `Écran : Formulaire`, servi derrière la garde de session dans
le cadre, la rubrique « Formulaires » marquée active, titré par le nom du formulaire. L'écran DOIT
présenter les **champs à choix** du formulaire dans l'ordre de la déclaration, chacun sous son libellé,
avec ses options courantes — celles du brouillon du formulaire s'il en porte un pour ce champ, sa
**dernière liste publiée** sinon, qui est celle de la déclaration tant que le formulaire n'a jamais été
publié — et, dans un champ avec prix, le prix de chaque option en euros. L'écran DOIT porter la marque de
brouillon quand le formulaire en porte un, et un seul bouton « Enregistrer » pour tout le formulaire. Les
champs sans option NE DOIVENT offrir aucun geste. L'écran NE DOIT offrir aucun moyen d'ajouter, de
retirer, de renommer ni de réordonner un champ (FR-050, UX-3). Un formulaire non déclaré DOIT donner une
réponse « introuvable » ; sans session, l'écran DOIT renvoyer à l'écran de connexion. Aucun terme de
développeur ni aucun identifiant ne DOIT paraître (FR-117).

#### Scenario: L'écran présente les champs à choix et leurs options
- **WHEN** l'éditrice ouvre « Devis gâteau », qui déclare les champs « Parfum » (avec prix : Vanille 8 €, Chocolat 9 €, Fraise 10 €), « Occasion » (sans prix) et « Votre adresse e-mail »
- **THEN** l'écran présente « Parfum » avec ses trois options et leurs prix, puis « Occasion » avec ses options sans prix, et n'offre aucun geste sur « Votre adresse e-mail »

#### Scenario: L'écran montre le contenu du brouillon
- **WHEN** l'écran de « Devis gâteau » est affiché alors que son brouillon passe « Vanille » à 10 €
- **THEN** l'option « Vanille » y paraît à 10 €, et l'écran porte la marque de brouillon

#### Scenario: Hors brouillon, l'écran montre la dernière liste publiée
- **WHEN** l'écran de « Devis gâteau » est affiché après la publication d'un brouillon qui ajoutait « Pistache » à 12 €, le formulaire ne portant plus de brouillon
- **THEN** « Parfum » y présente « Pistache » à 12 €, sans marque de brouillon

#### Scenario: Aucun geste de structure sur les champs
- **WHEN** l'éditrice parcourt l'écran d'un formulaire
- **THEN** aucun moyen ne lui est offert d'ajouter, de retirer, de renommer ou de réordonner un champ

#### Scenario: Un formulaire non déclaré est introuvable
- **WHEN** en session, l'écran d'un formulaire est demandé pour un identifiant qu'aucun formulaire déclaré ne porte
- **THEN** la réponse dit « introuvable », sans rien montrer d'autre

#### Scenario: Sans session, l'écran d'un formulaire renvoie à la connexion
- **WHEN** l'écran d'un formulaire déclaré est demandé sans session ouverte
- **THEN** la réponse renvoie à l'écran de connexion, sans rien montrer du formulaire

#### Scenario: Un texte saisi ou déclaré est affiché tel quel, jamais interprété
- **WHEN** l'écran d'un formulaire ou la liste des formulaires est affiché alors qu'un nom de formulaire, un libellé de champ ou un libellé d'option contient les caractères `<`, `>`, `&` ou des guillemets
- **THEN** ces caractères paraissent comme du texte, et aucun balisage n'est interprété

#### Scenario: Aucun terme de développeur sur les écrans des formulaires
- **WHEN** l'éditrice lit la liste des formulaires, l'écran d'un formulaire, ses champs et leurs messages
- **THEN** aucun terme de développeur ni aucun identifiant n'y paraît (FR-117)

### Requirement: Brouillon propre à chaque formulaire

Chaque formulaire SHALL porter son **propre brouillon**. Enregistrer un formulaire DOIT écrire son
brouillon et lui seul, sans jamais écrire le répertoire de contenu des formulaires ni toucher le site
public (FR-051), et sans marquer d'autre formulaire ni aucun réglage. L'état « porte un brouillon » d'un
formulaire DOIT être dérivé de la présence de son brouillon : vrai dès qu'un enregistrement a abouti,
faux sinon ; un brouillon dont le contenu n'a pas la forme attendue est tenu pour absent. Les brouillons
DOIVENT être portés par une table D1 créée par une migration versionnée additive. Quand la déclaration
change sous un brouillon, le brouillon se rattache par les identifiants stables : le brouillon d'un
formulaire ou d'un champ que la déclaration ne porte plus est ignoré ; un champ qui n'est plus à choix ne
montre aucune option ; un champ à choix dont le brouillon ne s'accorde plus à la marque avec prix / sans
prix déclarée montre sa dernière liste publiée si elle s'y accorde, les options de la déclaration sinon ;
un champ à choix nouvellement déclaré montre ses options de départ — jamais une erreur. La nature d'un
champ ne compte que pour savoir s'il est à choix : le brouillon ne la retient pas, et un champ passé de
choix unique à choix multiple, ou l'inverse, garde la liste de son brouillon. Le brouillon d'un champ à
choix porte **toute la liste de ses options** : elle est montrée telle quelle, sans y mêler les options de
départ que la déclaration a ajoutées, retirées ou changées depuis l'enregistrement, et la publication la
dépose telle quelle (capacité `publication`, « Les options d'un champ à choix à la publication »). Une
écriture refusée NE DOIT rien enregistrer. Une écriture sans session ouverte DOIT être refusée, et une
écriture forgée depuis une autre origine NE DOIT pas aboutir : la session `SameSite=Strict` n'est pas
attachée à une requête cross-site (ADR-0011), sans jeton anti-forgerie dédié.

#### Scenario: Enregistrer un formulaire n'en marque que lui
- **WHEN** par la couture HTTP, en session, l'éditrice enregistre une correction de « Devis gâteau »
- **THEN** « Devis gâteau » porte un brouillon, « Devis atelier » et les réglages n'en portent pas de nouveau, et le répertoire de contenu des formulaires est inchangé

#### Scenario: La marque de brouillon paraît sans quitter l'écran
- **WHEN** à l'écran d'un formulaire, l'éditrice enregistre avec succès
- **THEN** l'écran porte aussitôt la marque de brouillon, sans changement d'écran, et la saisie reste affichée

#### Scenario: Un formulaire jamais enregistré ne porte pas de brouillon
- **WHEN** la liste des formulaires est affichée sur une instance où aucun formulaire n'a été enregistré
- **THEN** aucun formulaire ne porte la marque de brouillon

#### Scenario: Le brouillon survit à un changement de la déclaration
- **WHEN** en `core/`, un brouillon porte les options d'un champ que la déclaration ne porte plus, et la déclaration ajoute un champ à choix que le brouillon ne connaît pas
- **THEN** la lecture ignore les options du champ disparu, montre les options de départ du champ nouveau, garde les autres champs du brouillon, et n'échoue pas

#### Scenario: Un brouillon désaccordé retombe sur la liste publiée
- **WHEN** en `core/`, un champ à choix a une liste publiée et un brouillon, puis l'intégrateur change sa marque avec prix / sans prix de sorte que le brouillon ne s'y accorde plus mais que la liste publiée s'y accorde
- **THEN** la lecture montre la liste publiée de ce champ, et n'échoue pas

#### Scenario: Table D1 des brouillons de formulaires versionnée
- **WHEN** la table D1 des brouillons de formulaires est mise en place
- **THEN** elle est créée par une migration versionnée additive, sans toucher aucune table existante

#### Scenario: Une écriture sans session est refusée
- **WHEN** par la couture HTTP, une correction d'un formulaire est soumise sans session ouverte
- **THEN** elle est refusée et aucun brouillon n'est écrit

#### Scenario: Une écriture pour un formulaire non déclaré est refusée
- **WHEN** par la couture HTTP, en session, une correction est soumise pour un identifiant qu'aucun formulaire déclaré ne porte
- **THEN** la réponse dit « introuvable », et aucun brouillon n'est écrit

#### Scenario: Une soumission illisible ou démesurée n'écrit rien
- **WHEN** par la couture HTTP, en session, une correction d'un formulaire est soumise avec un corps qui n'est pas du JSON, dont la forme n'est pas celle attendue, ou de plus de 64 Kio
- **THEN** elle est refusée sans erreur du serveur, et aucun brouillon n'est écrit

#### Scenario: Une écriture forgée cross-site n'aboutit pas
- **WHEN** une écriture d'un formulaire est forgée depuis une autre origine
- **THEN** elle n'aboutit pas, la session `SameSite=Strict` n'étant pas attachée à une requête cross-site (ADR-0011)
