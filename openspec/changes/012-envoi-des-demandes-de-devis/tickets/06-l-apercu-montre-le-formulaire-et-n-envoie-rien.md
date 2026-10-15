# 06 — L'aperçu montre le formulaire avec son brouillon, et n'envoie rien

**Bloqué par :** 05
**Vérif :** tdd
**Fichiers :** `src/pages/admin/apercu/[...slug].astro`, `src/core/rendu/page.ts`, `src/render/Formulaire.astro`, `src/render/formulaire/module.ts`, `src/render/formulaire/textes.ts`, `tests/integration/apercu-des-formulaires.test.ts`, `tests/parcours/apercu-formulaire.parcours.ts`

## Ce que ça livre

L'aperçu d'une page présente chaque formulaire qu'elle pose avec son **contenu courant** (FR-081) :
- pour chaque champ à choix, la liste d'options du brouillon du formulaire s'il en porte un, sa dernière
  version publiée sinon, libellés et prix compris ;
- la mention d'information courante, son brouillon s'il en porte un.

Le total s'y calcule avec ces prix, comme sur la page publique. Si l'éditrice a ajouté « Pistache » à
12 € sans publier, l'aperçu de « Contact » la présente, et la page publique ne la présente pas.

Depuis l'aperçu, le bouton d'envoi **n'envoie rien**. Un avis, au-dessus du bouton, dit : « Dans
l'aperçu, l'envoi est désactivé : rien ne part d'ici. » Actionner le bouton fait seulement ressortir cet
avis. Aucun e-mail de demande ne part jamais d'un aperçu. Demander l'aperçu ne change ni le brouillon du
formulaire, ni le site public.

Pour un même contenu sans aucun brouillon, l'aperçu et la page publique présentent le même formulaire,
élément par élément. Seuls diffèrent le bandeau de l'aperçu et cet avis.

Ce ticket passe **avant** l'envoi (ticket 07). Ainsi, la règle « rien ne part de l'aperçu » est en place
et gardée par un test avant que l'envoi n'existe.

**Préalable.** La retouche des tests du site public, fusionnée avant le ticket 05, a réécrit la
comparaison `SC-08b` de `tests/integration/apercu-d-une-page.test.ts`. Elle ignore les scripts et
l'élément marqué `data-avis-envoi-desactive`. Ce ticket pose l'avis sous **ce repère exact** et ne modifie
aucun test existant.

**Décisions à respecter (D2, D10 de l'approche ; ADR-0026) :**
- **Sources.** La route d'aperçu lit, pour chaque formulaire posé par la page, son brouillon
  (`obtenirBrouillonFormulaire`, `src/platform/formulaires/magasin.ts`) et son publié
  (`obtenirPublieFormulaire`, `src/platform/publication/magasin-publie.ts`).
- **Options.** Elle passe à `composerPage` les options de
  `optionsCourantes(declare, brouillon, publie)` (`src/core/formulaires/brouillon.ts`) : exactement ce que
  la publication déposera.
- **Mention.** Elle vient des réglages recouverts par le brouillon (`reglagesRecouvertsParLeBrouillon`),
  comme le pied de page.
- **Mode `desactive`.** L'aperçu compose le formulaire dans ce mode. Le document porte alors l'avis,
  marqué `data-avis-envoi-desactive`, dont le texte vit dans `src/render/formulaire/textes.ts`. Le module
  lit ce mode : en mode `desactive`, il n'émet **aucune** requête, quoi que fasse l'éditrice. La route
  d'envoi, à venir, ne connaît pas l'aperçu : elle n'a pas à le reconnaître, puisque rien n'en part.
- **Un seul lieu de rendu.** Même gabarit, même composant `Formulaire.astro`, même composition que la page
  publique (ADR-0024, I3). L'aperçu reste sous la politique de l'administration (I12), inchangée.
- **Lecture seule.** La route n'écrit rien en base.
- **Le test du critère SC-06e** vérifie qu'aucune requête ne quitte la page quand le bouton est actionné.
  Avant l'envoi, il est vrai par construction. Après le ticket 07, il garde la règle.
- **Aucun terme de développeur** dans l'avis (FR-117).

**Hors périmètre :** l'envoi lui-même (ticket 07) ; le brouillon des autres emplacements, déjà montré
par l'aperçu.

## Critères
- [ ] Quand une page ne porte aucun brouillon, qu'aucun réglage ni aucun formulaire n'en porte, et que l'on compare son aperçu à sa page publique, le contenu de la page — titre, navigation, emplacements, formulaires, pied de page — est le même, élément par élément et dans le même ordre, hors le bandeau de l'aperçu et l'avis d'envoi désactivé, les liens vers une page du site étant ramenés à leur adresse publique   (SC-06a)
- [ ] Quand l'éditrice a ajouté « Pistache » à 12 € dans « Parfum » du formulaire « Devis gâteau », sans publier, et demande l'aperçu de « Contact », qui le pose, l'aperçu présente « Pistache — 12 € » parmi les parfums, alors que la page publique « Contact » ne la présente pas   (SC-06b)
- [ ] Quand, dans l'aperçu, l'éditrice choisit « Pistache » (12 €, en brouillon) et « 10 parts » (30 €), le total affiché est 42 €   (SC-06c)
- [ ] Quand la mention d'information porte un brouillon, et que l'éditrice demande l'aperçu d'une page qui pose un formulaire, le formulaire de l'aperçu présente la mention du brouillon   (SC-06d)
- [ ] Quand l'éditrice remplit le formulaire de l'aperçu et actionne le bouton d'envoi, aucune demande ne part, aucun e-mail n'est envoyé, et l'avis dit que l'envoi est désactivé dans l'aperçu   (SC-06e)
- [ ] Quand l'éditrice lit l'avis d'envoi désactivé, aucun terme de développeur n'y paraît (FR-117)   (SC-06f)
