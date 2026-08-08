# PRD — ColibriCMS

| | |
|---|---|
| **Statut** | accepted |
| **Date** | 2026-08-06 |
| **Trace vers** | [Brief](./brief.md) |
| **Consommé par** | Stack, ADR, niveau specs |
| **Documents liés** | [Socle de livraison](./socle-de-livraison.md) — invariants `I1`–`I6`, contraintes `C1`–`C10` |

> **Ce que ce document est.** La réponse au *quoi*, au niveau produit. Il énumère les
> capacités d'ensemble de ColibriCMS et rien de leur réalisation : aucun langage, aucune
> plateforme, aucun format de fichier n'y figure. Ces choix sont l'objet de la phase Stack.
>
> Les `SC-001` à `SC-015` sont **repris du Brief sans renumérotation** — ils sont le fil qui
> relie le socle à l'implémentation. Les `SC-016` à `SC-018` sont introduits ici.

---

## User stories (priorisées, niveau produit)

Les priorités disent **l'ordre de construction**, pas la valeur : les quatorze stories sont
toutes en v1. Chaque priorité se justifie par un critère de succès qui ne peut pas être
prouvé sans elle.

### US1 — Ouvrir son admin sans compte technique (P1)

L'éditrice arrive sur son outil d'édition, donne son adresse e-mail, et travaille. Elle n'a
créé aucun compte, ne mémorise aucun mot de passe, ne visite aucun autre service — y compris
ceux ouverts à son nom, qui sont un instrument de réversibilité et non une interface.

- **Pourquoi P1** : `SC-006` (zéro compte à visiter) est une porte d'entrée : aucune autre
  story n'est atteignable sans elle.
- Scénarios d'acceptation :
  1. **Given** une instance livrée avec l'adresse de l'éditrice déclarée, **When** elle
     renseigne cette adresse, **Then** sa session d'édition s'ouvre sans autre information
     demandée.
  2. **Given** une adresse e-mail qui n'est pas celle déclarée pour l'instance, **When** elle
     est renseignée, **Then** aucune session ne s'ouvre.
  3. **Given** une éditrice qui n'a pas ouvert son admin depuis trois mois, **When** elle y
     revient, **Then** le geste d'ouverture est le même qu'à sa première visite et n'exige
     aucune information qu'elle aurait dû conserver.

### US2 — Corriger le contenu d'un emplacement (P1)

L'éditrice ouvre une page, voit ses emplacements remplis, en modifie un, et n'a jamais le
moyen d'en ajouter, d'en retirer ni d'en déplacer un. C'est ce qui rend impossible qu'elle
casse la mise en page de son propre site.

- **Pourquoi P1** : `SC-003` et `SC-015` (autonomie, du premier coup, y compris après trois
  mois) portent directement sur ce geste.
- Scénarios d'acceptation :
  1. **Given** la page « Accueil » et son emplacement de texte « Présentation », **When**
     l'éditrice en modifie le texte, **Then** la modification est retenue dans son brouillon
     et l'aperçu la montre.
  2. **Given** n'importe quelle page ouverte en édition, **When** l'éditrice cherche à
     ajouter, retirer ou déplacer un emplacement, **Then** l'outil n'offre aucun moyen de le
     faire.
  3. **Given** l'interface d'édition, **When** l'éditrice la parcourt entièrement, **Then**
     aucun terme désignant un mécanisme de développement n'y figure.

### US3 — Gérer sa bibliothèque d'images (P1)

L'éditrice téléverse, retrouve, renomme et supprime ses images depuis un écran unique, et
réemploie une image déjà présente sans la re-téléverser. Le produit ne la laisse jamais
produire un emplacement sans image.

- **Pourquoi P1** : `SC-010` en entier, et `SC-003` (« remplace une image, seule, du premier
  coup ») dépendent de cette story.
- Scénarios d'acceptation :
  1. **Given** une image déjà présente dans la bibliothèque, **When** l'éditrice l'affecte à
     un emplacement, **Then** l'emplacement l'affiche sans nouveau téléversement.
  2. **Given** une image utilisée par l'emplacement « bannière » de la page « Accueil »,
     **When** l'éditrice demande sa suppression, **Then** la suppression est refusée et
     l'outil nomme l'emplacement et la page qui l'utilisent.
  3. **Given** une image qu'aucun emplacement n'utilise, ni dans le brouillon ni dans la
     dernière version publiée, **When** l'éditrice demande sa suppression, **Then** l'image
     est supprimée.
  4. **Given** une image téléversée sans description, **When** elle est affichée sur le site
     publié, **Then** son nom tient lieu de description.

### US4 — Prévisualiser puis publier (P1)

