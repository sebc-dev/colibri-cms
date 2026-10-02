## Context

Voir `proposal.md` — Why. État observé du code (branche `main`, 2026-09-27) :

- **Modèle** — `src/core/pages/declaration.ts` : `EmplacementJson` (forme brute d'un `page.json`) et les
  six variantes de `Emplacement` (une par nature) portent `id`, `nature`, `rang` et le contenu propre à
  la nature. Une entrée dont la forme ne correspond pas à sa nature est **ignorée** à la lecture
  (commentaire de tête du module). `construirePageAvecEmplacements` assemble la page, déjà lue par
  `src/platform/contenu/pages.ts`.
- **Éditeur** — `src/pages/admin/pages/[slug].astro` : sur `main`, chaque emplacement est rendu sans
  titre de carte ; le ticket 08 du change 005 (PR #122, non fusionnée) pose une `Card` par emplacement
  dont le `CardTitle` dit la nature seule.
- **Bibliothèque** — `placeEmplacement` (`src/admin/ilots-svelte-5/emplacements-media.ts`, pur) calcule
  la place depuis `Emplacement[]` ; appelé par la fiche (`src/pages/admin/medias/[id].astro`) et par la
  suppression (`src/pages/admin/medias/[id]/supprimer.ts`). **Écart préexistant** : la fonction rend
  `galerie 2`, la spec vivante dit « 2e galerie ».
- **Contenu** — trois pages de démonstration dans `content/pages/*/page.json`, aucune n'a deux
  emplacements de même nature.

## Goals / Non-Goals

**Goals :**
- Un champ `nom` facultatif dans la déclaration, porté par **chaque** variante d'`Emplacement`, lu une
  seule fois en `core/`.
- Une seule règle de désignation par emplacement, partagée par l'éditeur et la bibliothèque.
- Aucune rupture pour une déclaration sans nom.

**Non-Goals :**
- Aucun changement du brouillon D1, des routes d'écriture, ni de la politique de sécurité.
- Aucune présentation du nom sur le site public.
- Aucun outil de saisie de la déclaration.

## Decisions

- **D1 — Le nom est un champ commun de l'emplacement, pas de sa nature.** `nom?: string` s'ajoute à la
  base commune des six variantes (et à `EmplacementJson`). *Alternative écartée* : un nom seulement pour
  les natures d'image — la maquette de 005 le montre sur un texte riche.
- **D2 — Un nom mal formé devient « pas de nom », jamais une entrée ignorée.** La règle actuelle
  (forme fausse ⇒ emplacement ignoré) protège la **nature** et le **contenu** ; appliquée au nom, elle
  ferait disparaître de l'éditeur un emplacement pour une faute de libellé. La normalisation (texte,
  espaces de bord retirés, vide ⇒ absent) vit en `core/`, dans la lecture. Aucune longueur maximale : le
  retour à la ligne de la carte (005, `break-words`) absorbe un nom long, et l'intégrateur le relit.
- **D3 — Une seule fonction de désignation, en `core/`.** Une fonction pure lit la page déclarée et
  rend, pour un emplacement, sa désignation : `nom` s'il existe, sinon la nature en français suivie du
  rang ordinal (« 2e galerie ») quand il y en a plusieurs. `placeEmplacement` s'appuie dessus (ou
  disparaît à son profit) ; l'éditeur l'emploie pour le titre de carte (« Nature — Nom » ou « Nature »).
  *Pourquoi `core/`* : c'est une règle métier sans plateforme (I2, ADR-0012) et elle devient testable en
  une place ; aujourd'hui elle vit dans `admin/`. Le libellé français des natures, s'il faut le partager
  entre les deux usages, suit la même voie.
- **D4 — Le rang ordinal de repli s'aligne sur la spec vivante.** Le repli garde la formulation déjà
  normative (« 1re galerie », « 2e galerie ») ; l'écart `galerie 2` observé se corrige avec D3, puisque la
  fonction est réécrite. Aucun changement de spec : c'est le code qui rejoint la spec.
- **D5 — Le nom est rendu comme du texte.** Interpolation échappée d'Astro/Svelte seulement, ni
  `set:html` ni `{@html}` (I5) : le nom vient d'un fichier du dépôt, mais il reste une entrée.
- **Conformité** — ADR-0012 tenu (un champ de plus dans le `page.json`, lu en `core/`, jamais écrit
  depuis l'administration ; l'identifiant reste la seule clé du brouillon). I1/I2 tenus (la désignation
  entre en `core/`, `admin/` et `pages/` l'appellent). I4, I5, I14 inchangés. **Pas d'ADR nouveau** :
  extension d'un modèle déjà décidé, sans nouveau patron.

## Risks / Trade-offs

- [Le nom et l'identifiant divergent — « Présentation » sur `bouton-devis`] → Aucun effet fonctionnel
  (seul l'identifiant vise) ; c'est une faute de l'intégrateur, visible dans l'éditeur.
- [Deux emplacements portent le même nom sur une page] → Admis, non détecté : le rang de repli ne
  s'applique qu'aux emplacements sans nom. Signalé dans la documentation de la déclaration.
- [Le ticket 08 de 005 n'est pas fusionné] → Le ticket d'éditeur de ce change s'empile sur
  `impl/editeur-emplacements-texte-08` ; le ticket `core/` + bibliothèque n'en dépend pas et part de
  `main`.
- [La spec de 005 dit « libellé » et ce change dit « nom »] → Même notion ; SC-08a de 005 se ferme quand
  l'éditeur montre « Nature — Nom ». Le mot « libellé » reste réservé au texte du bouton d'action.

## Migration Plan

Aucune donnée à migrer : le champ est facultatif. Les trois `page.json` de démonstration reçoivent des
noms sur une partie de leurs emplacements (au moins un nommé et un sans nom par page qui en a plusieurs),
pour que la recette montre les deux présentations. Retour arrière : retirer les noms des `page.json`
rend la présentation actuelle.
