# ADR-0017 : La déclaration des réglages transverses — un répertoire de contenu `content/reglages/` au format déposé, lu par `core/`
Statut : Accepté | Date : 2026-10-03

## Contexte
FR-041, FR-042 et FR-043 font corriger par l'éditrice trois contenus communs à tout le site : les
coordonnées de contact, les liens vers les réseaux sociaux et la mention d'information qui accompagne
les formulaires. FR-044 en fait des objets publiables : chacun porte un brouillon, sans effet sur le
site public. Le **réglage** devient ainsi le deuxième objet publiable du produit, à côté de la page.

Le change `008-reglages-transverses` rend la décision nécessaire **maintenant** : son ticket qui pose
la déclaration est le premier de la chaîne, et tout l'aval — le noyau `core/reglages/`, le magasin des
brouillons, l'écran — lit cette déclaration. Aujourd'hui, **aucun lieu n'existe** : `content/` ne
porte que `content/pages/`, et `instance.json` ne porte que les valeurs d'instance (domaine, clé
publique Turnstile, adresse d'expédition).

Les coordonnées ont une **structure** que l'éditrice ne touche pas : l'intégrateur pose, site par
site, quelles coordonnées existent, de quelle nature (texte d'une ligne, téléphone, adresse e-mail,
adresse postale), sous quel nom, dans quel ordre ; l'éditrice n'en corrige que la valeur. C'est la
même situation que les emplacements d'une page, qu'ADR-0012 a tranchée : une structure lue, jamais
écrite depuis l'administration, et une **identité stable** à laquelle le brouillon porté par D1 se
rattache. Les liens vers les réseaux, eux, forment une liste que l'éditrice compose ; la déclaration
n'en porte que la valeur de départ. La mention est un texte riche, sous les règles de liens de
`core/pages/texte-riche.ts`.

Les contraintes qui ont décidé ADR-0012 valent ici à l'identique : la déclaration est lue par
l'administration **et** par le futur rendu public, que la matrice `I1` ne fait se rencontrer qu'en
`core/` ; le site se rebâtit depuis les seuls fichiers déposés (`ARCH-1`) ; le format déposé est un
répertoire par objet, un `.md` par texte riche (candidat `format-du-contenu-un-repertoire-par-objet`).

## Décision
Nous déclarerons les réglages transverses dans un **répertoire de contenu versionné du dépôt,
`content/reglages/`**, à côté de `content/pages/`, au **même format que le contenu déposé à la
publication** :

- un **`reglages.json`** portant
  - `coordonnees` : une liste **ordonnée** d'entrées `{ id, nature, nom?, valeur }`, où `id` est un
    **identifiant stable**, `nature` ∈ `texte` | `telephone` | `email` | `adresse`, `nom` le nom écrit
    pour l'éditrice et `valeur` la valeur de départ — l'ordre est celui de la déclaration ;
  - `reseaux` : une liste **ordonnée** de `{ nom, lien }`, valeur de départ de la liste que l'éditrice
    compose ;
- un **`mention.md`** portant le texte de départ de la mention, en Markdown restreint.

La **lecture de cette déclaration vit dans `core/`** (`src/core/reglages/`), sans base, sans HTTP,
sans framework (`I2`) ; une entrée mal formée est écartée à la lecture, comme pour la déclaration des
pages. Le produit **lit** cette déclaration ; il ne l'**écrit jamais** depuis l'administration. Le
brouillon d'une coordonnée se rattache à elle par son **identifiant stable** ; sa **nature fait foi
depuis la déclaration**, jamais depuis ce qu'une soumission annonce.

C'est l'extension, à un nouvel objet, d'ADR-0012 : même lieu (un répertoire de contenu), même forme
(celle qui sera déposée), même sens (lue, jamais écrite), même ancrage du brouillon (l'identifiant).

## Conséquences
**Positives.**
- **Source et format déposé sont une seule forme.** La publication des réglages déposera la même
  arborescence sans conversion, et la reconstruction (`ARCH-1`) la relit telle quelle.
- **Un seul patron pour deux objets.** Déclaration lue en `core/`, lecture plateforme par
  `import.meta.glob` dans `src/platform/contenu/`, brouillon D1 rattaché par l'identifiant : le code
  des réglages copie celui des pages au lieu d'inventer.
- **Le texte de la cliente reste du texte.** La mention est un `.md` lisible dans un `git diff`, comme
  un emplacement de texte riche.
- **La logique se teste sans plateforme** : lire la déclaration, vérifier une nature, rattacher un
  brouillon sont des fonctions pures de `core/`.

**Négatives — ce à quoi le code s'engage.**
- **Coordonnées et liens partagent un fichier, pas un brouillon.** Les trois réglages ont des
  brouillons indépendants (une ligne par réglage en D1), mais coordonnées et réseaux sont déposés dans
  le même `reglages.json` : la publication d'un seul des deux réécrit ce fichier commun, en reprenant
  l'état publié de l'autre. La publication doit composer le fichier entier, jamais le reconstruire
  depuis le seul réglage publié.
- **La cohérence `reglages.json` ↔ `mention.md` est une convention du produit**, comme `page.json` ↔
  ses `.md` (ADR-0012) ; rien dans les fichiers ne la garantit.
- **La déclaration peut changer sous un brouillon.** Une coordonnée retirée ou renommée par
  l'intégrateur laisse au brouillon une valeur orpheline : elle est ignorée à la lecture, jamais une
  erreur ; une coordonnée nouvellement déclarée sans valeur au brouillon garde sa valeur de départ.
- **L'intégrateur écrit du JSON à la main**, sans outil de saisie ; une faute de forme se constate à
  la lecture par le produit.
- **La déclaration source et la copie déposée sont deux emplacements physiques** de même forme :
  corriger l'une ne corrige pas l'autre — seule la publication reporte le brouillon vers la copie
  déposée.

## Alternatives considérées
- **Les réglages dans `instance.json`** : écartée car ADR-0005 et `I8` réservent ce fichier aux valeurs
  d'instance, fixées à l'installation ; un réglage est un **contenu éditorial** qui porte un brouillon
  et passe par la publication.
- **Une « page » fictive `content/pages/reglages/`** : écartée car la liste des pages la montrerait à
  l'éditrice, et les natures des coordonnées (téléphone, adresse e-mail, adresse postale) n'existent
  pas chez les emplacements — il faudrait les y ajouter pour un seul usage.
- **Un fichier par réglage** (`coordonnees.json`, `reseaux.json`, `mention.md`) : écartée. Elle
  aligne un fichier sur un brouillon et laisse publier un réglage sans toucher l'autre, mais elle
  s'écarte de la forme d'ADR-0012 (un fichier de structure par objet, un `.md` par texte riche) et
  multiplie les fichiers de structure pour un objet qui reste unique côté site ; le coût d'un fichier
  commun se borne à la règle de composition notée en conséquence.
- **Des réglages sans déclaration, posés en dur dans le produit** : écartée car les coordonnées varient
  site par site et sont posées par l'intégrateur ; les écrire dans le code ferait d'un contenu une
  constante du produit.

## Vérifiable ?
Pour l'essentiel non — décision de fondation qui se constate à la revue et, pour le format déposé, à
la recette de livraison (`ARCH-1`). Le seul volet à trace mécanique est le **placement de la lecture
dans `core/` sans dépendance de plateforme**, déjà tenu par `I1` et `I2` (`boundaries`) : aucun
contrôle neuf à dériver. L'interdiction d'écrire la déclaration depuis l'administration et la forme
exacte (`reglages.json` + `mention.md`) relèvent de la revue.
