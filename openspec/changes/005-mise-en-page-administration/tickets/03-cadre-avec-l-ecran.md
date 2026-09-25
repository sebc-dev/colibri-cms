# 03 — Le cadre de l'administration arrive avec l'écran

**Bloqué par :** 02
**Vérif :** test
**Fichiers :** `src/admin/GabaritCadre.astro`, `src/admin/MenuRubriques.astro`, `src/pages/admin/mes-pages.astro`, `src/pages/admin/pages/[slug].astro`, `src/pages/admin/medias.astro`, `src/pages/admin/medias/[id].astro`, `src/admin/ilots-svelte-5/EcranMedias.svelte`, `src/admin/ilots-svelte-5/EcranFicheMedia.svelte`, `src/admin/ilots-svelte-5/monter.ts`, `src/admin/ilots-svelte-5/Cadre.svelte` (supprimé), `src/admin/ilots-svelte-5/Compteur.svelte` (supprimé), `src/admin/ilots-svelte-5/ActionRapide.svelte` (supprimé), `src/pages/admin/ilots.astro` (supprimé), `src/pages/admin/cadre.astro` (supprimé), `tests/integration/cadre-avec-l-ecran.test.ts`

## Ce que ça livre

Aujourd'hui, le cadre de l'administration (logo, menu des rubriques) est un îlot Svelte monté par
script : la page s'affiche d'abord sans menu, et la réponse du serveur ne le contient jamais. Désormais,
le cadre est **rendu par le serveur**, avec l'écran : dès l'affichage de « Mes pages », de l'éditeur
d'une page, de « Médias » ou de la fiche d'une image, l'éditrice voit le logo, le menu des cinq rubriques
(« Mes pages », Médias, Réglages, Formulaires, Demandes) avec la rubrique courante marquée, et le
contenu de l'écran à l'intérieur du cadre. Seules « Mes pages » et « Médias » mènent à un écran ;
Réglages, Formulaires et Demandes situent la navigation sans lien. Les deux écrans de démonstration du
socle (`/admin/ilots`, `/admin/cadre`) disparaissent.

**Décisions à respecter :**
- Nouveau gabarit `src/admin/GabaritCadre.astro`, qui enveloppe `Gabarit.astro` et prend `titre` et
  `rubrique` (`'mes-pages' | 'medias'`). Il rend une barre latérale (logo `Logo.astro`, menu) et
  `<main>` avec son `<slot/>`. La rubrique courante : « Mes pages » sur la liste et sur l'éditeur,
  « Médias » sur la bibliothèque et sur la fiche.
- Le menu est un composant `src/admin/MenuRubriques.astro` (une seule liste de rubriques, un seul
  marquage `aria-current="page"`), conçu pour être rendu deux fois plus tard (barre et tiroir, ticket
  suivant). Les icônes `@lucide/svelte` sont rendues par le serveur, sans directive `client:*`
  (invariant `I4`, ADR-0006). Libellés : ceux de l'existant (« Mes pages », « Médias »…).
- Les quatre écrans remplacent `Gabarit` par `GabaritCadre`. `monterCadreAvecContenu` et `monterCadre`
  sont retirés de `monter.ts` ; le point de montage `#ilot-cadre` disparaît ; `EcranMedias` et
  `EcranFicheMedia` ne rendent plus que leur contenu ; `Cadre.svelte` est supprimé, ainsi que les îlots
  que seuls les écrans de démonstration montaient (`Compteur.svelte`, `ActionRapide.svelte`) et leurs
  fonctions de montage.
- Aucun geste ne change : la ligne d'une page dans « Mes pages » ouvre toujours son éditeur
  (`activerNavigationListeDesPages`), et les îlots d'emplacements et des médias se montent comme avant.
- Le balisage que les tests existants lisent reste tel quel : `<h1>Mes pages</h1>`, les lignes
  `<li>Titre…` sans attribut, la zone `<span id="zone-pastille-brouillon">…</span>` juste avant `</h1>`
  dans l'éditeur.
- Aucun script en ligne, aucune directive `client:*` ; la politique de sécurité n'est pas touchée
  (ADR-0004, ADR-0008, `I11`, `I12`).
- À ce ticket, la barre latérale s'affiche à toutes les largeurs et n'a pas encore de bouton de repli ;
  le repli et le tiroir du téléphone arrivent au ticket suivant.

**Préalable :** le test « le point de montage du cadre est présent » de
`tests/integration/liste-des-pages.test.ts` (qui cherchait `#ilot-cadre`) a été retiré par une PR
directe, avant ce ticket. Ce ticket **n'ajoute** que des tests.

**Hors périmètre :** le repli en rail et le tiroir ; l'habillage propre de chaque écran ; tableau de
bord, demandes, création de page, bandeau d'état de publication.

## Critères
- [ ] Sur chacun des quatre écrans cadrés, le menu porte les cinq rubriques et marque active la rubrique de l'écran courant (« Mes pages » sur la liste et l'éditeur, « Médias » sur la bibliothèque et la fiche)   (SC-03a)
- [ ] La réponse du serveur d'un écran cadré porte déjà le logo, le menu des cinq rubriques avec la rubrique courante marquée, et le contenu de l'écran à l'intérieur du cadre, sans attendre l'exécution d'un script   (SC-03b)
- [ ] Aucune rubrique autre que « Mes pages » et « Médias » ne mène à un écran, et le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page   (SC-03c)
- [ ] Aucun terme de développeur ne paraît dans le menu ni dans les libellés du cadre   (SC-03d)
- [ ] Le cadre est servi sous la politique de sécurité stricte de l'administration, sans script en ligne ni directive `client:*`   (SC-03e)