L'éditrice travaille dans un brouillon unique qui couvre tout son site. Quand elle a fini,
elle regarde l'aperçu, lit la liste de ce qui va partir, et publie d'un geste explicite.

- **Pourquoi P1** : `SC-004` (visible en ligne en moins de 5 minutes) n'existe pas sans elle,
  et `SC-002` (site en production) non plus.
- Scénarios d'acceptation :
  1. **Given** un brouillon comportant une modification de texte sur « Accueil » et une
     modification de prix sur le formulaire, **When** l'éditrice demande à publier, **Then**
     l'outil lui présente ces deux modifications avant tout envoi.
  2. **Given** cet écran de récapitulatif, **When** l'éditrice renonce, **Then** le site
     public est inchangé et le brouillon est conservé.
  3. **Given** un brouillon quelconque, **When** aucune action de publication n'est faite,
     **Then** le site public reste identique à sa dernière version publiée.
  4. **Given** une publication achevée, **When** un visiteur charge la page modifiée, **Then**
     il en voit la nouvelle version.

### US5 — Retrouver la dernière version publiée (P2)

L'éditrice a écrasé un contenu par erreur. Elle abandonne son brouillon et retrouve son site
tel qu'il était en ligne. Un seul état antérieur existe ; il n'y a ni pile de versions, ni
comparaison, ni date à choisir.

- **Pourquoi P2** : `SC-009` est un filet, pas une porte d'entrée — il suppose qu'une
  publication ait déjà eu lieu.
- Scénarios d'acceptation :
  1. **Given** un brouillon contenant une modification erronée et une dernière version
     publiée, **When** l'éditrice abandonne le brouillon, **Then** l'admin présente exactement
     l'état de la dernière version publiée.
  2. **Given** cet abandon effectué, **When** un visiteur charge le site, **Then** il voit ce
     qu'il voyait avant la modification erronée.
  3. **Given** l'admin ouvert, **When** l'éditrice cherche un état antérieur à la dernière
     version publiée, **Then** aucun n'est atteignable.

### US6 — Régler les coordonnées et les réseaux sociaux (P1)

L'éditrice modifie une fois ses coordonnées de contact et ses liens sociaux ; le changement
vaut pour tout le site.

- **Pourquoi P1** : la mise en production (`SC-002`) suppose des coordonnées justes, et un
  déménagement ou un changement de numéro ne peut pas dépendre de l'intégrateur.
- Scénarios d'acceptation :
  1. **Given** un site dont trois pages affichent le numéro de téléphone, **When** l'éditrice
     le modifie une fois puis publie, **Then** les trois pages publiées portent le nouveau
     numéro.

### US7 — Régler les options, les prix et les libellés du devis (P2)

L'éditrice ajoute un parfum, change un prix, renomme une option, en retire une qu'elle ne
propose plus, réordonne sa liste. Elle ne touche jamais à la structure du formulaire.

- **Pourquoi P2** : `SC-007` commence par ce geste. Il suppose un site déjà éditable et
  publiable, donc il vient après le P1.
- Scénarios d'acceptation :
  1. **Given** le champ « Parfum » portant trois options, **When** l'éditrice ajoute
     « Pistache » avec son montant puis publie, **Then** le formulaire public propose
     « Pistache » et son montant entre dans le total quand un visiteur la choisit.
  2. **Given** une option dont le montant est de 5 €, **When** l'éditrice le porte à 7 € puis
     publie, **Then** le total calculé pour un visiteur qui la choisit augmente de 2 €.
  3. **Given** un champ à choix ne portant plus qu'une seule option, **When** l'éditrice
     demande à la retirer, **Then** le retrait est refusé.
  4. **Given** l'écran de réglage du formulaire, **When** l'éditrice le parcourt, **Then**
     aucun moyen d'ajouter, de retirer, de renommer ou de réordonner un champ n'y figure.

### US8 — Composer et envoyer une demande de devis (P2, visiteur)

Le visiteur compose sa commande, voit un total se mettre à jour sous ses yeux, comprend qu'il
est indicatif, laisse ses coordonnées et envoie.

- **Pourquoi P2** : c'est la seconde moitié de `SC-007`, et l'unique traitement serveur du
  produit — il suppose le formulaire réglé.
- Scénarios d'acceptation :
  1. **Given** un formulaire dont la taille « Moyen » vaut 85 €, le parfum « Fraise » 5 € et
     le décor « Fleurs fraîches » 20 €, **When** le visiteur choisit ces trois options,
     **Then** le total affiché est 110 €.
  2. **Given** ce total affiché, **When** le visiteur le regarde, **Then** son caractère
     indicatif et non engageant est affiché avec lui.
  3. **Given** une sélection en cours, **When** le visiteur change une option, **Then** le
     total est recalculé sans que la page soit rechargée depuis le serveur.
  4. **Given** une demande complète, **When** le visiteur l'envoie, **Then** la réception lui
     est confirmée dès que la demande est enregistrée.
  5. **Given** un visiteur quelconque, **When** il envoie une demande, **Then** aucun compte
     ni aucune inscription ne lui est demandé.

