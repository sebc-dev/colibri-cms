# ColibriCMS — Vision & exigences

## Vision

ColibriCMS est un CMS auto-hébergé chez le client, sur le palier gratuit de Cloudflare, pour un
site vitrine statique éditable par une cliente non technicienne. Il tient trois propriétés
qu'aucun outil existant ne réunit : **aucun outil de développeur exposé à l'éditrice**, **un coût
d'hébergement nul**, et **un site qui survit à la disparition de son prestataire** — Isometria.
Tout ce qui fait le site appartient déjà au client ; une séparation ne demande aucun transfert —
la promesse tient par une topologie de déploiement, et tombe au premier objet qui vit ailleurs que
chez le client. Le site convertit ses visiteurs en prospects par un formulaire de devis dont
l'intégrateur pose la structure et dont l'éditrice règle seule les options, les prix et les libellés.
Le test unique dont tout découle : *si Isometria disparaît demain, que reste-t-il au client ?*

## Exigences fonctionnelles (FR)

Le référentiel produit. Une feature en décline un sous-ensemble ; elle n'y renvoie sans les
recopier. Numérotation reprise du PRD 1.x sans renumérotation, pour que les renvois des ADR et de
l'architecture restent valides.

### Accès à l'administration
- **FR-001** — Ouvrir une session d'administration à qui a prouvé la maîtrise de l'adresse autorisée.
- **FR-002** — Refuser l'ouverture d'une session pour toute adresse autre que l'adresse autorisée.
- **FR-003** — N'exiger aucun mot de passe pour ouvrir une session.
- **FR-004** — N'exiger de l'éditrice la connexion à aucun compte autre que son administration, ni pour éditer, ni pour publier.
- **FR-005** — N'envoyer aucun message de preuve de maîtrise à une adresse autre que l'adresse autorisée.
- **FR-006** — Borner, sur une fenêtre de temps, le nombre de messages de preuve envoyés à l'adresse autorisée.
- **FR-007** — Rejeter les tentatives d'ouverture de session d'une même origine au-delà d'un seuil de fréquence.
- **FR-008** — Rendre la même réponse à toute adresse saisie ; ni le texte ni le délai ne dépendent de l'envoi effectif d'un message.
- **FR-009** — Remettre un moyen de reprise à la livraison de l'instance.
- **FR-010** — Ouvrir une session sur présentation du moyen de reprise, sans envoi d'aucun message.
- **FR-011** — Ne conserver, dans la configuration du déploiement, aucune donnée permettant de reconstituer le moyen de reprise.
- **FR-012** — Permettre de remplacer le moyen de reprise depuis une session ouverte ; l'ancien cesse d'ouvrir, et toute autre session ouverte est fermée.
- **FR-013** — Permettre de remplacer l'adresse autorisée depuis une session ouverte.
- **FR-014** — Une adresse ne devient l'adresse autorisée qu'après preuve de sa maîtrise.
- **FR-118** — Fermer toute session restée sept jours sans usage, et toute session ouverte depuis trente jours.
- **FR-120** — Une preuve de maîtrise n'ouvre de session que sur l'appareil depuis lequel elle a été demandée.
- **FR-121** — Une preuve de maîtrise n'ouvre qu'une seule session et cesse d'ouvrir au-delà d'une durée bornée après son émission.
- **FR-122** — Rendre inutilisable une preuve de maîtrise après un nombre borné de présentations erronées.

### Pages et emplacements
- **FR-015** — Présenter à l'éditrice la liste des pages du site.
- **FR-016** — Indiquer, pour chaque page, si elle porte un brouillon non publié.
- **FR-017** — Permettre de modifier le contenu de chaque emplacement éditable d'une page.
- **FR-018** — Un emplacement peut porter du texte riche.
- **FR-019** — Un emplacement peut porter une image.
- **FR-020** — Un emplacement peut porter une galerie d'images.
- **FR-021** — Un emplacement peut porter un carrousel d'images.
- **FR-022** — Un emplacement peut porter une vidéo désignée par un lien externe.
- **FR-023** — Un emplacement peut porter un bouton d'action dont l'éditrice règle le libellé et la destination.
- **FR-024** — N'offrir aucun moyen de créer, supprimer ou renommer une page.
- **FR-025** — N'offrir aucun moyen de modifier la structure d'une page (nombre, nature ou ordre des emplacements).
- **FR-026** — Toute modification est enregistrée dans le brouillon de la page, sans effet sur le site public.

