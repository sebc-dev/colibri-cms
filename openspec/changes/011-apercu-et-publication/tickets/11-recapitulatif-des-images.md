# 11 — Le récapitulatif annonce les images redécrites et celles qui seront effacées

**Bloqué par :** 02, 03, 10
**Vérif :** test
**Fichiers :** `src/core/publication/recapitulatif.ts`, `src/platform/medias/magasin.ts`, `src/pages/admin/publier.astro`, `src/admin/textes.ts`, `tests/unit/publication/recapitulatif-images.test.ts`, `tests/integration/recapitulatif-exact.test.ts`, `tests/static/ecran-publier-termes-statique.test.ts`

## Ce que ça livre

Le récapitulatif de l'écran Publier gagne ses deux listes d'images :
- les **images dont la description va changer en ligne** : les images déjà publiées dont la
  description a été modifiée depuis leur dernière publication ;
- les **images qui seront définitivement effacées** : les images qu'aucun emplacement ne pose plus
  dans son contenu courant (son brouillon s'il en porte un, sa dernière version publiée sinon).

Le récapitulatif est alors **exact** (SC-016) : il n'omet aucun élément de ses cinq listes — pages,
réglages, formulaires et ces deux listes d'images — et n'en porte aucun de trop. L'éditrice dit, en
le lisant seul, ce qui va partir et quelles images seront effacées. Tout nom paraît tel quel, et aucun
terme de développeur ne paraît sur l'écran.

**Décisions à respecter :**
- **Redécrites** : les images publiées (`publiee_le` renseigné) dont la description courante diffère
  de `description_publiee`.
- **Effacées** : la règle du ticket 03, qui se fonde sur le contenu courant de chaque emplacement.
  Une image téléversée et jamais posée est effacée. Une image posée au départ par l'intégrateur n'est
  ni listée ni effacée tant qu'un emplacement la pose.
- La logique reste pure, dans `src/core/publication/recapitulatif.ts`. La plateforme lui fournit les
  images en données.
- **Présentation** :
  - « Images dont la description change » ;
  - « Images qui seront définitivement effacées », avec la vignette de chaque image et la phrase « Ces
    images ne sont plus utilisées sur votre site. Elles seront effacées et ne pourront pas être
    récupérées. » ;
  - chaque liste est absente si elle est vide.
- « Rien à publier » exige désormais aussi qu'aucune description n'ait changé et qu'aucune image ne
  soit à effacer.
- **Exactitude** : un jeu de brouillons connu, semé en base, doit produire les cinq listes égales à
  l'attendu, ni plus ni moins.
- **Termes de développeur** : la liste plancher (dépôt, GitHub, branche, commit, build, déploiement,
  push, serveur, 404, 422…) est cherchée dans le HTML de l'écran. C'est un oracle partiel, complété
  par la relecture.

**Hors périmètre :** la confirmation et l'empreinte du récapitulatif (ticket 15) ; l'effacement
lui-même (ticket 15).

## Critères
- [ ] Quand les pages « Contact » et « Tarifs » portent un brouillon, le formulaire « Devis gâteau » aussi, et qu'une image n'est plus posée par aucun emplacement, le récapitulatif présente « Tarifs » et « Contact » parmi les pages, « Devis gâteau » parmi les formulaires et cette image parmi les images effacées — et rien d'autre : ni « Accueil », ni aucun réglage, ni « Devis atelier »   (SC-11a)
- [ ] Quand l'éditrice a modifié la description d'une image déjà publiée, sans toucher à aucune page, le récapitulatif présente cette image parmi les images dont la description va changer en ligne   (SC-11b)
- [ ] Quand une image publiée n'était posée que dans un emplacement dont le brouillon la remplace par une autre, le récapitulatif la présente parmi les images qui seront définitivement effacées   (SC-11c)
- [ ] Quand une image n'est posée que par la dernière version publiée d'un emplacement qui ne porte pas de brouillon, le récapitulatif ne la présente pas parmi les images effacées   (SC-11d)
- [ ] Quand un titre de page, un nom de formulaire ou un nom d'image du récapitulatif contient `<`, `>`, `&` ou des guillemets, ces caractères paraissent comme du texte, et aucun balisage n'est interprété   (SC-11e)
- [ ] Aucun terme de développeur ne paraît sur l'écran Publier, ni dans ses listes, ses boutons et ses messages (FR-117)   (SC-11f)
