# UX — 008 Réglages transverses

## Canvas

Pas encore d'artboard : l'écran s'assemble entièrement à partir des éléments déjà dessinés par le change
005 (`openspec/changes/archive/2026-10-02-005-mise-en-page-administration/ux.md`) — cadre, carte
d'emplacement, titre de carte en 13 px, pastille « Brouillon », bouton « Enregistrer », champ en erreur,
barre de mise en forme du texte riche. Si la revue du ticket de l'écran le demande, un artboard
« Écran : Réglages » (large et étroit) sera posé et lié ici.

## Écrans & états

- **Écran : Réglages** — titre « Réglages », dans le cadre, rubrique « Réglages » active. Une colonne, trois
  cartes dans cet ordre ; chaque carte porte son titre, sa pastille « Brouillon » quand le réglage en porte
  un, et son bouton « Enregistrer » en pied de carte.
- **Carte Coordonnées**
  - *remplie* : un champ par coordonnée déclarée, intitulé par son nom (« Téléphone de l'atelier ») ou, à
    défaut, par sa nature (« Téléphone », « Adresse e-mail », « Adresse postale », « Texte ») ; l'adresse
    postale est une zone de plusieurs lignes, les autres une ligne ; clavier adapté sur téléphone
    (numérique pour un téléphone, e-mail pour une adresse e-mail) ;
  - *vide de déclaration* : « Aucune coordonnée n'est prévue pour votre site. », sans aucun geste de
    création ;
  - *erreur* : chaque champ refusé est marqué et dit ce qui est attendu (« Un numéro de téléphone, de 6 à
    15 chiffres. », « Une adresse e-mail, par exemple nom@exemple.fr. ») ; rien n'est enregistré.
- **Carte Réseaux sociaux**
  - *liste* : une ligne par lien — champ « Nom affiché », champ « Adresse de la page », boutons « Monter »,
    « Descendre » (absents ou inactifs en bout de liste) et « Retirer » ;
  - *vide* : « Aucun lien pour l'instant. » et le bouton « Ajouter un lien » ;
  - *complète (12 liens)* : le bouton « Ajouter un lien » disparaît, remplacé par « La liste est complète
    (12 liens au plus). » ;
  - *erreur* : le champ refusé dit ce qui est attendu (« Une adresse qui commence par https:// »,
    « Un nom de 40 caractères au plus. »).
- **Carte Mention d'information** — l'éditeur de texte riche des pages, avec une phrase d'aide : « Ce
  texte accompagne chaque formulaire de votre site. » ; *erreur* si vide : « La mention ne peut pas rester
  vide. »
- **Envoi** — pendant l'enregistrement, le bouton de la carte est inactif et dit « Enregistrement… » ;
  au succès, la pastille « Brouillon » paraît sur cette carte seule ; sur un échec de connexion, la carte
  garde la saisie et dit que l'enregistrement n'a pas abouti.

## Critères d'acceptation UX

- UX1 — Sur un téléphone, l'éditrice corrige le numéro de l'atelier et l'enregistre au pouce, sans zoom ni
  défilement horizontal.
- UX2 — Après un enregistrement réussi, l'éditrice voit sans quitter l'écran quelle carte porte désormais
  un brouillon, et seulement celle-là.
- UX3 — Un refus désigne le champ fautif et dit quoi saisir ; la saisie de l'éditrice n'est jamais
  perdue.
- UX4 — Aucun identifiant technique de coordonnée n'apparaît, et rien sur la carte Coordonnées ne suggère
  qu'un champ puisse être ajouté, retiré ou renommé.
- UX5 — Monter, descendre et retirer un lien se font au clavier comme au doigt, chaque bouton portant un
  libellé accessible qui nomme le lien visé (« Monter Instagram »).
