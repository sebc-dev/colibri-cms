# 02 — Le produit lit la déclaration des réglages posée par l'intégrateur

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/core/reglages/declaration.ts`, `src/platform/contenu/reglages.ts`, `content/reglages/reglages.json`, `content/reglages/mention.md`, `tests/unit/reglages/declaration.test.ts`

## Ce que ça livre

Les réglages transverses — coordonnées de contact, liens vers les réseaux sociaux, mention d'information
qui accompagne les formulaires — n'ont aujourd'hui aucun lieu où vivre. Ce ticket pose leur
**déclaration**, écrite à la main par l'intégrateur hors administration, et sa **lecture** par le
produit : pour chacun des trois réglages, le produit connaît son contenu de départ. Les coordonnées
sont lues dans l'ordre posé, une entrée mal formée est écartée sans empêcher la lecture des autres, et
aucun nom n'est jamais fabriqué à partir d'un identifiant (FR-117).

**Décisions à respecter (ADR-0017, accepté) :**
- Répertoire `content/reglages/`, à côté de `content/pages/`, au format qui sera déposé à la
  publication : un `reglages.json` portant `coordonnees` — liste **ordonnée** d'entrées
  `{ id, nature, nom?, valeur }`, `nature` ∈ `texte` | `telephone` | `email` | `adresse` — et `reseaux`
  — liste ordonnée de `{ nom, lien }` ; plus un `mention.md` (texte de départ de la mention, Markdown
  restreint). Le répertoire est **garni pour la démonstration** (quelques coordonnées dont un
  « Téléphone de l'atelier », une adresse e-mail sans nom, une adresse postale ; deux ou trois liens
  `https` ; une mention).
- La lecture est une **fonction pure de `src/core/reglages/`** (sans base, sans HTTP, sans framework —
  `I2`) qui reçoit le contenu brut des deux fichiers et rend les trois contenus de départ, sur le modèle
  de `src/core/pages/declaration.ts`. Une coordonnée est écartée si elle n'a pas d'identifiant, si sa
  nature est inconnue, ou si son identifiant répète un identifiant déjà lu (la première l'emporte). Un
  `nom` absent ou vide une fois ses espaces de début et de fin retirés est **absent** — jamais remplacé
  par l'identifiant.
- La lecture plateforme vit dans `src/platform/contenu/reglages.ts`, par `import.meta.glob`, comme
  `src/platform/contenu/pages.ts` ; elle appelle la fonction de `core/`.
- Le produit **lit** cette déclaration, il ne l'**écrit jamais** (ADR-0017, ADR-0012).

**Hors périmètre :** la vérification des valeurs (ticket 03), l'écran (ticket 04), les brouillons
(ticket 05 et suivants), l'affichage sur le site public.

## Critères
- [ ] En `core/`, une déclaration portant trois coordonnées valides les rend toutes les trois dans l'ordre de la déclaration, chacune avec son identifiant, sa nature, son nom et sa valeur de départ   (SC-02a)
- [ ] En `core/`, une déclaration portant une coordonnée de nature inconnue, une sans identifiant et une dont l'identifiant répète celui d'une précédente, à côté d'une coordonnée valide, ne rend que la coordonnée valide, et la lecture n'échoue pas   (SC-02b)
- [ ] En `core/`, une coordonnée déclarée sans nom, ou avec un nom fait seulement d'espaces, est lue sans nom, et rien ne lui en fabrique un à partir de son identifiant   (SC-02c)
- [ ] En `core/`, un répertoire des réglages portant des coordonnées, une liste de liens et une mention de départ rend, pour chacun des trois réglages, son contenu de départ   (SC-02d)
