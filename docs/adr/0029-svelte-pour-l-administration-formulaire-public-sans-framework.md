# ADR-0029 : Îlots Svelte 5 pour l'administration ; le formulaire public, un document complet amélioré par un module du site
Statut : Accepté | Date : 2026-10-15

Promu depuis `docs/legacy/1.x/adr/0011-ilots-svelte-5.md` — ADR-0011, accepté sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x, **sauf ce que l'amendement de la
> promotion change** : le titre, la Décision, et les points marqués *(amendé)* ou *(ajouté)* — le
> § « Amendée à la promotion » dit quoi et pourquoi ; la forme d'origine reste dans l'archive. Les
> renvois `FR-xxx`, `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers
> `docs/legacy/1.x/` : ce ne sont pas des noms de fichier. Dans le texte d'origine, chaque renvoi à une
> autre décision porte la mention « (1.x) » — c'est son numéro du cycle 1.x ; dans le texte amendé, un
> numéro sans mention est un numéro 2.x (correspondance : [`README.md`](./README.md)).

**Modèle** : aucun delta. L'administration (`colibri-cms.worker.admin`), le rendu partagé
(`colibri-cms.worker.render`) et le site (`colibri-cms.worker.site`) sont modélisés ; le module du
formulaire vit dans `src/render/` et n'emprunte que `colibri-cms.worker.render →
colibri-cms.worker.core`, déjà modélisée.

## Contexte

`FR-054` fait **recalculer le total à chaque changement de sélection** : du JavaScript part
donc sur **toute page publique portant un formulaire**. Or `SC-005` mesure un score
**Lighthouse Performance ≥ 95 en mobile** sur le HTML réellement servi — c'est-à-dire sur ces
pages-là, et sur l'appareil de la visiteuse.

Le même framework sert l'administration, où `FR-017` (modifier chaque emplacement éditable),
`FR-117` (aucun terme de développeur dans l'interface) et les critères de parcours `SC-003` et
`SC-015` portent l'exigence d'interactivité.

Le contexte de sécurité vient de
[ADR-0001 (1.x)](../legacy/1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md) — origine commune — et
de la CSP stricte que [ADR-0015 (1.x)](../legacy/1.x/adr/0015-en-tetes-de-reponse-deux-porteurs.md) impose à
l'administration.

*(ajouté)* **Ce qui a changé depuis.** L'administration s'est bâtie comme la forme d'origine l'avait
prévu : une application montée par un point d'entrée externe, sans directive `client:*`
(ADR-0006, invariant `I4`), sur la base de composants shadcn-svelte (ADR-0009). Le site public, lui,
existe depuis le change `011` : ses pages sont des documents complets bâtis à la reconstruction
(FR-095), servis sous une politique portée par `_headers` qui n'admet **aucun** script
(`default-src 'none'`). Le change `012-envoi-des-demandes-de-devis` doit y faire entrer le premier
script, pour le total et l'envoi. La forme d'origine laissait au site public « ses îlots et sa
politique portée par `_headers` » : un îlot hydraté par `client:*` y écrirait son amorce dans la page,
ce qu'aucune politique sans `'unsafe-inline'` n'admet — et rouvrir `'unsafe-inline'` sur l'origine
qu'habite la session de l'éditrice (SEC-1) n'est pas une option.

## Décision

*(amendé)* Nous utiliserons **Svelte 5 pour l'administration**, montée comme une application par un
point d'entrée externe (ADR-0006).

Le **formulaire de devis public ne sera pas un îlot** : il sera un **document HTML complet**, dessiné à
la reconstruction par le rendu partagé (ADR-0024) — champs, options, prix, mentions, et les textes de
chacun de ses états —, et **amélioré par un module TypeScript sans framework**, déclaré par le
composant de rendu et servi par le site lui-même en fichier externe. Le module active le total et
l'envoi ; il n'écrit qu'en texte. Aucune page publique ne portera de script écrit dans la page, et la
politique du site public n'admettra de script que `'self'`.

## Conséquences

**Positives.**

- *(amendé)* **Le poids envoyé à la visiteuse est celui d'un petit module**, sans runtime ni composant
  de framework : c'est exactement la grandeur que `SC-005` mesure. Côté administration, le compilateur
  de Svelte **n'expédie pas de runtime de framework** : le poids est celui des composants.
- Svelte **échappe par défaut** ce qu'il rend : la première parade au XSS est le comportement
  normal du moteur, pas une discipline.
- *(ajouté)* **Un seul rendu du formulaire.** Le HTML bâti est le rendu, le même pour la page publique
  et pour l'aperçu (ARCH-3) ; le module n'en produit pas de seconde version, il bascule ce qui existe.
- *(ajouté)* **La page est complète sans script** (FR-095) : champs, options et prix se lisent même
  quand le navigateur n'exécute rien.
- *(ajouté)* **Aucune politique du produit ne tolère de script en ligne** : le site public et
  l'administration s'en tiennent tous deux à `script-src 'self'`.

**Négatives — ce à quoi le code s'engage.**

- *(amendé)* **L'hydratation des îlots produit du script en ligne**, ce qui est incompatible avec la CSP
  stricte de l'administration — laquelle interdit `unsafe-inline` sans nonce ni empreinte. Il en
  découle que **l'administration ne se bâtit pas comme des îlots dans des pages**, mais comme une
  application montée par un point d'entrée externe. C'est ce que l'invariant `I4` rend falsifiable. Le
  **site public est concerné de même** : sa politique n'admet pas plus le script en ligne, d'où le
  module externe plutôt qu'un îlot — ce que l'invariant `I16` rend falsifiable.
- **L'échappement par défaut a une porte, et une seule** : `{@html}`. Elle suffit à casser la
  propriété, d'où l'invariant `I5` de [`docs/archi.md`](../legacy/1.x/archi.md), qui la confine à un
  seul chemin.
- *(ajouté)* **Le module du formulaire n'a pas l'échappement de Svelte.** Il écrit par `textContent`,
  jamais par `innerHTML`, et lit ses données dans des attributs `data-*` comme nombres ou textes : c'est
  une discipline, tenue par la revue, pas un comportement du moteur.
- **L'écosystème est plus étroit que celui de React** : moins de composants tiers disponibles,
  et une part plus grande de ce dont le produit a besoin est à écrire.
- **Une version majeure de Svelte se propage à toute la flotte**, `FR-105` et `SC-008`
  interdisant tout code spécifique à une cliente.
- *(ajouté)* **Deux manières d'écrire l'interactivité** : des composants Svelte pour l'administration,
  le document et un module pour le site public. Le module doit rester petit ; s'il grossit au point de
  réinventer un framework, cette décision se rouvre par un ADR qui la supersède.

## Alternatives considérées

- **React 19** : écartée. Son écosystème est plus large, mais son coût est payé par la
  **visiteuse**, sur l'appareil et sur la page où `SC-005` se mesure. Le critère décide seul.
- *(ajouté)* **Un îlot Svelte hydraté par `client:*` sur le site public** (la forme d'origine) :
  écartée car Astro écrit l'amorce d'hydratation dans la page, refusée par `script-src 'self'` ; la
  rouvrir par `'unsafe-inline'` exposerait la session de l'éditrice, sur l'origine commune, à tout
  script injecté.
- *(ajouté)* **Un composant Svelte rendu au build, hydraté par `hydrate()` depuis un module externe** :
  écartée car elle suppose que le rendu de build d'Astro porte les marques d'hydratation de Svelte et
  que les propriétés se sérialisent à l'identique — deux paris, et le poids d'un composant compilé,
  pour un écran de dix champs.
- *(ajouté)* **Un composant Svelte monté par `mount()` à la place du HTML statique** : écartée car elle
  duplique le rendu (deux lieux, contre ARCH-3), et la page n'est plus complète pour qui n'exécute pas
  le script.

## Amendée à la promotion

Promue le 2026-10-15 par le change `012-envoi-des-demandes-de-devis`, le premier à charger un script
sur le site public. Un point de la décision d'origine change ; le reste est repris tel quel.

1. **Le site public n'a pas d'îlot Svelte.** La forme d'origine mettait des îlots Svelte « pour les
   pages publiques comme pour l'administration », en laissant au site public sa politique propre. Le
   formulaire public est un document complet amélioré par un module sans framework, sous
   `script-src 'self'` : la seule forme compatible avec une politique sans script en ligne qui ne
   duplique pas le rendu. La décision est proposée par le `design.md` du change (§ D3) et acceptée avec
   la fusion de la PR #242.

Retouchés en conséquence, marqués *(amendé)* ou *(ajouté)* : le titre, la Décision, un paragraphe de
contexte ajouté, une conséquence positive amendée et trois ajoutées, une conséquence négative amendée
et deux ajoutées, trois alternatives ajoutées, et la vérification. Dans la conséquence amendée, `I4` et
`I16` désignent les invariants de `docs/architecture.md` ; dans le texte d'origine, `I5` reste celui de
`docs/archi.md` (1.x), dont il porte la même règle.

## Vérifiable ?

*(amendé)* En partie, par deux invariants de `docs/architecture.md` : `I4` (aucune directive `client:*`
dans un gabarit de l'administration) et `I16`, que cet ADR crée — aucun fichier sous `src/site/` ni
`src/render/` n'est un composant `.svelte` ni ne porte de directive `client:*`. Le reste — aucun script
écrit dans une page publique, aucun script sur une page sans formulaire — se vérifie par les scénarios
de la spec `site-public` (change `012`) et par la garde de politique des parcours
(`tests/parcours/garde-politique.ts`).

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, arbitrée par
  l'humain. Revue humaine : 2026-08-13.
- *(ajouté)* Promotion amendée instruite par l'agent pour le change `012` (`design.md` § D3), acceptée
  avec la fusion de la PR #242 le 2026-10-15.
