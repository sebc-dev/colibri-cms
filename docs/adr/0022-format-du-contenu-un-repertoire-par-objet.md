# ADR-0022 : Format du contenu déposé — un répertoire par objet
Statut : Accepté | Date : 2026-10-11

Promu depuis `docs/legacy/1.x/adr/0007-format-du-contenu-un-repertoire-par-objet.md` — ADR-0007, accepté sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x, **sauf ce que la promotion
> ajoute** : les points marqués *(ajouté)* — le § « Complétée à la promotion » dit quoi et
> pourquoi. Les renvois `FR-xxx`, `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers
> `docs/legacy/1.x/` : ce ne sont pas des noms de fichier. Dans le texte d'origine, chaque renvoi à
> une autre décision porte la mention « (1.x) » — c'est son numéro du cycle 1.x ; dans le texte
> ajouté, un numéro sans mention est un numéro 2.x (correspondance : [`README.md`](./README.md)).

**Modèle** : aucun delta. `content/` relève de `colibri-cms.contenu` (`sourceDir content`), déjà modélisé.

## Contexte

`FR-087` fait déposer le contenu publié « en fichiers lisibles » dans un espace appartenant à
la cliente, et `FR-107` / `FR-109` en font la matière d'une procédure de reconstruction,
mesurée par l'épreuve de réversibilité `SC-011`.

La contrainte qui décide de la **forme** n'est pas technique : le §4.3 du clausier du
[socle de livraison](../legacy/socle-de-livraison.md) promet que les contenus « restent exploitables
par n'importe quel professionnel, avec ou sans l'outil ». C'est le **texte de la cliente** qui
doit rester lisible, et pas seulement récupérable.

Une contrainte de structure s'y ajoute : `FR-017` et `FR-018` font porter à une page
**plusieurs** emplacements éditables, dont plusieurs de texte riche.

## Décision

Nous déposerons le contenu publié à raison d'**un répertoire par objet** : un `page.json` pour
la **structure**, et un fichier `.md` par **emplacement de texte riche**.

*(ajouté)* **Une image publiée a une fiche** : `content/medias/<id>.json`, un fichier par image,
sur la branche principale, à côté des pages. Elle porte `{ id, nomOrigine, format, largeur,
hauteur, description }` — l'identité, le nom d'origine, les dimensions et la description
qu'exige `FR-108`. Ses octets vivent sur la branche `media`
([ADR-0020](./0020-medias-deux-magasins-un-par-etat.md)), sous `medias/<id>.<ext>`. Une image n'a
pas de répertoire : elle n'a ni structure à séparer d'un texte, ni texte riche. Les réglages et
les formulaires suivent le format déposé qu'ont fixé
[ADR-0017](./0017-declaration-des-reglages-transverses.md) et
[ADR-0018](./0018-declaration-des-formulaires-de-devis.md).

## Conséquences

**Positives.**

- Le texte de la cliente reste du texte : il s'ouvre dans n'importe quel éditeur et se lit dans
  un `git diff` ligne à ligne, ce que la promesse du §4.3 exige.
- La structure et le texte sont séparés : une modification de texte ne touche pas le fichier de
  structure, et réciproquement.
- Le coût d'appel de la publication n'en dépend pas : le contenu textuel est inliné dans
  l'arbre git, donc **le nombre de fichiers texte n'est pas contraint** — voir
  [ADR-0005 (1.x)](../legacy/1.x/adr/0005-forge-github-api-git-data-jeton-a-portee-fine.md).
- *(ajouté)* La description d'une image voyage avec sa fiche, dans le contenu : la changer est
  une publication de contenu comme une autre, qui déclenche la reconstruction, et une
  reconstruction sans le produit trouve dans la fiche tout ce que `FR-108` exige.

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
- *(ajouté)* **Une image publiée vit en deux lieux** — sa fiche sur la branche principale, ses
  octets sur `media` — reliés par le seul identifiant. Rien dans les fichiers ne rattrape une
  fiche sans octets ni des octets sans fiche : c'est la construction du site qui le constate, en
  échouant.

## Alternatives considérées

- **Un JSON par objet** : écartée car le texte riche y devient une **chaîne échappée** sur une
  seule ligne — le diff Git cesse d'être une lecture, et la promesse du §4.3 devient formelle
  au lieu d'être vraie.
- **Markdown + frontmatter** : écartée par empêchement de structure — une page porte
  **plusieurs** emplacements de texte riche (`FR-017`, `FR-018`), là où un fichier Markdown n'a
  qu'un seul corps.
- *(ajouté)* **La fiche d'image sur la branche `media`, à côté des octets** : écartée car cette
  branche est réécrite en `force: true` à chaque publication et ne déclenche pas la
  reconstruction — une description changée ne serait pas mise en ligne, et le texte de la
  cliente perdrait l'historique indestructible de la branche principale.
- *(ajouté)* **La description dans le `page.json` de chaque page qui pose l'image** : écartée
  car une image posée sur plusieurs pages aurait autant de descriptions à tenir en phase, là où
  `FR-108` en donne une par média.

## Complétée à la promotion

Promue le 2026-10-11 par le change `011-apercu-et-publication`, le premier à déposer une image.
La décision d'origine ne dit rien des médias : elle est reprise telle quelle et complétée de la
fiche d'image, que `FR-108` exige et que rien ne portait.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, arbitrée par
  l'humain. Revue humaine : 2026-08-13.
