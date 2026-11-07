# Restauration Specification

## Purpose

Permettre à l'éditrice d'abandonner seule le brouillon d'une page, d'un réglage ou d'un formulaire et de
retrouver sa dernière version publiée, sans toucher aux autres brouillons ni offrir aucun état plus
ancien. Couvre FR-092 → FR-094 et SC-009.

## Requirements

### Requirement: Revenir à la version publiée d'un objet

L'éditeur d'une page, chaque carte de l'`Écran : Réglages` (Coordonnées, Réseaux sociaux, Mention
d'information) et l'écran d'un formulaire SHALL offrir un geste **« Revenir à la version publiée »**
quand cet objet porte un brouillon, et NE DOIVENT pas l'offrir sinon (FR-092). Le geste DOIT d'abord
demander une confirmation qui nomme l'objet, dit que ses modifications seront perdues, et offre de les
garder. Garder les modifications NE DOIT rien changer. Confirmer DOIT supprimer le brouillon de l'objet,
et l'objet DOIT alors présenter son **contenu courant** sans brouillon : sa dernière version publiée, ou
son contenu de départ s'il n'a jamais été publié. Pour une page, le brouillon abandonné couvre tous ses
emplacements corrigés. L'écran DOIT présenter ce contenu et retirer la marque de brouillon de l'objet
sans que l'éditrice ait à recharger la page. Un objet sans brouillon qui reçoit le geste NE DOIT rien
changer, et le geste DOIT aboutir. Les noms affichés dans la confirmation DOIVENT y paraître tels quels,
sans qu'aucun balisage n'y soit interprété ; aucun terme de développeur NE DOIT paraître dans le geste,
la confirmation ni les messages (FR-117).

#### Scenario: Une page écrasée par erreur retrouve sa version publiée
- **WHEN** la page « Tarifs » a été publiée, puis que l'éditrice corrige son texte de présentation et son bouton d'action, actionne « Revenir à la version publiée » et confirme
- **THEN** l'éditeur de « Tarifs » présente le texte et le bouton publiés, la page ne porte plus la marque de brouillon, ni dans l'éditeur ni dans la liste des pages, et l'aperçu de « Tarifs » présente la version publiée

#### Scenario: Un réglage retrouve sa version publiée
- **WHEN** les coordonnées ont été publiées, puis que l'éditrice modifie le téléphone, actionne « Revenir à la version publiée » sur la carte Coordonnées et confirme
- **THEN** la carte Coordonnées présente le téléphone publié, sans marque de brouillon

#### Scenario: Un formulaire retrouve sa version publiée
- **WHEN** le formulaire « Devis gâteau » a été publié, puis que l'éditrice retire une option du champ « Parfum », actionne « Revenir à la version publiée » et confirme
- **THEN** l'écran de « Devis gâteau » présente les options publiées de « Parfum », option retirée comprise, sans marque de brouillon

#### Scenario: Un objet jamais publié reprend son contenu de départ
- **WHEN** la page « Contact » n'a jamais été publiée, que l'éditrice corrige son texte de présentation, puis revient à la version publiée
- **THEN** l'éditeur de « Contact » présente le texte de départ posé par l'intégrateur, sans marque de brouillon

#### Scenario: Le geste n'est offert qu'à un objet en brouillon
- **WHEN** la page « Accueil » porte un brouillon, que la page « Contact », la carte Réseaux sociaux et le formulaire « Devis atelier » n'en portent pas
- **THEN** l'éditeur d'« Accueil » offre « Revenir à la version publiée », et ni l'éditeur de « Contact », ni la carte Réseaux sociaux, ni l'écran de « Devis atelier » ne l'offrent

#### Scenario: Le geste paraît dès le premier enregistrement
- **WHEN** l'éditrice enregistre la première correction d'une page qui ne portait pas de brouillon
- **THEN** l'éditeur offre aussitôt « Revenir à la version publiée », sans changement d'écran

#### Scenario: Garder ses modifications ne change rien
- **WHEN** l'éditrice actionne « Revenir à la version publiée » sur la page « Tarifs », puis choisit de garder ses modifications
- **THEN** la confirmation se ferme, et le brouillon de « Tarifs » est intact et porte toujours sa marque

