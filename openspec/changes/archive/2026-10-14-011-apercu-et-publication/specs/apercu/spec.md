## Purpose

Montrer à l'éditrice, avant toute mise en ligne, une page telle qu'elle sera publiée — avec son brouillon
et ceux des réglages qu'elle affiche —, dessinée par le même rendu que la page publique, et à elle seule.
Couvre FR-080 → FR-082 ; la part « formulaires » de FR-081 suivra le dessin du formulaire public (story
« Composer et envoyer une demande de devis »).

## ADDED Requirements

### Requirement: Aperçu d'une page avec tous ses brouillons

Chaque page déclarée SHALL avoir un aperçu qui la présente telle qu'elle sera publiée : chaque emplacement
avec son contenu courant — son brouillon s'il en porte un, sa dernière version publiée sinon —, et le pied
de page avec les coordonnées et les réseaux sociaux courants — leur brouillon s'ils en portent un, leur
dernière version publiée sinon. Une image posée en brouillon, même jamais publiée, DOIT y paraître avec sa
description courante ; de même une image publiée que le site en service ne porte pas encore — entre une
publication et la fin de la reconstruction qui l'empaquette, ou tant qu'aucune reconstruction n'a abouti
(ADR-0020). L'aperçu montre l'état qui sera en ligne, jamais un état intermédiaire, et ne
touche ni aux brouillons ni au site public.

#### Scenario: L'aperçu montre le brouillon de la page
- **WHEN** la page « Accueil » porte un brouillon de son texte de présentation, et que l'éditrice en demande l'aperçu
- **THEN** l'aperçu présente le texte du brouillon, alors que la page publique « Accueil » présente toujours le texte publié

#### Scenario: L'aperçu réunit les brouillons de la page et des réglages
- **WHEN** la page « Contact » porte un brouillon, et le réglage des coordonnées un nouveau numéro de téléphone en brouillon, et que l'éditrice demande l'aperçu de « Contact »
- **THEN** l'aperçu présente ensemble le contenu du brouillon de la page et le nouveau numéro dans le pied de page

#### Scenario: Une image jamais publiée paraît dans l'aperçu
- **WHEN** l'éditrice a téléversé une image, l'a décrite et l'a posée dans un emplacement de « Tarifs », sans publier, puis demande l'aperçu de « Tarifs »
- **THEN** l'image y paraît à sa place, avec sa description comme texte de remplacement

#### Scenario: Une image publiée que le site ne porte pas encore paraît dans l'aperçu
- **WHEN** l'éditrice a publié « Tarifs » avec une image téléversée et décrite, que le site en service ne porte pas encore cette image, puis demande l'aperçu de « Tarifs »
- **THEN** l'image y paraît à sa place, avec sa description comme texte de remplacement

#### Scenario: Une page sans brouillon s'aperçoit telle qu'elle est publiée
- **WHEN** l'éditrice demande l'aperçu d'une page qui ne porte aucun brouillon, alors qu'aucun réglage n'en porte
- **THEN** l'aperçu présente la dernière version publiée de la page

#### Scenario: Demander l'aperçu ne change rien
- **WHEN** l'éditrice demande l'aperçu d'une page qui porte un brouillon
- **THEN** le brouillon est inchangé, la page porte toujours sa marque de brouillon, et le site public est inchangé

### Requirement: Même rendu que la page publique

L'aperçu SHALL être dessiné par le **même gabarit de page et le même rendu des emplacements** que la page
publique — un seul lieu de rendu, atteint par les deux (I3, ARCH-3). Pour un même contenu, la page de
l'aperçu DOIT présenter les mêmes éléments, dans le même ordre, avec les mêmes textes, les mêmes liens et
les mêmes images que la page publique ; seuls diffèrent le bandeau propre à l'aperçu, l'adresse d'où
sont servis les octets d'une image que le site en service ne porte pas encore — en brouillon, ou publiée
avant que la reconstruction ne l'empaquette —, et l'adresse des liens qui visent une page déclarée du
site, qui mènent à l'aperçu de cette page.

#### Scenario: Pour un même contenu, l'aperçu et la page publique coïncident
- **WHEN** une page ne porte aucun brouillon, qu'aucun réglage n'en porte, et que l'on compare son aperçu à sa page publique
- **THEN** le contenu de la page — titre, navigation, emplacements, pied de page — est le même, élément par élément et dans le même ordre, hors le bandeau de l'aperçu, les liens vers une page du site étant ramenés à leur adresse publique

#### Scenario: Dans l'aperçu, un lien vers une page du site mène à son aperçu
- **WHEN** l'éditrice, dans l'aperçu de « Accueil », actionne l'entrée « Tarifs » du menu, ou le bouton d'action qui mène à « Contact »
- **THEN** l'aperçu de cette page s'ouvre, sous le même bandeau, avec ses brouillons

#### Scenario: Un lien hors des pages du site reste celui de la page publique
- **WHEN** l'aperçu porte un lien vers un réseau social, une vidéo, un numéro de téléphone, une adresse e-mail, ou une adresse du site qui n'est pas une page déclarée
- **THEN** ce lien est identique à celui de la page publique

### Requirement: Aperçu réservé à la session ouverte

L'aperçu SHALL n'être atteignable que depuis une session d'administration ouverte (FR-082) : sans session,
sa demande DOIT renvoyer à l'écran de connexion sans rien montrer de la page. L'aperçu d'une page non
déclarée DOIT donner une réponse « introuvable ». L'aperçu DOIT être servi sous les en-têtes de sécurité de
l'administration (CSP stricte, ADR-0004, ADR-0008) et ne DOIT être conservé par aucun intermédiaire. Aucune
page publique NE DOIT mener à un aperçu.

#### Scenario: Sans session, l'aperçu renvoie à la connexion
- **WHEN** l'aperçu d'une page déclarée est demandé sans session ouverte
- **THEN** la réponse renvoie à l'écran de connexion, et rien du contenu de la page ni de son brouillon n'est montré

#### Scenario: L'aperçu d'une page non déclarée est introuvable
- **WHEN** en session, l'aperçu est demandé pour un identifiant qu'aucune page déclarée ne porte
- **THEN** la réponse dit « introuvable », sans rien montrer d'autre

#### Scenario: L'aperçu est servi sous les en-têtes de l'administration, sans être conservé
- **WHEN** en session, l'aperçu d'une page est servi
- **THEN** la réponse porte la politique de sécurité stricte de l'administration et interdit sa conservation par un intermédiaire

#### Scenario: Aucune page publique ne mène à un aperçu
- **WHEN** un visiteur parcourt les pages publiques
- **THEN** aucun lien ni aucune ressource ne pointe vers l'aperçu

### Requirement: Bandeau de l'aperçu et retour à l'édition

L'aperçu SHALL porter, au-dessus de la page et hors d'elle, un bandeau qui dit que la page n'est pas encore
en ligne et offre de revenir à l'édition de cette page. Aucun terme de développeur NE DOIT y paraître
(FR-117).

#### Scenario: Le bandeau dit que ce n'est pas encore en ligne
- **WHEN** l'éditrice consulte l'aperçu d'une page
- **THEN** un bandeau, hors de la page, dit que ce qu'elle voit n'est pas encore en ligne

#### Scenario: Revenir à l'édition
- **WHEN** l'éditrice actionne le retour à l'édition depuis l'aperçu d'une page
- **THEN** l'éditeur de cette page s'ouvre

#### Scenario: Aucun terme de développeur dans l'aperçu
- **WHEN** l'éditrice lit le bandeau de l'aperçu
- **THEN** aucun terme de développeur n'y paraît (FR-117)
