## Why

L'éditrice remplit ses pages, gère ses images, règle ses réglages et ses formulaires, mais rien de ce
travail n'atteint un visiteur : il n'existe ni aperçu, ni publication, ni même de page publique. Le Worker
ne sert aujourd'hui que l'administration. Sans cette story, tout ce qui précède reste en brouillon pour
toujours.

Sert **Epic A — Entrer et éditer** (`docs/roadmap.md`), dernière story **Aperçu et publication** ; couvre
**FR-080 → FR-091** et **SC-004**, **SC-016**, sous **FR-117** et **UX-1 → UX-3**. Elle reprend trois
exigences que des changes passés lui ont explicitement déléguées : l'**exécution** de l'effacement
définitif d'une image (**FR-037**, change 004), le **service** de la description d'une image avec elle sur
une page publiée (**FR-039**, change 004), et ce que la publication dépose pour un champ à choix dont les
options de départ ont changé sous un brouillon (candidat
`docs/adr/_candidates/brouillon-d-un-champ-a-choix-porte-toute-sa-liste.md`, change 010). Elle pose enfin
une **première version des pages publiques** — documents complets, sans traitement serveur (**FR-095**,
**FR-096**) —, sans laquelle l'aperçu n'aurait rien à imiter ni la publication rien à mettre à jour ; leur
rapidité mesurée (**SC-005**) reste à la story « Site public rapide et complet ».

## What Changes

- **Des pages publiques.** Chaque page déclarée devient une page du site, bâtie depuis les fichiers du
  contenu publié : chaque sorte d'emplacement y est dessinée (texte riche, image avec sa description,
  galerie, carrousel, bouton d'action, et lien de vidéo présenté comme un lien « Voir la vidéo »), avec
  la navigation entre les pages, les coordonnées et les réseaux sociaux en pied de page. Ce sont des
  documents complets, servis tels quels, sans aucun traitement serveur à la consultation.
- **L'aperçu d'une page.** Depuis l'éditeur d'une page — et depuis le récapitulatif —, « Voir l'aperçu »
  montre la page telle qu'elle sera en ligne, avec son brouillon et ceux des réglages, dessinée par
  exactement le même rendu que la page publique. Un bandeau signale que ce n'est pas encore en ligne et
  ramène à l'édition. L'aperçu n'est atteignable qu'en session ouverte.
- **Un geste « Publier » toujours à portée.** Le cadre de l'administration porte un bouton « Publier »
  et l'état de la dernière publication. Il mène au **récapitulatif** : les pages, les réglages et les
  formulaires qui vont partir en ligne, les images dont la description va changer, et les images qui
  seront définitivement effacées. « Annuler » ramène sans rien toucher.
- **La publication, en un seul geste.** Confirmer met en ligne tous les brouillons ensemble. Le contenu
  publié est déposé en fichiers lisibles dans le dépôt du client, les images publiées sur une branche
  réservée du même dépôt ; ce dépôt du contenu est l'unique déclencheur de la reconstruction du site.
  Les brouillons deviennent le contenu publié, que tous les écrans montrent aussitôt. Les images que plus
  aucun emplacement ne pose sont effacées. Une correction enregistrée pendant une publication reste en
  brouillon. Beaucoup d'images partent en plusieurs passes, avec un avancement visible.
- **L'éditrice connaît l'issue.** Le site sait de quelle publication il est né : l'administration dit
  « en cours de mise en ligne », « en ligne », ou, passé 30 minutes, « la mise en ligne n'a pas abouti »
  — le site reste alors tel qu'il était, ses modifications sont gardées, et elle peut relancer la mise en
  ligne. Une publication qui échoue avant le dépôt ne change rien, ni au site ni aux brouillons. Deux
  publications ne se chevauchent jamais.
- **Les options des champs à choix.** Ce que l'éditrice a vu à l'écran est ce qui part en ligne : la liste
  de son brouillon est déposée telle quelle, et un numéro d'option déjà publié ne revient jamais.
