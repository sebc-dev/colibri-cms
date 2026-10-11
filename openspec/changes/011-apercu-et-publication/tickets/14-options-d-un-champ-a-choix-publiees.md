# 14 — Les options d'un champ à choix partent telles que l'éditrice les a vues

**Bloqué par :** 01, 12
**Vérif :** tdd
**Fichiers :** `src/core/publication/plan.ts`, `src/core/formulaires/brouillon.ts`, `src/core/formulaires/options.ts`, `src/platform/formulaires/magasin.ts`, `tests/unit/publication/plan-formulaires.test.ts`, `tests/integration/numero-d-option-jamais-redonne.test.ts`

## Ce que ça livre

La publication dépose le `formulaire.json` de chaque formulaire en brouillon. Ce que l'éditrice a vu
à l'écran est ce qui part en ligne. Pour chaque champ à choix, la liste déposée est :
- la **liste de son brouillon telle quelle** — ordre, identifiants, libellés, prix en centimes —
  quand ce champ a un brouillon lisible et accordé à la marque avec prix / sans prix déclarée ;
- sa **liste publiée** sinon ;
- celle de la déclaration tant que le champ n'a jamais été publié.

Tout le reste du champ et du formulaire vient de la déclaration : existence, ordre, libellé, nature,
caractère obligatoire, marque avec prix. Les options de départ que l'intégrateur a ajoutées, retirées
ou changées depuis l'enregistrement ne se mêlent jamais à la liste du brouillon.

Un identifiant d'option donné une fois, publié ou non, n'est **jamais redonné** à une autre option du
même champ, y compris après une publication.

**Décisions à respecter (ADR-0026, ADR-0018) :**
- `optionsCourantes` reste la **seule règle**, avec le repli sur la liste publiée posé au ticket 01.
  Le plan (`src/core/publication/plan.ts`) s'en sert pour composer `formulaire.json`.
- **Format déposé** : les `options` du champ sont remplacées par la liste `{ id, libelle, prix? }`,
  prix en centimes, sans conversion. JSON produit par `JSON.stringify(…, null, 2)` et un saut de ligne
  final.
- Le récapitulatif **ne signale pas** les options de départ changées sous un brouillon : l'éditrice
  publie ce qu'elle a vu.
- **Numérotation** : `derniersNumeros` passe dans l'état publié (la ligne de `publies_formulaires`
  le garde, ticket 01). Un brouillon neuf part du **maximum**, champ par champ, entre son propre
  compteur et celui du publié, si bien qu'un `o<n>` déjà donné ne revient jamais.
  L'enregistrement des options (`src/platform/formulaires/magasin.ts` → `core/`) lit donc aussi le
  compteur publié.
- Les cinq cas se testent sur « Devis gâteau ».

**Hors périmètre :** l'écriture de l'état publié des formulaires à la finalisation (ticket 15) ; le
dessin public du formulaire (story « Composer et envoyer une demande de devis »).

## Critères
- [ ] Quand l'intégrateur ajoute l'option de départ « Pistache » au champ « Parfum » de « Devis gâteau » après que l'éditrice a enregistré ce champ, puis que l'éditrice publie, le `formulaire.json` déposé porte pour « Parfum » la liste du brouillon, sans « Pistache »   (SC-14a)
- [ ] Quand l'intégrateur retire l'option de départ « Fraise » que le brouillon de l'éditrice garde, puis que l'éditrice publie, le `formulaire.json` déposé porte « Fraise » dans « Parfum »   (SC-14b)
- [ ] Quand l'intégrateur passe un champ de choix unique à choix multiple après l'enregistrement de ce champ, puis que l'éditrice publie, le `formulaire.json` déposé porte ce champ en choix multiple, avec la liste du brouillon   (SC-14c)
- [ ] Quand l'intégrateur fait d'un champ à choix enregistré un champ de texte, puis que l'éditrice publie, le `formulaire.json` déposé porte ce champ sans aucune option, et la publication aboutit   (SC-14d)
- [ ] Quand un formulaire est publié alors qu'un de ses champs à choix n'a pas de brouillon, ce champ porte dans le `formulaire.json` déposé sa liste publiée, celle de la déclaration s'il n'a jamais été publié   (SC-14e)
- [ ] Quand un champ dont les options ajoutées par l'éditrice ont reçu trois identifiants est publié, puis que l'éditrice retire la dernière de ces options et en ajoute une nouvelle, la nouvelle option reçoit un identifiant distinct des trois identifiants déjà donnés   (SC-14f)
