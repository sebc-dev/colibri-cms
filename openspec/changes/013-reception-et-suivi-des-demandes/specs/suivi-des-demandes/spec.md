## Purpose

Garder chaque demande de devis acceptée dans une liste de l'administration, où l'éditrice la consulte, note
la suite qu'elle lui a donnée, la retire, et lit les nombres que son site produit — ce qu'il a apporté et ce
que ça a donné. Couvre FR-065 → FR-079, sous FR-117, SEC-6, SEC-8 et DAT-1.

## ADDED Requirements

### Requirement: Chaque demande acceptée est gardée à sa réception

Chaque demande acceptée par la capacité `demande-de-devis` SHALL être gardée dans la liste des demandes
(FR-065), avant son acheminement par e-mail et quelle qu'en soit l'issue (FR-066). La demande gardée DOIT
porter : sa date et son heure de réception ; le formulaire d'origine, sous son nom au moment de l'envoi ; la
page d'origine, sous son titre au moment de l'envoi (FR-067) ; pour un formulaire qui porte des prix, le
total qui était affiché au visiteur au moment de l'envoi (FR-068) ; et son détail — pour chaque champ à
choix renseigné, son libellé et les options choisies, avec, dans un champ avec prix, le prix de chacune ;
pour chaque coordonnée et chaque texte renseignés, son libellé et la valeur saisie. Libellés, options et
prix DOIVENT être ceux que le formulaire publié portait au moment de l'envoi : une publication ultérieure ne
change pas une demande gardée. Une demande refusée — champ manquant ou mal formé, formulaire changé, seuil
atteint, envoi qui ne vient pas du site — NE DOIT pas être gardée. Une demande gardée dont l'e-mail n'a pas
pu partir — refus de la plateforme d'acheminement, ou aucune adresse autorisée enregistrée — DOIT porter
la mention que son e-mail n'a pas pu partir ; une demande dont l'e-mail est parti NE DOIT pas la porter.

#### Scenario: Une demande acceptée paraît dans la liste
- **WHEN** un visiteur envoie, depuis la page « Contact », une demande complète pour « Devis gâteau » avec « Fraise » (10 €) et « 10 parts » (30 €)
- **THEN** la liste porte une demande de « Devis gâteau », venue de la page « Contact », avec sa date et son heure de réception et un total de 40 €

#### Scenario: La demande est gardée quand l'e-mail est refusé
- **WHEN** la plateforme d'acheminement refuse l'e-mail d'une demande complète
- **THEN** la demande figure dans la liste avec tout son détail, et porte la mention que son e-mail n'a pas pu partir

#### Scenario: Sans adresse autorisée, la demande est gardée
- **WHEN** aucune adresse autorisée n'est enregistrée et qu'un visiteur envoie une demande complète
- **THEN** la demande figure dans la liste, et porte la mention que son e-mail n'a pas pu partir

#### Scenario: Une demande dont l'e-mail est parti ne porte aucune mention d'échec
- **WHEN** une demande complète est gardée et que son e-mail est remis à la plateforme d'acheminement
- **THEN** la demande figure dans la liste sans la mention que son e-mail n'a pas pu partir

#### Scenario: La demande garde le formulaire tel qu'il était à l'envoi
- **WHEN** une demande a été gardée avec « Fraise » à 10 €, puis que l'éditrice publie « Fraise » renommée « Fraise des bois » à 11 €
- **THEN** la demande gardée porte toujours « Fraise » à 10 € et un total de 40 €

#### Scenario: Une demande refusée n'est pas gardée
- **WHEN** une demande est refusée parce qu'un champ obligatoire manque, parce que son total ne s'accorde pas au formulaire publié, ou parce que le seuil de son origine est atteint
- **THEN** la liste n'en porte aucune trace

### Requirement: La liste des demandes

L'`Écran : Demandes`, atteint par la rubrique « Demandes » du menu, SHALL présenter les demandes présentes
de la plus récente à la plus ancienne (FR-069), par pages de 50, avec un moyen d'atteindre les plus
anciennes. Chaque ligne DOIT dire la date de réception, le formulaire d'origine, la page d'origine, la
coordonnée qui permet de répondre au visiteur — son adresse e-mail, ou à défaut son téléphone —, le total
affiché quand le formulaire porte des prix, la suite, et, le cas échéant, la mention que l'e-mail n'a pas pu
partir ; chaque ligne DOIT mener à l'`Écran : Demande` de cette demande. L'éditrice DOIT pouvoir filtrer la
liste par formulaire d'origine (FR-070) : le filtre propose chaque formulaire dont au moins une demande est
présente — y compris un formulaire que le site ne porte plus — et le retour à toutes les demandes. Sans
aucune demande présente, l'écran le dit. Tout texte venu d'une demande DOIT être affiché tel quel, sans
qu'aucun balisage n'y soit interprété. Aucun terme de développeur NE DOIT paraître (FR-117).

