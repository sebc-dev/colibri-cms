# ADR-0002 : Format du contenu déposé — Markdown pour le texte riche, frontmatter YAML pour les champs structurés
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

`ADR-0001` fait du dépôt de la cliente le magasin de l'état publié. Reste à décider **dans
quel format** ce contenu y est déposé — et ce format n'est pas un détail de sérialisation :
c'est l'objet même de la promesse.

`FR-037` exige des **fichiers lisibles**, et `SC-011` fait de la reconstruction par un
tiers une épreuve exécutée. Or l'épreuve ne se joue pas seulement sur la présence des
fichiers : elle se joue sur ce que le développeur tiers doit apprendre avant de pouvoir
les exploiter. `US12` pose qu'il n'a « jamais entendu parler d'Isometria » ; `US11`
prévient que le format posé à la première publication se paie s'il faut le reprendre tard.

Le contenu déposé est de deux natures : du **texte riche** saisi par l'éditrice
(`FR-006`), et des **champs structurés** — références d'images (`FR-007`), suites
ordonnées (`FR-008`, `FR-009`), libellés et destinations de boutons (`FR-011`, `FR-012`),
coordonnées et liens sociaux (`FR-015`, `FR-016`), options et montants du formulaire
(`FR-048` à `FR-053`), inventaire des médias (`FR-039`).

Exigences concernées : `FR-006`, `FR-037`, `FR-039`, `FR-043`, `SC-011` · `US11`, `US12`.

## Décision

Nous déposerons le texte riche en **Markdown** et les champs structurés en **frontmatter
YAML** en tête du même fichier.

Nous bornerons l'éditeur de texte riche à ce que Markdown exprime : l'éditrice ne pourra
produire que des constructions représentables dans ce format.

Nous poserons ce format dès la première publication et le traiterons comme un engagement
vis-à-vis du dépôt de la cliente, au même titre que le contenu lui-même.

## Conséquences

**Positives**

- `SC-011` se joue sur du familier : un développeur tiers ouvre le fichier et lit, sans
  connaître aucun schéma propriétaire. C'est la condition qui rend l'épreuve tenable
  « sans poser aucune question » (`SC-014`).
- Borner l'éditeur à Markdown va dans le sens du produit : l'éditrice **ne peut pas casser
  sa mise en page**, ce que `US2` et `FR-013` exigent par ailleurs de la structure.
- Un seul fichier porte le texte et ses champs : rien à recoller à la lecture, et le diff
  d'une publication est lisible.
- Le format est directement consommable par les collections de contenu du moteur de rendu
  retenu (`ADR-0005`), sans couche de conversion.

**Négatives — ce que ce choix coûte**

- **L'éditrice perd toute mise en forme que Markdown n'exprime pas.** Un contenu collé
  depuis un traitement de texte est appauvri, et l'aller-retour HTML → Markdown → HTML
  n'est pas l'identité : le produit s'engage à ce que cet appauvrissement soit visible à
  l'aperçu (`FR-030`) plutôt que découvert après publication.
- **YAML a des pièges de typage** — une valeur non quotée peut être relue en booléen, en
  nombre ou en date. Le CMS s'engage à une sérialisation stricte à l'écriture et à une
  validation de schéma à la relecture ; c'est l'une des frontières que couvre `ADR-0006`.
- **Le format devient coûteux à changer** dès la première publication : il vit dans le
  dépôt de chaque instance de la flotte, et toute évolution est une migration à jouer
  partout (`ADR-0011`).

## Alternatives considérées

- **Le JSON structuré de l'éditeur de texte riche** (arbre de nœuds), déposé tel quel :
  écartée malgré une fidélité parfaite, parce que `SC-011` obligerait alors le développeur
  tiers à décoder le schéma d'un éditeur avant de pouvoir rendre quoi que ce soit — ce qui
  transforme une lecture en rétro-ingénierie et rend l'épreuve dépendante de notre
  documentation.
- **HTML déposé tel quel** : écartée parce qu'elle rend l'éditrice capable de produire de
  la mise en page arbitraire, ce que `FR-013` et `US2` interdisent explicitement, et parce
  que le fichier cesse d'être lisible au sens de `FR-037` dès que le balisage se densifie.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 2 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