### Bibliothèque de médias
- **FR-027** — Téléverser une image dans la bibliothèque.
- **FR-028** — Présenter la bibliothèque comme une grille de toutes les images du site.
- **FR-029** — Rechercher une image dans la bibliothèque.
- **FR-030** — Renommer une image de la bibliothèque.
- **FR-031** — Saisir et modifier la description d'une image depuis la bibliothèque.
- **FR-032** — Indiquer, pour une image, les emplacements où elle est posée.
- **FR-033** — Poser dans un emplacement une image déjà présente, sans nouveau téléversement.
- **FR-034** — Remplacer l'image posée dans un emplacement.
- **FR-035** — Présenter la liste des emplacements concernés avant d'appliquer la suppression d'une image.
- **FR-036** — La suppression retire l'image de tous ses emplacements, chaque retrait enregistré dans le brouillon concerné.
- **FR-037** — Effacer définitivement une image à la publication ssi plus aucun emplacement — publié ou brouillon — ne la référence.
- **FR-038** — Signaler dans la bibliothèque les images qu'aucun emplacement ne référence plus et qui seront effacées à la prochaine publication.
- **FR-039** — Servir la description d'une image avec elle sur toute page publiée où elle est posée.
- **FR-040** — Refuser un téléversement hors des bornes de format ou de poids, en indiquant ce qui a été refusé.

### Réglages transverses
- **FR-041** — Modifier les coordonnées de contact affichées sur l'ensemble du site.
- **FR-042** — Modifier les liens vers les réseaux sociaux affichés sur l'ensemble du site.
- **FR-043** — Modifier le texte de la mention d'information présentée aux visiteurs avec les formulaires.
- **FR-044** — Toute modification d'un réglage transverse est enregistrée en brouillon, sans effet sur le site public.

### Réglage des formulaires de devis
- **FR-045** — Présenter la liste des formulaires posés sur le site.
- **FR-046** — Modifier le libellé d'une option d'un formulaire.
- **FR-047** — Modifier le prix associé à une option d'un formulaire.
- **FR-048** — Ajouter une option à un champ existant d'un formulaire.
- **FR-049** — Retirer une option d'un champ existant d'un formulaire.
- **FR-050** — N'offrir aucun moyen d'ajouter, retirer ou réordonner un champ d'un formulaire.
- **FR-051** — Toute modification d'un formulaire est enregistrée dans son brouillon, sans effet sur le site public.

### Composition et envoi d'une demande par le visiteur
- **FR-052** — Afficher au visiteur le total de sa sélection.
- **FR-053** — Le total est la somme des contributions des options sélectionnées.
- **FR-054** — Recalculer le total à chaque changement, sur l'appareil du visiteur, sans échange avec un serveur.
- **FR-055** — Présenter, avec le total, la mention que l'estimation est indicative et non engageante.
- **FR-056** — Présenter la mention d'information sur le traitement des coordonnées avant l'envoi.
- **FR-057** — Permettre l'envoi de la demande après renseignement des coordonnées.
- **FR-058** — Refuser l'envoi si un champ obligatoire n'est pas renseigné, en désignant le champ manquant.
- **FR-059** — Confirmer au visiteur que sa demande a été envoyée.
- **FR-060** — Informer le visiteur quand l'envoi n'aboutit pas, sans perte de sa saisie.
- **FR-061** — N'accepter aucun fichier téléversé par un visiteur.
- **FR-062** — Rejeter les demandes d'une même origine au-delà d'un seuil de fréquence, sans exiger de compte du visiteur.