#### Scenario: Les plus récentes d'abord
- **WHEN** trois demandes sont arrivées lundi, mardi et mercredi
- **THEN** la liste présente celle de mercredi, puis celle de mardi, puis celle de lundi

#### Scenario: Une ligne dit l'essentiel de la demande
- **WHEN** l'éditrice ouvre la liste après la demande de Marie Dupont, venue de la page « Contact » pour « Devis gâteau », d'un total de 40 €, avec l'adresse « marie@exemple.fr »
- **THEN** la ligne de cette demande porte sa date de réception, « Devis gâteau », « Contact », « marie@exemple.fr », 40 € et la suite « à renseigner », et mène au détail de la demande

#### Scenario: Filtrer par formulaire d'origine
- **WHEN** la liste porte des demandes de « Devis gâteau » et de « Devis atelier », et que l'éditrice choisit « Devis atelier » dans le filtre
- **THEN** seules les demandes de « Devis atelier » paraissent, de la plus récente à la plus ancienne

#### Scenario: Revenir à toutes les demandes
- **WHEN** la liste est filtrée sur « Devis atelier », et que l'éditrice choisit de revoir toutes les demandes
- **THEN** les demandes de tous les formulaires paraissent de nouveau

#### Scenario: Les demandes paraissent par pages de 50
- **WHEN** 120 demandes sont présentes
- **THEN** l'écran présente les 50 plus récentes et un moyen d'atteindre les suivantes, et la troisième page présente les 20 plus anciennes

#### Scenario: Une liste vide le dit
- **WHEN** aucune demande n'est présente
- **THEN** l'écran dit qu'aucune demande n'est arrivée, sans terme de développeur

#### Scenario: Les demandes d'un formulaire que le site ne porte plus restent
- **WHEN** l'intégrateur a retiré du site un formulaire dont des demandes sont présentes
- **THEN** ces demandes restent dans la liste sous le nom de ce formulaire, et le filtre le propose toujours

#### Scenario: Un texte de demande n'est jamais interprété
- **WHEN** une demande porte, dans son adresse e-mail ou dans « Votre nom », des caractères `<`, `>`, `&` ou des guillemets
- **THEN** la liste et le détail les affichent comme du texte, et aucun balisage n'est interprété

### Requirement: Le détail d'une demande

L'`Écran : Demande` SHALL présenter tout ce qu'une demande présente porte : sa date et son heure de
réception, le formulaire et la page d'origine, chaque champ à choix renseigné avec ses options choisies et,
dans un champ avec prix, le prix de chacune, le total qui était affiché au visiteur avec la mention qu'il
était indicatif, chaque coordonnée et chaque texte renseignés sous le libellé de leur champ — un texte sur
plusieurs lignes gardant ses lignes —, la suite, et le cas échéant la mention que l'e-mail n'a pas pu
partir. Tout texte venu de la demande DOIT être affiché tel quel. L'écran DOIT offrir de renseigner la suite
et de retirer cette demande. Une demande retirée ou inconnue NE DOIT montrer aucune donnée : l'écran dit
que cette demande n'est plus dans la liste et mène à l'`Écran : Demandes`.

#### Scenario: Le détail complet d'une demande
- **WHEN** l'éditrice ouvre la demande qui porte « Fraise » (10 €), « 10 parts » (30 €), « Anniversaire », le nom « Marie Dupont » et l'adresse « marie@exemple.fr »
- **THEN** l'écran porte sa date de réception, « Devis gâteau », « Contact », « Parfum : Fraise (10 €) », « Nombre de parts : 10 parts (30 €) », « Occasion : Anniversaire », un total indicatif de 40 €, « Votre nom : Marie Dupont » et « Votre adresse e-mail : marie@exemple.fr »

#### Scenario: Un message sur plusieurs lignes garde ses lignes
- **WHEN** la demande porte dans « Votre message » un texte de trois lignes
- **THEN** l'écran présente ces trois lignes, l'une sous l'autre, sous le libellé « Votre message »

#### Scenario: Le détail d'une demande dont l'e-mail n'est pas parti le dit
- **WHEN** l'éditrice ouvre une demande dont l'e-mail n'a pas pu partir
- **THEN** l'écran porte la mention que l'e-mail de cette demande n'a pas pu partir

