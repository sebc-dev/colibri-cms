# 04 — La reconstruction échoue sur un formulaire introuvable ou sans moyen de répondre

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `src/core/rendu/page.ts`, `scripts/batir-site-jetable.mjs`, `tests/static/fixtures/site-jetable-formulaire-inconnu/`, `tests/static/fixtures/site-jetable-formulaire-sans-coordonnee/`, `tests/unit/rendu/formulaire-mal-pose.test.ts`, `tests/static/formulaire-mal-pose-statique.test.ts`

## Ce que ça livre

Une page publique n'est jamais servie avec un formulaire manquant, ni avec un formulaire auquel
l'éditrice ne pourrait pas répondre. La reconstruction du site **échoue**, en nommant la page et le
formulaire en cause, dans deux cas :
- un emplacement de formulaire désigne un formulaire qu'aucun formulaire publié ne porte ;
- le formulaire désigné ne porte aucun champ d'e-mail ni de téléphone **obligatoire** : l'éditrice ne
  pourrait pas répondre au visiteur.

Le site en service reste alors tel qu'il était (FR-091). Quand chaque emplacement de formulaire désigne
un formulaire publié qui porte un champ d'e-mail ou de téléphone obligatoire, la reconstruction aboutit,
et chaque page présente ses formulaires.

**Décisions à respecter (ADR-0027) :**
- Même patron que l'image posée mais absente des images publiées (`ImageManquanteError`,
  `src/core/rendu/page.ts`). `composerPage` lève une **erreur nommée** qui porte la page et le formulaire,
  et c'est elle qui fait échouer la construction.
- La preuve de l'échec passe par une construction du site jetable attendue en **échec**, sur le patron de
  `site-jetable-image-manquante` dans `scripts/batir-site-jetable.mjs`. Chaque cas a sa fixture versionnée
  sous `tests/static/fixtures/`, et `content/` n'est jamais touché.
- La règle « champ d'e-mail ou de téléphone obligatoire » se lit sur la nature et l'obligation des champs
  déclarés (`ChampDeclare`, `src/core/formulaires/declaration.ts`).

**Hors périmètre :** le dessin du formulaire lui-même (ticket 03) ; tout contrôle dans l'administration au
moment où l'intégrateur pose le formulaire.

## Critères
- [ ] Quand la reconstruction du site trouve une page dont un emplacement désigne un formulaire qu'aucun formulaire publié ne porte, la reconstruction échoue en nommant cette page et ce formulaire, et aucun site n'est produit   (SC-04a)
- [ ] Quand la reconstruction du site trouve une page qui pose un formulaire dont aucun champ d'e-mail ni de téléphone n'est obligatoire, la reconstruction échoue en nommant cette page et ce formulaire, et aucun site n'est produit   (SC-04b)
- [ ] Quand chaque emplacement de formulaire désigne un formulaire publié qui porte un champ d'e-mail ou de téléphone obligatoire, le site est produit, et chaque page présente ses formulaires   (SC-04c)
