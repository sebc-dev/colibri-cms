# PRD — ColibriCMS

| | |
|---|---|
| **Statut** | accepted |
| **Date** | 2026-08-10 |
| **Trace vers** | [Brief](./brief.md) |
| **Consommé par** | Stack, Archi, ADR, niveau specs |
| **Documents liés** | [Socle de livraison](./socle-de-livraison.md) — invariants `I1`–`I6`, clausier · [Audit Brief ↔ PRD](./audit-brief-prd.md) — les 11 constats traités |

> **Portée.** Ce document répond au *quoi*, au niveau produit. Il est
> **technology-agnostic** : aucun framework, aucune base, aucun service nommé. Où vit le
> contenu, où vivent les médias, quel service achemine les e-mails, quel moyen borne les
> abus — tout cela est un *moyen*, tranché en phase Stack.
>
> **Vocabulaire.** *Emplacement* = zone éditable posée par l'intégrateur dans un gabarit.
> *Brouillon* = état non publié d'une page, d'un réglage ou d'un formulaire — les trois
> objets publiables du produit. *Espace du client* = espace de stockage ouvert au nom du
> client, au sens de `I1`. *Adresse autorisée* = l'unique adresse e-mail qui ouvre
> l'administration du déploiement, et à laquelle les demandes sont acheminées. *Moyen de
> reprise* = secret non e-mail remis à la livraison, qui ouvre l'administration lorsque
> l'e-mail ne répond plus. *Demande présente* = demande figurant dans la liste des demandes.
> *Demande retirée* = demande que l'éditrice a ôtée de cette liste.

---

## User stories (priorisées, niveau produit)

La priorisation retenue est **« le premier client d'abord »** : `P1` rassemble tout ce que
la mise en production réelle du site de la pâtisserie exige, formulaire de devis compris.
`P2` porte les filets qui n'ont pas de destinataire au premier jour. `P3` ne se vérifie
qu'avec un tiers.

### US1 — Entrer dans l'admin par sa seule adresse e-mail (Priorité : P1)

L'éditrice ouvre son outil d'édition en saisissant l'adresse e-mail qu'elle utilise déjà.
Elle ne choisit pas de mot de passe, ne crée aucun compte, ne passe par aucun service tiers.
Le jour où sa boîte ne répond plus, un moyen de reprise remis à la livraison lui ouvre
quand même son administration.

- Pourquoi cette priorité : sans elle, aucune autre story n'est atteignable. Trace `SC-006`,
  `SC-020`.
- Scénarios d'acceptation :
  1. **Given** `contact@patisserie.fr` est l'adresse autorisée du déploiement, **When**
     l'éditrice la saisit sur l'écran de connexion et prouve qu'elle en a la maîtrise,
     **Then** une session d'administration s'ouvre.
  2. **Given** `inconnu@example.com` n'est pas l'adresse autorisée, **When** elle est saisie
     sur l'écran de connexion, **Then** aucune session ne s'ouvre, **aucun message ne part
     vers cette adresse**, et rien ne révèle quelle adresse est autorisée.
  3. **Given** la boîte e-mail de l'éditrice est devenue inaccessible, **When** elle présente
     le moyen de reprise remis à la livraison, **Then** une session d'administration s'ouvre
     sans qu'aucun message ait été envoyé.
  4. **Given** une session d'administration ouverte, **When** l'éditrice remplace l'adresse
     autorisée par une nouvelle, **Then** la nouvelle n'ouvre l'administration qu'après que
     l'éditrice en a prouvé la maîtrise, et l'ancienne cesse alors de l'ouvrir.
  5. **Given** une session d'administration ouverte, **When** l'éditrice parcourt
     l'intégralité de son travail d'édition et de publication, **Then** aucun écran ne lui
     demande de se connecter à un autre compte.

### US2 — Remplir et corriger les emplacements d'une page (Priorité : P1)

L'éditrice ouvre une page de son site, voit les emplacements que l'intégrateur y a posés,
et en modifie le contenu. Elle ne peut ni créer une page, ni déplacer un bloc, ni casser sa
mise en page.

- Pourquoi cette priorité : c'est le geste central du produit. Trace `SC-003`, `SC-015`.
- Scénarios d'acceptation :
  1. **Given** la page Accueil porte un emplacement de texte riche, **When** l'éditrice y
     remplace un paragraphe et quitte l'écran, **Then** la modification est conservée dans
     le brouillon de la page Accueil et le site public est inchangé.
  2. **Given** la page Accueil est publiée sans modification en attente, **When**
     l'éditrice modifie un emplacement, **Then** la page Accueil passe à l'état
     « brouillon » dans la liste des pages.
  3. **Given** une page ouverte en édition, **When** l'éditrice cherche à ajouter, retirer
     ou déplacer un bloc, **Then** aucun moyen de le faire ne lui est offert.

### US3 — Gérer la bibliothèque d'images (Priorité : P1)

L'éditrice téléverse ses photos, les retrouve dans une grille, les renomme, les décrit, les
réemploie d'une page à l'autre, et supprime celles dont elle n'a plus l'usage — sans jamais
laisser un trou dans une page publiée.

- Pourquoi cette priorité : le site d'une pâtissière-cake designer est fait de photos.
  Trace `SC-010`, `SC-003`, `SC-018`.
- Scénarios d'acceptation :
  1. **Given** une image `piece-montee.jpg` déjà présente dans la bibliothèque, **When**
     l'éditrice l'affecte à l'emplacement « bannière » de la page Tarifs, **Then**
     l'emplacement porte cette image sans qu'un nouveau téléversement ait eu lieu.
  2. **Given** l'image `photo-gateau.jpg` est posée sur les pages Accueil et Tarifs,
     **When** l'éditrice demande sa suppression depuis l'écran Médias, **Then** le système
     lui présente ces deux emplacements avant d'appliquer quoi que ce soit.
  3. **Given** cette suppression confirmée, **When** l'éditrice consulte les pages Accueil
     et Tarifs, **Then** l'emplacement y est vide dans le brouillon, et le site public
     affiche toujours l'image.
  4. **Given** cette suppression confirmée et les brouillons non publiés, **When**
     l'éditrice abandonne le brouillon de la page Accueil, **Then** l'emplacement de la
     page Accueil porte de nouveau l'image et celle-ci n'est plus destinée à l'effacement.
  5. **Given** une image dans la bibliothèque, **When** l'éditrice saisit « Pièce montée
     trois étages » dans le champ de description, **Then** cette description est servie
     avec l'image sur toutes les pages publiées où elle est posée.

### US4 — Régler les réglages transverses (Priorité : P1)

