# 07 — L'éditrice corrige les options depuis l'écran du formulaire

**Bloqué par :** 06
**Vérif :** test
**Fichiers :** `src/admin/ilots-svelte-5/EcranFormulaire.svelte`, `src/admin/ilots-svelte-5/formulaire-carte.ts`, `src/admin/ilots-svelte-5/monter.ts`, `src/admin/MontageEcranFormulaire.astro`, `src/pages/admin/formulaires/[id].astro`, `src/admin/textes.ts`, `src/admin/pastille-brouillon.ts`, `tests/unit/formulaire-carte.test.ts`, `tests/static/ecran-formulaire-statique.test.ts`, `tests/integration/corriger-options-depuis-l-ecran.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

À l'écran d'un formulaire, l'éditrice règle elle-même les choix proposés aux visiteurs. Dans chaque
carte de champ à choix, elle corrige le libellé d'une option et, dans un champ avec prix, son prix ;
elle **ajoute** un choix (« Ajouter un choix » pose une ligne vide en fin de liste et y place le focus),
en **retire** un, en **monte** ou en **descend** un d'un rang. Puis elle enregistre **tout le
formulaire** d'un seul bouton « Enregistrer ».
- **Pendant l'envoi**, le bouton est inactif et dit « Enregistrement… ».
- **Au succès**, la marque « Brouillon » paraît **aussitôt** à côté du titre, sans changer d'écran, la
  saisie reste affichée, et un message bref confirme : « Modifications enregistrées. Elles seront
  visibles sur le site après publication. ».
- **Sur un refus**, la ligne fautive est marquée et dit ce qui est attendu ; un message en haut de
  l'écran signale qu'il reste à corriger et mène à la première erreur ; rien n'est enregistré, la
  saisie n'est jamais perdue, et la marque ne paraît pas si elle n'y était pas.
- **Sur un échec de connexion**, l'écran garde la saisie et dit que l'enregistrement n'a pas abouti.
- **Bornes d'une carte** : avec une seule option, « Retirer » est inactif, avec l'explication « Gardez
  au moins un choix. » ; à 30 options, « Ajouter un choix » disparaît, remplacé par « La liste est
  complète (30 choix au plus). ».

**Décisions à respecter :**
- Îlot `EcranFormulaire.svelte`, monté depuis `monter.ts` par un composant Astro dédié
  (`src/admin/MontageEcranFormulaire.astro`) posé dans `<slot name="scripts"/>` de `GabaritCadre.astro`,
  hors de `<main>`, dont le `<script>` reste bundlé — patron de `src/admin/MontageCarteCoordonnees.astro`.
  Aucune directive `client:*` (`I4`, ADR-0006), aucun script en ligne. Données transmises en JSON échappé
  par Astro : les champs à choix dans l'ordre, leur nature, leur marque avec ou sans prix, et leurs
  **options courantes avec leurs identifiants** (ticket 06).
- La logique de liste — ajouter, retirer, monter, descendre, plafond — vit dans `formulaire-carte.ts`,
  **testable seule**. Bornes importées du noyau (`OPTIONS_PAR_CHAMP_MAX`, ticket 03 ; au moins une
  option), jamais recopiées.
- Le champ « Prix » est prérempli par `formaterPrix` ; la saisie part **telle quelle** (texte) à
  `POST /admin/formulaires/<id>/options` (ticket 05), forme
  `{ champs: [{ id, options: [{ id?, libelle, prix? }] }] }` : une option ajoutée part **sans** `id`, un
  champ sans prix part sans `prix`. La route reste seule juge ; l'îlot peut réutiliser `lirePrixSaisi`
  (une seule règle d'un montant).
- Après un `200`, l'îlot reprend les identifiants rendus dans `champs`, pour qu'un second
  enregistrement ne duplique pas les options ajoutées.
- Refus `400 { ok: false, refus: [{ champ, raison }] }` :
  - `champ` vaut `<idChamp>`, `<idChamp>.<rang>.libelle` ou `<idChamp>.<rang>.prix`, `rang` étant la
    position dans la soumission à partir de 0 ; la ligne correspondante est marquée ;
  - chaque code est traduit en français dans `src/admin/textes.ts` — « Un montant en euros, par exemple
    12 ou 12,50. », « Un choix de 80 caractères au plus. », « Ce choix existe déjà. », « Donnez un nom
    à ce choix. », « Gardez au moins un choix. » ;
  - un code inconnu reçoit un message générique, **jamais** affiché brut.
- Chaque bouton porte un libellé accessible qui nomme l'option et le champ visés (« Monter Fraise dans
  Parfum ») ; gestes au clavier comme au doigt.
- Au succès, la marque est clonée depuis `<template id="modele-marque-brouillon">` dans la zone à côté
  du titre (posée au ticket 04, mécanisme de zone cible de `src/admin/pastille-brouillon.ts`).
- Interpolation échappée de Svelte seulement (pas de `{@html}`, `I5`) ; tokens d'`admin.css` seuls
  (`I14`).
- Vérification : la logique de liste et la traduction des refus se testent seules ; l'ordre enregistré
  se prouve par la soumission que l'îlot construit, rejouée sur la route réelle. Ce qui ne s'observe
  qu'au navigateur — la marque révélée sans recharger, le focus sur la ligne ajoutée, l'usage au
  téléphone et au clavier — est **ajouté au cahier de recette** (`docs/cahier-de-test.md`, § du
  ticket) : un critère visuel inobservable en `workerd` ne bloque pas le ticket.

**Hors périmètre :** quitter l'écran avec des modifications non enregistrées ; tout geste sur un champ
(FR-050) ; l'aperçu et la publication.

## Critères
- [ ] À l'écran de « Devis gâteau », monter « Fraise » de deux rangs puis enregistrer fait porter au brouillon « Fraise », « Vanille », « Chocolat » dans cet ordre   (SC-07a)
- [ ] À l'écran d'un formulaire, enregistrer avec le prix d'une option écrit « douze » désigne l'option fautive avec ce qui est attendu (un montant en euros), garde toute la saisie affichée, et ne donne pas au formulaire la marque de brouillon s'il ne la portait pas   (SC-07b)
- [ ] À l'écran d'un formulaire, un enregistrement réussi fait porter aussitôt la marque de brouillon à l'écran, sans changement d'écran, et la saisie reste affichée   (SC-07c)
- [ ] Les messages de l'écran d'un formulaire — refus, confirmation, bornes d'une carte, libellés des boutons — ne portent aucun terme de développeur ni aucun identifiant (FR-117)   (SC-07d)