- **Les écrans montrent le contenu publié.** Hors brouillon, l'éditeur d'une page, l'écran des réglages et
  celui d'un formulaire montrent la dernière version publiée ; la bibliothèque compte les images posées
  par le contenu publié et liste aussi les images déjà en ligne.

Hors-périmètre :
- Le dessin d'un formulaire sur une page, sa pose par l'intégrateur, le total et l'envoi d'une demande
  (story « Composer et envoyer une demande de devis »). L'aperçu montrera les brouillons de formulaires
  le jour où cette story dessinera le formulaire dans le rendu partagé.
- La rapidité mesurée des pages publiques (SC-005), un lecteur vidéo intégré, la mise en page fine du
  gabarit par l'intégrateur (story « Site public rapide et complet »).
- L'abandon d'un brouillon et le retour à la version publiée (story « Restauration »).
- Le maintien en vie de la clé d'écriture du dépôt sur un an, le déploiement d'une instance au nom du
  client, la reconstruction sans le CMS (Epic D).

## Capabilities

### New Capabilities
- `site-public` : les pages publiques bâties depuis le contenu publié — gabarit, navigation, dessin de
  chaque sorte d'emplacement, coordonnées et réseaux, description des images —, servies comme documents
  complets sans traitement serveur, sous leurs en-têtes de sécurité.
- `apercu` : l'aperçu d'une page avec tous ses brouillons concernés, au même rendu que le publié,
  réservé à la session ouverte.
- `publication` : le récapitulatif avant publication et son annulation, la publication de l'ensemble des
  brouillons en un geste, le dépôt du contenu et des images dans le dépôt du client, l'effacement des
  images, la sérialisation des publications, l'information de l'éditrice sur l'issue, et le contenu
  publié qui remplace le contenu de départ.

### Modified Capabilities
- `pages-et-emplacements` : le cadre porte le geste « Publier » et l'état de la dernière publication ;
  l'éditeur d'une page offre « Voir l'aperçu » et montre, hors brouillon, la dernière version publiée.
- `bibliotheque-de-medias` : les emplacements où une image est posée et son effaçabilité tiennent compte
  du contenu publié ; l'effacement définitif est exécuté par la publication.
- `reglages-transverses` : hors brouillon, l'écran des réglages montre la dernière version publiée.
- `reglage-des-formulaires` : hors brouillon, l'écran d'un formulaire montre les options publiées ; ce que
  la publication dépose pour un champ à choix est fixé.

## Impact

- **Code** : la zone `render/` (rendu partagé des emplacements) et la zone `site/` (gabarit et feuille de
  style publics) cessent d'être vides ; une route publique bâtie à l'avance et une route d'aperçu gardée
  par la session ; un module `core/` de la publication (récapitulatif, plan de dépôt, préfixes autorisés,
  état d'une publication) ; un adaptateur de dépôt vers GitHub ; l'écran « Publier » et son îlot ; le
  cadre et l'éditeur d'une page retouchés.
- **Données** : des tables D1 du contenu publié (pages, réglages, formulaires) et de l'état de la
  publication ; la table des images reprise pour porter aussi les images publiées (migrations
  versionnées).
- **Contenu déposé** : `content/` réécrit par la publication (pages, réglages, formulaires, fiche de
  chaque image, marque de publication) ; une branche `media` du dépôt pour les octets des images.
- **Configuration** : le dépôt de publication dans `instance.json` ; une clé d'écriture limitée à ce dépôt,
  secret du compte du client (jamais d'Isometria) ; un fichier d'en-têtes pour les pages publiques ; la
  reconstruction qui récupère la branche `media`.
- **Décisions** : huit candidats d'ADR à promouvoir, dont trois amendés (voir design.md) ; aucune
  dépendance nouvelle.
- **Recette** : une chaîne réelle de publication montée sur la recette (dépôt privé, clé, reconstruction
  automatique), avec trois gestes humains.