L'éditrice modifie en un seul endroit ce qui s'affiche sur l'ensemble du site :
coordonnées de contact, liens vers ses réseaux sociaux, et le texte de la mention
d'information affichée aux visiteurs qui envoient une demande.

- Pourquoi cette priorité : la mention d'information conditionne la mise en ligne des
  formulaires, qui sont `P1`. Trace `SC-003`, `SC-017`.
- Scénarios d'acceptation :
  1. **Given** le numéro de téléphone est affiché en pied de toutes les pages, **When**
     l'éditrice le modifie dans les réglages et publie, **Then** toutes les pages publiées
     portent le nouveau numéro.
  2. **Given** le texte de la mention d'information, **When** l'éditrice le modifie,
     **Then** la modification part en brouillon et le site public affiche encore
     l'ancienne mention jusqu'à la publication.

### US5 — Régler options, prix et libellés d'un formulaire de devis (Priorité : P1)

L'éditrice ouvre un formulaire posé par l'intégrateur, change le prix d'une option, en
renomme une autre, en ajoute une nouvelle. Elle ne touche jamais à la structure — quels
champs existent, de quel type, dans quel ordre.

- Pourquoi cette priorité : c'est le geste qui rend le formulaire vivant sans intégrateur.
  Trace `SC-007`.
- Scénarios d'acceptation :
  1. **Given** le formulaire « Devis gâteau » porte un champ « Parfum » avec trois options,
     **When** l'éditrice ajoute l'option « Pistache » à 12 €, **Then** le brouillon du
     formulaire porte quatre options et le site public en présente encore trois.
  2. **Given** l'option « Vanille » est à 8 €, **When** l'éditrice la passe à 10 € et
     publie, **Then** une visiteuse qui choisit « Vanille » voit sa contribution de 10 €
     dans le total.
  3. **Given** un formulaire ouvert en édition, **When** l'éditrice cherche à ajouter un
     champ ou à changer l'ordre des champs, **Then** aucun moyen de le faire ne lui est
     offert.
  4. **Given** un site portant les formulaires « Devis gâteau » et « Devis atelier »,
     **When** l'éditrice ouvre l'écran des formulaires, **Then** les deux lui sont
     présentés et elle en choisit un à régler.

### US6 — Prévisualiser puis publier (Priorité : P1)

L'éditrice contrôle son travail sur un aperçu qui rend exactement ce que verront ses
visiteurs, puis met tout en ligne d'un seul geste, après avoir vu la liste de ce qui part.

- Pourquoi cette priorité : sans publication, rien de ce qui précède n'atteint le public.
  Trace `SC-004`, `SC-016`.
- Scénarios d'acceptation :
  1. **Given** le brouillon de la page Accueil, **When** l'éditrice demande l'aperçu,
     **Then** elle voit la page telle qu'elle sera publiée, et cet aperçu n'est atteignable
     que depuis sa session d'administration.
  2. **Given** un brouillon de page, un nouveau numéro de téléphone en brouillon de réglage
     et un prix d'option en brouillon de formulaire, **When** l'éditrice demande l'aperçu de
     cette page, **Then** elle y voit les trois modifications ensemble — l'aperçu montre
     l'état qui sera en ligne, jamais un état intermédiaire.
  3. **Given** des brouillons sur les pages Contact et Tarifs, un formulaire modifié et une
     image que plus aucun emplacement ne référence, **When** l'éditrice déclenche la
     publication, **Then** le système lui présente les deux pages, le formulaire et
     l'annonce de l'effacement de cette image, avant toute mise en ligne.
  4. **Given** ce récapitulatif affiché, **When** l'éditrice annule, **Then** rien n'est mis
     en ligne et tous les brouillons sont intacts.
  5. **Given** ce récapitulatif affiché, **When** l'éditrice confirme, **Then** toutes les
     pages, tous les réglages et tous les formulaires en brouillon passent en ligne
     ensemble, et le site public reflète la modification en moins de cinq minutes.
  6. **Given** une publication qui n'aboutit pas, **When** l'éditrice consulte son site,
     **Then** le site public est identique à son dernier état publié et l'admin lui indique
     que la publication n'a pas abouti.

### US7 — Revenir à la dernière version publiée (Priorité : P2)

L'éditrice a écrasé par erreur un texte, un numéro de téléphone ou le prix d'une option.
Elle abandonne le brouillon de cet objet-là et retrouve ce qui est en ligne, sans perdre
son travail sur les autres.

- Pourquoi cette priorité : c'est un filet, pas un geste courant ; le premier jalon est
  livrable sans lui, au prix d'une fausse manœuvre sans remède. Trace `SC-009`.
- Scénarios d'acceptation :
  1. **Given** des brouillons sur les pages Accueil et Contact, **When** l'éditrice
     abandonne le brouillon de la page Accueil, **Then** la page Accueil revient à sa
     version publiée et le brouillon de la page Contact est intact.
  2. **Given** un numéro de téléphone écrasé par erreur en brouillon de réglage, **When**
     l'éditrice abandonne ce brouillon, **Then** le réglage retrouve sa valeur publiée et
     aucun autre brouillon n'est touché.
  3. **Given** le prix d'une option écrasé par erreur en brouillon de formulaire, **When**
     l'éditrice abandonne le brouillon de ce formulaire, **Then** le formulaire retrouve ses
     options publiées et aucun autre brouillon n'est touché.
  4. **Given** une page abandonnée puis publiée, **When** une visiteuse consulte cette page,
     **Then** elle y voit ce qui s'y trouvait avant la modification erronée.
  5. **Given** une page publiée trois fois de suite, **When** l'éditrice cherche un état
     antérieur à la dernière version publiée, **Then** aucun moyen de l'atteindre ne lui est
     offert.

### US8 — Composer et envoyer une demande de devis chiffrée (Priorité : P1)

Une visiteuse compose sa commande sur le site, voit le total évoluer à chaque choix, lit
que ce montant est indicatif, renseigne ses coordonnées et envoie.

- Pourquoi cette priorité : c'est ce qui fait du site vitrine un outil qui rapporte.
  Trace `SC-007`.
- Scénarios d'acceptation :
  1. **Given** un formulaire dont « Parfum : pistache » vaut 12 € et « Nombre de parts : 20 »
     vaut 60 €, **When** la visiteuse coche ces deux options, **Then** le total affiché est
     72 €, et il se met à jour sans que la page soit rechargée ni qu'un serveur soit
     sollicité.
  2. **Given** un total affiché, **When** la visiteuse le lit, **Then** la mention que
     l'estimation est indicative et non engageante lui est présentée avec ce total.
  3. **Given** un formulaire dont un champ obligatoire est vide, **When** la visiteuse
     envoie, **Then** l'envoi est refusé et le champ manquant lui est désigné.
  4. **Given** un formulaire complet, **When** la visiteuse envoie, **Then** une
     confirmation lui est présentée.
  5. **Given** un envoi qui n'aboutit pas, **When** la visiteuse consulte l'écran, **Then**
     elle en est informée et sa saisie est encore présente.
  6. **Given** un formulaire de devis, **When** la visiteuse cherche à joindre une photo,
     **Then** aucun moyen de téléverser un fichier ne lui est offert.

