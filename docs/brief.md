# Brief — ColibriCMS

| | |
|---|---|
| **Statut** | accepted |
| **Date** | 2026-08-06 |
| **Trace vers** | — (racine de la chaîne) |
| **Consommé par** | PRD, Stack, ADR |
| **Documents liés** | [Socle de livraison](./socle-de-livraison.md) — invariants, clausier, limites datées |

## Problème

Une petite entreprise qui veut un site vitrine rapide et bien référencé a intérêt à ce
qu'il soit statique. Mais dès qu'elle veut en modifier le contenu et les images
elle-même, elle se heurte à un choix entre deux familles d'outils, dont aucune ne lui
convient.

Les CMS *git-based* sont gratuits et faits pour le statique, mais leur architecture **est**
l'authentification de l'éditeur contre un hébergeur de code : l'éditrice doit y créer un
compte et passer par un flux d'autorisation qui ne lui évoque rien. Les CMS à base de
données n'exposent aucun concept technique à l'éditrice, mais exigent un serveur et une
base qui ne sont jamais gratuits — et le site s'éteint quand l'abonnement s'arrête.

Un audit d'expérience concurrentielle a passé quinze sites au crible et n'a trouvé qu'un
seul terrain non occupé :

> *Même prix. Même périmètre écrit. Mais quand vous arrêtez de payer, le site reste.*

Le concurrent le plus proche écrit son périmètre avec rigueur, à 49 € HT par mois, sur la
même cible mot pour mot — **et le client perd son site à la résiliation.**

L'espace que ColibriCMS vise tient donc en trois propriétés simultanées, qu'aucun outil ne
réunit : **aucun outil de développeur exposé à l'éditrice**, **un coût d'hébergement nul**,
et **un site qui survit à la disparition de son prestataire**. Où vit techniquement le
contenu — base de données, fichiers versionnés, ou les deux — est un *moyen* d'y parvenir
et non une promesse faite à la cliente : c'est une décision de la phase Stack, pas du
Brief.

Ce territoire ne se tient pas par un argument, il se tient par une topologie de
déploiement, et il tombe au premier objet qui vit ailleurs que chez le client. D'où le
test unique dont tout le reste découle : **si Isometria disparaît demain, que reste-t-il au
client ?**

**Pourquoi maintenant** : une cliente pâtissière-cake designer attend toujours son site
vitrine éditable, et sera le premier client réel de ColibriCMS. Aucun outil existant ne
permet de le lui livrer sans lui faire créer un compte technique ou payer un hébergement
mensuel.

**Pour qui** : les clients d'Isometria, dont l'intégrateur est l'unique déployeur. Le code
est publié en open source et auditable, mais la v1 ne promet pas l'auto-hébergement par un
tiers.

## Objectif & résultat attendu

Une cliente non technicienne gère seule le contenu et les médias de son site vitrine
statique, hébergé pour 0 €/mois, sans avoir créé le moindre compte ni appris le moindre
concept de développeur — et **tout ce qui fait son site lui appartient déjà**, si bien
qu'une séparation ne demande aucun transfert.

Le site convertit ses visiteurs en prospects par un formulaire de devis dont l'intégrateur
pose la structure et dont **elle** règle seule les options, les prix et les libellés : le
visiteur compose sa commande, obtient une estimation indicative calculée dans son
navigateur, et l'envoie ; la demande parvient à la cliente par e-mail et reste consultable
dans son admin, où elle en note la suite.

Le résultat est atteint quand le site de la pâtisserie tourne en production sur
ColibriCMS, qu'elle y publie sans aide, qu'une demande de devis composée par un visiteur
lui parvient, et qu'un développeur tiers reconstruit le site à partir des seuls objets
qu'elle possède, sans aucun accès à ColibriCMS.

## Utilisateurs & cas d'usage principaux

- **Éditrice** (la cliente, seule sur son site) → remplir et corriger les emplacements de
  ses pages, gérer ses images, régler les options et les prix de son formulaire de devis,
  noter la suite donnée aux demandes reçues, prévisualiser et publier — sans assistance et
  sans vocabulaire technique. Elle est aussi **propriétaire de tous les comptes** qui
  portent son site, mais ne s'y connecte jamais dans son travail d'édition.
