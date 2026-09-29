# 02 — La bibliothèque désigne un emplacement par son nom

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/core/pages/designation.ts`, `src/admin/ilots-svelte-5/emplacements-media.ts`, `src/pages/admin/medias/[id].astro`, `tests/unit/designation-emplacement.test.ts`, `tests/integration/nom-emplacement-bibliotheque.test.ts`

## Ce que ça livre

Sur la fiche d'une image, la liste « Posée dans » désigne chaque emplacement par sa page et **son nom**
quand l'intégrateur lui en a donné un (« Tarifs — Bandeau des tarifs »). Un emplacement sans nom garde
la désignation actuelle : la nature en français (« image », « galerie », « carrousel ») suivie de son
rang (« 1re galerie », « 2e galerie ») dès que la page a plusieurs emplacements de même nature. Il n'est
jamais désigné par son identifiant technique (FR-117). La confirmation de suppression d'une image
(« Elle est posée dans : ») montre la **même** liste, avec les mêmes désignations. L'éditrice retrouve
ainsi, sans hésiter, l'emplacement où une image est posée.

**Prérequis hors ticket, fait (arbitrage humain du 2026-09-28, PR #129)** : la désignation de repli
suit déjà la spec vivante (« 1re galerie », « 2e galerie », « 1er carrousel » au lieu de `galerie 2`),
et `tests/unit/emplacements-media.test.ts` l'affirme. Ce ticket part d'une `main` qui porte ce
correctif. Il n'affaiblit ni ne modifie aucun test existant : il **ajoute** les
siens.

**Décisions à respecter :**
- **Une seule règle de désignation, en `core/`** (design D3, I1/I2, ADR-0012) : une fonction pure reçoit
  les emplacements déclarés d'une page (déjà triés par rang) et un identifiant, et rend sa désignation.
  Elle rend `nom` s'il existe, sinon la nature suivie du rang ordinal quand il y en a plusieurs.
  `placeEmplacement` (`src/admin/ilots-svelte-5/emplacements-media.ts`) s'appuie sur elle ou disparaît
  à son profit. Un identifiant non déclaré ne rend aucune désignation (garde existante, conservée).
- **Le rang se compte parmi TOUS les emplacements de même nature de la page, nommés ou non** (arbitrage
  humain du 2026-09-28, lecture littérale de la spec). Une galerie sans nom placée après une galerie
  nommée « Nos réalisations » se dit « 2e galerie ». Un emplacement nommé ne montre jamais de rang.
  Deux emplacements de même nom sur une page sont admis, et rien ne les distingue.
- **Une seule liste pour la fiche et la suppression** : la confirmation de suppression
  (`FicheMedia.svelte`) reprend la liste composée par `src/pages/admin/medias/[id].astro`
  (`data-emplacements`). La route `src/pages/admin/medias/[id]/supprimer.ts` ne compose aucune liste :
  ce ticket ne la touche pas. (Le design du change dit l'inverse, mais c'est inexact.)
- **Le nom est rendu comme du texte** (design D5, I5) : transporté dans l'attribut `data-emplacements`
  par l'échappement d'attribut d'Astro, affiché par interpolation Svelte, jamais par `{@html}` ni
  `innerHTML`.
- **Tests existants intacts** : les désignations `image`, `galerie`, `carrousel` que
  `tests/integration/ou-posee-et-supprimer.test.ts` attend pour les emplacements d'image sans nom des
  pages de démonstration restent justes (ces emplacements restent sans nom, ticket 01). Le cas nommé
  s'exerce sur l'emplacement d'image « Bandeau des tarifs » de la page Tarifs, posé par le ticket 01.

**Hors périmètre :** l'éditeur d'une page (ticket 03), l'habillage de la fiche (change 005), le site
public, toute écriture en D1 autre que le semis des tests.

## Critères
- [ ] L'éditrice consulte la fiche d'une image posée dans l'emplacement nommé « Bandeau des tarifs » de la page Tarifs : la liste « Posée dans » la désigne par le titre de sa page et le nom de l'emplacement (« Tarifs — Bandeau des tarifs »), sans terme de développeur   (SC-02a)
- [ ] À défaut de nom, la place est la nature de l'emplacement en français (« image », « galerie », « carrousel »), jamais son identifiant, suivie de son rang parmi les emplacements de même nature de la page (« 1re galerie », « 2e galerie ») dès qu'il y en a plusieurs, le rang se comptant parmi tous les emplacements de cette nature, nommés ou non   (SC-02b)
- [ ] L'éditrice consulte la fiche d'une image posée dans un emplacement nommé d'une page et dans un emplacement sans nom d'une autre page : dans la même liste, le premier est désigné par son nom, le second par sa nature (et son rang s'il y a lieu)   (SC-02c)
- [ ] L'éditrice demande la suppression d'une image posée dans un emplacement nommé : la liste des emplacements concernés, présentée avant toute application, désigne cet emplacement par sa page et son nom, comme la fiche   (SC-02d)