### US9 — Consulter des pages rapides et complètes (Priorité : P1)

Un visiteur ouvre une page du site. Elle s'affiche vite, son contenu est présent dès la
réception du document, et rien ne s'exécute côté serveur pour la servir.

- Pourquoi cette priorité : c'est ce qui rend la gratuité et le référencement possibles.
  Trace `SC-005`.
- Scénarios d'acceptation :
  1. **Given** une page de contenu publiée, **When** un visiteur la demande, **Then** le
     document reçu porte déjà l'intégralité du contenu éditorial, sans assemblage ultérieur
     sur son appareil.
  2. **Given** une page de contenu publiée, **When** sa performance est mesurée en
     conditions mobiles, **Then** le score est d'au moins 95.
  3. **Given** un visiteur qui consulte n'importe quelle page publique, **When** il n'envoie
     aucune demande de devis, **Then** aucun traitement serveur propre au site n'a été
     déclenché.

### US10 — Recevoir les demandes et noter la suite donnée (Priorité : P1)

Chaque demande arrive dans la boîte e-mail de l'éditrice et s'inscrit dans une liste de son
admin, où elle note ce qu'elle en a fait. Deux nombres en sortent : ce que le site a
apporté, et ce que ça a donné. Ce qu'elle retire de la liste ne disparaît pas en silence.

- Pourquoi cette priorité : sans l'instrument, le premier relevé n'a rien à relever.
  Trace `SC-007`, `SC-019`.
- Scénarios d'acceptation :
  1. **Given** une demande envoyée par une visiteuse, **When** l'éditrice consulte sa boîte
     e-mail, **Then** elle y trouve le détail des sélections, le total indicatif et les
     coordonnées de la visiteuse.
  2. **Given** cette même demande, **When** l'éditrice ouvre la liste des demandes de son
     admin, **Then** la demande y figure avec sa date, le formulaire dont elle provient et
     la page d'origine.
  3. **Given** l'acheminement par e-mail qui n'aboutit pas, **When** l'éditrice ouvre la
     liste des demandes, **Then** la demande y figure quand même.
  4. **Given** une demande dans la liste, **When** l'éditrice choisit « devis envoyé »,
     **Then** la demande porte cette suite, et l'éditrice peut la changer plus tard.
  5. **Given** onze demandes issues de « Devis gâteau » dont trois portent la suite
     « commande », et trois demandes issues de « Devis atelier » sans aucune commande,
     **When** l'éditrice ouvre l'écran des demandes, **Then** elle lit 14 demandes et
     3 commandes pour le site, ainsi que la ventilation `11 → 3` et `3 → 0` par formulaire.
  6. **Given** ces mêmes demandes, **When** l'éditrice en retire deux qui étaient sans suite,
     en déclarant le retrait ordinaire, **Then** l'écran affiche 12 demandes, 3 commandes et
     2 retirées — et aucune autre demande n'est effacée par le système lui-même.
  7. **Given** quarante soumissions automatisées entrées sous le seuil de fréquence, qui font
     momentanément lire 54 demandes, **When** l'éditrice les sélectionne et les retire en un
     geste en les déclarant indésirables, **Then** les trois nombres retrouvent **exactement**
     les valeurs qu'ils portaient avant l'arrivée de ces soumissions — le nombre de retirées,
     en particulier, n'a pas bougé.

### US11 — Déployer une instance au nom du client (Priorité : P1)

L'intégrateur ouvre les comptes au nom du client, déploie une instance selon une convention
identique d'un client à l'autre, et n'y laisse aucun identifiant qui lui appartienne.

- Pourquoi cette priorité : c'est la condition d'existence de la promesse commerciale.
  Trace `SC-001`, `SC-012`, `SC-013`.
- Scénarios d'acceptation :
  1. **Given** une instance prête à être livrée, **When** l'inventaire des identifiants et
     des liaisons du déploiement est dressé, **Then** aucun n'appartient à l'intégrateur, et
     rien n'y permet de reconstituer le moyen de reprise.
  2. **Given** une instance en production, **When** tous les accès de l'intégrateur sont
     retirés, **Then** le site public est toujours servi, une session d'administration
     s'ouvre encore, et une publication aboutit.
  3. **Given** une instance livrée, **When** le compte du client est examiné, **Then**
     aucun moyen de paiement n'y est enregistré et aucun abonnement payant n'y est souscrit.

### US12 — Déployer une nouvelle version sur une instance existante (Priorité : P2)

L'intégrateur publie une nouvelle version de ColibriCMS et la déploie sur une instance déjà
en service, sans écrire une ligne de code propre à ce client et sans lui faire perdre son
contenu.

- Pourquoi cette priorité : rien à maintenir tant qu'il n'y a qu'une instance récente.
  Trace `SC-008`.
- Scénarios d'acceptation :
  1. **Given** une instance en production portant du contenu publié et des brouillons,
     **When** une nouvelle version y est déployée, **Then** le contenu publié et les
     brouillons sont intacts.
  2. **Given** deux instances de clients différents, **When** une nouvelle version est
     déployée sur chacune, **Then** aucune n'a exigé de code propre à son client.

### US13 — Reconstruire le site sans ColibriCMS (Priorité : P1)

Un développeur tiers, sans aucun accès à ColibriCMS ni concours de l'intégrateur, prend les
seuls fichiers que la cliente possède et reconstruit le site complet, médias compris.

- Pourquoi cette priorité : c'est l'invariant qui transforme la réversibilité en fait
  exécutable ; l'épreuve doit être passée à la livraison, pas plus tard. Trace `SC-011`.
- Scénarios d'acceptation :
  1. **Given** les seuls fichiers déposés dans les espaces de la cliente, **When** un
     développeur tiers suit la procédure de reconstruction documentée avec eux dans un
     environnement neuf, **Then** il obtient un site équivalent au site en ligne pour un
     visiteur — mêmes contenus, mêmes médias aux mêmes emplacements, mêmes pages au même
     rendu.
  2. **Given** ces mêmes fichiers, **When** le développeur tiers examine ce qui accompagne
     les médias, **Then** il y trouve, pour chaque média, de quoi le remettre à sa place :
     son identité, son nom d'origine, ses dimensions et sa description.
  3. **Given** une publication qui vient d'aboutir, **When** on inspecte les espaces de la
     cliente, **Then** le contenu et les médias publiés s'y trouvent en fichiers lisibles.