### Réception et suivi des demandes
- **FR-063** — Acheminer chaque demande par e-mail à l'adresse autorisée.
- **FR-064** — L'e-mail porte le détail des sélections, le total indicatif et les coordonnées du visiteur.
- **FR-065** — Enregistrer chaque demande dans la liste des demandes de l'administration.
- **FR-066** — L'enregistrement ne dépend pas de la réussite de l'acheminement par e-mail.
- **FR-067** — Chaque demande porte sa date de réception, le formulaire d'origine et la page d'origine.
- **FR-068** — Chaque demande porte le total qui était affiché au visiteur au moment de l'envoi.
- **FR-069** — Présenter les demandes de la plus récente à la plus ancienne.
- **FR-070** — Filtrer la liste des demandes par formulaire d'origine.
- **FR-071** — Renseigner la suite d'une demande parmi : sans suite, devis envoyé, commande.
- **FR-072** — Modifier la suite d'une demande déjà renseignée.
- **FR-073** — Retirer une demande de la liste en déclarant le motif : ordinaire ou indésirable.
- **FR-074** — Retirer plusieurs demandes en un geste, le motif portant sur l'ensemble de la sélection.
- **FR-075** — Afficher, pour le site, le nombre de demandes présentes et le nombre de suites « commande ».
- **FR-076** — Afficher le nombre de retirées quand il n'est pas nul ; un retrait indésirable n'est compté dans aucun nombre.
- **FR-077** — Afficher ces nombres ventilés par formulaire.
- **FR-078** — Continuer de compter une demande retirée après que son contenu a cessé d'être conservé.
- **FR-079** — Un retrait n'entraîne le retrait d'aucune autre ; le système ne fait disparaître aucune demande sans en informer l'éditrice.

### Aperçu, publication, restauration
- **FR-080** — Consulter un aperçu d'une page présentant son brouillon.
- **FR-081** — L'aperçu rend la page avec tous ses brouillons concernés — page, réglages, formulaires — au même rendu que le publié.
- **FR-082** — L'aperçu n'est atteignable que depuis une session d'administration ouverte.
- **FR-083** — Avant toute mise en ligne, présenter la liste des pages, réglages et formulaires qui vont être publiés.
- **FR-084** — Ce récapitulatif indique les images qui vont être définitivement effacées.
- **FR-085** — Annuler la publication depuis ce récapitulatif, sans effet sur les brouillons.
- **FR-086** — La publication met en ligne l'ensemble des brouillons du site en un seul geste.
- **FR-087** — La publication dépose le contenu publié en fichiers lisibles dans un espace du client.
- **FR-088** — La publication dépose les médias publiés dans un espace du client.
- **FR-089** — Le dépôt du contenu publié est l'unique déclencheur de la mise à jour du site public.
- **FR-090** — Informer l'éditrice de l'issue de sa publication.
- **FR-091** — Quand une publication n'aboutit pas, le site public reste dans son dernier état publié.
- **FR-092** — Abandonner le brouillon d'une page, d'un réglage ou d'un formulaire, et retrouver sa dernière version publiée.
- **FR-093** — L'abandon du brouillon d'un objet n'affecte le brouillon d'aucun autre.
- **FR-094** — N'offrir aucun accès à un état antérieur à la dernière version publiée.

### Site public
- **FR-095** — Servir chaque page publique comme un document complet, bâti à la publication, portant tout son contenu éditorial.
- **FR-096** — La consultation d'une page publique ne déclenche aucun traitement serveur propre au site.
- **FR-097** — L'envoi d'une demande est le seul geste d'un visiteur déclenchant un traitement serveur.

### Déploiement, réversibilité, flotte
- **FR-098** — Fonctionner sans aucun identifiant appartenant à l'intégrateur dans la configuration du déploiement.
- **FR-099** — Après retrait des accès de l'intégrateur, le site public continue d'être servi.
- **FR-100** — Après retrait des accès de l'intégrateur, une session d'administration peut être ouverte.
- **FR-101** — Après retrait des accès de l'intégrateur, une publication aboutit.
- **FR-102** — Ne dépendre d'aucun traitement s'exécutant hors des comptes du client.
- **FR-103** — Ne requérir aucun service payant ni aucun moyen de paiement enregistré.
- **FR-104** — Être déployé à raison d'une instance par site, selon une configuration identique d'un client à l'autre.
- **FR-105** — Une nouvelle version se déploie sur une instance existante sans code propre à son client.
- **FR-106** — Le déploiement d'une nouvelle version n'entraîne aucune perte du contenu publié ni des brouillons.
- **FR-107** — Fournir une procédure documentée reconstruisant le site complet, médias compris, depuis les seuls fichiers déposés chez le client, sans l'administration ni les comptes de l'intégrateur.
- **FR-108** — Les fichiers déposés portent, pour chaque média, son identité, son nom d'origine, ses dimensions et sa description.
- **FR-109** — La procédure de reconstruction est documentée avec les fichiers déposés.