#### Scenario: La confirmation nomme l'objet tel quel
- **WHEN** l'éditrice actionne « Revenir à la version publiée » sur une page dont le titre contient les caractères `<`, `>`, `&` ou des guillemets
- **THEN** la confirmation présente ce titre comme du texte, sans qu'aucun balisage ne soit interprété, et dit que les modifications de cette page seront perdues

#### Scenario: Revenir sur un objet déjà revenu ne change rien
- **WHEN** l'éditrice confirme « Revenir à la version publiée » sur une page depuis deux onglets, l'un après l'autre
- **THEN** les deux gestes aboutissent, et la page présente sa version publiée sans marque de brouillon

#### Scenario: Aucun terme de développeur dans le geste
- **WHEN** l'éditrice lit le geste, la confirmation et chacun de leurs messages
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: Revenir n'affecte aucun autre brouillon

Revenir à la version publiée d'un objet SHALL supprimer le brouillon de cet objet et de lui seul (FR-093) :
le brouillon de toute autre page, de tout autre réglage et de tout autre formulaire DOIT rester intact et
garder sa marque. Le geste NE DOIT ni déposer quoi que ce soit dans le dépôt du client, ni changer le
contenu publié, ni toucher le site public. L'objet revenu NE DOIT plus paraître au récapitulatif de
publication, et la publication suivante NE DOIT pas le réécrire.

#### Scenario: Revenir sur une page laisse les autres brouillons intacts
- **WHEN** les pages « Accueil » et « Tarifs », la mention d'information et le formulaire « Devis gâteau » portent un brouillon, et que l'éditrice revient à la version publiée de « Tarifs »
- **THEN** « Accueil », la mention d'information et « Devis gâteau » portent toujours leur brouillon, inchangé, et seul « Tarifs » n'en porte plus

#### Scenario: Revenir sur un réglage laisse les deux autres intacts
- **WHEN** les trois réglages portent un brouillon, et que l'éditrice revient à la version publiée des réseaux sociaux
- **THEN** les coordonnées et la mention d'information portent toujours leur brouillon, inchangé

#### Scenario: L'objet revenu quitte le récapitulatif
- **WHEN** les pages « Accueil » et « Tarifs » portent un brouillon, que l'éditrice revient à la version publiée de « Tarifs », puis ouvre l'écran Publier
- **THEN** le récapitulatif présente « Accueil » parmi les pages, et ne présente pas « Tarifs »

#### Scenario: Le site public redevient celui d'avant l'erreur
- **WHEN** l'éditrice écrase par erreur le texte de « Tarifs », revient à la version publiée, corrige « Accueil » puis publie
- **THEN** le dépôt réécrit les fichiers d'« Accueil » et aucun fichier de « Tarifs », et la page publique « Tarifs » est identique à ce qu'elle était avant l'erreur (SC-009)

#### Scenario: Revenir ne dépose rien
- **WHEN** l'éditrice revient à la version publiée d'une page
- **THEN** rien n'est déposé dans le dépôt du client, et le contenu publié de cette page est inchangé

### Requirement: Aucun état antérieur à la dernière version publiée

L'administration SHALL n'offrir aucun accès à un état d'une page, d'un réglage ou d'un formulaire plus
ancien que sa dernière version publiée (FR-094) : ni liste de versions, ni retour en arrière d'une
publication, ni lecture des versions déposées dans le dépôt du client. Revenir à la version publiée NE DOIT
pas se défaire : aucun geste ne rend le brouillon abandonné.

#### Scenario: Seule la dernière version publiée est offerte
- **WHEN** la page « Tarifs » a été publiée deux fois, avec deux textes différents, puis que l'éditrice corrige son texte et revient à la version publiée
- **THEN** l'éditeur présente le texte de la seconde publication, et aucun écran n'offre le texte de la première

#### Scenario: Le brouillon abandonné ne revient pas
- **WHEN** l'éditrice a confirmé « Revenir à la version publiée » sur une page
- **THEN** aucun geste de l'administration ne lui rend le brouillon abandonné

### Requirement: Revenir est refusé pendant une publication

Tant qu'une publication confirmée n'a pas fini de déposer — en train de déposer, ou interrompue et en
attente de reprise —, le geste « Revenir à la version publiée » SHALL être refusé, sur tout objet, avec un
message qui dit qu'une publication est en cours et qu'il pourra revenir à la version publiée une fois
qu'elle sera terminée, sans aucun terme de développeur (FR-117). Le refus NE DOIT rien changer. Dès que la
publication a fini de déposer, le geste DOIT de nouveau aboutir sur un objet qui porte encore un brouillon.