### US14 — Reprendre l'exploitation sur le seul dossier d'instance (Priorité : P3)

Un prestataire tiers, avec les accès aux comptes de la cliente et le dossier d'instance,
redéploie l'instance et publie une modification — sans poser une seule question à
l'intégrateur.

- Pourquoi cette priorité : elle ne se vérifie qu'avec un tiers réel, et son support — le
  dossier d'instance — se tient à jour dès `P1`. Trace `SC-014`.
- Scénarios d'acceptation :
  1. **Given** les accès aux comptes de la cliente et le dossier d'instance, **When** un
     prestataire tiers redéploie l'instance et publie une modification, **Then** la
     modification apparaît en ligne sans qu'il ait sollicité l'intégrateur.
  2. **Given** le dossier d'instance, **When** on y cherche un identifiant, **Then** on y
     lit où il est rangé et jamais sa valeur.
  3. **Given** le dossier d'instance, **When** on cherche l'emplacement où il vit, **Then**
     il est dans un espace appartenant à la cliente et connu d'elle.

---

## Exigences fonctionnelles (atomiques, testables)

### Accès à l'administration

- **FR-001** : Le système DOIT ouvrir une session d'administration à toute personne ayant
  prouvé la maîtrise de l'adresse autorisée du déploiement.
- **FR-002** : Le système DOIT refuser l'ouverture d'une session d'administration pour toute
  adresse autre que l'adresse autorisée.
- **FR-003** : Le système NE DOIT exiger aucun mot de passe pour ouvrir une session
  d'administration.
- **FR-004** : Le système NE DOIT exiger de l'éditrice la connexion à aucun compte autre
  que son administration, ni pour éditer, ni pour publier.
- **FR-005** : Le système NE DOIT envoyer aucun message de preuve de maîtrise à une adresse
  autre que l'adresse autorisée.
- **FR-006** : Le système DOIT borner, sur une fenêtre de temps, le nombre de messages de
  preuve de maîtrise envoyés à l'adresse autorisée.
- **FR-007** : Le système DOIT rejeter les tentatives d'ouverture de session émises depuis
  une même origine au-delà d'un seuil de fréquence.
- **FR-008** : Aucune réponse de l'écran de connexion NE DOIT permettre de distinguer
  l'adresse autorisée d'une adresse qui ne l'est pas.
- **FR-009** : Le système DOIT remettre un moyen de reprise à la livraison de l'instance.
- **FR-010** : Le système DOIT ouvrir une session d'administration sur présentation du moyen
  de reprise, sans envoi d'aucun message.
- **FR-011** : Le système NE DOIT conserver, dans la configuration du déploiement, aucune
  donnée permettant de reconstituer le moyen de reprise.
- **FR-012** : L'éditrice DOIT pouvoir remplacer le moyen de reprise depuis une session
  d'administration ouverte ; l'ancien cesse alors d'ouvrir une session, et toute session
  ouverte autre que celle du remplacement est fermée.
- **FR-013** : L'éditrice DOIT pouvoir remplacer l'adresse autorisée depuis une session
  d'administration ouverte.
- **FR-014** : Une adresse NE DOIT devenir l'adresse autorisée qu'après que la maîtrise en a
  été prouvée.
- **FR-118** : Le système DOIT fermer toute session d'administration restée sept jours sans
  usage, et toute session ouverte depuis trente jours, quel qu'en soit l'usage.

### Pages et emplacements

- **FR-015** : Le système DOIT présenter à l'éditrice la liste des pages du site.
- **FR-016** : Le système DOIT indiquer, pour chaque page de cette liste, si elle porte un
  brouillon non publié.
- **FR-017** : L'éditrice DOIT pouvoir modifier le contenu de chaque emplacement éditable
  d'une page.
- **FR-018** : Le système DOIT permettre à un emplacement éditable de porter du texte
  riche.
- **FR-019** : Le système DOIT permettre à un emplacement éditable de porter une image.
- **FR-020** : Le système DOIT permettre à un emplacement éditable de porter une galerie
  d'images.
- **FR-021** : Le système DOIT permettre à un emplacement éditable de porter un carrousel
  d'images.
- **FR-022** : Le système DOIT permettre à un emplacement éditable de porter une vidéo
  désignée par un lien externe.
- **FR-023** : Le système DOIT permettre à un emplacement éditable de porter un bouton
  d'action dont l'éditrice règle le libellé et la destination.
- **FR-024** : Le système NE DOIT offrir à l'éditrice aucun moyen de créer, de supprimer ou
  de renommer une page.
- **FR-025** : Le système NE DOIT offrir à l'éditrice aucun moyen de modifier la structure
  d'une page — nombre, nature ou ordre de ses emplacements.
- **FR-026** : Toute modification faite par l'éditrice DOIT être enregistrée dans le
  brouillon de la page concernée, sans effet sur le site public.

### Bibliothèque de médias

- **FR-027** : L'éditrice DOIT pouvoir téléverser une image dans la bibliothèque.
- **FR-028** : Le système DOIT présenter la bibliothèque comme une grille de toutes les
  images du site.
- **FR-029** : L'éditrice DOIT pouvoir rechercher une image dans la bibliothèque.
- **FR-030** : L'éditrice DOIT pouvoir renommer une image de la bibliothèque.
- **FR-031** : L'éditrice DOIT pouvoir saisir et modifier la description d'une image depuis
  la bibliothèque.
- **FR-032** : Le système DOIT indiquer, pour une image donnée, les emplacements où elle est
  posée.
- **FR-033** : L'éditrice DOIT pouvoir poser dans un emplacement une image déjà présente
  dans la bibliothèque, sans nouveau téléversement.
- **FR-034** : L'éditrice DOIT pouvoir remplacer l'image posée dans un emplacement.
- **FR-035** : Le système DOIT présenter à l'éditrice la liste des emplacements concernés
  avant d'appliquer la suppression d'une image qui y est posée.
- **FR-036** : La suppression d'une image DOIT retirer cette image de tous les emplacements
  où elle est posée, chaque retrait étant enregistré dans le brouillon de la page concernée.
- **FR-037** : Le système DOIT effacer définitivement une image lors d'une publication si et
  seulement si, à ce moment, plus aucun emplacement — publié ou en brouillon — ne la
  référence.
- **FR-038** : Le système DOIT signaler dans la bibliothèque les images qu'aucun emplacement
  ne référence plus et qui seront effacées à la prochaine publication.
- **FR-039** : Le système DOIT servir la description d'une image avec cette image sur toute
  page publiée où elle est posée.
