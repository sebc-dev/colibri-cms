# 01 — L'éditeur de texte riche reçoit son adresse d'enregistrement

**Bloqué par :** —
**Vérif :** test
**Fichiers :** `src/admin/ilots-svelte-5/TexteRiche.svelte`, `src/admin/ilots-svelte-5/soumettre-correction.ts`, `src/admin/ilots-svelte-5/EmplacementComposition.svelte`, `src/admin/ilots-svelte-5/monter.ts`, `src/pages/admin/pages/[slug].astro`

## Ce que ça livre

Préfactoring, sans nouveau comportement pour l'éditrice. Aujourd'hui, l'îlot de texte riche
(`TexteRiche.svelte`) et la soumission partagée (`soumettreCorrection`) sont liés à l'éditeur de page :
ils composent eux-mêmes l'adresse `/admin/pages/<slug>/emplacements/<id>`, et l'îlot fait paraître la
marque de brouillon dans la zone **unique** de l'écran (`afficherPastilleDeBrouillon`, zone
`#zone-pastille-brouillon`). L'écran des réglages (ticket 08) doit réutiliser le même éditeur pour la
mention d'information, à une autre adresse, avec une marque de brouillon **par carte**, et ses routes
répondent un refus d'une autre forme. Ce ticket rend l'éditeur indépendant de la page, pour que l'édition
d'une page continue de se comporter **à l'identique**.

**Décisions à respecter :**
- `TexteRiche` reçoit en propriétés l'**adresse d'enregistrement** (au lieu de `slug` + `idEmplacement`)
  et ce qu'il fait **après un enregistrement réussi** (une fonction ; l'éditeur de page lui passe
  `afficherPastilleDeBrouillon`). `monterCorrectionsTexteRiche` compose l'adresse
  `/admin/pages/<slug>/emplacements/<id>` depuis les `data-*` existants : le balisage rendu par
  `src/pages/admin/pages/[slug].astro` peut rester tel quel, ou porter directement l'adresse.
- `TexteRiche` lit les deux formes de refus d'un `400` : `{ ok: false, raison }` (route des emplacements,
  inchangée) et `{ ok: false, refus: [{ champ, raison }] }` (forme des routes des réglages, design du
  change 008) — dans ce second cas, la première `raison` est traduite par la même table de textes. Une
  raison inconnue reste traduite par le message d'échec générique, jamais affichée brute.
- `soumettreCorrection` reçoit l'adresse au lieu de `(slug, idEmplacement)` ; son unique consommateur
  (`EmplacementComposition.svelte`) lui passe l'adresse de l'emplacement.
- Aucun texte visible ne change ; aucune route serveur n'est touchée ; aucune directive `client:*`.
- Ce ticket **n'ajoute ni ne modifie aucun test** : les tests existants des pages (texte riche,
  composition de galerie/carrousel, marque de brouillon) sont l'oracle et doivent rester verts sans
  retouche.

**Hors périmètre :** la migration des autres îlots qui portent encore leur `fetch` en ligne
(`EmplacementImage`, `ReglageLienVideo`, `CorrectionBoutonAction`) ; tout ce qui concerne les réglages.

## Critères
- [ ] L'édition d'un emplacement de page (texte riche, composition d'images) s'enregistre, refuse et fait paraître la marque de brouillon exactement comme avant : les tests existants des pages passent sans aucune retouche   (SC-01a)