#### Scenario: Une demande retirée ne montre plus rien
- **WHEN** l'éditrice ouvre l'adresse du détail d'une demande qu'elle a retirée
- **THEN** l'écran dit que cette demande n'est plus dans la liste, n'en montre aucune donnée, et mène à la liste des demandes

### Requirement: La suite d'une demande

Une demande neuve SHALL porter la suite « à renseigner ». L'éditrice DOIT pouvoir lui donner l'une des trois
suites « sans suite », « devis envoyé » ou « commande » (FR-071), depuis la liste comme depuis le détail, et
la changer ensuite pour une autre des trois (FR-072). La suite choisie DOIT être enregistrée dès le choix,
sans autre geste, et retrouvée à tout nouvel affichage. Quand l'enregistrement n'aboutit pas, l'écran DOIT
le dire sans terme de développeur, et la demande garde la suite enregistrée avant. Une demande retirée NE
DOIT plus recevoir de suite.

#### Scenario: Une demande neuve est à renseigner
- **WHEN** une demande vient d'arriver
- **THEN** sa suite est « à renseigner »

#### Scenario: Renseigner la suite
- **WHEN** l'éditrice choisit « devis envoyé » pour une demande
- **THEN** la demande porte « devis envoyé », et la porte toujours une fois l'écran rechargé

#### Scenario: Changer une suite déjà renseignée
- **WHEN** l'éditrice choisit « commande » pour une demande qui portait « devis envoyé »
- **THEN** la demande porte « commande », et le nombre de commandes compte cette demande

#### Scenario: Un enregistrement de la suite qui échoue le dit
- **WHEN** l'éditrice choisit une suite et que son enregistrement n'aboutit pas
- **THEN** l'écran dit que la suite n'a pas pu être enregistrée, sans terme de développeur, et la demande garde la suite qu'elle portait avant

#### Scenario: Une demande retirée ne reçoit plus de suite
- **WHEN** une suite est envoyée pour une demande déjà retirée
- **THEN** elle est refusée, et rien ne change dans les nombres

### Requirement: Retirer une demande ou plusieurs

L'éditrice SHALL pouvoir retirer une demande présente, depuis la liste ou depuis son détail, ou plusieurs en
un seul geste, en les sélectionnant dans la liste, filtrée ou non (FR-074). Elle DOIT déclarer le motif du
retrait — ordinaire ou indésirable —, qui porte sur toute la sélection (FR-073, FR-074). Avant que rien ne
soit retiré, l'écran DOIT dire combien de demandes vont l'être, que tout ce que leurs visiteurs ont envoyé
sera effacé définitivement, et, pour un retrait indésirable, qu'elles ne seront plus comptées nulle part ;
l'éditrice confirme ou renonce, et renoncer ne change rien. Un retrait ordinaire DOIT effacer aussitôt tout
ce que le visiteur a envoyé — sélections, coordonnées, textes, total, page d'origine, date de réception — et
ne garder de la demande que son formulaire d'origine et sa suite, pour la compter (FR-078). Un retrait
indésirable DOIT effacer la demande entière. Un retrait est définitif : aucun moyen ne fait reparaître une
demande retirée. Un retrait NE DOIT toucher aucune autre demande que celles sélectionnées, et un retrait
groupé s'applique à toute la sélection ou à aucune de ses demandes. Le produit NE DOIT retirer ni effacer
aucune demande de lui-même : aucune durée ne s'applique, aucun effacement n'a lieu sans le geste de
l'éditrice (FR-079).

#### Scenario: Retirer une demande
- **WHEN** l'éditrice retire la demande de Marie Dupont en déclarant le retrait ordinaire, et confirme
- **THEN** la demande ne paraît plus dans la liste, et la base ne porte plus aucune des valeurs que Marie Dupont avait saisies, ni son total, ni sa page d'origine

#### Scenario: Retirer plusieurs demandes en un geste
- **WHEN** l'éditrice sélectionne trois demandes, choisit le motif indésirable, et confirme
- **THEN** les trois demandes ne paraissent plus dans la liste, et la base n'en porte plus rien

#### Scenario: La confirmation dit ce qui va se passer
- **WHEN** l'éditrice demande à retirer trois demandes
- **THEN** avant que rien ne soit retiré, l'écran dit que trois demandes vont être retirées et que ce que leurs visiteurs ont envoyé sera effacé définitivement

#### Scenario: Renoncer ne retire rien
- **WHEN** l'éditrice demande à retirer une demande, puis renonce à la confirmation
- **THEN** la demande est toujours dans la liste, avec tout son détail et sa suite

#### Scenario: Un retrait ne touche aucune autre demande
- **WHEN** l'éditrice retire deux des quatorze demandes présentes
- **THEN** les douze autres restent dans la liste, chacune avec son détail et sa suite inchangés

