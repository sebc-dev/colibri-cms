# Candidat ADR : Ingestion des médias — liste blanche fermée JPEG / PNG / WebP, reconnue sur les octets d'en-tête, SVG refusé
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0014-ingestion-des-medias-liste-blanche-sur-octets.md` (ADR-0014 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — le numéro 2.x est attribué à la promotion, un geste humain dans `docs/adr/`.


## Contexte

`FR-027` fait téléverser une image dans la bibliothèque, et `FR-040` fait **refuser un
téléversement dont le format ou le poids sort des bornes**, en le disant à l'éditrice. Le volet
**poids** est acquis : 2 Mo, limite documentée d'une ligne D1
([ADR-0004](../../legacy/1.x/adr/0004-medias-deux-magasins-un-par-etat.md)). Le volet **format** est ouvert, et
c'est lui que cette décision ferme.

Le contexte de sécurité a changé depuis que le brouillon vit en D1 : un média téléversé est
servi par une **route du Worker**, sur l'**origine commune**
([ADR-0001](../../legacy/1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md)), avec un
`Content-Type` que le code choisit — **avant toute publication**. La liste blanche se pose donc
au **téléversement**, et non à la publication.

Le geste est déjà payé : `FR-108` exige que les fichiers déposés portent les **dimensions** de
chaque média, donc l'en-tête du fichier est lu de toute façon.

## Décision

Nous n'admettrons au téléversement que **JPEG, PNG et WebP** — liste blanche **fermée**.

Le format sera reconnu sur les **octets d'en-tête** du fichier : ni l'extension du nom
d'origine, ni le `Content-Type` du téléversement ne seront crus, et le `Content-Type` renvoyé
plus tard sera **déduit de la liste**, jamais recopié.

Le **SVG sera refusé**.

## Conséquences

**Positives.**

- **La liste est opposable.** L'extension et le `Content-Type` déclaré sont l'un et l'autre
  choisis par celui qui téléverse ; les octets d'en-tête, non.
- **Le geste ne coûte rien** : l'en-tête est déjà lu pour `FR-108`, et la signature s'y lit dans
  le même geste.
- **Le comportement du pipeline d'images face à un SVG n'a plus besoin d'être établi**, et
  `FR-108` tient sans règle supplémentaire — un SVG n'a pas de dimensions en pixels fiables.
- `X-Content-Type-Options: nosniff`, posé par ailleurs
  ([ADR-0015](../../legacy/1.x/adr/0015-en-tetes-de-reponse-deux-porteurs.md)), rattrape le résidu : un fichier
  hostile passé pour une image n'est pas réinterprété par le navigateur.

**Négatives — ce à quoi le code s'engage.**

- **Un logo vectoriel devra être fourni en PNG.** Coût réel, assumé.
- **Un téléversement direct depuis un téléphone en HEIC est refusé** — en le disant à
  l'éditrice, comme `FR-040` l'exige, mais refusé.
- **La liste est fermée** : ajouter un format plus tard n'est pas un réglage, c'est une révision
  de cette décision — et elle emporte l'instruction du comportement du pipeline d'images pour ce
  format.

## Alternatives considérées

- **Le SVG assaini** : écartée — c'est le motif de
  [ADR-0008](../../legacy/1.x/adr/0008-texte-riche-markdown-restreint.md) dans l'autre sens. Un SVG est un document
  exécutable, l'assainir demanderait de prouver une absence, et il faudrait embarquer la
  bibliothèque sous le plafond de 3 Mo gzip du Worker.
- **Le SVG servi depuis une origine distincte** : écartée car elle ferme le vol de session, mais
  ouvre un espace de plus à vérifier sous l'invariant `I1` du
  [socle de livraison](../../legacy/socle-de-livraison.md), pour un format dont le produit n'a pas besoin.
- **Admettre le HEIC** : écartée car sa lecture par le pipeline d'images n'est pas établie et
  deviendrait un point de recette bloquant de plus.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack le 2026-08-11 par le
  traitement de `S-06`. Revue humaine : 2026-08-13.