### Dossier d'instance
- **FR-110** — Chaque instance est accompagnée d'un dossier déposé dans un espace du client et connu de lui, dont l'accès n'est pas plus ouvert que les comptes et les rangements qu'il décrit.
- **FR-111** — Le dossier recense les comptes ouverts pour l'instance et le nom au titre duquel chacun l'est.
- **FR-112** — Le dossier indique, pour chaque identifiant — le moyen de reprise compris —, où il est rangé, sans sa valeur.
- **FR-113** — Le dossier recense les comptes dont la récupération dépend de la boîte e-mail de l'éditrice.
- **FR-114** — Le dossier porte la procédure de redéploiement de l'instance.
- **FR-115** — Le dossier porte la procédure de publication.
- **FR-116** — Le dossier porte la procédure de reconstruction.
- **FR-119** — Le dossier porte la procédure de réétablissement de l'adresse autorisée et du moyen de reprise depuis les seuls accès du client, sans reconstituer l'ancien moyen de reprise.

### Langage de l'interface
- **FR-117** — L'interface d'édition n'emploie aucun terme de développeur pour désigner un geste de l'éditrice.

## Critères de succès (SC)

Ce qui prouve que le produit valait le coup — distinct des `FR` : le `FR` est ce qu'on fait, le
`SC` la preuve. Numérotation reprise du PRD 1.x.

- **SC-001** — 0 €/mois par site en conditions nominales ; à la livraison, aucun moyen de paiement enregistré sur le compte du client, aucun abonnement payant.
- **SC-002** — Le site de la pâtisserie est en production sur ColibriCMS.
- **SC-003** — L'éditrice modifie un texte et remplace une image, seule, sans aide et du premier coup, lors d'un test d'usage réel observé.
- **SC-004** — Une modification publiée est visible en ligne en moins de 5 minutes après « Publier ».
- **SC-005** — Score Lighthouse Performance ≥ 95 en mobile, mesuré sur le HTML réellement bâti des pages de contenu publiées.
- **SC-006** — Comptes auxquels l'éditrice doit se connecter pour éditer ou publier : zéro, hors son administration ouverte par son adresse e-mail ; les comptes portés par son nom sont ouverts par l'intégrateur et jamais visités par elle.
- **SC-007** — L'éditrice change seule le prix d'une option et ajoute un parfum, publie ; une demande de visiteuse l'incluant lui parvient par e-mail — détail des sélections, total indicatif, coordonnées de la visiteuse —, apparaît dans la liste, et elle y note seule la suite.
- **SC-008** — Une nouvelle version se déploie sur une instance existante sans code spécifique à ce client et sans perte de contenu.
- **SC-009** — Après avoir écrasé un contenu par erreur, l'éditrice retrouve seule la version publiée, et le site public redevient identique à ce qu'il était avant sa modification.
- **SC-010** — L'éditrice remplace l'image d'un emplacement par une image déjà présente, retrouvée depuis l'écran Médias sans la re-téléverser ; après toute suppression depuis l'écran Médias — l'image utilisée ou non —, aucune page publiée n'affiche d'image manquante.
- **SC-011** — Épreuve de réversibilité : dans un environnement neuf, depuis les seuls objets du client et sans l'intégrateur, la reconstruction documentée produit le site complet, médias compris, équivalent au site en ligne pour un visiteur — mêmes contenus, mêmes médias aux mêmes emplacements, mêmes pages au même rendu, sans exiger l'identité binaire des fichiers. Sortie conservée, datée.
- **SC-012** — Après révocation de tous les accès de l'intégrateur, le site est servi, l'administration s'ouvre, une publication aboutit.
- **SC-013** — À la livraison, l'inventaire des identifiants et liaisons ne contient aucun identifiant de l'intégrateur, et rien n'y permet de reconstituer le moyen de reprise.
- **SC-014** — Épreuve de passation : un prestataire tiers, avec les seuls accès du client et le dossier d'instance, redéploie et publie une modification en ligne, sans question à l'intégrateur. Sortie conservée, datée.
- **SC-015** — Après au moins trois mois sans usage, l'éditrice modifie et publie seule, sans aide ni réapprentissage — même épreuve que SC-003.
- **SC-016** — Le récapitulatif avant publication liste exactement les pages, réglages, formulaires publiés et les images effacées : sur un jeu de brouillons connu, aucune omission, aucun élément en trop.
- **SC-017** — L'éditrice modifie seule le texte de la mention d'information, présenté aux visiteurs de tous les formulaires après publication.
- **SC-018** — L'éditrice saisit seule, depuis l'écran Médias, la description d'une image, servie avec elle sur toutes les pages publiées où elle est posée.
- **SC-019** — Sur un jeu de demandes connu, avec retraits ordinaires et retraits déclarés indésirables, l'écran affiche présent / commandes / retirées pour le site et par formulaire, les indésirables dans aucun, les ventilations sommant au total.
- **SC-020** — Boîte e-mail rendue inaccessible, l'éditrice ouvre seule son administration par le moyen de reprise et consulte la liste des demandes.
- **SC-021** — Épreuve de résistance de la connexion : une campagne de sollicitations — adresses balayées une à une, même adresse répétée jusqu'au plafond, preuves erronées en série, preuve valide rejouée puis présentée depuis un autre appareil — n'ouvre aucune session, n'envoie aucun message vers une adresse non autorisée, et ne produit — sous plafond — aucune différence de réponse ni de délai. Sortie conservée, datée.