### US9 — Consulter les demandes et noter la suite donnée (P2)

L'éditrice retrouve dans son admin toutes les demandes reçues, en lit le détail, note ce
qu'elle en a fait, et lit les deux nombres qui en sortent. Elle peut supprimer ce qui n'a pas
lieu d'y être.

- **Pourquoi P2** : c'est la fin de `SC-007` et l'instrument du produit. Il n'a rien à mesurer
  avant que le formulaire n'existe.
- Scénarios d'acceptation :
  1. **Given** une demande envoyée par une visiteuse, **When** l'éditrice ouvre son admin,
     **Then** la demande y figure avec son horodatage, les options choisies, leurs montants,
     le total et les coordonnées de la visiteuse.
  2. **Given** une demande reçue, **When** l'éditrice renseigne « devis envoyé », **Then**
     cette suite est conservée et visible à sa prochaine visite.
  3. **Given** une demande enregistrée dont l'e-mail vers l'éditrice n'est pas parti, **When**
     l'éditrice ouvre son admin, **Then** l'outil lui signale l'existence de demandes non
     acheminées, et le signalement subsiste tant que le cas dure.
  4. **Given** quarante demandes issues d'une soumission automatisée, **When** l'éditrice les
     supprime après confirmation, **Then** elles disparaissent de la liste et des deux
     nombres.
  5. **Given** la suppression d'une demande, **When** l'éditrice la confirme, **Then** l'outil
     lui indique que la demande reste présente dans sa boîte e-mail.

### US10 — Consulter un site rapide et complet (P1, visiteur)

Le visiteur charge une page bâtie d'avance. Rien ne s'exécute sur un serveur pour la lui
servir, et son contenu est présent dès la première réponse.

- **Pourquoi P1** : `SC-005` porte sur le rendu réellement bâti, et c'est ce principe qui rend
  la gratuité possible (`SC-001`).
- Scénarios d'acceptation :
  1. **Given** une page de contenu publiée, **When** un visiteur la charge sur un appareil
     mobile, **Then** son score Lighthouse Performance est d'au moins 95.
  2. **Given** une page de contenu publiée, **When** sa réponse initiale est examinée sans
     exécuter aucun script, **Then** l'intégralité de son contenu éditorial y figure.
  3. **Given** une page de contenu publiée, **When** un visiteur la consulte, **Then** aucun
     traitement serveur propre à l'instance n'est déclenché.

### US11 — Disposer de son contenu en clair, chez elle (P1)

À chaque publication, le contenu et les médias sont déposés en fichiers lisibles dans un
espace qui appartient à la cliente. Ce dépôt n'est pas une exportation à demander : c'est le
geste même qui met le site à jour, donc il ne peut jamais être périmé.

- **Pourquoi P1** : c'est l'invariant `I2`, et la matière de `SC-011`. Le format des fichiers
  déposés est posé dès la première publication ; le décider tard reviendrait à le refaire.
- Scénarios d'acceptation :
  1. **Given** une publication achevée, **When** on examine l'espace de la cliente, **Then**
     il contient le contenu publié en fichiers lisibles, daté de cette publication.
  2. **Given** une publication comportant une nouvelle image, **When** on examine l'espace de
     la cliente, **Then** l'image y figure, accompagnée de son nom, de ses dimensions et de sa
     description.
  3. **Given** l'inventaire des identifiants nécessaires à une publication, **When** on
     l'examine, **Then** aucun n'appartient à l'intégrateur.
  4. **Given** un site publié, **When** on cherche par quel autre chemin le site public
     pourrait être reconstruit, **Then** le dépôt des fichiers est le seul déclencheur.

### US12 — Reconstruire le site sans ColibriCMS (P3, développeur tiers)

Un développeur qui n'a jamais entendu parler d'Isometria, avec les seuls fichiers déposés
chez la cliente, obtient le site complet en suivant une procédure écrite qui vit avec ces
fichiers.

- **Pourquoi P3** : `SC-011` est une épreuve, pas une capacité de l'admin. Elle se joue une
  fois la matière produite — mais elle valide rétroactivement le format posé en P1.
