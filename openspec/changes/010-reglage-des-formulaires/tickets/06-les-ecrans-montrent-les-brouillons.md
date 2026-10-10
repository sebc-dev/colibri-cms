# 06 — Les écrans des formulaires montrent leurs brouillons

**Bloqué par :** 04, 05
**Vérif :** test
**Fichiers :** `src/core/formulaires/brouillon.ts`, `src/pages/admin/formulaires.astro`, `src/pages/admin/formulaires/[id].astro`, `tests/unit/formulaires/brouillon.test.ts`, `tests/integration/brouillons-des-formulaires.test.ts`

## Ce que ça livre

Une fois un formulaire enregistré (ticket 05), l'administration le montre. Sur l'`Écran : Formulaires`,
chaque formulaire qui porte un brouillon porte la marque « Brouillon », et lui seul ; sur une instance
où rien n'a été enregistré, aucun ne la porte. L'écran d'un formulaire montre ses **options
courantes** — celles du brouillon pour un champ qui en porte, celles de la déclaration sinon — et la
marque à côté de son titre quand il porte un brouillon. Quand la déclaration change sous un brouillon
(un champ retiré ou ajouté, une marque avec ou sans prix changée), l'écran s'y retrouve par les
identifiants stables, **jamais par une erreur**. Un libellé enregistré par l'éditrice, même s'il
contient du balisage, s'affiche comme du texte.

**Décisions à respecter :**
- `src/core/formulaires/brouillon.ts` — `optionsCourantes(formulaireDeclare, brouillon)`, logique pure
  (`I2`), rapprochement **par identifiant** :
  - les options au brouillon d'un champ que la déclaration ne porte plus sont **ignorées** ;
  - un champ dont le brouillon ne s'accorde plus à la déclaration (champ qui n'est plus à choix,
    prix présents alors que le champ est déclaré sans prix ou absents alors qu'il est déclaré avec prix)
    montre les **options de la déclaration** ;
  - un champ à choix nouvellement déclaré, inconnu du brouillon, montre ses **options de départ** ;
  - un brouillon de forme inattendue est traité comme absent ;
  - `derniersNumeros` (le dernier numéro d'option attribué par champ, ticket 05) n'entre pas dans
    l'affichage : un brouillon qui en est dépourvu reste un brouillon valide ;
  - l'ordre des champs, leur nature et leur marque avec ou sans prix viennent **toujours** de la
    déclaration.
  Elle servira plus tard l'aperçu et la publication.
- Les deux écrans lisent les brouillons par le magasin du ticket 05 (tous les brouillons pour la
  liste, celui du formulaire pour son écran). « Porte un brouillon » = présence de la ligne ; un
  brouillon dont le formulaire n'est plus déclaré est ignoré.
- La marque est **rendue par le serveur** avec `src/admin/MarqueBrouillon.astro` : sur chaque ligne de
  la liste concernée, et dans la zone à côté du titre de l'écran d'un formulaire (posée au ticket 04).
- Prix affichés par `formaterPrix` (ticket 03), suffixés « € ». Interpolation échappée d'Astro
  seulement (`I5`) ; aucune directive `client:*`.

**Hors périmètre :** la marque qui paraît sans recharger après un enregistrement depuis l'écran
(ticket 07) ; l'abandon d'un brouillon ; l'aperçu et la publication.

## Critères
- [ ] L'écran de « Devis gâteau » affiché alors que son brouillon passe « Vanille » à 10 € montre l'option « Vanille » à 10 €, et l'écran porte la marque de brouillon   (SC-06a)
- [ ] L'`Écran : Formulaires` affiché alors que seul « Devis atelier » porte un brouillon montre la marque de brouillon sur « Devis atelier » et pas sur « Devis gâteau »   (SC-06b)
- [ ] La liste des formulaires affichée sur une instance où aucun formulaire n'a été enregistré ne montre la marque de brouillon sur aucun formulaire   (SC-06c)
- [ ] En `core/`, quand un brouillon porte les options d'un champ que la déclaration ne porte plus et que la déclaration ajoute un champ à choix que le brouillon ne connaît pas, la lecture des options courantes ignore les options du champ disparu, montre les options de départ du champ nouveau, garde les autres champs du brouillon, et n'échoue pas   (SC-06d)
- [ ] Quand une option enregistrée au brouillon porte un libellé contenant `<`, `>`, `&` ou des guillemets — par exemple `<img src=x onerror=alert(1)>` —, l'écran du formulaire l'affiche comme du texte et aucun balisage n'est interprété   (SC-06e)