- **Visiteur** (public du site) → consulter des pages qui chargent vite et sont
  correctement référencées, et composer une demande de devis chiffrée qu'il envoie.
- **Intégrateur** (Isometria, unique déployeur) → ouvrir les comptes au nom du client,
  poser les gabarits de pages et la structure des formulaires, déployer une instance par
  client selon une convention identique, et maintenir la flotte dans le temps.
- **Développeur tiers** (hypothétique, mais c'est lui qui rend la promesse vérifiable) →
  reconstruire le site complet à partir des seuls objets que la cliente possède, sans
  concours d'Isometria ni accès au CMS.

## Périmètre

### Inclus (v1)

- **Pages sous gabarit** : l'intégrateur pose les emplacements, l'éditrice les remplit.
  Types de contenu éditables : texte riche, images, galeries, carrousel, vidéo par lien
  externe, boutons d'action (libellé et destination).
- **Médias** : téléversement d'images et écran de gestion complet — grille de toutes les
  images du site, recherche, renommage, suppression, remplacement, et réemploi d'une image
  déjà présente dans un emplacement.
- **Réglages transverses** : coordonnées de contact et liens vers les réseaux sociaux,
  éditables une fois et affichés sur l'ensemble du site.
- **Formulaire de devis** : la structure (quels champs, de quel type, dans quel ordre) est
  un artefact d'intégration défini hors admin ; l'éditrice édite les options, leurs prix et
  leurs libellés. Le total présenté au visiteur est une somme simple des contributions des
  champs choisis, calculée dans son navigateur. Le caractère **indicatif et non engageant**
  de l'estimation est affiché au visiteur avec le total : la règle d'EXCLU « Prix ferme »
  se voit à l'écran, pas seulement au contrat.
- **Réception et suivi des demandes** : chaque soumission est acheminée par e-mail à
  l'éditrice **et** enregistrée dans une liste consultable de l'admin, portant un **champ de
  suite qu'elle renseigne elle-même** — sans suite, devis envoyé, commande. Deux nombres en
  sortent : ce que le site a apporté, et ce que ça a donné.
- **Cycle de mise en ligne** : brouillon privé → aperçu fidèle du rendu → publication
  explicite qui met le site public à jour.
- **Contenu déposé en clair chez le client** : la publication dépose le contenu **et** les
  médias en fichiers lisibles, dans des espaces appartenant au client, et c'est ce dépôt de
  fichiers qui déclenche la reconstruction du site. Un seul mécanisme : la copie portable et
  le déclencheur sont le même geste, donc la copie ne peut jamais être périmée.
- **Reconstruction sans ColibriCMS** : une procédure de reconstruction lisant les seuls
  fichiers déposés, sans base et sans ColibriCMS, documentée avec eux.
- **Dossier d'instance** : les pièces qui permettent de reprendre l'exploitation du site
  d'une cliente sans Isometria — comptes et à quel nom, emplacement de chaque objet,
  identifiants et où ils sont rangés, procédures de redéploiement, de publication et de
  reconstruction. Le dossier vit dans un espace appartenant à la cliente et connu d'elle ;
  il ne consigne aucun secret en clair — il dit où chaque identifiant est rangé, jamais sa
  valeur — et recense les comptes dont la récupération dépend de sa boîte e-mail.
- **Restauration** : retour à la dernière version publiée, abandonnant le brouillon en
  cours.
- **Authentification** de l'éditrice par sa seule adresse e-mail.

### EXCLU (v1)

Ces exclusions sont des décisions, pas des lacunes. Chacune est réversible quand un client
réel la demandera.

- **Constructeur visuel de formulaires.** L'admin n'expose aucun éditeur de structure : ni
  palette de champs, ni ajout ou retrait de champ. Ce que l'éditrice doit changer seule,
  c'est le contenu du formulaire (parfums, prix, libellés), pas sa structure. Changer un
  champ passe par l'intégrateur.
- **Création et composition libre de pages.** L'éditrice ne crée aucune page et ne peut ni
  ajouter, ni retirer, ni réordonner un bloc. Les gabarits sont figés à l'intégration —
  c'est ce qui rend impossible qu'elle casse la mise en page de son propre site.
- **Hébergement de vidéo.** Les vidéos sont des liens externes affichés dans un lecteur
  intégré. Stocker, encoder et servir de la vidéo est le premier poste qui ferait sortir du
  palier gratuit.
- **Articles, auteurs et tags.** La cliente n'a ni blog, ni flux daté, ni corpus à
  parcourir. Reporté jusqu'au premier client qui a réellement un blog.
- **Multi-éditeurs, rôles et permissions, édition concurrente.** Un seul éditeur par site :
  la collision qu'un verrou protégerait est structurellement impossible.
- **Historique daté des versions.** Un seul état antérieur est atteignable depuis l'admin —
  la dernière version publiée. Ni pile de versions présentée à l'éditrice, ni comparaison,
  ni restauration d'un état plus ancien.
- **Réversibilité de l'historique des demandes.** Les demandes reçues sont consultables
  dans l'admin tant que le CMS fonctionne ; leur historique n'est pas couvert par la
  garantie de contenu en clair (`I2`) et ne survit pas à l'outil. Ce que la cliente doit
  conserver d'une demande — un prospect, une commande — vit déjà dans sa boîte e-mail, où
  chaque demande arrive.
- **Upload de fichier par le visiteur** (joindre une photo du modèle souhaité). Ce serait
  le seul endroit où un inconnu, depuis l'internet public, écrit dans le stockage d'une
  instance sans surveillance. La borne à poser (poids, type, rétention, abus) coûte plus que
  la capacité ne rapporte en v1.
- **Prix ferme ou contractuel.** Le total affiché au visiteur est indicatif et non
  engageant : aucun tarif opposable, aucun devis à valeur contractuelle.
- **Logique de formulaire avancée.** Ni champ conditionnel, ni formulaire multi-étapes, ni
  règle de prix combinatoire (paliers, remises). Ces capacités s'ajouteront quand un
  formulaire réel les exigera.
- **Pages publiques dynamiques.** Consulter une page ne déclenche aucun traitement serveur :
  le HTML est bâti à la publication et l'estimation se calcule dans le navigateur du
  visiteur. C'est le principe qui rend la gratuité et la performance possibles. **Unique
  exception assumée** : l'envoi d'une demande de devis déclenche un traitement serveur
  (réception, acheminement par e-mail, enregistrement). Cette entaille est circonscrite à ce
  seul geste.
- **Mutualisation multi-clients.** Un déploiement = un site = un client. Aucune notion de
  tenant dans le produit, aucune console centrale de flotte.
- **Tout service hébergé par Isometria.** Rien ne s'exécute sur une infrastructure du
  studio : ni file d'attente, ni service de build, ni stockage, ni fonction, ni tâche
  planifiée, ni surveillance. Le produit est déployé chez le client, il n'est pas offert
  comme service.
- **Analytique tierce.** Aucun mouchard, aucun service d'analytique externe : les
  indicateurs de fréquentation appartiennent déjà au compte du client, et l'instrument du
  produit est le compteur de demandes, pas le trafic.
- **Le relevé mensuel et son commentaire.** Le produit fournit l'instrument (les demandes et
  leur suite) ; la lecture qu'on en vend est une offre d'exploitation, hors du périmètre du
  logiciel.
