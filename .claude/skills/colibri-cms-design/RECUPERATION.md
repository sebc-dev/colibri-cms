# Ce qui a été rapatrié, et ce qui ne l'a pas été

Copie du projet **Colibri CMS Design System** de claude.ai/design
(`aa1b5b6c-df85-4124-84e4-d33cdb72e4a5`), rapatriée le 2026-09-24.
**113 fichiers sur 116.** La source de vérité reste le projet en ligne : cette copie
ne s'y resynchronise pas toute seule.

## Les 3 fichiers non copiés — artefacts de l'application, pas du système

| Fichier | Pourquoi |
| --- | --- |
| `_ds_bundle.js` | Bundle compilé des composants pour l'aperçu claude.ai (1,7 Mo). Régénéré par l'application ; le source des composants, lui, est là. |
| `_ds_manifest.json` | Index compilé des cartes, dérivé des commentaires `@dsCard` et des tokens. Régénéré par l'application. |
| `.thumbnail` | Vignette rendue par l'application. `thumbnail.html`, sa source, est là. |

Conséquence : les `*.card.html`, les pages de `guidelines/` et
`ui_kits/administration/index.html` chargent `_ds_bundle.js` et ne s'ouvriront donc pas
telles quelles dans un navigateur local. Elles restent lisibles comme documentation.

## Une altération assumée

Les deux SVG de `assets/` ont perdu leur bloc `<metadata><c2pa:manifest>` (≈ 14 Ko de
provenance Content Credentials par fichier). Le dessin est intact : mêmes `viewBox`,
mêmes tracés, mêmes couleurs — `logo-colibri-clair.svg` est dérivé du sombre par
substitution de la seule couleur de remplissage, tracés vérifiés identiques.

## Ce que cette copie n'est pas

Elle n'est **pas** prête à l'emploi dans le produit. Trois écarts avec le socle de
ColibriCMS (`docs/design-system.md`, ADR-0009, ADR-0004/0008/0010) sont à arbitrer
avant tout portage :

1. **React vs Svelte.** Les 21 composants sont en JSX avec styles en ligne. Le produit
   est en **Svelte 5 + Tailwind v4 CSS-first**, sur base **shadcn-svelte** (ADR-0009).
   Ce sont les **tokens**, la **voix** et les **dispositions** qui se transposent, pas
   le code.
2. **Origines tierces sous CSP stricte.** `tokens/fonts.css` importe Google Fonts, et
   `Icon.jsx` charge Lucide depuis unpkg. La CSP de l'administration est
   `default-src 'none'; script-src 'self'; style-src 'self'` : les deux sont bloqués en
   l'état. Les polices devraient être servies en même origine, et lucide est déjà une
   dépendance bundlée du projet.
3. **Deux thèmes.** Le système porte clair + sombre (`[data-theme="dark"]`).
   `docs/design-system.md` fixe aujourd'hui **un seul jeu de valeurs, sans variante
   sombre** — l'administration reste en `color-scheme: light`.

Les écrans de `ui_kits/administration/` décrivent par ailleurs des surfaces que le
produit n'a pas encore (tableau de bord, demandes de devis, écran Technique, création
de page) et en nomment certaines autrement (« Médiathèque » vs « Médias »,
« Pages » vs « Mes pages »). À lire comme une intention de design, pas comme une
spécification : les specs vivantes de `openspec/specs/` font foi.
