# 03 — L'éditeur présente chaque emplacement par sa nature et son nom

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/pages/admin/pages/[slug].astro`, `tests/integration/nom-emplacement-editeur.test.ts`, `tests/static/nom-emplacement-editeur-statique.test.ts`

## Ce que ça livre

Dans l'éditeur d'une page, le titre de la carte de chaque emplacement dit sa nature **et son nom**
quand l'intégrateur lui en a donné un : « Texte riche — Présentation », « Lien de la vidéo — Vidéo
d'accueil ». Un emplacement sans nom se présente, comme aujourd'hui, par sa nature seule
(« Bouton d'action », « Galerie ») ; son identifiant n'apparaît nulle part à l'écran. Sur une page
chargée, l'éditrice distingue ainsi deux emplacements de même nature à la seule lecture des titres, sans
lire leur contenu. Le nom se lit, il ne s'édite pas : rien à l'écran ne suggère que l'éditrice puisse le
changer.

**Décisions à respecter :**
- **La forme du titre** (ux.md) : la nature, déjà écrite dans chaque `CardTitle` de l'éditeur, puis un
  tiret cadratin entouré d'espaces, puis le nom (`Nature — Nom`). Sans nom, la nature seule, sans
  tiret. Les libellés de nature actuels ne changent pas. Un nom long passe à la ligne dans la carte, sans
  être tronqué ni coupé (habillage déjà posé par le change 005, `break-words`, qui n'est pas à refaire).
- **Le nom vient de l'emplacement lu** (champ `nom`, posé par le ticket 01). La superposition du
  brouillon le conserve. Il ne se calcule jamais à partir de l'identifiant (FR-117). La page de
  démonstration « Accueil » porte un texte riche nommé « Présentation » et un bouton d'action sans nom :
  ce sont les deux cas à exercer par une requête HTTP réelle sur l'éditeur (patron des tests
  d'intégration existants de l'éditeur).
- **Le nom est rendu comme du texte** (design D5, I5, security-review) : par l'interpolation échappée
  d'Astro seulement, ni `set:html`, ni `{@html}`, ni `innerHTML` sur son chemin. Aucune page de
  démonstration ne porte de balisage dans un nom. Cette garantie se prouve donc par la lecture de la
  source (patron `tests/static/*`, `?raw`) : le titre de chaque carte interpole le nom sans directive
  qui injecte du HTML. La CSP (I12) reste la seconde barrière.
- **Aucun geste de structure** (FR-024/025) : ni champ, ni bouton, ni crayon sur le titre. Le nom
  n'est jamais envoyé par une route d'écriture et ne devient jamais un champ de correction.
- **Tests existants intacts** : l'ordre des emplacements, le contenu courant, le fil de retour et les
  moyens de correction de chaque nature (tickets 03 à 06 du change 003, 08 et 09 du change 005) ne
  changent pas, et leurs tests restent verts tels quels.

**Hors périmètre :** la bibliothèque (ticket 02), l'habillage de la carte elle-même (change 005), le
site public, tout moyen de modifier un nom.

## Critères
- [x] L'éditeur d'une page est affiché et un de ses emplacements porte le nom « Présentation » déclaré par l'intégrateur : cet emplacement se présente par sa nature suivie de son nom (« Texte riche — Présentation »), au-dessus de son contenu   (SC-03a)
- [x] L'éditeur d'une page est affiché et un de ses emplacements ne porte pas de nom : cet emplacement se présente par sa nature seule, et son identifiant n'apparaît nulle part à l'écran   (SC-03b)
- [x] L'intégrateur a donné à un emplacement un nom contenant des caractères de balisage (`<`, `>`, `&`, guillemets) : l'éditeur affiche ces caractères comme du texte, sans qu'aucune balise ne soit interprétée   (SC-03c)
- [x] L'éditrice parcourt l'éditeur d'une page dont des emplacements sont nommés : aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement, ni ne change son nom, et rien ne l'offre à l'écran   (SC-03d)
- [x] L'éditrice lit l'éditeur d'une page dont des emplacements sont nommés : aucun terme de développeur n'y paraît   (SC-03e)