- **Positionnement dans les moteurs de recherche.** Le produit livre les fondations qu'un
  site statique offre au référencement — pages rapides, HTML complet servi tel quel — mais
  **aucune position ni aucun volume de trafic n'est un livrable** : le classement dépend de
  facteurs extérieurs au produit. Toute prestation de référencement est une offre
  distincte, hors du périmètre du logiciel.
- **Auto-hébergement par un tiers.** Le code est publié, mais la v1 ne livre ni
  installateur, ni documentation d'installation grand public, ni support : l'intégrateur
  d'Isometria est le seul déployeur attendu.

## Contraintes

Les six premières sont les **invariants de livraison** : elles ne sont pas des préférences,
elles sont ce qui rend le territoire commercial vrai. Chacune se vérifie ; le détail des
vérifications et le clausier associé vivent dans le [socle de
livraison](./socle-de-livraison.md).

- **I1 — Aucun objet nécessaire au site ne vit hors des comptes du client.** Domaine,
  hébergement, base, CMS, espaces où vivent son contenu et ses médias : tout est ouvert à
  son nom. Isometria n'y dispose que d'accès, révocables à tout moment.
- **I2 — Le contenu existe à tout moment en clair, hors base.** Une base managée est
  *accessible*, elle n'est pas *portable* : sans copie en clair, le client peut lire ses
  données mais ne peut pas partir avec.