- **FR-040** : Le système DOIT refuser un téléversement dont le format ou le poids sort des
  bornes du déploiement, en indiquant à l'éditrice ce qui a été refusé.

### Réglages transverses

- **FR-041** : L'éditrice DOIT pouvoir modifier les coordonnées de contact affichées sur
  l'ensemble du site.
- **FR-042** : L'éditrice DOIT pouvoir modifier les liens vers les réseaux sociaux affichés
  sur l'ensemble du site.
- **FR-043** : L'éditrice DOIT pouvoir modifier le texte de la mention d'information
  présentée aux visiteurs avec les formulaires.
- **FR-044** : Toute modification d'un réglage transverse DOIT être enregistrée en
  brouillon, sans effet sur le site public.

### Réglage des formulaires de devis

- **FR-045** : Le système DOIT présenter à l'éditrice la liste des formulaires posés sur le
  site.
- **FR-046** : L'éditrice DOIT pouvoir modifier le libellé d'une option d'un formulaire
  donné.
- **FR-047** : L'éditrice DOIT pouvoir modifier le prix associé à une option d'un formulaire
  donné.
- **FR-048** : L'éditrice DOIT pouvoir ajouter une option à un champ existant d'un
  formulaire donné.
- **FR-049** : L'éditrice DOIT pouvoir retirer une option d'un champ existant d'un
  formulaire donné.
- **FR-050** : Le système NE DOIT offrir à l'éditrice aucun moyen d'ajouter, de retirer ou
  de réordonner un champ d'un formulaire.
- **FR-051** : Toute modification d'un formulaire DOIT être enregistrée dans le brouillon de
  ce formulaire, sans effet sur le site public.

### Composition et envoi d'une demande par le visiteur

- **FR-052** : Le système DOIT afficher au visiteur le total de sa sélection.
- **FR-053** : Le total affiché DOIT être la somme des contributions des options
  sélectionnées.
- **FR-054** : Le système DOIT recalculer le total à chaque changement de sélection, sur
  l'appareil du visiteur, sans échange avec un serveur.
- **FR-055** : Le système DOIT présenter au visiteur, avec le total, la mention que
  l'estimation est indicative et non engageante.
- **FR-056** : Le système DOIT présenter au visiteur la mention d'information sur le
  traitement de ses coordonnées avant l'envoi de sa demande.
- **FR-057** : Le visiteur DOIT pouvoir envoyer sa demande après avoir renseigné ses
  coordonnées.
- **FR-058** : Le système DOIT refuser l'envoi d'une demande dont un champ obligatoire n'est
  pas renseigné, en désignant le champ manquant.
- **FR-059** : Le système DOIT confirmer au visiteur que sa demande a été envoyée.
- **FR-060** : Le système DOIT informer le visiteur lorsque l'envoi n'aboutit pas, sans
  perte de sa saisie.
- **FR-061** : Le système NE DOIT accepter aucun fichier téléversé par un visiteur.
- **FR-062** : Le système DOIT rejeter les demandes émises depuis une même origine au-delà
  d'un seuil de fréquence, sans exiger de compte du visiteur.

### Réception et suivi des demandes

- **FR-063** : À réception d'une demande, le système DOIT l'acheminer par e-mail à l'adresse
  autorisée du déploiement.
- **FR-064** : L'e-mail acheminé DOIT porter le détail des sélections, le total indicatif et
  les coordonnées du visiteur.
- **FR-065** : À réception d'une demande, le système DOIT l'enregistrer dans la liste des
  demandes de l'administration.
- **FR-066** : L'enregistrement d'une demande NE DOIT pas dépendre de la réussite de son
  acheminement par e-mail.
- **FR-067** : Chaque demande enregistrée DOIT porter sa date de réception, le formulaire
  dont elle provient et la page d'origine.
- **FR-068** : Chaque demande enregistrée DOIT porter le total qui était affiché au visiteur
  au moment de l'envoi.
- **FR-069** : Le système DOIT présenter les demandes de la plus récente à la plus ancienne.
- **FR-070** : L'éditrice DOIT pouvoir filtrer la liste des demandes par formulaire
  d'origine.
- **FR-071** : L'éditrice DOIT pouvoir renseigner la suite donnée à une demande parmi trois
  valeurs : sans suite, devis envoyé, commande.
- **FR-072** : L'éditrice DOIT pouvoir modifier la suite donnée à une demande déjà
  renseignée.
- **FR-073** : L'éditrice DOIT pouvoir retirer une demande de la liste en déclarant le motif
  du retrait : ordinaire ou indésirable.
- **FR-074** : L'éditrice DOIT pouvoir retirer plusieurs demandes de la liste en un seul
  geste, le motif déclaré portant sur l'ensemble de la sélection.
- **FR-075** : Le système DOIT afficher, pour l'ensemble du site, le nombre de demandes
  présentes et le nombre de celles dont la suite est « commande ».
- **FR-076** : Le système DOIT afficher le nombre de demandes retirées lorsque ce nombre
  n'est pas nul ; un retrait déclaré indésirable NE DOIT être compté dans aucun des nombres.
- **FR-077** : Le système DOIT afficher ces nombres ventilés par formulaire.
- **FR-078** : Le système DOIT continuer de compter une demande retirée après que son
  contenu a cessé d'être conservé.
- **FR-079** : Le retrait d'une demande NE DOIT entraîner le retrait d'aucune autre, et le
  système NE DOIT faire disparaître aucune demande sans que l'éditrice en ait été informée.

### Aperçu, publication, restauration

- **FR-080** : L'éditrice DOIT pouvoir consulter un aperçu d'une page présentant son
  brouillon.
- **FR-081** : L'aperçu DOIT rendre la page avec l'ensemble des brouillons qui la concernent
  — page, réglages transverses et formulaires — avec le même rendu que celui du site publié.
- **FR-082** : L'aperçu NE DOIT être atteignable que depuis une session d'administration
  ouverte.
- **FR-083** : Avant toute mise en ligne, le système DOIT présenter la liste des pages, des
  réglages et des formulaires qui vont être publiés.
- **FR-084** : Ce récapitulatif DOIT indiquer les images qui vont être définitivement
  effacées.
- **FR-085** : L'éditrice DOIT pouvoir annuler la publication depuis ce récapitulatif, sans
  effet sur les brouillons.
- **FR-086** : La publication DOIT mettre en ligne l'ensemble des brouillons du site en un
  seul geste.
- **FR-087** : La publication DOIT déposer le contenu publié en fichiers lisibles dans un
  espace appartenant au client.
- **FR-088** : La publication DOIT déposer les médias publiés dans un espace appartenant au
  client.