- Scénarios d'acceptation :
  1. **Given** un environnement neuf, les seuls fichiers déposés et aucun accès à ColibriCMS,
     **When** la procédure documentée est suivie, **Then** le site complet est produit, médias
     compris.
  2. **Given** ce site reconstruit, **When** on le compare au site en ligne du point de vue
     d'un visiteur, **Then** les contenus, les médias et leurs emplacements sont les mêmes —
     l'identité binaire des fichiers n'est pas exigée.
  3. **Given** les fichiers déposés chez la cliente, **When** on les examine, **Then** la
     procédure de reconstruction s'y trouve.

### US13 — Déployer et maintenir une instance (P3, intégrateur)

L'intégrateur déploie une instance par client selon une convention identique, et fait monter
toute la flotte en version sans écrire une ligne de code propre à un client ni perdre son
contenu.

- **Pourquoi P3** : `SC-008` ne peut être éprouvé qu'à partir d'une instance existante portant
  du contenu réel.
- Scénarios d'acceptation :
  1. **Given** une instance cliente en production portant du contenu, **When** une nouvelle
     version de ColibriCMS y est déployée, **Then** le déploiement aboutit sans aucune
     modification de code propre à cette instance.
  2. **Given** ce déploiement achevé, **When** l'éditrice ouvre son admin, **Then** tout
     contenu saisi avant le déploiement est retrouvé.
  3. **Given** un gabarit dont un emplacement rempli a été retiré, **When** cet emplacement
     est rétabli plus tard, **Then** le contenu saisi avant le retrait réapparaît à
     l'identique.
  4. **Given** une publication dont le volume approche une limite au-delà de laquelle les
     publications suivantes seraient refusées, **When** elle est effectuée, **Then**
     l'intégrateur en est averti.

### US14 — Reprendre une instance sur pièces (P3, tiers)

Un prestataire qui n'a que les accès aux comptes de la cliente et le dossier d'instance
redéploie le site et publie une modification, sans poser aucune question à Isometria.

- **Pourquoi P3** : `SC-012` et `SC-014` se vérifient par exécution, sur une instance réelle
  et complète.
- Scénarios d'acceptation :
  1. **Given** les seuls accès aux comptes de la cliente et le dossier d'instance, **When** un
     prestataire tiers redéploie l'instance et publie une modification, **Then** la
     modification apparaît en ligne sans qu'aucune question n'ait été posée à Isometria.
  2. **Given** le retrait de tous les accès de l'intégrateur, **When** on charge le site,
     **Then** il est servi.
  3. **Given** ce même retrait, **When** l'éditrice ouvre son admin et publie, **Then** la
     publication aboutit.
  4. **Given** le dossier d'instance, **When** on l'examine, **Then** aucune valeur de secret
     n'y figure — seulement l'endroit où chacun est rangé.

---

## Exigences fonctionnelles (atomiques, testables)

### Accès à l'outil d'édition

- **FR-001** : Le système DOIT ouvrir une session d'édition sur le seul renseignement de
  l'adresse e-mail déclarée pour l'instance.
- **FR-002** : Le système DOIT refuser l'ouverture d'une session à toute adresse e-mail autre
  que celle déclarée pour l'instance.
- **FR-003** : Le système DOIT permettre de rouvrir une session par le même geste après une
  interruption d'usage de durée quelconque, sans exiger d'information que l'éditrice aurait dû
  conserver.

### Édition du contenu

- **FR-004** : Le système DOIT présenter à l'éditrice la liste des pages de son site.
- **FR-005** : Le système DOIT présenter, pour une page donnée, ses emplacements éditables.
- **FR-006** : Le système DOIT permettre de modifier le contenu d'un emplacement de texte
  riche.
- **FR-007** : Le système DOIT permettre de désigner l'image affichée par un emplacement
  d'image.
- **FR-008** : Le système DOIT permettre de composer la suite ordonnée d'images d'un
  emplacement de galerie.
- **FR-009** : Le système DOIT permettre de composer la suite ordonnée d'images d'un
  emplacement de carrousel.
- **FR-010** : Le système DOIT permettre de renseigner, pour un emplacement de vidéo,
  l'adresse d'une vidéo hébergée par un service externe.
- **FR-011** : Le système DOIT permettre de modifier le libellé d'un emplacement de bouton
  d'action.
- **FR-012** : Le système DOIT permettre de modifier la destination d'un emplacement de bouton
  d'action.
- **FR-013** : Le système NE DOIT offrir à l'éditrice aucun moyen de créer, supprimer, ajouter,
  retirer ou déplacer une page ou un emplacement.
- **FR-014** : Le système NE DOIT afficher, dans l'interface d'édition, aucun terme désignant
  un mécanisme de développement.

### Réglages transverses

- **FR-015** : Le système DOIT permettre de modifier les coordonnées de contact affichées sur
  l'ensemble du site.
- **FR-016** : Le système DOIT permettre de modifier les liens vers les réseaux sociaux
  affichés sur l'ensemble du site.

