# 04 — Chaque page déclarée a sa page publique, avec sa navigation et son pied de page

**Bloqué par :** —
**Vérif :** test
**Fichiers :** `src/pages/[...slug].astro`, `src/pages/404.astro`, `src/site/page.astro`, `src/site/PiedDePage.astro`, `src/site/site.css`, `src/render/index.ts`, `src/render/BoutonAction.astro`, `src/render/LienVideo.astro`, `src/core/rendu/page.ts`, `docs/architecture/model.c4`, `docs/architecture/context.c4`, `tests/unit/rendu/page.test.ts`, `tests/static/pages-publiques-statique.test.ts`

## Ce que ça livre

Le Worker ne sert aujourd'hui que l'administration : aucune page n'existe pour un visiteur. Ce ticket
fait de chaque page déclarée une **page publique**, à son adresse — `/` pour l'accueil, `/tarifs`,
`/contact`. C'est un document complet, bâti à la construction du site depuis le contenu publié :
- le titre de la page ;
- la navigation entre toutes les pages, dans l'ordre posé, la page courante marquée ;
- ses emplacements dans l'ordre posé ;
- en pied de page, les coordonnées puis les réseaux sociaux.

Une adresse inconnue reçoit une page « introuvable » propre au site. Tout texte venu du contenu
s'affiche tel quel.

Ce ticket pose le **rendu partagé** : le gabarit et les composants qui dessinent les emplacements,
que l'aperçu réutilisera (ticket 08). Il dessine le bouton d'action et le lien de vidéo. Le texte
riche (ticket 05) et les images (ticket 06) ne dessinent encore rien.

**Décisions à respecter :**
- `src/core/rendu/page.ts`, pur, compose une **page à rendre** : `{ titre, navigation: [{ titre,
  adresse, courante }], emplacements, pied: { coordonnees, reseaux } }`. Il la compose depuis la
  déclaration, l'état publié, les brouillons voulus et les réglages courants. La route publique ne lui
  passe que la déclaration : le graphe du site publié n'atteint jamais la base (C1). L'aperçu lui
  passera aussi l'état publié et les brouillons (tickets 08 et 09).
- Chaque destination de bouton y est revérifiée par `destinationBoutonAutorisee`, chaque adresse de
  vidéo par `lienVideoAutorise`. Un lien refusé devient du texte.
- `src/render/index.ts` est le seul chemin de `src/render/` importé de l'extérieur ;
  `src/site/page.astro` est son unique importateur (I3, ADR-0024). Aucun `set:html` ni `{@html}` (I5,
  tenu par absence).
- **Dérogation déclarée à I3, temporaire** : I3 veut que le gabarit soit importé par la route publique
  **et** par la route d'aperçu `src/pages/admin/apercu/[...slug].astro`. Celle-ci naît au ticket 08,
  qui lève la dérogation. Jusque-là, seule la route publique importe le gabarit.
- **Gabarit** `src/site/page.astro` :
  - document complet (`<html lang="fr">`, titre, navigation, emplacements, pied de page) ;
  - feuille externe `src/site/site.css`, jamais Tailwind ni `admin.css` (ADR-0009) ;
  - aucun script, aucun attribut `style` : le même gabarit se rendra sous la politique stricte de
    l'administration dans l'aperçu ;
  - navigation en barre sur écran large, liste repliable sans script (`<details>`) sur téléphone ;
  - aucun nom de site inventé ; une colonne lisible (≈ 70 caractères).
- **Pied de page** : les coordonnées dans l'ordre déclaré, chacune sous son nom quand l'intégrateur lui
  en a donné un. Le téléphone mène à un appel (`tel:`), l'e-mail à un message (`mailto:`), l'adresse
  paraît sur ses lignes. Viennent ensuite les réseaux sociaux dans leur ordre, chacun sous son nom.
  Sans réseau, la section n'existe pas. La mention d'information n'y paraît pas.
- **Lien de vidéo** : un lien « Voir la vidéo » en `rel="noopener noreferrer"`, sans `iframe` ni
  aucune ressource de l'hébergeur.
- **Routes** : `src/pages/[...slug].astro` en `prerender = true`, avec `getStaticPaths` tiré de la
  déclaration (`adresseDeLaPage`). `src/pages/404.astro` est bâtie : « Cette page n'existe pas. » et un
  lien vers l'accueil.
- **Tests** : le contenu de démonstration ne porte ni `<`, ni `>`, ni `&`, ni guillemets, ni réseau
  vide. Le test apporte ses propres cas **sans modifier `content/`** : sur la composition pure, et si
  besoin sur un site bâti depuis un contenu jetable. Cet outil servira aussi aux tickets 05 et 06.
- **Modèle d'architecture** :
  - relations `colibri-cms.worker.routes -[sync]-> colibri-cms.worker.site 'rend la page publique et
    son aperçu par le gabarit'` et `colibri-cms.worker.site -[sync]-> colibri-cms.worker.render
    'dessine les emplacements'` dans `model.c4` ;
  - acteur `visiteur` et relation `visiteur -> colibri-cms.worker 'consulte les pages publiques'` dans
    `context.c4` ;
  - les descriptions de `render` et `site` cessent de les dire vides ;
  - `likec4 validate --no-layout --json --project colibri-cms docs/architecture` vert.

**Hors périmètre :** le texte riche (ticket 05) ; les images, galeries et carrousels (ticket 06) ; les
en-têtes du site public et la preuve « document statique » (ticket 07) ; l'aperçu (ticket 08) ; la
mise en page fine et la rapidité mesurée (story « Site public rapide et complet ») ; le formulaire de
devis public.

## Critères
- [ ] Un visiteur qui demande `/tarifs` puis `/contact` reçoit la page « Tarifs » puis la page « Contact », chacune avec son propre titre et son propre contenu   (SC-04a)
- [ ] Sur n'importe quelle page publique, la navigation liste toutes les pages déclarées dans l'ordre posé par l'intégrateur, chacune menant à son adresse, la page courante marquée   (SC-04b)
- [ ] Un visiteur qui demande une adresse qu'aucune page déclarée ne porte reçoit une page « introuvable » du site, qui ne montre le contenu d'aucune autre page   (SC-04c)
- [ ] Quand un titre de page, un libellé de bouton ou une coordonnée publiés contiennent `<`, `>`, `&` ou des guillemets, la page publique les affiche comme du texte, et aucun balisage n'est interprété   (SC-04d)
- [ ] Un emplacement de bouton d'action publié qui porte le libellé « Demander un devis » et la destination `/contact` paraît comme un lien « Demander un devis » qui mène à `/contact`   (SC-04e)
- [ ] Un emplacement de lien de vidéo publié paraît comme un lien « Voir la vidéo » vers l'adresse de la vidéo, et la page ne charge rien de l'hébergeur de la vidéo   (SC-04f)
- [ ] Sur n'importe quelle page publique, le pied de page présente les coordonnées publiées dans l'ordre déclaré, le téléphone en lien d'appel, l'e-mail en lien de message, l'adresse sur ses lignes   (SC-04g)
- [ ] Quand trois liens de réseaux sociaux sont publiés, le pied de page de chaque page présente ces trois liens dans leur ordre, chacun sous son nom   (SC-04h)
- [ ] Quand aucun lien de réseau social n'est publié, le pied de page ne porte pas de section des réseaux   (SC-04i)