- **FR-089** : Le dépôt du contenu publié DOIT être l'unique déclencheur de la mise à jour
  du site public.
- **FR-090** : Le système DOIT informer l'éditrice de l'issue de sa publication.
- **FR-091** : Lorsqu'une publication n'aboutit pas, le site public DOIT rester dans son
  dernier état publié.
- **FR-092** : L'éditrice DOIT pouvoir abandonner le brouillon d'une page, d'un réglage
  transverse ou d'un formulaire, et retrouver sa dernière version publiée.
- **FR-093** : L'abandon du brouillon d'un objet NE DOIT affecter le brouillon d'aucun autre
  objet.
- **FR-094** : Le système NE DOIT offrir à l'éditrice aucun accès à un état antérieur à la
  dernière version publiée.

### Site public

- **FR-095** : Le système DOIT servir chaque page publique comme un document complet, bâti à
  la publication et portant l'intégralité de son contenu éditorial.
- **FR-096** : La consultation d'une page publique NE DOIT déclencher aucun traitement
  serveur propre au site.
- **FR-097** : L'envoi d'une demande DOIT être le seul geste d'un visiteur déclenchant un
  traitement serveur.

### Déploiement, réversibilité, flotte

- **FR-098** : Le système DOIT fonctionner sans qu'aucun identifiant appartenant à
  l'intégrateur figure dans la configuration du déploiement.
- **FR-099** : Après retrait de tous les accès de l'intégrateur, le site public DOIT
  continuer d'être servi.
- **FR-100** : Après retrait de tous les accès de l'intégrateur, une session
  d'administration DOIT pouvoir être ouverte.
- **FR-101** : Après retrait de tous les accès de l'intégrateur, une publication DOIT
  aboutir.
- **FR-102** : Le système NE DOIT dépendre d'aucun traitement s'exécutant hors des comptes
  du client.
- **FR-103** : Le système NE DOIT requérir aucun service payant ni aucun moyen de paiement
  enregistré.
- **FR-104** : Le système DOIT être déployé à raison d'une instance par site, selon une
  configuration identique d'un client à l'autre.
- **FR-105** : Une nouvelle version DOIT pouvoir être déployée sur une instance existante
  sans code propre au client de cette instance.
- **FR-106** : Le déploiement d'une nouvelle version NE DOIT entraîner aucune perte du
  contenu publié ni des brouillons.
- **FR-107** : Le produit DOIT fournir une procédure documentée reconstruisant le site
  complet, médias compris, à partir des seuls fichiers déposés dans les espaces du client,
  sans l'administration et sans accès aux comptes de l'intégrateur.
- **FR-108** : Les fichiers déposés DOIVENT porter, pour chaque média, son identité, son nom
  d'origine, ses dimensions et sa description.
- **FR-109** : La procédure de reconstruction DOIT être documentée avec les fichiers
  déposés.

### Dossier d'instance

- **FR-110** : Chaque instance DOIT être accompagnée d'un dossier d'instance déposé dans un
  espace appartenant au client et connu de lui.
- **FR-111** : Le dossier d'instance DOIT recenser les comptes ouverts pour l'instance et le
  nom au titre duquel chacun l'est.
- **FR-112** : Le dossier d'instance DOIT indiquer, pour chaque identifiant nécessaire — le
  moyen de reprise compris —, où il est rangé, sans en consigner la valeur.
- **FR-113** : Le dossier d'instance DOIT recenser les comptes dont la récupération dépend
  de la boîte e-mail de l'éditrice.
- **FR-114** : Le dossier d'instance DOIT porter la procédure de redéploiement de
  l'instance.
- **FR-115** : Le dossier d'instance DOIT porter la procédure de publication.
- **FR-116** : Le dossier d'instance DOIT porter la procédure de reconstruction.
- **FR-119** : Le dossier d'instance DOIT porter la procédure permettant de réétablir
  l'adresse autorisée et le moyen de reprise à partir des seuls accès du client, sans
  reconstituer l'ancien moyen de reprise.

### Langage de l'interface

- **FR-117** : L'interface d'édition NE DOIT employer aucun terme de développeur pour
  désigner un geste de l'éditrice.

---

## Cas limites

Chaque question ci-dessous a une réponse arrêtée dans ce PRD ; la référence renvoie à
l'exigence qui la porte.

- **Une image n'est posée que dans un brouillon, et l'éditrice la supprime.** Le retrait est
  appliqué à ce brouillon comme aux autres ; l'image n'étant plus référencée nulle part, elle
  est effacée à la publication suivante (`FR-036`, `FR-037`).
- **L'éditrice abandonne le brouillon d'une page dont un emplacement avait été vidé par une
  suppression d'image.** L'emplacement retrouve son image, qui redevient référencée et n'est
  donc plus effacée. L'état « sera effacée » n'est jamais stocké : il se dérive de l'absence
  de référence (`FR-037`, `FR-038`, `FR-092`).
- **L'éditrice déclenche une publication alors qu'aucun brouillon n'existe.** Le récapitulatif
  ne liste ni page, ni réglage, ni formulaire, ni image à effacer ; il n'y a rien à mettre en
  ligne (`FR-083`).
- **L'acheminement par e-mail cesse de fonctionner en silence.** La demande est enregistrée
  quand même et reste consultable dans l'admin (`FR-066`). L'admin reste atteignable même
  quand l'e-mail ne fonctionne plus, par le moyen de reprise (`FR-010`) — sans quoi ce filet
  serait illusoire : la connexion et l'acheminement empruntent le même canal et visent la même
  boîte, si bien qu'une panne les fermerait ensemble. La *détection* de la panne est tranchée
  en phase Stack — le Brief la lui renvoie explicitement.
- **Le prix d'une option change entre le chargement de la page par la visiteuse et son
  envoi.** La demande enregistrée porte le total qui lui était affiché au moment de l'envoi,
  et non un total recalculé après coup (`FR-068`).
- **Une soumission automatisée massive vise le formulaire.** Les envois au-delà du seuil de
  fréquence sont rejetés, sans compte ni friction imposée au visiteur légitime (`FR-062`).
  Le moyen est tranché en phase Stack.
- **Des demandes indésirables passent sous le seuil de fréquence, ou sont distribuées sur
  assez d'origines pour ne jamais l'atteindre.** Elles entrent dans la liste. L'éditrice les
  sélectionne et les retire en un geste en les déclarant indésirables (`FR-073`, `FR-074`) ;
  n'étant comptées nulle part (`FR-076`), la lecture des nombres reste juste. Le produit ne
  prévoit aucun autre remède — ni qualification d'une demande présente, ni blocage d'origine —
  et c'est assumé.