### Médias

- **FR-017** : Le système DOIT permettre de téléverser une image.
- **FR-018** : Le système DOIT présenter la totalité des images du site sur un écran unique.
- **FR-019** : Le système DOIT permettre de retrouver une image par son nom.
- **FR-020** : Le système DOIT permettre de renommer une image.
- **FR-021** : Le système DOIT permettre de remplacer le fichier d'une image sans modifier les
  emplacements qui l'utilisent.
- **FR-022** : Le système DOIT permettre d'affecter à un emplacement une image déjà présente,
  sans nouveau téléversement.
- **FR-023** : Le système DOIT indiquer, pour chaque image, les pages et les emplacements qui
  l'utilisent.
- **FR-024** : Le système DOIT refuser la suppression d'une image utilisée par un emplacement
  du brouillon ou de la dernière version publiée.
- **FR-025** : Le système DOIT nommer, lorsqu'il refuse une suppression, les pages et les
  emplacements qui utilisent l'image.
- **FR-026** : Le système DOIT supprimer une image qu'aucun emplacement du brouillon ni de la
  dernière version publiée n'utilise.
- **FR-027** : Le système DOIT permettre de saisir une description facultative pour chaque
  image.
- **FR-028** : Le système DOIT employer le nom de l'image comme description lorsque la
  description est vide.

### Brouillon, aperçu et publication

- **FR-029** : Le système DOIT retenir toute modification de l'éditrice dans un brouillon
  unique couvrant l'ensemble du site — contenu des pages, réglages transverses et options du
  formulaire.
- **FR-030** : Le système DOIT présenter un aperçu du brouillon fidèle au rendu que verra le
  visiteur.
- **FR-031** : Le système DOIT présenter, avant toute publication, la liste des modifications
  du brouillon qui seront mises en ligne.
- **FR-032** : Le système DOIT permettre de renoncer depuis cet écran sans modifier le site
  public ni le brouillon.
- **FR-033** : Le système DOIT mettre le site public à jour sur une action de publication
  explicite de l'éditrice.
- **FR-034** : Le système NE DOIT mettre aucune modification en ligne en l'absence de cette
  action explicite.
- **FR-035** : Le système DOIT permettre d'abandonner le brouillon et de rétablir l'état de la
  dernière version publiée.
- **FR-036** : Le système NE DOIT rendre atteignable aucun état antérieur autre que la dernière
  version publiée.

### Dépôt du contenu chez la cliente

- **FR-037** : À chaque publication, le système DOIT déposer le contenu publié en fichiers
  lisibles dans un espace appartenant à la cliente.
- **FR-038** : À chaque publication, le système DOIT déposer les médias publiés dans un espace
  appartenant à la cliente.
- **FR-039** : Le système DOIT déposer, avec les médias, un inventaire associant chaque média à
  son nom, à ses dimensions et à sa description.
- **FR-040** : Le dépôt des fichiers DOIT être le seul déclencheur de la reconstruction du site
  public.
- **FR-041** : Le système NE DOIT exiger, pour publier, aucun identifiant appartenant à
  l'intégrateur.
- **FR-042** : Une rafale de publications rapprochées NE DOIT produire qu'une seule
  reconstruction du site public.

### Reconstruction sans ColibriCMS

- **FR-043** : Une procédure documentée DOIT produire le site complet, médias compris, à partir
  des seuls fichiers déposés chez la cliente, sans accès à ColibriCMS.
- **FR-044** : Cette procédure DOIT être déposée avec les fichiers, dans l'espace de la
  cliente.

### Site public

- **FR-045** : Le système DOIT bâtir les pages du site public à la publication.
- **FR-046** : La consultation d'une page publiée NE DOIT déclencher aucun traitement serveur
  propre à l'instance.
- **FR-047** : Le contenu éditorial d'une page publiée DOIT être présent dans la réponse
  initiale, sans exécution supplémentaire côté visiteur pour l'afficher.

### Formulaire de devis — ce que l'éditrice règle

- **FR-048** : Le système DOIT présenter à l'éditrice les champs à choix du formulaire et leurs
  options.
- **FR-049** : Le système DOIT permettre d'ajouter une option à un champ à choix.
- **FR-050** : Le système DOIT permettre de modifier le libellé d'une option.
- **FR-051** : Le système DOIT permettre de modifier le montant d'une option.
- **FR-052** : Le système DOIT permettre de retirer une option d'un champ à choix.
- **FR-053** : Le système DOIT permettre de réordonner les options d'un champ à choix.
- **FR-054** : Le système DOIT refuser le retrait de la dernière option d'un champ à choix.
- **FR-055** : Le système NE DOIT offrir à l'éditrice aucun moyen d'ajouter, de retirer, de
  renommer ou de réordonner un champ.
