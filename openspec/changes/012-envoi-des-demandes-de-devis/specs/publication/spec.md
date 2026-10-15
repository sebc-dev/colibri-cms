## ADDED Requirements

### Requirement: La publication garde l'emplacement d'un formulaire

Quand une page qui pose un formulaire est publiée, le `page.json` déposé SHALL porter son emplacement de
formulaire **tel que l'intégrateur l'a posé** — identifiant, rang, formulaire désigné, nom s'il en a un —,
à son rang parmi les autres emplacements. La publication NE DOIT jamais retirer, déplacer ni changer le
formulaire désigné par un tel emplacement. Publier un formulaire NE DOIT réécrire aucune des pages qui le
posent.

#### Scenario: Une page publiée garde son formulaire
- **WHEN** la page « Contact », qui pose le formulaire « Devis gâteau », porte un brouillon de son texte de présentation, et que l'éditrice publie
- **THEN** le `page.json` déposé pour « Contact » porte toujours l'emplacement qui désigne « Devis gâteau », à son rang

#### Scenario: Publier un formulaire ne réécrit pas ses pages
- **WHEN** seul le formulaire « Devis gâteau » porte un brouillon, et que l'éditrice publie
- **THEN** le dépôt réécrit le `formulaire.json` de « Devis gâteau », et ne réécrit le `page.json` d'aucune des pages qui le posent
