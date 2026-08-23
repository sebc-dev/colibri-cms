# Candidat ADR : Format du contenu déposé — un répertoire par objet
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0007-format-du-contenu-un-repertoire-par-objet.md` (ADR-0007 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

`FR-087` fait déposer le contenu publié « en fichiers lisibles » dans un espace appartenant à
la cliente, et `FR-107` / `FR-109` en font la matière d'une procédure de reconstruction,
mesurée par l'épreuve de réversibilité `SC-011`.

La contrainte qui décide de la **forme** n'est pas technique : le §4.3 du clausier du
[socle de livraison](../../socle-de-livraison.md) promet que les contenus « restent exploitables
par n'importe quel professionnel, avec ou sans l'outil ». C'est le **texte de la cliente** qui
doit rester lisible, et pas seulement récupérable.

Une contrainte de structure s'y ajoute : `FR-017` et `FR-018` font porter à une page
**plusieurs** emplacements éditables, dont plusieurs de texte riche.

## Décision

Nous déposerons le contenu publié à raison d'**un répertoire par objet** : un `page.json` pour
la **structure**, et un fichier `.md` par **emplacement de texte riche**.

## Conséquences

**Positives.**

- Le texte de la cliente reste du texte : il s'ouvre dans n'importe quel éditeur et se lit dans
  un `git diff` ligne à ligne, ce que la promesse du §4.3 exige.
- La structure et le texte sont séparés : une modification de texte ne touche pas le fichier de
  structure, et réciproquement.
- Le coût d'appel de la publication n'en dépend pas : le contenu textuel est inliné dans
  l'arbre git, donc **le nombre de fichiers texte n'est pas contraint** — voir
  [ADR-0005](../../1.x/adr/0005-forge-github-api-git-data-jeton-a-portee-fine.md).

**Négatives — ce à quoi le code s'engage.**

- **La forme des fichiers déposés n'est plus ouverte** : elle devient une contrainte que
  `docs/archi.md` reprend telle quelle, et que le niveau specs ne peut plus rouvrir.
- **La cohérence entre `page.json` et ses `.md` est une convention du produit**, pas une
  propriété du format. Un emplacement renommé ou retiré touche deux fichiers, et rien dans les
  fichiers eux-mêmes ne rattraperait une divergence — l'écriture est atomique par l'arbre git,
  la cohérence sémantique ne l'est pas.
- **Un objet coûte plusieurs fichiers**, donc plusieurs entrées dans l'arbre déposé. C'est sans
  effet sur le budget d'appels de la publication, mais cela pèse sur le décompte de fichiers
  que le garde-fou `C5` du socle de livraison surveille.

## Alternatives considérées

- **Un JSON par objet** : écartée car le texte riche y devient une **chaîne échappée** sur une
  seule ligne — le diff Git cesse d'être une lecture, et la promesse du §4.3 devient formelle
  au lieu d'être vraie.
- **Markdown + frontmatter** : écartée par empêchement de structure — une page porte
  **plusieurs** emplacements de texte riche (`FR-017`, `FR-018`), là où un fichier Markdown n'a
  qu'un seul corps.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, arbitrée par
  l'humain. Revue humaine : 2026-08-13.