- **FR-056** : Le système NE DOIT offrir à l'éditrice aucun moyen de modifier le type d'un
  champ ni son caractère obligatoire.

### Formulaire de devis — le parcours du visiteur

- **FR-057** : Le système DOIT présenter au visiteur les champs du formulaire dans l'ordre
  défini à l'intégration.
- **FR-058** : Le système DOIT calculer le total sur l'appareil du visiteur, sans échange avec
  un serveur.
- **FR-059** : Le total DOIT être la somme des montants des options choisies.
- **FR-060** : Le montant d'une option NE DOIT dépendre de la valeur d'aucun autre champ.
- **FR-061** : Le système DOIT recalculer le total à chaque changement de sélection.
- **FR-062** : Le système DOIT afficher, avec le total, la mention de son caractère indicatif
  et non engageant.
- **FR-063** : Le système DOIT recueillir, avec chaque demande, les coordonnées du visiteur
  définies à l'intégration.
- **FR-064** : Le système NE DOIT exiger du visiteur aucun compte ni aucune inscription pour
  envoyer une demande.
- **FR-065** : Le système DOIT écarter les soumissions automatisées avant leur enregistrement,
  de sorte qu'elles n'entrent ni dans la liste des demandes ni dans les nombres qui en sortent.

### Réception et suivi des demandes

- **FR-066** : Le système DOIT enregistrer chaque demande soumise avec son horodatage, les
  options choisies, leur libellé et leur montant au moment de l'envoi, le total et les
  coordonnées du visiteur.
- **FR-067** : Le système NE DOIT jamais modifier le libellé ni le montant enregistrés d'une
  demande passée, quelles que soient les modifications ultérieures du formulaire.
- **FR-068** : Le système DOIT confirmer la réception au visiteur dès que la demande est
  enregistrée, indépendamment de son acheminement par e-mail.
- **FR-069** : Le système DOIT acheminer chaque demande enregistrée par e-mail à l'éditrice,
  avec les options choisies, le total et les coordonnées du visiteur.
- **FR-070** : Le système DOIT porter, pour chaque demande, son état d'acheminement.
- **FR-071** : Le système DOIT signaler à l'éditrice, à chaque ouverture de son admin,
  l'existence de demandes non acheminées.
- **FR-072** : Le système DOIT présenter à l'éditrice les demandes reçues, de la plus récente à
  la plus ancienne.
- **FR-073** : Le système DOIT permettre de consulter le détail d'une demande.
- **FR-074** : Le système DOIT permettre de renseigner la suite donnée à une demande parmi :
  sans suite, devis envoyé, commande.
- **FR-075** : Le système DOIT présenter le nombre de demandes reçues et le nombre de demandes
  ayant abouti à une commande, sur une période donnée.
- **FR-076** : Le système DOIT permettre de supprimer définitivement une demande.
- **FR-077** : Le système DOIT exiger une confirmation explicite avant toute suppression de
  demande.
- **FR-078** : Le système DOIT indiquer, au moment de la suppression, que la demande demeure
  dans la boîte e-mail de l'éditrice.
- **FR-079** : Le système DOIT exclure une demande supprimée des nombres présentés.
- **FR-080** : Le système NE DOIT enregistrer les demandes que dans un espace appartenant à la
  cliente.
- **FR-081** : Le système NE DOIT transmettre aucune donnée de fréquentation ni de demande à un
  service d'analytique tiers.

### Gabarits et maintien de la flotte

- **FR-082** : Le système DOIT conserver le contenu d'un emplacement retiré d'un gabarit.
- **FR-083** : Le système DOIT rétablir ce contenu si l'emplacement réapparaît.
- **FR-084** : Le système NE DOIT présenter à l'éditrice aucun contenu dont l'emplacement a
  disparu.
- **FR-085** : Le système DOIT mettre à disposition de l'intégrateur l'inventaire des contenus
  sans emplacement.
- **FR-086** : Le déploiement d'une nouvelle version sur une instance existante NE DOIT exiger
  aucun code propre à cette instance.
- **FR-087** : Le système DOIT avertir l'intégrateur lorsqu'une publication approche un volume
  au-delà duquel les publications suivantes seraient refusées.

### Dossier d'instance

- **FR-088** : Un dossier d'instance DOIT vivre dans un espace appartenant à la cliente et
  atteignable par elle sans l'intégrateur.
- **FR-089** : Le dossier d'instance DOIT recenser chaque compte ouvert pour l'instance et le
  nom auquel il est ouvert.
- **FR-090** : Le dossier d'instance DOIT indiquer, pour chaque objet nécessaire au site, où il
  vit.