## Stack

Sur quoi le produit est bâti — un **constat scannable**, pas un registre de décisions (celui-là est
`docs/legacy/1.x/stack.md`, archivé). Le *pourquoi* de chaque choix structurant est un ADR : promu dans
`docs/adr/` (cité par son numéro), ou hérité du 1.x et en attente de promotion dans
`docs/adr/_candidates/` (cité par son intitulé — la numérotation 2.x lui est attribuée à la
promotion, un geste humain dans `docs/adr/`). Aucune version exacte : les manifestes du dépôt
et `docs/ci.md` les portent, une copie dériverait ici.

- **Langage** — TypeScript en mode strict, partout (candidat `langage-typescript-strict`).
- **Générateur du site public et de l'aperçu** — Astro : chaque page publique est un document complet bâti à la publication (candidat `generateur-astro-7`).
- **Îlots interactifs** — Svelte 5 dans Astro, pour le formulaire de devis public comme pour l'administration (candidat `ilots-svelte-5`). Base de composants des **îlots d'administration**, gestion du contenu comprise : **registre shadcn-svelte** — composants copiés dans le dépôt, non dépendance opaque (ADR-0009).
- **Hébergement et exécution** — un Worker Cloudflare unique sert le public et l'administration sur la **même origine**, sur le palier gratuit ; build par Workers Builds (candidat `cible-de-deploiement-worker-unique-workers-builds`).
- **Données** — Cloudflare D1 : brouillons, état publié, demandes, sessions et médias en brouillon (candidats `magasin-d1-brouillons-etat-publie-et-demandes`, `acces-aux-donnees-api-d1-native-et-migrations-wrangler`).
- **Contenu et médias publiés** — dépôt GitHub : contenu en fichiers, médias sur une branche dédiée ; écriture additive par l'API git data (candidats `format-du-contenu-un-repertoire-par-objet`, `medias-deux-magasins-un-par-etat`, `forge-github-api-git-data-jeton-a-portee-fine`).
- **Ingestion et pipeline des médias** — liste blanche JPEG/PNG/WebP reconnue sur les octets, SVG refusé ; variantes d'images produites au build (candidats `ingestion-des-medias-liste-blanche-sur-octets`, `pipeline-d-images-variantes-au-build`).
- **Texte riche** — éditeur TipTap sérialisé en Markdown restreint (candidat `texte-riche-markdown-restreint`).
- **Authentification** — implémentation maison sur D1 : code à saisir, session opaque, moyen de reprise (ADR-0001 ; candidat `moyen-de-reprise-code-128-bits-hache`).
- **Services Cloudflare** — Email Routing achemine chaque demande (ADR-0002) ; Turnstile et un compteur de fréquence tiennent l'anti-abus (candidat `anti-abus-turnstile-et-compteur-a-empreintes-de-fenetre`).
- **En-têtes et CSP** — deux porteurs (`_headers` pour le public, middleware pour l'administration), CSP stricte propre à l'administration (ADR-0004, ADR-0008, ADR-0010).
- **Tests** — Vitest dans `workerd`, Playwright pour les parcours, épreuve de réversibilité scriptée (ADR-0003).
- **Configuration d'instance** — quatre lieux, un par nature de valeur ; aucun secret dans le dépôt (ADR-0005).

## Domaines transverses (base des ADR)

Les préoccupations durables par domaine — le *quoi* qu'on doit réussir. La **décision** reste un
ADR (`docs/adr/`), qui cite la préoccupation ; on n'inscrit ici aucun invariant, aucun chemin, aucune
décision. La plupart sont déjà tranchées — par un ADR du cycle courant (`docs/adr/`) ou par un ADR
hérité du 1.x en attente de promotion depuis `docs/adr/_candidates/` ; celles marquées **(ouverte)**
ne le sont nulle part et attendent leur promotion dans `docs/adr/`.

### Architecture
- **ARCH-1** — Reconstructibilité : le site public se rebâtit sans le produit ni l'intégrateur, depuis les seuls fichiers déposés chez le client.
- **ARCH-2** — Confinement de l'origine commune : le public et l'administration partagent la même origine, et aucune frontière entre zones ne peut être tenue par le déploiement — le confinement se tient de l'intérieur du dépôt.
- **ARCH-3** — Fidélité de l'aperçu : le rendu d'un emplacement n'existe qu'en un lieu, atteint identiquement par le publié et par l'aperçu.
- **ARCH-4** — Uniformité de la flotte : une version se déploie sur toute instance sans code propre au client ; ce qui diffère reste de la configuration.
- **ARCH-5** — Testabilité sans plateforme : la logique métier s'instancie et se vérifie sans base, sans HTTP, sans Worker.

### Sécurité
- **SEC-1** — Le cookie de session d'administration vit sur l'origine commune : tout script tiers chargé où que ce soit est un risque XSS contre lui.
- **SEC-2** — Les surfaces exposées au public (connexion, envoi d'une demande) résistent à l'abus sans compte visiteur, sans friction disproportionnée, sans consommer les quotas gratuits.
- **SEC-3** — Zéro secret appartenant à l'intégrateur : tout identifiant est créé au nom du client, jeton d'écriture du CMS compris.
- **SEC-4** — L'écran de connexion ne trahit pas quelle adresse ouvre l'administration : réponse et délai indépendants de l'envoi effectif d'un message, tant que le plafond n'est pas atteint — sans traiter l'adresse autorisée comme un secret.
- **SEC-5** — Un média téléversé est servi sur l'origine commune avant toute publication, avec un type que le code choisit : un fichier qui ment sur sa nature y devient du contenu exécutable.
- **SEC-6** — Le texte riche de l'éditrice et les données des visiteurs finissent rendus dans des pages servies sur l'origine commune : toute saisie devenue HTML exécutable est un XSS de l'intérieur, sans script tiers.
- **SEC-7** — L'acheminement des demandes ouvre à l'internet anonyme un canal d'écriture vers la boîte même qui ouvre l'administration : un message acheminé ne doit jamais pouvoir se faire passer pour un message du produit.
- **SEC-8** — Une session d'administration volée use des mêmes portes que l'éditrice : son rayon d'action doit rester énuméré et borné, sans qu'elle puisse détruire le contenu de référence publié.

### UX/UI
- **UX-1** — Aucun terme de développeur dans un texte visible par l'éditrice — session, cookie, requête, 404, commit, build… : la liste des termes proscrits est un plancher, jamais un plafond.
- **UX-2** — L'éditrice agit seule, sans notion technique, y compris à sa première édition après des mois sans usage.
- **UX-3** — L'éditrice ne peut rien casser : gabarits de pages et structures de formulaires figés à l'intégration, aucun geste de création ou de composition.

### Données personnelles
- **DAT-1** — Chaque demande transporte les coordonnées d'un visiteur, conservées dans l'instance et acheminées par e-mail : l'information du visiteur, la politique de durée et le cadre juridique restent à cadrer avant la première mise en ligne — le versant produit (effacement praticable, aucune purge d'office) est déjà arrêté au PRD. **(ouverte)**
- **DAT-2** — L'acheminement des demandes peut cesser en silence (compte suspendu, palier, délivrabilité) : comment l'éditrice s'en aperçoit avec ses seuls moyens, sans surveillance hébergée par l'intégrateur, reste à trancher — la phase Stack a esquissé un état d'acheminement porté par chaque demande, sans exigence porteuse à ce jour. **(ouverte)**
- **DAT-3** — La défense anti-abus compte par origine, et une « même origine » est une adresse IP, donc une donnée personnelle : la protection du site ne doit pas créer un fichier des visiteurs.

## Découpage — epics

L'epic nomme ses features par `NNN` quand elles sont sur le disque ; sinon, par leur intention.
Trois changes existent aujourd'hui (`001` et `002` livrés et fusionnés dans `openspec/specs/`,
`003` en cours) ; le reste est de la planification — son `NNN` sera attribué à la création du
change (`/opsx:propose`). L'avancement réel se lit par `/scd-spec-dev:status`, jamais ici.
Deux identifiants ne sont rattachés à aucune feature, à dessein : FR-117 (langage de l'interface)
s'impose à toutes, et SC-002 (le site en production) est le critère-somme du produit entier.

### Epic A — Entrer et éditer · Now
Le cœur du produit : l'éditrice entre, remplit ses pages, gère ses images, règle ses formulaires, prévisualise et publie.
Résultats-clés :
- L'éditrice édite et publie seule, sans aide et sans vocabulaire technique.
- Aucune fausse manœuvre ne peut casser la mise en page ni laisser un trou dans une page publiée.
Features :
- **001** — Connexion de l'éditrice par code   (FR-001→006, FR-008, FR-118, FR-120→122 · SC-006, SC-021)
- **002** — Socle d'îlots d'administration shadcn-svelte   (aucun FR propre — substrat des features d'édition · SEC-1, ARCH-2, UX-1)
- **003** — Remplir et corriger les emplacements d'une page   (FR-015→026 · SC-003, SC-015)
- Bibliothèque de médias   (FR-027→040 · SC-010, SC-018)
- Réglages transverses   (FR-041→044 · SC-017)
- Réglage des formulaires de devis   (FR-045→051 · SC-007)
- Aperçu et publication   (FR-080→091 · SC-004, SC-016)

### Epic B — Convertir le visiteur · Next
Le site vitrine devient un outil qui rapporte : pages rapides, devis chiffré, demandes reçues et pilotées.
Résultats-clés :
- Une visiteuse compose une demande chiffrée et l'envoie ; l'éditrice la reçoit et la suit.
- Le site public reste statique et rapide — un seul traitement serveur, l'envoi d'une demande.
Features :
- Composer et envoyer une demande de devis   (FR-007, FR-052→062 · SC-007) — porte FR-007, le seuil par origine que le SPEC de 001 déclare hors-périmètre et lui délègue
- Réception et suivi des demandes   (FR-063→079 · SC-007, SC-019)
- Site public rapide et complet   (FR-095→097 · SC-005)

### Epic C — Filets & reprise · Later
Ce qui protège l'éditrice quand quelque chose tourne mal — sans destinataire au premier jour, mais vital ensuite.
Résultats-clés :
- Une fausse manœuvre a un remède ; une boîte e-mail perdue n'enferme pas l'éditrice dehors.
Features :
- Restauration : retour à la dernière version publiée   (FR-092→094 · SC-009)
- Moyen de reprise   (FR-009→012 · SC-020)
- Remplacement de l'adresse autorisée   (FR-013, FR-014)

### Epic D — Flotte & réversibilité · Later
Ce qui rend la promesse commerciale vraie et exécutable : déployer, maintenir, et partir sans rien perdre.
Later dans l'ordre de construction, pas dans l'échéance : rien n'entre en production (SC-002) sans
instance déployée au nom du client, et la reconstruction s'éprouve « à la livraison, pas plus
tard » (SC-011) — l'epic se solde avant la première mise en ligne.
Résultats-clés :
- Une instance se déploie et se met à jour selon une convention identique, sans code par client.
- Un tiers reconstruit et reprend le site depuis les seuls objets du client, sans l'intégrateur.
Features :
- Déployer une instance au nom du client   (FR-098→104 · SC-001, SC-012, SC-013)
- Déployer une nouvelle version sur une instance existante   (FR-105, FR-106 · SC-008)
- Reconstruire le site sans le CMS   (FR-107→109 · SC-011)
- Dossier d'instance   (FR-110→116, FR-119 · SC-014)
