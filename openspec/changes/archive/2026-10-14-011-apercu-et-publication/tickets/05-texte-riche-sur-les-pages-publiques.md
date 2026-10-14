# 05 — Le texte riche paraît mis en forme sur les pages publiques

**Bloqué par :** 04
**Vérif :** tdd
**Fichiers :** `src/core/rendu/page.ts`, `src/render/index.ts`, `src/render/markdown/TexteRiche.astro`, `src/render/markdown/Noeud.astro`, `src/site/site.css`, `tests/unit/rendu/texte-riche.test.ts`, `tests/static/texte-riche-public-statique.test.ts`

## Ce que ça livre

Les emplacements de texte riche paraissent sur les pages publiques avec leur mise en forme :
paragraphes, titres, listes à puces, gras, italique et liens. Le texte de l'éditrice est stocké en
Markdown restreint.

Le rendu est **sûr par construction**. Un lien n'est rendu comme lien que si son adresse est relative
au site ou commence par `https:`, `mailto:` ou `tel:` ; sinon seul son texte paraît. Aucun HTML écrit
dans le texte n'est interprété : le site public partage l'origine du cookie de session de
l'administration, donc une balise exécutée serait une faille contre l'éditrice. Le texte de chaque
emplacement figure dans le document servi, sans échange supplémentaire.

Le même rendu servira à l'aperçu (ticket 08).

**Décisions à respecter :**
- Le texte riche entre dans la page à rendre (`src/core/rendu/page.ts`) **déjà analysé en arbre** par
  `analyserMarkdownRestreint`. Chaque lien y est revérifié par `lienDeTexteRicheAutorise`, et un lien
  refusé devient un nœud de texte.
- `src/render/markdown/` rend l'arbre **nœud par nœud** en composants Astro : paragraphe, titre,
  liste ; gras, italique, lien. Aucun `set:html` ni `{@html}` : I5 le permettrait sous ce dossier, mais
  l'arbre rendu en composants n'ouvre aucune porte. Le reste du texte passe par l'échappement par
  défaut d'Astro.
- Un lien externe porte `rel="noopener noreferrer"`.
- `src/render/index.ts` reste le seul chemin importé de l'extérieur de `src/render/` (I3).
- **Tests** : le contenu de démonstration ne porte ni lien `javascript:`, ni `data:`, ni balise écrite.
  Le test les apporte **sans modifier `content/`** : sur la composition pure, et sur un rendu bâti
  depuis un contenu jetable (outil posé au ticket 04).

**Hors périmètre :** les images (ticket 06) ; l'aperçu (ticket 08) ; l'édition du texte riche (déjà
livrée).

## Critères
- [x] Le texte de chacun des emplacements d'une page publique figure dans la réponse elle-même, sans qu'aucun échange supplémentaire ne soit nécessaire pour l'obtenir   (SC-05a)
- [x] Un emplacement de texte riche publié qui porte un titre, un paragraphe avec un mot en gras et un en italique, et une liste à puces paraît avec ce titre, ce paragraphe avec ses mots en gras et en italique, et la liste à puces   (SC-05b)
- [x] Quand un texte riche publié porte un lien vers `https://exemple.fr`, un lien `mailto:`, un lien relatif `/contact` et un lien `javascript:` ou `data:`, les trois premiers sont rendus comme liens, et le dernier ne paraît que par son texte, sans lien   (SC-05c)
- [x] Quand un texte riche publié contient `<script>` ou `<img onerror=…>` écrits comme texte, la page les affiche comme du texte, et aucune balise n'est créée   (SC-05d)