- **FR-091** : Le dossier d'instance DOIT indiquer, pour chaque identifiant, où il est rangé.
- **FR-092** : Le dossier d'instance NE DOIT consigner la valeur d'aucun secret.
- **FR-093** : Le dossier d'instance DOIT recenser les comptes dont la récupération dépend de la
  boîte e-mail de la cliente.
- **FR-094** : Le dossier d'instance DOIT porter la procédure de redéploiement de l'instance.
- **FR-095** : Le dossier d'instance DOIT porter la procédure de publication.
- **FR-096** : Le dossier d'instance DOIT porter la procédure de reconstruction.

### Indépendance et gratuité

- **FR-097** : Le site public DOIT continuer d'être servi après le retrait de tous les accès de
  l'intégrateur.
- **FR-098** : L'outil d'édition DOIT s'ouvrir après le retrait de tous les accès de
  l'intégrateur.
- **FR-099** : Une publication DOIT aboutir après le retrait de tous les accès de
  l'intégrateur.
- **FR-100** : Le fonctionnement du site NE DOIT dépendre d'aucun traitement périodique,
  d'aucune surveillance ni d'aucun renouvellement opérés par l'intégrateur.
- **FR-101** : Le produit NE DOIT requérir aucun service dont l'usage suppose un moyen de
  paiement enregistré.
- **FR-102** : Le produit NE DOIT requérir aucun compte ouvert au nom de l'intégrateur.

---

## Cas limites

**Édition et publication**

- L'éditrice publie alors que le brouillon ne diffère en rien de la dernière version publiée :
  le récapitulatif ne liste aucune modification, et aucune reconstruction n'est déclenchée.
- L'éditrice abandonne son brouillon alors que le site n'a jamais été publié : il n'existe
  aucun état antérieur à rétablir.
- L'éditrice ouvre son admin dans deux onglets et modifie le même emplacement dans les deux :
  le produit ne pose aucun verrou, puisqu'il n'y a qu'une éditrice ; le dernier enregistrement
  fait foi.
- Un emplacement de vidéo pointe vers une adresse devenue invalide : la page publiée reste
  servie, l'emplacement n'empêche pas le rendu du reste.

**Médias**

- Une image n'est utilisée que par un contenu dont l'emplacement a disparu : elle est
  supprimable, puisque l'éditrice n'a aucun moyen d'atteindre cet emplacement. Si
  l'emplacement réapparaît, le contenu revient sans son image.
- Une image est utilisée dans la dernière version publiée mais plus dans le brouillon : sa
  suppression reste refusée, sans quoi l'abandon du brouillon (`FR-035`) ne pourrait plus
  rétablir la version publiée.
- L'éditrice sélectionne dix images dont deux sont utilisées : les huit libres sont supprimées,
  les deux autres sont refusées nommément.

**Formulaire et demandes**

- L'éditrice retire une option pendant qu'un visiteur compose une demande qui l'inclut : la
  demande enregistrée conserve le libellé et le montant en vigueur au moment de l'envoi.
- Le visiteur ne choisit aucune option payante : le total affiché est de 0 €, et sa mention
  d'indication reste affichée.
- Une demande arrive pendant qu'un brouillon est en cours d'édition : elle entre dans la liste
  sans dépendre de l'état du brouillon, la réception étant indépendante de la publication.
- L'éditrice supprime la dernière demande de la liste : les nombres présentés tombent à zéro
  sans erreur.
- Le service d'acheminement des e-mails est indisponible pendant plusieurs heures : chaque
  demande est confirmée au visiteur, enregistrée, marquée non acheminée, et le signalement
  attend l'éditrice à sa prochaine ouverture.

**Exploitation**

- Une publication est refusée parce qu'une limite de palier gratuit est atteinte : le site déjà
  en ligne continue d'être servi, et le brouillon n'est pas perdu.
- Un gabarit remplace un emplacement par un autre de même rôle sous un nom différent : le
  contenu de l'ancien est conservé (`FR-082`) mais n'est pas transposé automatiquement — la
  transposition est un geste d'intégration.

---

## NON inclus (frontière de périmètre)

Cette section **hérite du scope EXCLU du Brief** — qui reste la référence — et l'affine des
décisions prises à ce niveau. Aucune de ces exclusions n'est une lacune ; chacune est
réversible quand un client réel la demandera.

**Hérité du Brief, sans modification**

