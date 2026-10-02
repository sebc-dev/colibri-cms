# UX — 006 Nom des emplacements

## Canvas

Pas d'artboard propre : ce change remplit le titre de carte déjà dessiné par le change 005
(`openspec/changes/005-mise-en-page-administration/ux.md`, « Écran : Éditeur d'une page » —
« Texte riche — Présentation », libellé en 13 px au-dessus du contenu). Aucun nouvel écran, aucun
nouvel état.

## Écrans & états

- **Éditeur d'une page** — titre de chaque carte :
  - *emplacement nommé* : « Texte riche — Présentation » (nature, tiret cadratin espacé, nom) ;
  - *emplacement sans nom* : « Galerie » (nature seule, comme aujourd'hui) ;
  - *nom long* : passe à la ligne dans la carte, jamais tronqué ni coupé.
- **Fiche d'une image — « Posée dans »** et **confirmation de suppression — « Elle est posée dans : »** :
  - *emplacement nommé* : « Accueil — Nos réalisations » ;
  - *emplacement sans nom* : « Accueil — galerie », ou « Accueil — 2e galerie » s'il y en a plusieurs.

## Critères d'acceptation UX

- UX1 — Sur une page où deux emplacements ont la même nature et chacun un nom, l'éditrice désigne sans
  hésiter celui qu'elle cherche à la seule lecture des titres de carte, sans lire leur contenu.
- UX2 — Un même emplacement porte la même désignation dans l'éditeur et dans la fiche d'une image.
- UX3 — Aucun identifiant technique (`presentation`, `galerie-realisations`) n'apparaît, avec ou sans
  nom.
- UX4 — Rien à l'écran ne suggère que l'éditrice puisse changer un nom (pas de crayon, pas de champ).
