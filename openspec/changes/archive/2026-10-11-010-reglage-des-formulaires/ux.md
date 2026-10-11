# UX — 010 Réglage des formulaires de devis

## Canvas

Pas encore d'artboard : les deux écrans s'assemblent à partir des éléments déjà dessinés par les changes
005 et 008 — cadre, liste des pages (lignes menant à un écran, pastille « Brouillon »), carte à titre en
13 px, bouton « Enregistrer », champ en erreur, liste éditable de la carte Réseaux sociaux (monter,
descendre, retirer, ajouter, plafond). Si la revue du ticket de l'écran d'un formulaire le demande, un
artboard « Écran : Formulaire » (large et étroit) sera posé et lié ici.

## Écrans & états

- **Écran : Formulaires** — titre « Formulaires », dans le cadre, rubrique « Formulaires » active.
  - *liste* : une ligne par formulaire, dans l'ordre alphabétique de leurs identifiants, sous son nom (« Devis gâteau »), toute la
    ligne menant à son écran, la pastille « Brouillon » quand il en porte un ;
  - *vide* : « Aucun formulaire n'est prévu pour votre site. », sans aucun geste de création.
- **Écran : Formulaire** — titre au nom du formulaire, lien de retour « Formulaires », pastille
  « Brouillon » à côté du titre quand il en porte un ; une phrase d'aide : « Vous réglez ici les choix
  proposés aux visiteurs et leurs prix. Les questions elles-mêmes sont posées avec vous à la création du
  site. » ; une carte par champ à choix, dans l'ordre posé, titrée par son libellé (« Parfum »), avec la
  mention « Un seul choix » ou « Plusieurs choix possibles » ; un bouton « Enregistrer » unique en pied
  d'écran, qui reste atteignable sur téléphone.
  - *carte avec prix* : une ligne par option — champ « Choix » (le libellé), champ « Prix » suffixé
    « € » (clavier numérique décimal sur téléphone), boutons « Monter », « Descendre » (absents ou
    inactifs en bout de liste) et « Retirer » ; bouton « Ajouter un choix » en pied de carte, qui ajoute
    une ligne vide en fin de liste et y place le focus ;
  - *carte sans prix* : mêmes lignes sans champ « Prix » ;
  - *une seule option* : le bouton « Retirer » de la dernière option est inactif, avec l'explication
    « Gardez au moins un choix. » ;
  - *complète (30 options)* : « Ajouter un choix » disparaît, remplacé par « La liste est complète
    (30 choix au plus). » ;
  - *erreur* : la ligne fautive est marquée et dit ce qui est attendu (« Un montant en euros, par
    exemple 12 ou 12,50. », « Un choix de 80 caractères au plus. », « Ce choix existe déjà. »,
    « Donnez un nom à ce choix. ») ; un message en haut de l'écran signale qu'il reste à corriger et
    mène à la première erreur ; rien n'est enregistré.
  - Les champs sans option (nom, e-mail, message) **n'apparaissent pas** : rien sur l'écran ne suggère
    qu'une question puisse être ajoutée, retirée, renommée ou déplacée.
- **Envoi** — pendant l'enregistrement, le bouton est inactif et dit « Enregistrement… » ; au succès,
  la pastille « Brouillon » paraît à côté du titre et un message bref confirme « Modifications
  enregistrées. Elles seront visibles sur le site après publication. » ; sur un échec de connexion,
  l'écran garde la saisie et dit que l'enregistrement n'a pas abouti.
- **Quitter avec des modifications non enregistrées** — hors périmètre de ce change (même comportement
  que les cartes des réglages).

## Critères d'acceptation UX

- UX1 — Sur un téléphone, l'éditrice passe le prix de « Vanille » de 8 € à 10 € et enregistre au pouce,
  sans zoom ni défilement horizontal.
- UX2 — L'éditrice ajoute le parfum « Pistache » à 12 € et l'enregistre en moins de 30 secondes depuis
  l'ouverture de l'écran du formulaire.
- UX3 — Un refus désigne l'option fautive et dit quoi saisir ; la saisie de l'éditrice n'est jamais
  perdue.
- UX4 — Aucun identifiant technique (de formulaire, de champ, d'option) n'apparaît, et aucun prix
  n'apparaît en centimes : toujours en euros, à la française (« 12,50 € »).
- UX5 — Monter, descendre, retirer et ajouter un choix se font au clavier comme au doigt, chaque bouton
  portant un libellé accessible qui nomme l'option et le champ visés (« Monter Fraise dans Parfum »).
