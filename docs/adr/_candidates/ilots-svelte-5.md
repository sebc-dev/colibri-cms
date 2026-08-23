# Candidat ADR : Framework d'îlots — Svelte 5
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0011-ilots-svelte-5.md` (ADR-0011 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

`FR-054` fait **recalculer le total à chaque changement de sélection** : du JavaScript part
donc sur **toute page publique portant un formulaire**. Or `SC-005` mesure un score
**Lighthouse Performance ≥ 95 en mobile** sur le HTML réellement servi — c'est-à-dire sur ces
pages-là, et sur l'appareil de la visiteuse.

Le même framework sert l'administration, où `FR-017` (modifier chaque emplacement éditable),
`FR-117` (aucun terme de développeur dans l'interface) et les critères de parcours `SC-003` et
`SC-015` portent l'exigence d'interactivité.

Le contexte de sécurité vient de
[ADR-0001](../../1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md) — origine commune — et
de la CSP stricte que [ADR-0015](../../1.x/adr/0015-en-tetes-de-reponse-deux-porteurs.md) impose à
l'administration.

## Décision

Nous utiliserons des **îlots Svelte 5** dans Astro, pour les pages publiques comme pour
l'administration.

## Conséquences

**Positives.**

- Le compilateur de Svelte **n'expédie pas de runtime de framework** : le poids envoyé à la
  visiteuse est celui du composant, pas celui de la bibliothèque. C'est exactement la grandeur
  que `SC-005` mesure.
- Svelte **échappe par défaut** ce qu'il rend : la première parade au XSS est le comportement
  normal du moteur, pas une discipline.

**Négatives — ce à quoi le code s'engage.**

- **L'hydratation des îlots produit du script en ligne**, ce qui est incompatible avec la CSP
  stricte de l'administration — laquelle interdit `unsafe-inline` sans nonce ni empreinte. Il
  en découle que **l'administration ne se bâtit pas comme des îlots dans des pages**, mais
  comme une application montée par un point d'entrée externe. C'est ce que l'invariant `I4` de
  [`docs/archi.md`](../../1.x/archi.md) rend falsifiable. Le **site public n'est pas concerné** : il
  garde ses îlots et sa politique portée par `_headers`.
- **L'échappement par défaut a une porte, et une seule** : `{@html}`. Elle suffit à casser la
  propriété, d'où l'invariant `I5` de `docs/archi.md`, qui la confine à un seul chemin.
- **L'écosystème est plus étroit que celui de React** : moins de composants tiers disponibles,
  et une part plus grande de ce dont le produit a besoin est à écrire.
- **Une version majeure de Svelte se propage à toute la flotte**, `FR-105` et `SC-008`
  interdisant tout code spécifique à une cliente.

## Alternatives considérées

- **React 19** : écartée. Son écosystème est plus large, mais son coût est payé par la
  **visiteuse**, sur l'appareil et sur la page où `SC-005` se mesure. Le critère décide seul.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, arbitrée par
  l'humain. Revue humaine : 2026-08-13.
