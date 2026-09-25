# 08 — L'éditeur d'une page habillé, emplacements de texte

**Bloqué par :** 05
**Vérif :** observé
**Fichiers :** `src/pages/admin/pages/[slug].astro`, `src/admin/ilots-svelte-5/TexteRiche.svelte`, `src/admin/ilots-svelte-5/CorrectionBoutonAction.svelte`, `src/admin/ilots-svelte-5/ReglageLienVideo.svelte`

## Ce que ça livre

L'éditeur d'une page présente un lien de retour « ‹ Mes pages », le titre de la page (Fraunces) suivi
de sa marque de brouillon, puis **une carte par emplacement**, dans l'ordre posé par l'intégrateur :
chaque carte porte sa nature et son libellé au-dessus de son contenu, puis ses gestes. Ce ticket habille
la page et les emplacements de **texte** — texte riche, bouton d'action, lien de vidéo. Enregistrer est
l'action principale (`plumage`) ; pendant l'enregistrement, le bouton est désactivé et son libellé ne
change pas ; un enregistrement refusé s'affiche en rouge (`danger`) dans la carte concernée, avec son
texte. Sur téléphone, les cartes passent en pleine largeur sur une seule colonne, et les boutons d'une
carte passent sous son contenu, en pleine largeur.

**Décisions à respecter :**
- **Aucun geste ne change** : corriger, enregistrer, régler un lien de vidéo restent identiques, par
  les mêmes routes ; les messages de refus restent ceux de `message-erreur-correction.ts`. Les tests
  existants de ces gestes doivent rester verts tels quels.
- Le balisage que les tests existants lisent reste tel quel : `<span id="zone-pastille-brouillon">…</span>`
  placé juste avant `</h1>` ; l'attribut `data-pastille-brouillon` de la marque.
- La carte d'emplacement est posée dans `[slug].astro` (rendue par le serveur) ; les îlots Svelte
  s'y montent comme avant. Les îlots d'image, de galerie et de carrousel restent hors de ce ticket
  (ticket suivant) mais s'affichent déjà dans leur carte.
- Composants de base disponibles : `card`, `label`, `textarea`, `alert`, `button`.
- Sur écran étroit, chaque élément actionnable offre une cible d'au moins 44 × 44 px ; au-delà, les
  hauteurs du canvas (38 px, 30 px). Champs à 16 px sous 768 px (règle commune déjà posée).
- Tokens seulement (`I14`) ; aucune directive `client:*` (`I4`) ; rendu échappé partout, aucun
  `{@html}` ni `set:html` hors `src/render/markdown/` (`I5`).

**Preuve attendue :** sur l'artefact bâti (`npm run build` puis `wrangler dev`), captures à 1280 px et
à 360 px d'une page portant les trois natures de texte : au repos, en saisie, enregistrée (marque
apparue), refusée ; titre de page long ; mesure du contraste ; `scrollWidth` à 360 px ; boîtes des
contrôles à 360 px.

**Hors périmètre :** les emplacements d'image, de galerie et de carrousel et la sur-couche de choix
d'image ; tout geste nouveau d'édition ; l'aperçu et la publication.

## Critères
- [ ] Sur écran étroit, les emplacements de l'éditeur se suivent sur une seule colonne, chacun avec son libellé au-dessus de son contenu, et corriger, enregistrer et régler un lien de vidéo restent disponibles   (SC-08a)
- [ ] Un enregistrement refusé d'un emplacement de texte s'affiche en `danger`, dans la carte concernée, avec son texte   (SC-08b)
- [ ] L'éditeur porte le thème Colibri : fond neutre chaud, titre en Fraunces, texte en Instrument Sans, bouton d'enregistrement en `plumage`   (SC-08c)
- [ ] Affiché à 360 px de large, l'éditeur ne défile pas horizontalement et aucun contenu n'est coupé, titre de page long compris   (SC-08d)
- [ ] Sur écran étroit, chaque élément actionnable de l'éditeur et de ses emplacements de texte offre une zone de toucher d'au moins 44 × 44 px   (SC-08e)
- [ ] Chaque texte de l'éditeur, marque de brouillon et messages compris, atteint un contraste d'au moins 4,5:1 sur son fond   (SC-08f)
