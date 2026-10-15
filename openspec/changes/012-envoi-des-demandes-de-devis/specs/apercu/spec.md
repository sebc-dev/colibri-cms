## MODIFIED Requirements

### Requirement: Même rendu que la page publique

L'aperçu SHALL être dessiné par le **même gabarit de page et le même rendu des emplacements** que la page
publique — un seul lieu de rendu, atteint par les deux (I3, ARCH-3). Pour un même contenu, la page de
l'aperçu DOIT présenter les mêmes éléments, dans le même ordre, avec les mêmes textes, les mêmes liens et
les mêmes images que la page publique ; seuls diffèrent le bandeau propre à l'aperçu, l'adresse d'où
sont servis les octets d'une image que le site en service ne porte pas encore — en brouillon, ou publiée
avant que la reconstruction ne l'empaquette —, l'adresse des liens qui visent une page déclarée du
site, qui mènent à l'aperçu de cette page, et, dans un formulaire, l'avis qui dit que l'envoi est désactivé
dans l'aperçu.

#### Scenario: Pour un même contenu, l'aperçu et la page publique coïncident
- **WHEN** une page ne porte aucun brouillon, qu'aucun réglage ni aucun formulaire n'en porte, et que l'on compare son aperçu à sa page publique
- **THEN** le contenu de la page — titre, navigation, emplacements, formulaires, pied de page — est le même, élément par élément et dans le même ordre, hors le bandeau de l'aperçu et l'avis d'envoi désactivé, les liens vers une page du site étant ramenés à leur adresse publique

#### Scenario: Dans l'aperçu, un lien vers une page du site mène à son aperçu
- **WHEN** l'éditrice, dans l'aperçu de « Accueil », actionne l'entrée « Tarifs » du menu, ou le bouton d'action qui mène à « Contact »
- **THEN** l'aperçu de cette page s'ouvre, sous le même bandeau, avec ses brouillons

#### Scenario: Un lien hors des pages du site reste celui de la page publique
- **WHEN** l'aperçu porte un lien vers un réseau social, une vidéo, un numéro de téléphone, une adresse e-mail, ou une adresse du site qui n'est pas une page déclarée
- **THEN** ce lien est identique à celui de la page publique

## ADDED Requirements

### Requirement: Les formulaires dans l'aperçu

L'aperçu d'une page SHALL présenter chaque formulaire qu'elle pose avec son contenu courant (FR-081) :
pour chaque champ à choix, la liste d'options du brouillon du formulaire s'il en porte un, sa dernière
version publiée sinon — libellés et prix compris —, et la mention d'information courante, son brouillon
s'il en porte un. Le total s'y calcule avec ces prix, comme sur la page publique. Depuis l'aperçu, le
bouton d'envoi NE DOIT rien envoyer : un avis, dans le formulaire, dit que l'envoi est désactivé dans
l'aperçu, et aucun e-mail de demande NE DOIT jamais partir d'un aperçu. Demander l'aperçu ne change ni le
brouillon du formulaire, ni le site public.

#### Scenario: L'aperçu montre le brouillon d'un formulaire
- **WHEN** l'éditrice a ajouté « Pistache » à 12 € dans « Parfum » du formulaire « Devis gâteau », sans publier, et demande l'aperçu de « Contact », qui le pose
- **THEN** l'aperçu présente « Pistache — 12 € » parmi les parfums, alors que la page publique « Contact » ne la présente pas

#### Scenario: Le total de l'aperçu suit les prix du brouillon
- **WHEN** dans l'aperçu, l'éditrice choisit « Pistache » (12 €, en brouillon) et « 10 parts » (30 €)
- **THEN** le total affiché est 42 €

#### Scenario: L'aperçu montre la mention en brouillon
- **WHEN** la mention d'information porte un brouillon, et que l'éditrice demande l'aperçu d'une page qui pose un formulaire
- **THEN** le formulaire de l'aperçu présente la mention du brouillon

#### Scenario: L'aperçu n'envoie rien
- **WHEN** l'éditrice remplit le formulaire de l'aperçu et actionne le bouton d'envoi
- **THEN** aucune demande ne part, aucun e-mail n'est envoyé, et l'avis dit que l'envoi est désactivé dans l'aperçu

#### Scenario: Aucun terme de développeur dans l'avis
- **WHEN** l'éditrice lit l'avis d'envoi désactivé
- **THEN** aucun terme de développeur n'y paraît (FR-117)