#### Scenario: Un retrait groupé qui échoue ne retire rien
- **WHEN** l'éditrice confirme le retrait de trois demandes et que leur effacement n'aboutit pas
- **THEN** aucune des trois n'est retirée, et l'écran dit que le retrait n'a pas pu se faire, sans terme de développeur

#### Scenario: Le produit n'efface rien de lui-même
- **WHEN** des demandes sont présentes depuis plus d'un an, sans aucun geste de l'éditrice
- **THEN** elles figurent toujours dans la liste, chacune avec tout son détail

### Requirement: Les nombres du site et de chaque formulaire

L'`Écran : Demandes` SHALL afficher, pour l'ensemble du site, le nombre de demandes présentes et le nombre de
commandes (FR-075), ainsi que le nombre de demandes retirées lorsqu'il n'est pas nul (FR-076) ; et les mêmes
nombres pour chaque formulaire qui compte au moins une demande présente ou retirée (FR-077). Les demandes
présentes sont celles de la liste. Les commandes sont les demandes dont la suite est « commande », qu'elles
soient présentes ou retirées par un retrait ordinaire. Les retirées sont les demandes retirées par un
retrait ordinaire, comptées après l'effacement de ce que leur visiteur avait envoyé (FR-078). Une demande
retirée par un retrait indésirable NE DOIT être comptée dans aucun nombre (FR-076). Pour chacun des trois
nombres, la somme des nombres des formulaires DOIT être égale au nombre du site. Les nombres NE DOIVENT
dépendre ni du filtre ni de la page de la liste affichés.

#### Scenario: Les nombres du site et leur ventilation par formulaire
- **WHEN** la liste porte onze demandes de « Devis gâteau », dont trois de suite « commande », et trois demandes de « Devis atelier », sans aucune commande, et qu'aucune n'a été retirée
- **THEN** l'écran affiche 14 demandes et 3 commandes pour le site, 11 demandes et 3 commandes pour « Devis gâteau », 3 demandes et 0 commande pour « Devis atelier », et aucun nombre de retirées

#### Scenario: Un retrait ordinaire passe aux retirées
- **WHEN** à partir de ces quatorze demandes, l'éditrice retire deux demandes « sans suite » de « Devis gâteau » en déclarant le retrait ordinaire
- **THEN** l'écran affiche 12 demandes, 3 commandes et 2 retirées pour le site, et 9 demandes, 3 commandes et 2 retirées pour « Devis gâteau »

#### Scenario: Un retrait indésirable ne compte nulle part
- **WHEN** après ces deux retraits, quarante demandes automatisées de « Devis gâteau » font lire 52 demandes, et que l'éditrice les sélectionne et les retire en un geste en les déclarant indésirables
- **THEN** l'écran affiche exactement 12 demandes, 3 commandes et 2 retirées pour le site, et les mêmes nombres qu'avant leur arrivée pour chaque formulaire

#### Scenario: Une commande retirée reste comptée
- **WHEN** l'éditrice retire, en déclarant le retrait ordinaire, une demande de suite « commande »
- **THEN** le nombre de demandes baisse de un, le nombre de retirées monte de un, et le nombre de commandes ne change pas

#### Scenario: Les ventilations somment au nombre du site
- **WHEN** sur un jeu de demandes connu, mêlant plusieurs formulaires, des retraits ordinaires et des retraits indésirables
- **THEN** pour les demandes, les commandes et les retirées, la somme des nombres des formulaires égale le nombre du site

#### Scenario: Les nombres ne suivent pas le filtre
- **WHEN** l'éditrice filtre la liste sur « Devis atelier », ou passe à la page suivante
- **THEN** les nombres du site et de chaque formulaire restent ceux de toutes les demandes

### Requirement: Le suivi n'est ouvert qu'à l'éditrice

L'`Écran : Demandes`, l'`Écran : Demande` et toute écriture du suivi — suite, retrait — SHALL n'être
atteignables que depuis une session d'administration ouverte. Sans session, un écran DOIT mener à l'écran
de connexion sans rendre aucune donnée de demande, et une écriture DOIT être refusée sans rien changer.

#### Scenario: Les écrans du suivi exigent une session
- **WHEN** l'`Écran : Demandes` ou l'`Écran : Demande` est demandé sans session ouverte
- **THEN** l'écran de connexion s'ouvre, et la réponse ne porte aucune donnée de demande

#### Scenario: Une écriture sans session est refusée
- **WHEN** une suite ou un retrait est envoyé sans session ouverte
- **THEN** il est refusé, et aucune demande ni aucun nombre ne change
