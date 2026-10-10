# 01 — Le produit lit les formulaires déclarés par l'intégrateur

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/core/formulaires/declaration.ts`, `src/platform/contenu/formulaires.ts`, `content/formulaires/devis-gateau/formulaire.json`, `content/formulaires/devis-atelier/formulaire.json`, `docs/architecture/model.c4`, `docs/architecture/context.c4`, `tests/unit/formulaires/declaration.test.ts`

## Ce que ça livre

Les formulaires de devis n'ont aujourd'hui aucun lieu où vivre : `content/` ne porte que les pages et
les réglages, et rien ne parle de champ, d'option ni de prix. Ce ticket pose leur **déclaration**,
écrite à la main par l'intégrateur hors administration, et sa **lecture** par le produit. Pour chaque
formulaire, le produit connaît son identifiant, son nom écrit pour l'éditrice (« Devis gâteau ») et ses
champs dans l'ordre posé ; pour chaque champ à choix, sa marque avec ou sans prix et ses options.
Les formulaires sont rangés dans l'ordre alphabétique de leurs identifiants. Une entrée mal formée est
écartée sans empêcher la lecture des autres, et aucun nom ni libellé n'est jamais fabriqué à partir
d'un identifiant (FR-117). Tout l'aval — écrans, vérification des corrections, brouillons — lit ce que
ce ticket produit.

**Décisions à respecter (ADR-0018, accepté) :**
- Un sous-répertoire par formulaire : `content/formulaires/<id>/formulaire.json`, où `<id>`, le **nom
  du répertoire**, est l'identifiant stable du formulaire. Le fichier porte
  `{ nom, champs: [{ id, nature, libelle, obligatoire?, avecPrix?, options? }] }` ; `nature` ∈
  `choix-unique` | `choix-multiple` (les **champs à choix**) | `texte` | `texte-long` | `email` |
  `telephone` ; `obligatoire` vaut `false` par défaut. Seuls les champs à choix portent `avecPrix`
  (`false` par défaut) et `options: [{ id, libelle, prix? }]` ; dans un champ `avecPrix: true`, le prix
  d'une option est un **entier de centimes** de 0 à 9 999 999. `avecPrix` et `options` posés sur un
  champ qui n'est pas à choix sont ignorés.
- La lecture est une **fonction pure de `src/core/formulaires/declaration.ts`** (sans base, sans HTTP,
  sans framework — `I2`), sur le modèle de `src/core/reglages/declaration.ts` : elle reçoit la liste des
  fichiers bruts avec leur identifiant de répertoire et rend les formulaires lus. Règles d'écart :
  - un formulaire est écarté s'il n'a pas d'identifiant, pas de nom (vide une fois les espaces de début
    et de fin retirés), si son identifiant répète celui d'un autre (le premier l'emporte), ou s'il ne
    garde aucun champ lisible ;
  - un champ est écarté s'il n'a pas d'identifiant, pas de libellé, une nature inconnue, ou si son
    identifiant répète celui d'un champ du même formulaire (le premier l'emporte) ;
  - une option est écartée si elle n'a pas d'identifiant, pas de libellé, si son identifiant répète
    celui d'une option du même champ, ou — dans un champ avec prix seulement — si son prix manque,
    n'est pas un entier ou sort de 0 à 9 999 999 ;
  - un champ à choix qui ne garde aucune option lisible est écarté ;
  - un prix porté par une option d'un champ sans prix est **ignoré** : l'option est lue, sans prix.
- **Ordre** : les formulaires sont triés **explicitement en `core/`** par simple comparaison des
  identifiants — sans compter sur l'ordre où le chargement rend les fichiers ; les champs et les options
  gardent l'ordre de la déclaration.
- La borne du prix est une constante nommée exportée (`PRIX_CENTIMES_MAX = 9_999_999`).
- Le chargement vit dans `src/platform/contenu/formulaires.ts`, par
  `import.meta.glob('/content/formulaires/*/formulaire.json', { eager: true, import: 'default' })`,
  l'identifiant étant tiré du nom du répertoire, comme `src/platform/contenu/reglages.ts` ; il appelle la
  fonction de `core/`. Il expose **la liste lue** et **le formulaire d'un identifiant donné**, cherché
  dans cette liste déjà chargée — un identifiant venu d'une adresse ne sert **jamais** à lire un fichier.
  Les deux sont consommés par les tickets suivants (écrans et route d'écriture).
- Le produit **lit** cette déclaration, il ne l'**écrit jamais**.
- **Contenu de démonstration** :
  - `devis-gateau` (« Devis gâteau ») : « Parfum » (choix unique, avec prix : Vanille 800, Chocolat
    900, Fraise 1000, dans cet ordre), « Nombre de parts » (choix unique, avec prix), « Occasion »
    (sans prix), puis des champs de coordonnées sans option : nom (texte), « Votre adresse e-mail »
    (email, obligatoire), téléphone, message (texte long) ;
  - `devis-atelier` (« Devis atelier ») : au moins un champ à choix avec prix, un sans prix, et des
    coordonnées.
  Les identifiants d'option sont **parlants** (`vanille`, `chocolat`, `fraise`), jamais de la forme
  `o<n>`, réservée aux options créées par l'éditrice. Au moins un libellé déclaré porte une esperluette
  (`&`) et un autre une apostrophe, pour que l'affichage tel quel soit observable sur les écrans.
- Modèle d'architecture : la description de `colibri-cms.contenu` (« Pages, emplacements et
  réglages… ») et le libellé de la relation `integrateur -> colibri-cms.contenu` (« déclare pages,
  emplacements et réglages ») reçoivent les formulaires. Aucun élément ni relation nouvelle ; le
  modèle reste valide (`likec4 validate --no-layout --json --project colibri-cms docs/architecture`).

**Hors périmètre :** la liste et l'écran d'un formulaire (tickets 02, 04) ; la vérification d'une
correction et la lecture d'un prix saisi (ticket 03) ; les brouillons (tickets 05, 06) ; l'affichage
d'un formulaire au visiteur.

## Critères
- [ ] En `core/`, un répertoire des formulaires portant deux formulaires valides d'identifiants `devis-gateau` puis `devis-atelier`, chacun avec des champs à choix et des champs sans option, les rend tous les deux, `devis-atelier` d'abord, chacun avec son identifiant, son nom et ses champs dans l'ordre de la déclaration, et les options de chaque champ à choix dans leur ordre   (SC-01a)
- [ ] En `core/`, un formulaire qui déclare un champ « Parfum » avec prix dont les options valent 800 et 1200 centimes, et un champ « Occasion » sans prix dont une option porte malgré tout un prix, est lu avec le prix de chaque option de « Parfum » et sans aucun prix pour les options d'« Occasion »   (SC-01b)
- [ ] En `core/`, un formulaire qui déclare, à côté de champs valides, un champ d'une nature inconnue, un champ dont l'identifiant répète celui d'un autre, et un champ avec prix dont une option n'a pas de prix à côté d'options valides, est lu sans le champ de nature inconnue, sans le champ répété et sans l'option sans prix, avec toutes les autres entrées, et la lecture n'échoue pas   (SC-01c)
- [ ] En `core/`, un champ à choix qui ne porte que des options mal formées est écarté de son formulaire, un autre formulaire qui ne porte que des champs mal formés est écarté de la liste, et les autres formulaires sont lus   (SC-01d)