- **Une soumission massive vise l'écran de connexion.** Aucun message ne part vers une adresse
  qui n'est pas l'adresse autorisée (`FR-005`), les envois vers l'adresse autorisée sont bornés
  (`FR-006`), et les tentatives depuis une même origine sont rejetées au-delà d'un seuil
  (`FR-007`). Le compte d'envoi de la cliente et sa délivrabilité sont ainsi hors d'atteinte.
- **Un visiteur légitime est rejeté par ce seuil.** Il en est informé sans perte de sa
  saisie (`FR-060`).
- **L'éditrice retire la dernière option d'un champ de formulaire.** Le champ reste posé par
  le gabarit ; l'éditrice ne peut pas le retirer (`FR-050`). Ce qu'un champ sans option
  présente au visiteur relève du niveau specs.
- **La vidéo désignée par un lien externe est retirée par son hébergeur.** Le produit ne le
  détecte pas : l'emplacement porte un lien, pas une vidéo (`FR-022`). Conséquence assumée de
  l'exclusion de l'hébergement de vidéo.
- **Une publication est déclenchée alors qu'une précédente n'est pas terminée.** Le site
  public reste servi dans son dernier état publié pendant toute la durée d'une publication
  (`FR-091`). La sérialisation des publications est un moyen, tranché en phase Stack.
- **Deux fenêtres de la même session éditent la même page.** Un seul éditeur existe par site
  — une seule adresse ouvre l'administration (`FR-001`), et elle se remplace, elle ne
  s'additionne pas (`FR-013`) — donc aucun verrou n'est prévu ; la dernière écriture prévaut.
- **La liste des demandes grandit sans borne.** Conséquence assumée : le produit n'applique
  aucune durée de conservation et n'efface rien de lui-même (`FR-079`). L'éditrice retire à la
  main, à l'unité ou en groupe (`FR-073`, `FR-074`). À noter : chaque demande existe aussi dans
  la boîte e-mail de l'éditrice (`FR-063`) — ce que le produit efface n'y est pas effacé.
- **L'éditrice perd l'accès à sa boîte e-mail.** Elle ouvre son administration avec le moyen
  de reprise remis à la livraison (`FR-010`), puis remplace l'adresse autorisée par une
  nouvelle dont elle prouve la maîtrise (`FR-013`, `FR-014`). Le dossier d'instance dit où le
  moyen de reprise est rangé, jamais sa valeur (`FR-112`).
- **La boîte e-mail de l'éditrice est compromise.** Le moyen de reprise n'y peut rien :
  l'attaquant ouvre l'administration comme elle. Remplacer le moyen de reprise (`FR-012`)
  l'évince des sessions déjà ouvertes, et rien de plus : tant que la boîte est tenue,
  l'écran de connexion public le laisse revenir au code suivant. Le remède durable est de
  retirer l'adresse compromise en la remplaçant (`FR-013`), ce qui suppose d'entrer dans
  l'administration avant lui — par le moyen de reprise s'il a déjà changé l'adresse.
- **Quelqu'un entre dans l'administration et en ferme la porte derrière lui**, en remplaçant
  l'adresse autorisée et le moyen de reprise. Le produit ne prévoit rien : l'administration est
  auto-administrable, et cette propriété se paie. Le dernier recours est hors du produit — la
  configuration du déploiement appartient à la cliente et se reprend sur pièces (`SC-014`).
- **La base de l'instance est perdue** (incident de plateforme, sans attaquant). L'adresse
  autorisée, l'empreinte du moyen de reprise et les sessions vivent en base et n'existent nulle
  part ailleurs ; aucune n'est du contenu, donc `I2`/`I3` ne les reconstruisent pas. Les
  sessions sont sans enjeu — elles expirent de toute façon (`FR-118`). L'adresse autorisée et le
  moyen de reprise se réétablissent par le réamorçage au dossier d'instance (`FR-119`) :
  redéployer, réensemencer l'adresse et engendrer un nouveau moyen de reprise (nouveau papier),
  depuis les seuls accès du client — le geste de livraison (`FR-009`) rejoué après l'incident.

---

## NON inclus (frontière de périmètre)

Repris et affiné depuis le scope EXCLU du Brief. Ces exclusions sont des décisions, pas des
lacunes ; chacune est réversible quand un client réel la demandera.

**Hérité du Brief**

- Constructeur visuel de formulaires : aucune palette de champs, aucun ajout ni retrait de
  champ dans l'admin.
- Création et composition libre de pages : ni création, ni ajout, retrait ou réordonnancement
  de bloc.
- Hébergement de vidéo : les vidéos sont des liens externes.
- Articles, auteurs, tags, flux daté.
- Multi-éditeurs, rôles et permissions, édition concurrente, verrou d'édition. Une seule
  adresse ouvre l'administration, et l'éditrice la **remplace** sans jamais pouvoir en ajouter
  une seconde : la collision qu'un verrou protégerait reste structurellement impossible.
- Historique daté des versions : ni pile de versions, ni comparaison, ni restauration d'un
  état plus ancien que la dernière version publiée.
- Export ou réversibilité de l'historique des demandes : la suite donnée ne survit pas à
  l'outil.
- Téléversement de fichier par le visiteur.
- Prix ferme, opposable ou contractuel.
- Logique de formulaire avancée : champ conditionnel, formulaire multi-étapes, paliers,
  remises, règle de prix combinatoire.
- Pages publiques dynamiques, à l'unique exception de l'envoi d'une demande.
- Mutualisation multi-clients : aucune notion de tenant, aucune console de flotte.
- Tout service hébergé par l'intégrateur.
- Analytique tierce.
- Le relevé mensuel et son commentaire : le produit fournit l'instrument, pas la lecture.
- Positionnement dans les moteurs de recherche : aucune position ni aucun volume de trafic
  n'est un livrable.
- Auto-hébergement par un tiers : ni installateur, ni documentation d'installation grand
  public, ni support.

**Arrêté par ce PRD**

- **Durée de conservation appliquée par le produit.** Aucune purge automatique des demandes,
  aucune échéance affichée : le produit ne décide pas d'une durée à la place de celle à qui
  les données sont confiées, il rend l'effacement praticable — retrait unitaire, retrait
  groupé, demandes présentées de la plus récente à la plus ancienne. Décision documentée par
  la recherche du
  [2026-08-10](./research/2026-08-10-retention-donnees-demandes-devis.md) ; réversible si une
  position d'autorité vient viser l'éditeur d'un outil plutôt que son utilisateur.
- **Filtre par date sur la liste des demandes.** La date portée par chaque demande
  (`FR-067`), la présentation antéchronologique (`FR-069`) et le retrait groupé (`FR-074`)
  rendent le ménage praticable sans contrôle supplémentaire. À rouvrir si une liste grossit au
  point que le défilement devienne l'obstacle.