#### Scenario: Une publication en cours bloque le retour
- **WHEN** une publication confirmée dépose ses images, et que l'éditrice confirme « Revenir à la version publiée » sur une page depuis un autre onglet
- **THEN** le geste est refusé avec un message disant qu'une publication est en cours, et le brouillon de la page est intact

#### Scenario: Une publication interrompue bloque le retour jusqu'à sa reprise
- **WHEN** une publication s'est interrompue avant de déposer le contenu, que plus de 5 minutes ont passé, et que l'éditrice confirme « Revenir à la version publiée » sur un formulaire
- **THEN** le geste est refusé avec le même message, et le brouillon du formulaire est intact

#### Scenario: Après la publication, le retour aboutit de nouveau
- **WHEN** une publication a fini de déposer, puis que l'éditrice corrige une page et revient à la version publiée
- **THEN** le geste aboutit, et la page présente la version qui vient d'être publiée

### Requirement: Revenir sans session ou depuis une autre origine n'aboutit pas

Le geste « Revenir à la version publiée » SHALL être refusé sans session ouverte, sans rien supprimer. Un
geste forgé depuis une autre origine NE DOIT pas aboutir : la session `SameSite=Strict` n'est pas attachée
à une requête cross-site (ADR-0011). Un geste qui désigne une page, un réglage ou un formulaire que la
déclaration ne porte pas DOIT être refusé sans erreur du serveur, et sans rien supprimer.

#### Scenario: Sans session, rien n'est supprimé
- **WHEN** le geste « Revenir à la version publiée » d'une page est soumis sans session ouverte
- **THEN** il est refusé, et le brouillon de la page est intact

#### Scenario: Un geste forgé cross-site n'aboutit pas
- **WHEN** le geste « Revenir à la version publiée » d'un réglage est forgé depuis une autre origine
- **THEN** il n'aboutit pas, et le brouillon du réglage est intact

#### Scenario: Un objet inconnu est refusé sans erreur du serveur
- **WHEN** en session, le geste désigne une page, un réglage ou un formulaire que la déclaration ne porte pas
- **THEN** il est refusé sans erreur du serveur, et aucun brouillon n'est supprimé

### Requirement: Revenir ne redonne aucun identifiant d'option

Après qu'un formulaire est revenu à sa version publiée, une option ajoutée à un de ses champs à choix SHALL
recevoir un identifiant distinct de tout identifiant déjà donné à une option de ce champ, y compris ceux
que seul le brouillon abandonné portait (ADR-0018, ADR-0026).

#### Scenario: Un identifiant donné au brouillon abandonné n'est pas redonné
- **WHEN** l'éditrice ajoute deux options au champ « Parfum » de « Devis gâteau », qui reçoivent deux identifiants, revient à la version publiée, puis ajoute une option à « Parfum »
- **THEN** la nouvelle option reçoit un identifiant distinct des deux identifiants donnés au brouillon abandonné

### Requirement: Les images après un retour à la version publiée

Après un retour à la version publiée, les images SHALL suivre le contenu courant de l'objet, comme partout
ailleurs : une image que seul le brouillon abandonné posait n'est plus posée par cet objet, et une image
que la version publiée pose l'est de nouveau. Le geste NE DOIT effacer aucune image de la bibliothèque.

#### Scenario: Une image posée seulement par le brouillon abandonné devient à effacer
- **WHEN** l'éditrice téléverse une image, la pose dans l'emplacement d'image de « Tarifs », revient à la version publiée de « Tarifs », puis ouvre l'écran Publier
- **THEN** l'image est toujours dans la bibliothèque, et le récapitulatif la présente parmi les images qui seront définitivement effacées

#### Scenario: Une image retirée au seul brouillon redevient posée
- **WHEN** l'éditrice supprime depuis l'écran Médias une image que seule la version publiée de « Tarifs » pose, puis revient à la version publiée de « Tarifs »
- **THEN** l'image est de nouveau posée par « Tarifs », et le récapitulatif ne la présente plus parmi les images qui seront effacées
