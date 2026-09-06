# Candidat ADR : Le HTML brut n'est rendu qu'en un seul lieu — `src/render/markdown/`
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0025-html-brut-confine-au-rendu-markdown.md` (ADR-0025 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

Le site public et l'administration partagent une **origine commune**
([ADR-0001](../../legacy/1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md)) : tout contenu tiers
exécuté vaut vol de session. Deux chemins amènent du texte d'inconnu jusqu'à un rendu — le texte
riche des emplacements éditables (`FR-018`) et la **liste des demandes** (`FR-069`), où les
coordonnées d'un visiteur anonyme atteignent un écran d'administration.

Svelte **échappe par défaut** ; seul `{@html}` casse cette propriété, et Astro a son équivalent,
`set:html`.

La Stack avait déposé l'invariant en ces termes : « aucune donnée fournie par un visiteur
n'atteint un rendu HTML brut ». C'est la propriété voulue, et elle **n'est pas décidable
statiquement** — suivre une donnée depuis un formulaire jusqu'à son rendu demanderait une
analyse de flux que rien n'exécute. Cet invariant retient la forme qui l'est.

**Caractéristique architecturale servie** : `C2` — confinement de l'origine commune.
**Exigences servies** : `FR-018`, `FR-069`.

**Trace observable** : l'**occurrence** de `{@html}` ou `set:html`, hors du chemin autorisé.

## Décision

**`{@html}` et `set:html` n'apparaîtront que sous `src/render/markdown/`** ; **aucune occurrence
ailleurs** dans les sources.

## Conséquences

**Positives.**

- **La première des deux parades du XSS same-origin devient une propriété du dépôt**, lisible
  sans exécuter quoi que ce soit — et non plus une intention.
- **Le seul lieu autorisé ne rend que du Markdown restreint**, déjà filtré sur ses marques et
  ses schémas d'URL ([ADR-0008](../../legacy/1.x/adr/0008-texte-riche-markdown-restreint.md)) : l'exception est
  bornée à un contenu qui a déjà passé une liste blanche.
- L'échappement par défaut de Svelte redevient la règle **sans exception ailleurs**.

**Négatives — ce à quoi le code s'engage.**

- **C'est plus strict que l'énoncé d'origine.** Du HTML brut parfaitement légitime — un fragment
  produit par le produit lui-même, sans aucune donnée de visiteur — est interdit ailleurs aussi.
  C'est le prix assumé : la simplicité de l'interdit est ce qui le rend vérifiable.
- **L'interdit est nominatif.** Il nomme deux formes ; une troisième voie d'insertion de HTML
  brut — un `innerHTML` posé à la main, une API de DOM équivalente — **passerait le contrôle**.
  La liste est à étendre si la stack évolue.
- **Un besoin de rendu riche non couvert par le Markdown restreint n'a pas d'échappatoire** : il
  demande d'étendre le Markdown, donc de réviser
  [ADR-0008](../../legacy/1.x/adr/0008-texte-riche-markdown-restreint.md), ou de remplacer cet ADR-ci.

## Alternatives considérées

- **Suivre la donnée du visiteur jusqu'à son rendu** — l'énoncé d'origine de la Stack : écartée
  car **non décidable statiquement**. Un invariant qu'aucun contrôle ne peut prendre en défaut
  n'est pas un invariant.
- **Autoriser `{@html}` partout et s'en remettre à l'assainissement** : écartée — c'est le motif
  de [ADR-0008](../../legacy/1.x/adr/0008-texte-riche-markdown-restreint.md), un assainissement raté est un risque
  dont on ne prouve jamais l'absence.
- **Interdire `{@html}` sans aucune exception** : écartée car le rendu du Markdown restreint en
  a besoin. L'exception existe donc, mais elle est **bornée à un chemin nommé** au lieu d'être
  laissée au jugement.

## Vérifiable ?

Oui — `arch-invariants`, invariant `I5` : `{@html}` et `set:html` confinés à `src/render/markdown/`.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — compilée en phase Archi, qui a resserré
  l'énoncé de la Stack en une forme vérifiable. Revue humaine : 2026-08-13.