Constructeur visuel de formulaires · création et composition libre de pages · hébergement de
vidéo · articles, auteurs et tags · multi-éditeurs, rôles et permissions, édition concurrente ·
historique daté des versions · réversibilité de l'historique des demandes · upload de fichier
par le visiteur · prix ferme ou contractuel · logique de formulaire avancée · pages publiques
dynamiques (hors envoi d'une demande) · mutualisation multi-clients · tout service hébergé par
Isometria · analytique tierce · relevé mensuel et son commentaire · positionnement dans les
moteurs de recherche · auto-hébergement par un tiers.

**Ajouté à ce niveau**

- **Publication sélective.** Il n'existe qu'un brouillon et qu'une publication, portant sur
  tout le site. L'éditrice ne choisit pas ce qu'elle met en ligne.
- **Vidage d'un emplacement d'image.** Aucun chemin du produit ne laisse un emplacement d'image
  sans image : la suppression est refusée plutôt que l'emplacement vidé.
- **Remplacement automatique à la suppression.** Le produit ne propose pas de substituer une
  autre image aux emplacements concernés ; il refuse et renvoie vers eux.
- **Prix unitaire et quantité.** Une option porte un montant fixe. Aucun champ ne multiplie un
  prix par une quantité saisie par le visiteur.
- **Réglage de la structure du formulaire.** Le libellé d'un champ, son type, son ordre et son
  caractère obligatoire sont figés à l'intégration.
- **Signalement des contenus orphelins à l'éditrice.** L'inventaire existe pour l'intégrateur ;
  l'éditrice n'en est pas informée par l'outil.
- **Anonymisation partielle d'une demande.** Une demande est conservée entière ou supprimée
  entière ; le produit n'efface pas les seules coordonnées.
- **Purge automatique des demandes.** Aucune durée de conservation réglable, aucun effacement
  périodique : la suppression est toujours un geste de l'éditrice.
- **Restauration d'une demande supprimée.** La suppression est définitive.
- **Accusé de réception par e-mail au visiteur.** Le Brief n'ouvre qu'une destination
  d'acheminement — l'éditrice. Le visiteur reçoit une confirmation à l'écran (`FR-068`), pas un
  e-mail.

---

## Critères de succès mesurables

`SC-001` à `SC-015` sont **repris du Brief à l'identique** ; leur formulation de référence y
demeure. Ils sont rappelés ici sous forme abrégée pour que la traçabilité soit lisible d'un
seul document.

| # | Critère (abrégé) | Stories |
|---|---|---|
| **SC-001** | 0 €/mois par site ; aucun moyen de paiement enregistré, aucun abonnement payant | US11, US13 |
| **SC-002** | Le site de la pâtisserie est en production sur ColibriCMS | toutes P1 |
| **SC-003** | L'éditrice modifie un texte et remplace une image, seule et du premier coup | US2, US3 |
| **SC-004** | Une modification publiée est visible en ligne en moins de 5 minutes | US4 |
| **SC-005** | Lighthouse Performance ≥ 95 en mobile, sur les pages réellement bâties | US10 |
| **SC-006** | Zéro compte à visiter pour éditer ou publier, hors son admin | US1 |
| **SC-007** | Elle change un prix, ajoute un parfum, publie ; la demande d'une visiteuse lui parvient, apparaît dans la liste, elle y note la suite | US7, US8, US9 |
| **SC-008** | Une nouvelle version se déploie sur une instance existante sans code spécifique et sans perte de contenu | US13 |
| **SC-009** | Après une erreur, elle retrouve seule la version publiée et le site public redevient identique | US5 |
| **SC-010** | Réemploi d'une image sans re-téléversement ; après toute suppression, aucune page publiée n'affiche d'image manquante | US3 |
| **SC-011** | Épreuve de réversibilité : dans un environnement neuf, la procédure produit le site complet, médias compris | US11, US12 |
| **SC-012** | Après révocation des accès d'Isometria, le site est servi, l'admin s'ouvre, une publication aboutit | US14 |
| **SC-013** | L'inventaire des identifiants du déploiement ne contient aucun identifiant d'Isometria | US11 |
| **SC-014** | Épreuve de passation : un tiers redéploie et publie sans poser de question à Isometria | US14 |
| **SC-015** | Après trois mois sans usage, elle modifie et publie seule, sans réapprentissage | US1, US2, US4 |

**Introduits par ce PRD**

- **SC-016** — **Aucune demande perdue en cas de panne d'acheminement.** Sur une période où le
  service d'envoi d'e-mail est indisponible, le nombre de demandes enregistrées est égal au
  nombre de soumissions confirmées au visiteur, et chacune porte l'état « non acheminée ».
- **SC-017** — **Une rafale automatisée n'entame pas l'instrument.** Une campagne de
  soumissions automatisées n'ajoute aucune ligne à la liste des demandes ni aucune unité aux
  nombres présentés à l'éditrice.
- **SC-018** — **Le contenu survit à un aller-retour de gabarit.** Après retrait puis
  rétablissement d'un emplacement, le contenu qui s'y trouvait est identique à ce qu'il était
  avant le retrait.
