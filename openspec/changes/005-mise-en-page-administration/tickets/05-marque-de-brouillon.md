# 05 — La marque de brouillon, la même partout

**Bloqué par :** 03, 04
**Vérif :** test
**Fichiers :** `src/admin/MarqueBrouillon.astro`, `src/admin/GabaritCadre.astro`, `src/admin/pastille-brouillon.ts`, `src/pages/admin/mes-pages.astro`, `src/pages/admin/pages/[slug].astro`, `tests/integration/marque-de-brouillon.test.ts`, `tests/static/marque-de-brouillon-statique.test.ts`

## Ce que ça livre

Une page qui porte une correction non publiée (un **brouillon**) se signale aujourd'hui par un petit
texte « • brouillon », écrit à la main à trois endroits. Désormais, elle porte partout la même marque :
un badge au libellé écrit « Brouillon », texte rubis (`gorge`) sur fond rubis pâle (`gorge-soft`),
forme de pastille, un point devant le libellé. La marque est identique sur la ligne de la page dans
« Mes pages », à côté du titre de son éditeur, et quand elle apparaît sans recharger l'écran après un
enregistrement. Le rubis ne sert à rien d'autre : aucun bouton ni lien ne le porte. La marque est
toujours lisible par son libellé, jamais par la seule couleur.

**Décisions à respecter :**
- Source unique : le composant `src/admin/MarqueBrouillon.astro`. Les écrans le rendent là où une page
  porte un brouillon, et `GabaritCadre.astro` le rend aussi, une fois, dans un
  `<template id="modele-marque-brouillon">`.
- `afficherPastilleDeBrouillon` (`src/admin/pastille-brouillon.ts`) **clone** le contenu du modèle
  (`content.cloneNode(true)`) au lieu de construire un `<span>` à la main — jamais `innerHTML`, jamais
  d'assemblage de texte en HTML. Il n'ajoute la marque qu'une fois (pas de doublon après deux
  enregistrements).
- L'attribut `data-pastille-brouillon` est **conservé** sur la marque : de nombreux tests existants le
  cherchent.
- Le balisage que les tests existants lisent reste tel quel : les lignes `<li>Titre…` de « Mes pages »
  sans attribut sur `<li>`, et, dans l'éditeur, `<span id="zone-pastille-brouillon">…</span>` placé
  juste avant `</h1>`.
- Les classes `gorge` (`text-gorge`, `bg-gorge-soft`…) ne paraissent **que** dans
  `MarqueBrouillon.astro` sous `src/admin/` — c'est ce qui garantit que le rubis ne sert jamais une
  action.
- Tokens seulement, aucune couleur littérale (`I14`) ; aucune directive `client:*` (`I4`).

**Hors périmètre :** l'adresse des pages et le reste de l'habillage de « Mes pages » et de l'éditeur ;
le bandeau d'état de publication.

## Critères
- [ ] Une page qui porte une correction non publiée montre, sur sa ligne de « Mes pages » et dans le titre de son éditeur, la même marque de brouillon, en `gorge`, avec le libellé écrit « Brouillon »   (SC-05a)
- [ ] La marque qui apparaît sans recharger après un enregistrement est identique à celle que rend l'écran rechargé : le modèle servi dans la réponse et la marque rendue par le serveur sont identiques, et la marque clonée n'apparaît qu'une fois   (SC-05b)
- [ ] Aucun bouton ni lien d'un écran servi n'est présenté en `gorge` : cette couleur ne paraît que dans la marque de brouillon   (SC-05c)
