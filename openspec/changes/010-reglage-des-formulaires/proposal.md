## Why

Le site convertit ses visiteurs par un formulaire de devis dont l'intégrateur pose la structure et dont
l'éditrice règle seule les options, les prix et les libellés (`docs/vision.md`, § Vue d'ensemble). Or
aucun formulaire n'existe encore : la rubrique « Formulaires » du menu est posée sans mener à aucun
écran, et rien ne dit où vivent les champs, les options et leurs prix. La story suivante (« Composer et
envoyer une demande de devis ») et « Aperçu et publication » supposent que les formulaires existent,
sont lisibles et portent un brouillon.

Sert **Epic A — Entrer et éditer** (`docs/roadmap.md`), story **Réglage des formulaires de devis** ;
couvre **FR-045** (liste des formulaires posés sur le site), **FR-046** (libellé d'une option),
**FR-047** (prix d'une option), **FR-048** (ajouter une option à un champ existant), **FR-049** (retirer
une option), **FR-050** (aucun moyen d'ajouter, retirer ou réordonner un champ) et **FR-051** (toute
modification d'un formulaire va dans son brouillon, sans effet sur le site public), sous **FR-117** et
**UX-3**. Prépare **SC-007** : « l'éditrice change seule le prix d'une option et ajoute un parfum » — le
critère se juge en entier quand la publication et l'envoi d'une demande seront là.

## What Changes

- **L'intégrateur déclare les formulaires, hors administration.** Chaque formulaire a un identifiant
  stable, un nom écrit pour l'éditrice (« Devis gâteau ») et une liste ordonnée de champs. Un champ a un
  identifiant stable, un libellé, une nature et une marque « obligatoire ». Les **champs à choix**
  (choix unique ou choix multiple) portent des options. L'intégrateur indique, champ par champ, si les
  options ont un **prix** : dans un champ « avec prix », chaque option porte un prix (0 € admis) ; dans
  un champ « sans prix » (« Occasion : anniversaire, mariage »), les options n'en ont aucun. Les autres
  champs (nom, adresse e-mail, téléphone, message de la visiteuse) sont déclarés mais l'éditrice ne les
  touche pas.
- **La rubrique « Formulaires » mène à la liste des formulaires.** Chaque formulaire y paraît sous son
  nom, dans l'ordre alphabétique de leurs identifiants, avec sa marque de brouillon s'il en porte un. Sans formulaire déclaré, la
  liste le dit, sans aucun geste de création.
- **Un écran par formulaire.** Il présente les champs à choix dans l'ordre posé, chacun avec ses
  options. Pour chaque option, l'éditrice corrige le **libellé** et, dans un champ avec prix, le
  **prix** en euros au centime près (« 12 » ou « 12,50 »). Elle **ajoute** une option (en fin de liste),
  en **retire** une, et **change leur ordre** (monter, descendre). Un champ garde **au moins une
  option** et au plus 30. Elle n'ajoute, ne retire, ne renomme ni ne déplace aucun **champ** (FR-050).
- **Un brouillon par formulaire.** Un seul bouton « Enregistrer » soumet tout le formulaire et écrit son
  brouillon, sans toucher la déclaration ni le site public ; l'écran et la liste indiquent alors que ce
  formulaire porte un brouillon non publié. Les formulaires ont des brouillons indépendants entre eux et
  des réglages.

Hors-périmètre :
- La pose d'un formulaire sur une page, son affichage au visiteur, le calcul du total et l'envoi d'une
  demande (story « Composer et envoyer une demande de devis ») ; l'aperçu, le récapitulatif et la
  publication (story « Aperçu et publication ») ; l'abandon d'un brouillon de formulaire (story
  « Restauration »).
- Toute logique de formulaire avancée : champ conditionnel, multi-étapes, prix combinatoire (paliers,
  remises), quantité multipliant un prix — le total restera la somme simple des options choisies
  (FR-053).
- La correction des champs sans options (leur libellé, leur caractère obligatoire) : c'est de la
  structure, elle passe par l'intégrateur.
- Tout outil de saisie de la déclaration pour l'intégrateur (elle s'écrit à la main, comme celle des
  pages et des réglages).

## Capabilities

### New Capabilities
- `reglage-des-formulaires` : la déclaration des formulaires par l'intégrateur et sa lecture, la liste
  des formulaires, l'écran d'un formulaire et ses champs à choix, la correction des options (libellé,
  prix, ajout, retrait, ordre) et ses vérifications, et le brouillon propre à chaque formulaire.

### Modified Capabilities
- `pages-et-emplacements` : le cadre de navigation sert désormais la rubrique « Formulaires » (quatre
  rubriques servies au lieu de trois) ; seule « Demandes » reste sans écran.

## Impact

- **Contenu** : un répertoire de formulaires à côté de `content/pages/` et `content/reglages/`, un
  sous-répertoire par formulaire, garni d'un formulaire de démonstration (« Devis gâteau ») qui porte
  un champ avec prix, un champ sans prix et des champs de coordonnées.
- **Code** : un module `core/` des formulaires (lecture de la déclaration, lecture d'un prix saisi,
  correction des options, rapprochement d'un brouillon avec la déclaration) ; un magasin D1 des
  brouillons de formulaires et sa migration additive ; deux écrans d'administration et un îlot ; une
  route d'écriture par formulaire sous `/admin/formulaires/…`, gardée par la session ; le menu des
  rubriques.
- **Données** : une nouvelle table D1 de brouillons de formulaires (migration additive) ; aucune donnée
  existante touchée.
- **Décisions** : une décision structurante nouvelle — le lieu et le format de la déclaration des
  formulaires, que la story suivante lira aussi — appelle un ADR (voir design.md) ; ADR-0011, ADR-0012 et
  ADR-0017 tenus.
- **Site public, politique de sécurité, dépendances** : inchangés.
