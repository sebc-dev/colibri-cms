# 01 — L'intégrateur pose un formulaire sur une page, et l'éditrice l'y voit sans pouvoir le modifier

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/core/pages/declaration.ts`, `src/core/rendu/page.ts`, `src/core/publication/plan.ts`, `src/pages/admin/pages/[slug].astro`, `src/admin/textes.ts`, `content/pages/tarifs/page.json`, `content/pages/contact/page.json`, `tests/unit/emplacement-formulaire.test.ts`, `tests/integration/emplacement-de-formulaire.test.ts`

## Ce que ça livre

L'intégrateur peut poser un formulaire de devis sur une page. Il le fait par un **emplacement de nature
« formulaire »**, déclaré dans le `page.json` de la page parmi les autres emplacements (ADR-0027) :

```json
{ "id": "formulaire-devis", "nature": "formulaire", "rang": 3, "formulaire": "devis-gateau" }
```

Le champ `formulaire` porte l'identifiant du formulaire désigné, c'est-à-dire le nom de son répertoire
sous `content/formulaires/` (ADR-0018). Le champ `nom` reste facultatif, comme pour toute nature. Un même
formulaire peut être posé sur plusieurs pages.

Le contenu de départ du dépôt pose « Devis gâteau » sur deux pages :
- « Tarifs » le pose au rang 3, juste après son image de bandeau ;
- « Contact » le pose au rang 4, après son carrousel.

Dans l'éditeur de la page, l'éditrice voit l'emplacement à son rang, sous forme de carte. La carte est
titrée « Formulaire — Devis gâteau », avec le **nom du formulaire désigné**. Elle porte la phrase « Ses
options et ses prix se règlent dans Formulaires. » et un lien « Régler ce formulaire », qui ouvre l'écran
de ce formulaire. La carte n'a aucun champ et aucun bouton d'enregistrement : l'éditrice ne peut ni
modifier l'emplacement, ni changer le formulaire désigné. Ce qu'elle règle — options, libellés, prix —
vit dans le brouillon du formulaire, une fois pour toutes les pages qui le posent.

Quand l'éditrice publie, le `page.json` déposé garde l'emplacement de formulaire tel que l'intégrateur
l'a posé. Publier le seul formulaire ne réécrit aucune des pages qui le posent.

Sur la page publique et dans l'aperçu, l'emplacement ne dessine encore rien : le dessin du formulaire
arrive au ticket 03 (la page publique présente le formulaire qu'elle pose).

**Décisions à respecter :**
- La lecture de la déclaration des pages (`construireEmplacement`, `src/core/pages/declaration.ts`) admet
  cette septième nature. Une entrée sans `formulaire` textuel non vide est écartée, comme toute entrée mal
  formée, sans empêcher la lecture des autres. Le nouveau type est
  `EmplacementFormulaire { id, nature: 'formulaire', rang, formulaire, nom? }`.
- L'emplacement ne porte **aucun contenu éditable** : aucun brouillon ne s'y rattache. La route de
  correction choisit sa branche selon la nature **déclarée**. Une correction qui vise un emplacement de
  formulaire est refusée (400) comme une correction de structure (FR-025), et rien n'est écrit.
- Le titre de la carte est la nature suivie du **nom du formulaire désigné**, lu dans la déclaration des
  formulaires (`lireFormulaireDeLaDeclaration`, `src/platform/contenu/formulaires.ts`). Le `nom` propre à
  l'emplacement n'entre pas dans ce titre.
- Les textes de la carte vivent dans `src/admin/textes.ts`. Ils sont affichés comme du texte, sans
  balisage interprété, et sans aucun terme de développeur (FR-117). Le lien mène à
  `/admin/formulaires/<identifiant du formulaire>`.
- Le plan de dépôt (`versJson`, `src/core/publication/plan.ts`) recopie l'emplacement tel que déclaré :
  identifiant, nature, rang, formulaire désigné, et nom s'il en a un.
- La composition d'une page (`composerPage`, `src/core/rendu/page.ts`) ne produit rien pour un emplacement
  de formulaire dans ce ticket. La page publique et l'aperçu restent donc identiques entre eux.
- Deux critères tiennent déjà avant le code. SC-01e tient parce qu'un emplacement inconnu est refusé
  comme non déclaré. SC-01h tient parce qu'une page sans brouillon n'est pas réécrite. Leur test fixe la
  règle une fois la nature connue : qu'il soit vert avant le code est attendu.
- Un test existant pourrait figer la structure exacte de « Tarifs » ou de « Contact ». S'il casse avec le
  contenu modifié, il se déclare en dérogation dans la PR, relue par l'humain. Il n'est jamais réécrit en
  silence.

**Hors périmètre :**
- le dessin du formulaire sur la page publique (ticket 03) ;
- le formulaire dans l'aperçu (ticket 06) ;
- l'échec de la reconstruction sur un formulaire introuvable (ticket 04).

## Critères
- [ ] Quand l'éditeur d'une page est affiché, les emplacements paraissent dans l'ordre posé, chacun présenté selon sa nature — texte riche, lien de vidéo, bouton d'action, image, galerie, carrousel, formulaire   (SC-01a)
- [ ] Quand l'éditrice ouvre l'éditeur de « Contact », dont un emplacement désigne le formulaire « Devis gâteau », cet emplacement se présente comme « Formulaire — Devis gâteau », à son rang parmi les autres, avec la phrase qui renvoie à l'écran Formulaires   (SC-01b)
- [ ] Quand l'éditrice actionne le lien de cet emplacement, l'écran du formulaire « Devis gâteau » s'ouvre   (SC-01c)
- [ ] Quand l'éditrice parcourt l'emplacement de formulaire dans l'éditeur de la page, aucun champ ni aucun geste n'en modifie le contenu ni ne change le formulaire désigné   (SC-01d)
- [ ] Quand une correction parvient pour un emplacement de formulaire, elle est refusée, et aucun brouillon n'est écrit   (SC-01e)
- [ ] Quand l'intégrateur déclare un emplacement de nature formulaire qui ne désigne aucun formulaire, cet emplacement est ignoré à la lecture, et les autres emplacements de la page paraissent normalement   (SC-01f)
- [ ] Quand la page « Contact », qui pose le formulaire « Devis gâteau », porte un brouillon de son texte de présentation, et que l'éditrice publie, le `page.json` déposé pour « Contact » porte toujours l'emplacement qui désigne « Devis gâteau », à son rang   (SC-01g)
- [ ] Quand seul le formulaire « Devis gâteau » porte un brouillon, et que l'éditrice publie, le dépôt réécrit le `formulaire.json` de « Devis gâteau », et ne réécrit le `page.json` d'aucune des pages qui le posent   (SC-01h)