- **I3 — Le site se reconstruit sans Isometria et sans le CMS.** Un développeur tiers, à
  partir des seuls objets que le client possède déjà et sans aucun concours d'Isometria,
  obtient le site complet — médias compris — par une procédure documentée. C'est l'invariant
  qui transforme la réversibilité en fait exécutable.
- **I4 — Aucun secret appartenant à Isometria n'est nécessaire au fonctionnement.** Tout
  identifiant est créé sur le compte du client et à son nom, **y compris le jeton d'écriture
  qu'utilise le CMS pour déposer le contenu**. Si un service tiers est nécessaire (envoi
  d'e-mail), son compte est ouvert au nom du client, jamais mutualisé.
- **I5 — Aucun prélèvement n'est possible sans un acte du client.** Ce qui rend le
  prélèvement impossible n'est pas le palier gratuit mais l'absence de moyen de paiement
  enregistré : les limites gratuites sont des murs (refus, erreur temporaire), jamais des
  compteurs facturés. La gratuité s'écrit donc en **condition**, jamais en promesse
  unilatérale.
- **I6 — Le retrait des accès d'Isometria ne dégrade rien.** Après révocation, le site est
  servi, le CMS s'ouvre, une publication aboutit. Ce qui relève du suivi est **additif**,
  jamais vital.

S'y ajoutent les contraintes de conception et d'exploitation :

- **Une instance se reprend sur pièces.** Tout ce qu'il faut pour exploiter le site d'une
  cliente sans Isometria est écrit et vit avec l'instance : quels comptes existent et à quel
  nom, où vit chaque objet, quels identifiants et où ils sont rangés, comment redéployer,
  comment publier, comment reconstruire. Cette documentation n'est pas un livrable de fin de
  mission — un dossier écrit au moment de partir n'est jamais écrit — mais une pièce tenue à
  jour, et **elle se vérifie par exécution** : un tiers reprend, ou la documentation est
  fausse. C'est la contrepartie opérationnelle de `I1` à `I6` ; sans elle, « tout est chez
  vous » reste une phrase.
- **Aucun compte technique dans le parcours d'édition.** L'éditrice ne se connecte à rien
  d'autre qu'à son admin, par sa seule adresse e-mail. Les comptes ouverts à son nom
  — hébergement et espaces où vit son contenu — le sont **par l'intégrateur**, avec cette
  même adresse, et elle n'a jamais à s'y rendre : ni pour éditer, ni pour publier. Ces
  espaces sont un instrument de réversibilité, pas une interface.
- **Aucun vocabulaire de développeur exposé** dans l'interface d'édition : ni commit, ni
  branche, ni build, ni déploiement.
- **Hébergement Cloudflare, offre gratuite.** Donnée d'entrée et non choix à justifier :
  l'agence y est déjà installée. Le produit doit tenir intégralement sur le palier gratuit
  dans les conditions d'un site vitrine. **Aucune valeur chiffrée de plateforme n'est figée
  ici** : les paliers ont déjà bougé plusieurs fois et vivent dans l'annexe datée du socle de
  livraison, qui se révise sans rouvrir le contrat.
- **Open source**, choisi dès l'origine — comme mode de publication du code, sans promesse
  d'usage par des tiers en v1.
- **Un déploiement = un site**, selon une convention de déploiement identique d'un client à
  l'autre.
- **Flotte maintenable dans le temps.** Une nouvelle version doit pouvoir être déployée sur
  **toutes** les instances clientes existantes sans code spécifique par client et sans perte
  de leur contenu. Cet impératif prime sur toute personnalisation par client qui le
  compromettrait : ce qui diffère d'un client à l'autre reste de la configuration, jamais du
  code divergent.
- **Le code entrant n'est pas relu ligne à ligne.** Aujourd'hui parce qu'une seule personne
  construit le produit en s'appuyant sur la génération assistée par IA ; demain parce que
  l'open source peut amener des contributeurs extérieurs. Dans les deux cas la confiance ne
  peut pas reposer sur la relecture humaine : elle doit être établie par des vérifications
  mécaniques.