- **Seconde adresse d'administration.** L'adresse autorisée est unique et se remplace ; il
  n'existe ni adresse de secours, ni récupération par un tiers. La reprise en cas de perte de
  la boîte passe par le moyen de reprise (`FR-009` à `FR-012`).
- **Révocation d'un accès en cours.** Le produit n'offre aucun moyen de fermer une session
  ouverte ailleurs ni de constater les accès en cours. La fermeture de toute session au
  remplacement du moyen de reprise (`FR-012`) et l'expiration d'une session par le temps
  (`FR-118`) sont des conséquences automatiques, pas de telles fonctions.
- **Remplacement du fichier d'une image de la bibliothèque.** Le « remplacement » de l'écran
  Médias se fait emplacement par emplacement (`FR-034`), jamais en substituant le binaire
  d'une image déjà posée : une substitution propagée devrait attendre la publication comme
  tout brouillon, ce qui donnerait un état en attente à un objet qui n'en a pas. Poser la
  nouvelle image et la réaffecter suffit.
- **Texte alternatif par emplacement.** La description appartient à l'image et la suit
  partout ; l'intégrateur n'en pose aucune sur les gabarits.
- **Publication partielle.** Il n'existe pas de publication page par page : la mise en ligne
  porte sur l'ensemble des brouillons.
- **Restauration partielle.** L'abandon d'un brouillon porte sur un objet entier — une page,
  un réglage, un formulaire ; il n'y a pas de retour en arrière champ par champ.
- **Titre et description destinés aux moteurs de recherche, éditables par l'éditrice.** Non
  couvert en v1 : le produit livre les fondations d'un site statique, rien de plus.

---

## Critères de succès mesurables

`SC-001` à `SC-015` sont repris du Brief sans renumérotation ; `SC-016` et suivants naissent
des arbitrages de ce PRD.

- **SC-001** : Coût d'hébergement de **0 €/mois par site** en conditions nominales, et à la
  livraison **aucun moyen de paiement enregistré** sur le compte du client, **aucun
  abonnement payant** souscrit.
- **SC-002** : Le site de la pâtisserie est **en production** sur ColibriCMS. *(Pas d'échéance
  contractuelle : la cliente attend sans date ferme.)*
- **SC-003** : L'éditrice **modifie un texte et remplace une image, seule, sans aide et du
  premier coup**, lors d'un test d'usage réel observé.
- **SC-004** : Une modification publiée est **visible en ligne en moins de 5 minutes** après
  l'action « Publier ».
- **SC-005** : Score **Lighthouse Performance ≥ 95 en mobile**, mesuré sur le HTML réellement
  bâti des pages de contenu publiées.
- **SC-006** : Comptes auxquels l'éditrice doit se connecter pour éditer ou publier :
  **zéro**, hors son administration ouverte par son adresse e-mail. Les comptes portés par son
  nom sont ouverts par l'intégrateur et **jamais visités par elle**.
- **SC-007** : L'éditrice **change seule le prix d'une option et ajoute un parfum** à un
  formulaire, puis publie. Une visiteuse compose ensuite une demande incluant ce nouveau
  parfum : la demande **parvient à l'éditrice par e-mail** avec le détail des sélections, le
  total indicatif et les coordonnées de la visiteuse, **apparaît dans la liste des demandes
  reçues**, et l'éditrice y **renseigne seule la suite donnée**.
- **SC-008** : Une nouvelle version **se déploie sur une instance cliente existante sans
  modification de code spécifique à ce client, et sans perte de son contenu**.
- **SC-009** : Après avoir écrasé un contenu par erreur, l'éditrice **retrouve seule la
  version publiée**, et le site public redevient identique à ce qu'il était avant sa
  modification.
- **SC-010** : L'éditrice **remplace l'image d'un emplacement par une image déjà présente**,
  retrouvée depuis l'écran Médias sans la re-téléverser ; et après toute suppression d'image
  depuis l'écran Médias — qu'elle soit utilisée ou non — **aucune page publiée n'affiche
  d'image manquante**.
- **SC-011** : **Épreuve de réversibilité** : dans un environnement neuf, à partir des seuls
  objets que la cliente possède et sans aucun concours de l'intégrateur, la procédure de
  reconstruction documentée produit **le site complet, médias compris, équivalent au site en
  ligne pour un visiteur** : mêmes contenus, mêmes médias aux mêmes emplacements, mêmes pages
  au même rendu — **l'identité binaire des fichiers n'est pas exigée**. La sortie est conservée
  comme pièce, datée.
- **SC-012** : Après **révocation de tous les accès de l'intégrateur**, le site est toujours
  servi, l'administration s'ouvre, et une publication aboutit.
- **SC-013** : À la livraison, l'inventaire des identifiants et des liaisons du déploiement
  ne contient **aucun identifiant appartenant à l'intégrateur**, et rien n'y permet de
  reconstituer le moyen de reprise.
- **SC-014** : **Épreuve de passation** : un prestataire tiers, avec les seuls accès aux
  comptes de la cliente et le dossier d'instance, **redéploie l'instance et publie une
  modification qui apparaît en ligne**, sans poser aucune question à l'intégrateur. La sortie
  est conservée comme pièce, datée.
- **SC-015** : Lors de sa première édition après au moins trois mois sans usage, l'éditrice
  **modifie et publie seule, sans aide** — même épreuve que `SC-003`, sans réapprentissage.
- **SC-016** : Le récapitulatif présenté avant une publication liste **exactement** les pages,
  les réglages et les formulaires qui vont être mis en ligne et les images qui vont être
  effacées : sur un jeu de brouillons connu, aucune omission et aucun élément en trop.
- **SC-017** : L'éditrice **modifie seule le texte de la mention d'information** et le
  nouveau texte est présenté aux visiteurs de tous les formulaires après publication.
- **SC-018** : L'éditrice **saisit seule la description d'une image** depuis l'écran Médias,
  et cette description est servie avec l'image sur toutes les pages publiées où elle est
  posée.
- **SC-019** : Sur un jeu de demandes connu **comportant des retraits ordinaires et des
  retraits déclarés indésirables**, l'écran des demandes affiche **le nombre présent, le
  nombre de commandes et le nombre de retirées pour le site, et les mêmes nombres pour chaque
  formulaire** — les retraits indésirables ne figurant dans aucun, et les ventilations sommant
  au total du site.
- **SC-020** : Boîte e-mail de l'éditrice rendue inaccessible, l'éditrice **ouvre seule son
  administration par le moyen de reprise** et consulte la liste des demandes.
