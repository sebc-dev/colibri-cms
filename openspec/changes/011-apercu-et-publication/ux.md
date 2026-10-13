# UX — 011 Aperçu et publication

## Canvas

Pas encore d'artboard. Les écrans d'administration s'assemblent à partir des éléments déjà dessinés par
les changes 005, 008 et 010 — cadre (barre latérale, tiroir, barre haute), carte titrée, liste de lignes
menant à un écran, pastille « Brouillon », bouton principal, message d'état (`Alert`), boîte de dialogue.
Deux artboards seront posés et liés ici si la revue du ticket correspondant le demande : « Écran :
Publier » (large et étroit, avec ses états) et le **gabarit public** (page Accueil, large et étroit).

## Écrans & états

- **Cadre — geste « Publier » et état de la dernière publication.**
  - Le bouton **« Publier »** (bouton principal) est dans la barre haute du cadre, à droite, sur tous les
    écrans, visible sur téléphone tiroir fermé. Il mène à l'écran Publier ; il ne met rien en ligne
    lui-même.
  - À côté, une **pastille d'état** dès la première confirmation :
    - *en cours* : « Mise en ligne en cours… » (couleur d'attente) ;
    - *en ligne* : « Site à jour » (couleur de succès), discrète ;
    - *n'a pas abouti* : « La dernière mise en ligne n'a pas abouti » (couleur d'alerte), menant à
      l'écran Publier ;
    - *publication en train de partir* (verrou pris) : « Publication en cours… ».
  - Jamais de pastille avant la première confirmation : pendant le dépôt de la toute première
    publication, la pastille dit déjà « Publication en cours… ».

- **Éditeur d'une page — « Voir l'aperçu ».** Un bouton secondaire « Voir l'aperçu » en tête de
  l'éditeur, à côté du titre de la page ; il ouvre l'aperçu dans le même onglet.

- **Aperçu d'une page.** La page publique telle qu'elle sera, surmontée d'un **bandeau** pleine largeur,
  hors de la page : « Aperçu — cette page n'est pas encore en ligne. » et un lien « Revenir à la page »
  (vers l'éditeur de cette page). Le bandeau reste lisible sur téléphone (une ligne qui passe à la ligne,
  pas de défilement horizontal). Un lien vers une autre page du site (menu, bouton, lien d'un texte)
  ouvre l'aperçu de cette page, sous le même bandeau : l'éditrice parcourt son site avec ses brouillons
  sans le quitter par erreur. Les liens vers l'extérieur (réseaux, vidéo, téléphone, e-mail) mènent à
  leur destination réelle.

- **Écran : Publier** — titre « Publier », dans le cadre (aucune rubrique marquée active).
  - *récapitulatif* : une phrase d'introduction « Voici ce qui va être mis en ligne. Rien ne part tant
    que vous n'avez pas confirmé. » ; puis jusqu'à cinq listes, chacune absente si elle est vide :
    « Pages » (chaque titre est un lien « Voir l'aperçu »), « Réglages », « Formulaires de devis »,
    « Images dont la description change », « Images qui seront définitivement effacées » (avec une
    vignette et la phrase « Ces images ne sont plus utilisées sur votre site. Elles seront effacées et
    ne pourront pas être récupérées. ») ; en pied, « Publier maintenant » (bouton principal) et
    « Annuler » (bouton secondaire, retour à l'écran quitté, « Mes pages » à défaut).
  - *rien à publier* : « Rien à publier : aucune page, aucun réglage ni aucun formulaire n'a de
    modification en attente. » ; seul « Revenir à mes pages » est offert, plus « Relancer la mise en
    ligne » quand la dernière mise en ligne n'a pas abouti.
  - *récapitulatif changé* (confirmation refusée, 409) : message « Vos modifications ont changé depuis
    l'affichage de cette liste. Vérifiez-la à nouveau avant de publier. » au-dessus du récapitulatif à
    jour ; rien n'est parti.
  - *déjà en cours* : « Une publication est déjà en cours. Attendez qu'elle se termine, puis
    réessayez. »
  - *dépôt en cours* : la liste se fige, « Publier maintenant » devient inactif et dit « Publication… » ;
    s'il y a des images, une barre d'avancement « Envoi des images : 3 sur 12 » ; l'éditrice peut
    quitter l'écran sans rien interrompre de grave (une publication interrompue est reprise).
  - *déposée, en cours de mise en ligne* : « C'est publié. Votre site sera à jour dans quelques minutes.
    Vous pouvez continuer à travailler. » ; l'écran se met à jour de lui-même.
  - *en ligne* : « Votre site est à jour. » avec un lien « Voir mon site » (nouvel onglet).
  - *n'a pas abouti* (mise en ligne) : « La mise en ligne n'a pas abouti. Votre site est resté tel qu'il
    était, et vos modifications sont gardées. » et le bouton « Relancer la mise en ligne ».
  - *échec avant le dépôt* : « La publication n'a pas pu se faire. Rien n'a changé : votre site et vos
    modifications sont intacts. Réessayez dans quelques minutes. » Le même message vaut quand le site
    n'est pas raccordé (pas de dépôt ou pas de clé), comme le veut la spec de la publication.
  - Vocabulaire proscrit sur tout l'écran : dépôt, GitHub, branche, commit, build, déploiement, push,
    serveur, erreur 4xx/5xx. On dit « publier », « mettre en ligne », « votre site ».

- **Pages publiques (gabarit sobre).** En-tête : la navigation entre les pages (barre sur écran large,
  liste repliable sans script — `<details>` — sur téléphone) ; aucun nom de site n'est déclaré
  aujourd'hui, l'en-tête n'en invente pas. Corps : les emplacements l'un sous l'autre, en une colonne lisible (≈ 70 caractères).
  Pied : coordonnées, puis réseaux sociaux. Images à largeur de colonne, galerie en grille, carrousel en
  bande défilante au doigt. « Introuvable » : « Cette page n'existe pas. » et un lien vers l'accueil.

## Critères d'acceptation UX

- UX1 — Depuis n'importe quel écran, sur téléphone, l'éditrice atteint le récapitulatif en un seul
  toucher (« Publier »), sans ouvrir le tiroir.
- UX2 — Sur le jeu de brouillons de SC-016, l'éditrice dit sans aide ce qui va partir et quelles images
  seront effacées, en lisant le seul récapitulatif.
- UX3 — Après « Publier maintenant », l'éditrice sait à tout moment si son site est à jour, en cours, ou
  si la mise en ligne n'a pas abouti — y compris après avoir quitté l'écran Publier (pastille du cadre).
- UX4 — Depuis l'éditeur d'une page, l'aperçu s'ouvre en un geste et le retour à l'édition en un autre ;
  l'éditrice ne confond jamais l'aperçu avec le site en ligne (bandeau).
- UX5 — Aucun message de publication, en succès comme en échec, n'emploie un terme de développeur ; un
  échec dit toujours ce qui est arrivé au site (inchangé) et aux modifications (gardées).
- UX6 — Les pages publiques se lisent sur un écran de 360 px sans défilement horizontal, la navigation
  restant atteignable sans script.