- **Les surfaces exposées au public résistent à l'abus.** L'envoi d'une demande de devis —
  unique traitement serveur — et l'accès à l'admin sont les seuls endroits où un inconnu,
  depuis l'internet public, sollicite l'instance. Une soumission automatisée massive ne
  doit ni rendre la liste des demandes inutilisable, ni fausser les deux nombres qui en
  sortent, ni consommer les quotas gratuits (`I5`), ni mettre en danger le compte d'envoi
  d'e-mail de la cliente. Le moyen est tranché en phase Stack ; il doit rester compatible
  0 € et n'imposer au visiteur ni compte, ni friction disproportionnée.

## Critères de succès (mesurables)

- **SC-001** — Coût d'hébergement : **0 €/mois par site** en conditions nominales, et à la
  livraison **aucun moyen de paiement enregistré** sur le compte du client, **aucun
  abonnement payant** souscrit.
- **SC-002** — Le site de la pâtisserie est **en production** sur ColibriCMS. *(Pas
  d'échéance contractuelle : la cliente attend sans date ferme.)*
- **SC-003** — Autonomie : l'éditrice **modifie un texte et remplace une image, seule, sans
  aide et du premier coup**, lors d'un test d'usage réel observé.
- **SC-004** — Fraîcheur : une modification publiée est **visible en ligne en moins de
  5 minutes** après l'action « Publier ».
- **SC-005** — Performance du site public : score **Lighthouse Performance ≥ 95 en mobile**,
  mesuré sur le HTML réellement bâti des pages de contenu.
- **SC-006** — Comptes auxquels l'éditrice doit se connecter pour éditer ou publier :
  **zéro**, hors son admin ouvert par son adresse e-mail. Les comptes portés par son nom
  sont ouverts par l'intégrateur et **jamais visités par elle**.
- **SC-007** — La pâtissière **change seule le prix d'une option et ajoute un parfum** à son
  formulaire de devis, puis publie. Une visiteuse compose ensuite une demande incluant ce
  nouveau parfum : la demande **parvient à la pâtissière par e-mail** avec le détail des
  sélections, le total indicatif et les coordonnées de la visiteuse, **apparaît dans la liste
  des demandes reçues**, et la pâtissière y **renseigne seule la suite donnée**.
- **SC-008** — Une nouvelle version de ColibriCMS **se déploie sur une instance cliente
  existante sans modification de code spécifique à ce client, et sans perte de son
  contenu**.
- **SC-009** — Après avoir écrasé un contenu par erreur, l'éditrice **retrouve seule la
  version publiée**, et le site public redevient identique à ce qu'il était avant sa
  modification.
- **SC-010** — L'éditrice **remplace l'image d'un emplacement par une image déjà présente**,
  retrouvée depuis l'écran Médias sans la re-téléverser ; et après toute suppression
  d'image depuis l'écran Médias — qu'elle soit utilisée ou non — **aucune page publiée
  n'affiche d'image manquante** ; le moyen (blocage, avertissement, retrait de
  l'emplacement) est laissé à l'aval.
- **SC-011** — **Épreuve de réversibilité** : dans un environnement neuf, à partir des seuls
  objets que la cliente possède et sans aucun concours d'Isometria, la procédure de
  reconstruction documentée produit **le site complet, médias compris, équivalent au site
  en ligne pour un visiteur** : mêmes contenus, mêmes médias aux mêmes emplacements, mêmes
  pages au même rendu — l'identité binaire des fichiers n'est pas exigée. La sortie est
  conservée comme pièce, datée.
- **SC-012** — Après **révocation de tous les accès d'Isometria**, le site est toujours
  servi, l'admin s'ouvre, et une publication aboutit.
- **SC-013** — À la livraison, l'inventaire des variables d'environnement et des liaisons du
  déploiement ne contient **aucun identifiant appartenant à Isometria** — jeton d'écriture du
  CMS compris.
- **SC-014** — **Épreuve de passation** : un prestataire tiers, avec les seuls accès aux
  comptes de la cliente et le dossier d'instance, **redéploie l'instance et publie une
  modification qui apparaît en ligne**, sans poser aucune question à Isometria. La sortie est
  conservée comme pièce, datée.
- **SC-015** — Rémanence de l'autonomie : lors de sa première édition après au moins trois
  mois sans usage, l'éditrice **modifie et publie seule, sans aide** — même épreuve que
  `SC-003`, sans réapprentissage.

## Hypothèses à confirmer

- **Fréquence d'édition rare** — la cliente prévoit d'intervenir quelques fois par an. Non
  observé : hypothèse posée à la date de ce brief, à confirmer par son usage réel. Elle
  justifie le faible coût accepté sur la fraîcheur (`SC-004`) et l'absence de raccourcis
  d'édition.

## Questions ouvertes

- **Où vit le magasin de contenu.** `I2` et `I3` imposent le contenu en clair, hors base,
  chez le client ; reste à décider si cet espace **est** le magasin (l'admin y écrit à la
  publication, les brouillons vivant ailleurs) ou s'il en est une **copie** déposée depuis
  une base. La première voie satisfait `I2`, `I3` et `SC-009` par construction et supprime
  toute désynchronisation ; la seconde impose une double écriture à maintenir. Une recherche
  approfondie est en cours côté produit. **Tranché en phase Stack**, pas ici.
- **Où vivent les médias.** Au même endroit que le contenu textuel, ou dans un stockage
  objet distinct du compte de la cliente ? Le second sépare ce qui est lisible et comparable
  de ce qui est binaire et volatil : il évite qu'un espace versionné grossisse sans jamais
  maigrir, retire les images du décompte de fichiers par déploiement — la limite qui mord en
  premier — et rend honnête le geste « supprimer » de l'écran Médias. Il coûte un **manifeste
  des médias** déposé avec le contenu (clé, nom d'origine, dimensions, texte alternatif),
  sans lequel `SC-011` devient une devinette. À trancher avec la question précédente, **en
  phase Stack**, et après vérification du palier gratuit applicable : le stockage objet et le
  produit de transformation d'images de la plateforme n'ont pas le même statut, et un produit
  payant est disqualifié net par `I5`.
- **Service d'envoi d'e-mail** non choisi. Quel qu'il soit : son compte s'ouvre au nom de
  la cliente (`I4`) ; il fonctionne sans moyen de paiement enregistré (`I5`) ; sa
  délivrabilité vers les boîtes courantes se vérifie à la recette. **Si aucun service ne
  satisfait ces trois conditions, le Brief se rouvre** — c'est une hypothèse d'existence,
  pas un choix de confort. Tranché en phase Stack.
- **Détection d'une panne d'acheminement des demandes.** L'e-mail peut cesser d'arriver en
  silence — compte suspendu, palier atteint, délivrabilité dégradée — pendant que la liste
  de l'admin se remplit sans être consultée. Comment la cliente s'en aperçoit-elle avec
  ses seuls moyens, sans surveillance hébergée par Isometria (`I6`) ? Tranché en phase
  Stack.
- **Perte ou compromission de la boîte e-mail de la cliente.** Cette boîte ouvre l'admin
  et porte la récupération de tous les comptes ouverts à son nom : c'est la clé de voûte
  de l'instance. Quel est le chemin de reprise si elle devient inaccessible, et
  qu'exige-t-il d'avoir été préparé à la livraison ? À cadrer avant la première mise en
  ligne.
- **Moyen anti-abus des surfaces exposées.** Non choisi. Quel qu'il soit : gratuit sans
  moyen de paiement (`I5`), sans compte visiteur, sans service hébergé par Isometria.
  **Tranché en phase Stack.**
- **Données personnelles des demandes de devis.** Chaque demande transporte les
  coordonnées d'un visiteur, conservées dans l'instance et acheminées par e-mail.
  Information du visiteur, durée de rétention, effacement : obligations à cadrer **avant
  la première mise en ligne** — la relecture juridique prévue au socle ne couvre
  aujourd'hui que le clausier.
- **Réplicabilité non chiffrée** (« déployer une nouvelle instance client en moins de
  N heures »). Ne le sera pas de façon crédible avant le deuxième déploiement réel — à
  trancher à ce moment-là plutôt qu'à l'estime.
