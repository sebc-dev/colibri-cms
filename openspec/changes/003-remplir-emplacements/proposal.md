## Why

Remplir seule ses pages est le geste central du produit (SC-003, et SC-015 après des mois sans usage) ;
or l'administration, après 001 (connexion) et 002 (socle d'îlots), n'a qu'un accueil vide — ni menu, ni
liste des pages, ni écran d'édition, ni enregistrement. Sert Epic A « Entrer et éditer » (docs/vision.md,
feature 003) ; couvre FR-015→026, sous FR-117, avec les deux garde-fous qui ne pardonnent pas :
l'éditrice ne doit rien pouvoir casser de la mise en page (FR-024/025) et aucune correction ne touche le
site public tant qu'elle n'a pas publié (FR-026).

## What Changes

- L'administration présente une **barre latérale rétractable** portant le menu des rubriques (« Mes
  pages », Médias, Réglages, Formulaires, Demandes) ; seule « Mes pages » est active et servie ici, les
  autres situent la navigation. La barre se replie en un rail d'icônes et se redéploie ; l'état est une
  préférence retenue sur l'appareil, sans effet serveur.
- La **liste des pages** affiche toutes les pages déclarées par l'intégrateur dans l'ordre posé ; chaque
  page dit si elle porte un brouillon non publié (FR-015/016). Une instance sans page déclarée montre un
  état vide, sans aucun geste de création (FR-024).
- L'**éditeur d'une page** présente ses emplacements dans l'ordre posé, chacun avec le moyen d'édition de
  sa nature (FR-017) : texte riche (FR-018), lien de vidéo (FR-022), bouton d'action (FR-023).
- **Corriger** un emplacement de bouton (libellé, destination), de lien de vidéo (lien externe reconnu,
  ou refus motivé), ou de texte riche (gras, italique, lien, liste, titre — sans jamais écrire de balise,
  sérialisé en Markdown restreint). Chaque correction va au brouillon et bascule la page à « brouillon »,
  sans effet sur le site public (FR-026).
- Aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement ou une page ; rien ne l'offre
  à l'écran (FR-024/025). Aucun terme de développeur ne paraît dans le parcours (FR-117).

Hors-périmètre : les rubriques autres que « Mes pages » ; les emplacements porteurs d'image (FR-019/020/021,
renvoyés à « Bibliothèque de médias ») ; l'aperçu et la publication (FR-080→091) ; l'abandon d'un brouillon
(FR-092→094) ; la déconnexion explicite ; la saisie de la déclaration des pages/emplacements (geste
d'intégration hors produit).

## Capabilities

### New Capabilities
- `pages-et-emplacements` : présenter à l'éditrice ses pages et l'état brouillon de chacune, ouvrir une
  page et ses emplacements, corriger le contenu d'un emplacement (bouton, lien de vidéo, texte riche) vers
  le brouillon, en interdisant toute modification de structure, le tout dans le cadre de navigation de
  l'administration.

### Modified Capabilities
- (aucune — première capacité d'édition ; le socle d'îlots de 002 n'a pas de spec vivante à modifier)

## Impact

- `src/admin/` : nouvel îlot du cadre (barre latérale + menu), écran de liste, éditeur par nature
  d'emplacement, éditeur de texte riche TipTap — sous CSP stricte, sans directive `client:*` (ADR-0006).
- `src/pages/admin/` : routes « Mes pages », éditeur de page, routes d'écriture d'une correction.
- `src/core/` : modèle d'emplacement, application d'une correction au brouillon, dérivation de l'état
  « porte un brouillon », refus d'une correction de structure, reconnaissance d'un lien de vidéo,
  sérialisation du texte riche en Markdown restreint (logique pure, sans base ni HTTP).
- `src/platform/` : persistance D1 du brouillon ; `migrations/` : table des brouillons versionnée.
- Dépendance nouvelle : TipTap (éditeur de texte riche, monté en îlot).
- Tests : `tests/integration/**` (couture HTTP contre la vraie base locale).
