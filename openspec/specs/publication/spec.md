# Publication Specification

## Purpose

Mettre en ligne, en un seul geste et après un récapitulatif exact, l'ensemble des brouillons du site : le
contenu publié est déposé en fichiers lisibles et les images publiées dans le dépôt du client, ce dépôt
déclenche seul la reconstruction du site, et l'éditrice apprend l'issue. Couvre FR-083 → FR-091, SC-004,
SC-016, et l'exécution de FR-037.

## Requirements

### Requirement: Récapitulatif avant publication

Le geste « Publier » du cadre SHALL mener à l'`Écran : Publier`, servi derrière la garde de session dans
le cadre de l'administration, qui présente, **avant toute mise en ligne**, le récapitulatif de ce qui va
partir (FR-083, FR-084) :
- les **pages** qui portent un brouillon, par leur titre, dans l'ordre posé, chacune menant à son aperçu ;
- les **réglages** qui portent un brouillon, par leur nom (Coordonnées, Réseaux sociaux, Mention
  d'information) ;
- les **formulaires** qui portent un brouillon, par leur nom ;
- les **images dont la description va changer en ligne** : les images déjà publiées dont la description a
  été modifiée depuis leur dernière publication, par leur nom ;
- les **images qui seront définitivement effacées** : les images qu'aucun emplacement ne pose plus dans son
  contenu courant — son brouillon s'il en porte un, sa dernière version publiée sinon —, par leur nom.
Le récapitulatif NE DOIT omettre aucun élément de ces cinq listes ni en porter aucun de trop (SC-016).
Sans rien à publier, l'écran DOIT le dire et n'offrir aucun geste de mise en ligne, hors la relance d'une
mise en ligne qui n'a pas abouti. Sans session, l'écran DOIT renvoyer à l'écran de connexion. Tout nom
DOIT y être affiché tel quel, sans qu'aucun balisage n'y soit interprété ; aucun terme de développeur NE
DOIT y paraître (FR-117).

#### Scenario: Le récapitulatif liste exactement ce qui va partir
- **WHEN** les pages « Contact » et « Tarifs » portent un brouillon, le formulaire « Devis gâteau » aussi, qu'une image n'est plus posée par aucun emplacement, et que l'éditrice ouvre l'écran Publier
- **THEN** le récapitulatif présente « Tarifs » et « Contact » parmi les pages, « Devis gâteau » parmi les formulaires et cette image parmi les images effacées — et rien d'autre : ni « Accueil », ni aucun réglage, ni « Devis atelier »

#### Scenario: Un réglage en brouillon est listé seul
- **WHEN** seul le réglage « Mention d'information » porte un brouillon
- **THEN** le récapitulatif présente « Mention d'information » parmi les réglages, et ne présente aucune page, aucun formulaire ni aucune image

#### Scenario: Une description modifiée est annoncée
- **WHEN** l'éditrice a modifié la description d'une image déjà publiée, sans toucher à aucune page
- **THEN** le récapitulatif présente cette image parmi les images dont la description va changer en ligne

#### Scenario: Une image retirée d'un emplacement publié est annoncée effacée
- **WHEN** une image publiée n'était posée que dans un emplacement dont le brouillon la remplace par une autre
- **THEN** le récapitulatif la présente parmi les images qui seront définitivement effacées

#### Scenario: Une image encore posée par une version publiée n'est pas effacée
- **WHEN** une image n'est posée que par la dernière version publiée d'un emplacement qui ne porte pas de brouillon
- **THEN** le récapitulatif ne la présente pas parmi les images effacées

#### Scenario: Chaque page listée mène à son aperçu
- **WHEN** l'éditrice actionne une page listée dans le récapitulatif
- **THEN** l'aperçu de cette page s'ouvre

#### Scenario: Rien à publier
- **WHEN** aucune page, aucun réglage ni aucun formulaire ne porte de brouillon, qu'aucune description n'a changé, qu'aucune image n'est à effacer, et que la dernière publication n'a pas échoué
- **THEN** l'écran dit qu'il n'y a rien à publier, et n'offre aucun geste de mise en ligne

#### Scenario: Sans session, l'écran Publier renvoie à la connexion
- **WHEN** l'écran Publier est demandé sans session ouverte
- **THEN** la réponse renvoie à l'écran de connexion, sans rien montrer du récapitulatif

#### Scenario: Un nom est affiché tel quel dans le récapitulatif
- **WHEN** un titre de page, un nom de formulaire ou un nom d'image du récapitulatif contient les caractères `<`, `>`, `&` ou des guillemets
- **THEN** ces caractères paraissent comme du texte, et aucun balisage n'est interprété

#### Scenario: Aucun terme de développeur dans le récapitulatif
- **WHEN** l'éditrice lit l'écran Publier, ses listes, ses boutons et ses messages
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: Annuler depuis le récapitulatif

L'éditrice SHALL pouvoir **annuler** depuis le récapitulatif (FR-085) : rien n'est alors déposé, aucun
brouillon n'est touché, et le site public est inchangé.

#### Scenario: Annuler ne met rien en ligne
- **WHEN** le récapitulatif est affiché et que l'éditrice annule
- **THEN** elle revient à l'écran qu'elle quittait, rien n'est déposé, chaque brouillon est intact et porte toujours sa marque, et le site public est inchangé

### Requirement: Publier l'ensemble des brouillons en un seul geste

Confirmer depuis le récapitulatif SHALL mettre en ligne **ensemble** tous les éléments qu'il présente
(FR-086), sans autre geste de l'éditrice : quand il y a beaucoup d'images à déposer, les passes
successives s'enchaînent d'elles-mêmes et l'écran en montre l'avancement. La publication DOIT porter
exactement ce que le récapitulatif confirmé a présenté : si les brouillons ont changé entre l'affichage du
récapitulatif et la confirmation, la publication NE DOIT pas partir, et l'écran DOIT présenter le
récapitulatif à jour. Une fois le dépôt fait, chaque brouillon publié devient la dernière version publiée
de son objet, et l'objet cesse de porter une marque de brouillon ; une correction enregistrée **après** la
confirmation DOIT rester en brouillon, sans être perdue.

#### Scenario: Pages, réglages et formulaires partent ensemble
- **WHEN** la page « Tarifs », le réglage des coordonnées et le formulaire « Devis gâteau » portent un brouillon, et que l'éditrice confirme la publication
- **THEN** une fois le dépôt fait, ni « Tarifs », ni les coordonnées, ni « Devis gâteau » ne portent plus de marque de brouillon, et chacun présente le contenu de son ancien brouillon comme dernière version publiée

#### Scenario: Les brouillons ont changé depuis l'affichage du récapitulatif
- **WHEN** après l'affichage du récapitulatif, une correction de la page « Accueil » est enregistrée depuis un autre onglet, puis l'éditrice confirme
- **THEN** rien n'est déposé, et l'écran présente le récapitulatif à jour, « Accueil » compris

#### Scenario: Une correction enregistrée pendant la publication reste en brouillon
- **WHEN** une correction de la page « Contact » est enregistrée après la confirmation, pendant que la publication dépose
- **THEN** une fois le dépôt fait, « Contact » porte toujours un brouillon qui contient cette correction

#### Scenario: Beaucoup d'images partent sans autre geste
- **WHEN** la publication doit déposer plus d'images qu'une seule passe n'en porte
- **THEN** les passes s'enchaînent sans autre geste de l'éditrice, l'écran montre combien d'images sont parties sur combien, et toutes les images sont déposées

### Requirement: Dépôt du contenu publié en fichiers lisibles

La publication SHALL déposer le contenu publié dans le dépôt du client, sur sa branche principale, en
**fichiers lisibles** (FR-087), au format de la déclaration (ADR-0012, ADR-0017, ADR-0018) :
- pour chaque page publiée, son `page.json` — la structure de la déclaration, les contenus publiés — et un
  fichier Markdown par emplacement de texte riche ;
- pour les réglages publiés, `reglages.json` et le texte de la mention ;
- pour chaque formulaire publié, son `formulaire.json` ;
- pour chaque image publiée, sa **fiche** portant son identité, son nom d'origine, son format, ses
  dimensions et sa description (FR-108) ;
- une **marque de publication** propre à ce dépôt.
Un objet sans brouillon NE DOIT pas être réécrit. Le dépôt DOIT se faire en **une seule écriture** qui
ajoute à l'historique sans jamais en effacer : bâtie sur un état de la branche devenu périmé, elle DOIT
être refusée puis rebâtie sur l'état courant, jamais écraser un état plus récent ; une écriture dont la
réponse s'est perdue DOIT être reconnue au nouvel essai et comptée comme faite, sans doublon. Tout chemin
écrit DOIT appartenir aux préfixes que la publication a le droit d'écrire, et aucun NE DOIT commencer par
`.github/` (I9). Ce dépôt du contenu est **l'unique déclencheur** de la reconstruction du site public
(FR-089). La clé d'écriture du dépôt NE DOIT paraître dans aucune réponse, aucun écran ni aucun journal.

#### Scenario: Seule la page en brouillon est réécrite
- **WHEN** seule la page « Accueil » porte un brouillon de son texte de présentation, et que la publication dépose
- **THEN** le dépôt réécrit le `page.json` et le fichier Markdown de la présentation d'« Accueil » avec le contenu du brouillon, et ne réécrit aucun fichier de « Tarifs » ni de « Contact »

#### Scenario: Le texte riche déposé se lit tel quel
- **WHEN** un texte riche publié porte un titre, du gras et une liste
- **THEN** le fichier déposé pour cet emplacement est un texte Markdown lisible dans n'importe quel éditeur, et non une chaîne échappée dans un JSON

#### Scenario: La fiche d'une image publiée porte ce que demande la reconstruction
- **WHEN** une image est publiée pour la première fois
- **THEN** sa fiche déposée porte son identité, son nom d'origine, son format, sa largeur, sa hauteur et sa description

#### Scenario: Aucun chemin hors des préfixes autorisés
- **WHEN** la publication compose son dépôt
- **THEN** chaque chemin écrit appartient aux préfixes autorisés, et aucun ne commence par `.github/`

#### Scenario: Un état périmé est refusé, puis rebâti
- **WHEN** la branche principale a avancé entre la lecture de son état et l'écriture du dépôt
- **THEN** l'écriture bâtie sur l'état périmé est refusée par le dépôt, la publication la rebâtit sur l'état courant, et l'état plus récent est conservé

#### Scenario: Une réponse perdue n'engendre pas de doublon
- **WHEN** l'écriture du dépôt a abouti mais que sa réponse s'est perdue, et que la publication réessaie
- **THEN** le nouvel essai reconnaît son propre dépôt, le compte comme fait, et n'en ajoute pas un second

#### Scenario: La clé d'écriture ne paraît nulle part
- **WHEN** une publication aboutit, puis qu'une autre échoue
- **THEN** la clé d'écriture du dépôt ne figure dans aucune réponse, aucun écran ni aucune ligne de journal

### Requirement: Dépôt des images publiées et effacement définitif

La publication SHALL déposer, sur la **branche des images** du même dépôt (FR-088), les octets de chaque
image que le contenu publié pose pour la première fois, **inchangés**. Ce dépôt NE DOIT pas déclencher la
reconstruction du site ; il DOIT précéder le dépôt du contenu. La liste des images que porte la branche
DOIT être calculée depuis l'inventaire des images publiées tenu par le produit, jamais depuis ce qui est lu
sur la branche. Une image que la publication efface (FR-037) DOIT disparaître de la bibliothèque et perdre
sa fiche dans le contenu déposé à cette publication ; ses octets DOIVENT quitter la branche des images au
plus tard au dépôt de la publication suivante, sans jamais quitter avant que le contenu qui la pose ait
cessé d'être le dernier contenu déposé.

#### Scenario: Les octets déposés sont ceux du téléversement
- **WHEN** une image JPEG, une PNG et une WebP sont publiées pour la première fois
- **THEN** les octets déposés sur la branche des images sont identiques, octet pour octet, à ceux téléversés

#### Scenario: Les images partent avant le contenu, sur leur propre branche
- **WHEN** une publication dépose des images et du contenu
- **THEN** les images sont déposées sur la branche des images avant que le contenu ne soit déposé sur la branche principale, et seule la branche principale déclenche la reconstruction

#### Scenario: Une image effacée quitte la bibliothèque puis la branche
- **WHEN** une publication efface une image, puis qu'une publication suivante dépose
- **THEN** après la première, l'image a quitté la bibliothèque et sa fiche le contenu déposé ; après la seconde, ses octets ne sont plus sur la branche des images

#### Scenario: Une image encore posée par le contenu déposé reste sur la branche
- **WHEN** la publication réécrit la branche des images alors que le dernier contenu déposé pose encore une image
- **THEN** les octets de cette image restent sur la branche

### Requirement: Une publication à la fois

Les publications SHALL se succéder sans jamais se chevaucher. Une publication demandée pendant qu'une autre dépose
DOIT être refusée avec un message qui le dit. Une publication interrompue en cours de route — fenêtre
fermée, serveur arrêté — NE DOIT bloquer les suivantes que pendant au plus 5 minutes après son dernier
signe de vie ; une publication suivante DOIT alors la reprendre et aboutir à un dépôt correct, sans image
en double ni contenu manquant.

#### Scenario: Une publication demandée pendant une autre est refusée
- **WHEN** une publication dépose, et qu'une seconde publication est confirmée depuis un autre onglet
- **THEN** la seconde est refusée, avec un message disant qu'une publication est déjà en cours

#### Scenario: Une publication interrompue ne bloque pas pour toujours
- **WHEN** une publication s'est interrompue après avoir déposé une partie de ses images, et que 5 minutes ont passé sans signe de vie
- **THEN** une nouvelle publication est acceptée, et son dépôt porte toutes les images et tout le contenu attendus, sans doublon

#### Scenario: Avant la fin de la borne, la publication interrompue garde la main
- **WHEN** une publication s'est interrompue, et que moins de 5 minutes ont passé depuis son dernier signe de vie
- **THEN** une nouvelle publication est refusée, avec un message disant qu'une publication est déjà en cours

### Requirement: Une publication qui échoue avant le dépôt ne change rien

Quand une publication échoue avant que le contenu soit déposé — dépôt injoignable, accès refusé, clé
absente ou invalide, dépôt non configuré —, le site public, le contenu publié et chaque brouillon SHALL
rester exactement tels qu'ils étaient (FR-091), et l'éditrice DOIT en être informée par un message qui dit
que rien n'a changé et qu'elle peut réessayer plus tard, sans aucun terme de développeur (FR-117).

#### Scenario: Un dépôt refusé ne change rien
- **WHEN** l'éditrice confirme une publication et que le dépôt refuse l'écriture
- **THEN** chaque brouillon est intact et porte toujours sa marque, le contenu publié est inchangé, et l'écran dit que la publication n'a pas pu se faire et que rien n'a changé

#### Scenario: Un site sans dépôt configuré ne publie pas
- **WHEN** l'instance n'a pas de dépôt de publication configuré, ou pas de clé d'écriture, et que l'éditrice confirme une publication
- **THEN** rien n'est déposé, chaque brouillon est intact, et l'écran dit que la publication n'a pas pu se faire, sans aucun terme de développeur

### Requirement: Issue de la publication

Une fois le contenu déposé, l'administration SHALL dire à l'éditrice où en est la mise en ligne
(FR-090) : **« en cours de mise en ligne »** tant que le site en service n'est pas né de cette
publication, **« en ligne »** dès qu'il l'est, et **« n'a pas abouti »** quand 30 minutes ont passé depuis
le dépôt sans qu'il le soit — le site restant alors tel qu'il était (FR-091), et ses modifications gardées.
L'administration DOIT savoir de quelle publication le site en service est né sans appel à aucun service
tiers ni aucune adresse publique nouvelle. L'état de la dernière publication DOIT paraître dans le cadre
sur chaque écran. Quand la dernière mise en ligne n'a pas abouti, l'éditrice DOIT pouvoir la **relancer**,
même sans aucun brouillon : la relance dépose une nouvelle marque de publication, sans changer le contenu.
Une mise en ligne qui arrive après la borne DOIT faire passer l'état à « en ligne ». Tant qu'une publication
ou une relance dépose, dès la toute première, l'administration DOIT dire qu'une **publication est en
cours**, sur l'écran Publier comme dans le cadre. Aucun terme de développeur NE DOIT paraître dans ces
états (FR-117).

#### Scenario: Juste après le dépôt, la mise en ligne est en cours
- **WHEN** le contenu vient d'être déposé et que le site en service n'est pas encore né de cette publication
- **THEN** l'administration dit que la publication est en cours de mise en ligne, sur l'écran Publier comme dans le cadre

#### Scenario: Une publication qui dépose est dite en cours, dès la première
- **WHEN** une publication ou une relance est en train de déposer, y compris la toute première publication
- **THEN** le cadre et l'écran Publier disent qu'une publication est en cours

#### Scenario: Le site né de la publication la dit en ligne
- **WHEN** le site en service est né de la dernière publication déposée
- **THEN** l'administration dit que la publication est en ligne

#### Scenario: Au-delà de 30 minutes, la mise en ligne n'a pas abouti
- **WHEN** le site en service n'est pas né de la dernière publication, 29 minutes et 59 secondes après son dépôt, puis 30 minutes après
- **THEN** l'administration dit d'abord « en cours de mise en ligne », puis que la mise en ligne n'a pas abouti, que le site est resté tel qu'il était et que les modifications sont gardées

#### Scenario: Une mise en ligne tardive est reconnue
- **WHEN** la mise en ligne a été dite sans aboutissement, puis le site en service naît de cette publication
- **THEN** l'administration dit que la publication est en ligne

#### Scenario: Relancer une mise en ligne qui n'a pas abouti
- **WHEN** la dernière mise en ligne n'a pas abouti, qu'aucun brouillon n'existe, et que l'éditrice relance la mise en ligne
- **THEN** une nouvelle marque de publication est déposée sans changer le contenu, et l'état repasse à « en cours de mise en ligne »

#### Scenario: Une modification publiée est en ligne en moins de 5 minutes
- **WHEN** sur l'instance de recette, l'éditrice modifie un texte, publie et confirme
- **THEN** la page publique présente la modification moins de 5 minutes après la confirmation (SC-004), et l'administration dit la publication en ligne

#### Scenario: Aucun terme de développeur dans l'issue
- **WHEN** l'éditrice lit l'état d'une publication, en cours, en ligne, sans aboutissement ou refusée
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: Le contenu publié remplace le contenu de départ

Dès que le contenu est déposé, et sans attendre la reconstruction du site, la dernière version publiée de
chaque objet SHALL tenir lieu de son contenu de départ pour tous les écrans, pour l'aperçu et pour la
publication suivante. La **structure** — pages, emplacements, leur nature, leur ordre et leur nom ; champs
de formulaire ; coordonnées déclarées — DOIT rester celle de la déclaration de l'intégrateur : la version
publiée d'un emplacement ou d'un champ que la déclaration ne porte plus est ignorée, et un emplacement ou
un champ nouvellement déclaré présente son contenu de départ.

#### Scenario: Juste après le dépôt, l'éditeur montre la version publiée
- **WHEN** la page « Tarifs » vient d'être publiée et que le site n'est pas encore reconstruit
- **THEN** l'éditeur de « Tarifs » présente le contenu publié, sans marque de brouillon, et non l'ancien contenu de départ

#### Scenario: La structure reste celle de la déclaration
- **WHEN** après une publication, l'intégrateur retire un emplacement de la déclaration d'une page et en ajoute un autre
- **THEN** la version publiée de l'emplacement retiré n'est plus montrée, et l'emplacement ajouté présente son contenu de départ

### Requirement: Les options d'un champ à choix à la publication

Pour chaque champ à choix d'un formulaire publié, le `formulaire.json` déposé SHALL porter **la liste du
brouillon telle quelle** — ordre, identifiants, libellés et prix en centimes — quand ce champ a un
brouillon lisible et accordé à la marque avec prix / sans prix déclarée, et sa liste publiée sinon (celle
de la déclaration tant qu'il n'a jamais été publié) ; tout le reste du champ et du formulaire — existence,
ordre, libellé, nature, caractère obligatoire, marque avec prix — DOIT venir de la déclaration. Les options
de départ que l'intégrateur a ajoutées, retirées ou changées depuis l'enregistrement NE DOIVENT pas se
mêler à la liste du brouillon. Un identifiant d'option donné une fois, publié ou non, NE DOIT jamais être
redonné à une autre option du même champ, y compris après une publication.

#### Scenario: Une option de départ ajoutée après l'enregistrement n'est pas publiée
- **WHEN** l'intégrateur ajoute l'option de départ « Pistache » au champ « Parfum » de « Devis gâteau » après que l'éditrice a enregistré ce champ, puis l'éditrice publie
- **THEN** le `formulaire.json` déposé porte pour « Parfum » la liste du brouillon, sans « Pistache »

#### Scenario: Une option de départ retirée mais gardée au brouillon est publiée
- **WHEN** l'intégrateur retire l'option de départ « Fraise » que le brouillon de l'éditrice garde, puis l'éditrice publie
- **THEN** le `formulaire.json` déposé porte « Fraise » dans « Parfum »

#### Scenario: Un champ passé à choix multiple publie la liste du brouillon
- **WHEN** l'intégrateur passe un champ de choix unique à choix multiple après l'enregistrement de ce champ, puis l'éditrice publie
- **THEN** le `formulaire.json` déposé porte ce champ en choix multiple, avec la liste du brouillon

#### Scenario: Un champ devenu sans option ne publie aucune option
- **WHEN** l'intégrateur fait d'un champ à choix enregistré un champ de texte, puis l'éditrice publie
- **THEN** le `formulaire.json` déposé porte ce champ sans aucune option, et la publication aboutit

#### Scenario: Un champ à choix sans brouillon publie sa liste publiée
- **WHEN** un formulaire est publié alors qu'un de ses champs à choix n'a pas de brouillon
- **THEN** ce champ porte dans le `formulaire.json` déposé sa liste publiée, celle de la déclaration s'il n'a jamais été publié

#### Scenario: Un identifiant publié n'est jamais redonné
- **WHEN** un champ dont les options ajoutées par l'éditrice ont reçu trois identifiants est publié, puis que l'éditrice retire la dernière de ces options et en ajoute une nouvelle
- **THEN** la nouvelle option reçoit un identifiant distinct des trois identifiants déjà donnés
