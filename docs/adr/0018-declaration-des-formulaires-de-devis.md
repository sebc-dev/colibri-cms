# ADR-0018 : La déclaration des formulaires de devis — un sous-répertoire par formulaire sous `content/formulaires/`, au format déposé, lu par `core/`
Statut : Accepté | Date : 2026-10-10

## Contexte
FR-045 fait présenter à l'éditrice la liste des formulaires posés sur le site ; FR-046 à FR-049 lui
font régler les options de leurs champs (libellé, prix, ajout, retrait) ; FR-050 lui interdit tout
geste sur les champs eux-mêmes ; FR-051 fait du formulaire un objet publiable, qui porte son
brouillon. Le **formulaire** est le troisième et dernier objet publiable du produit, après la page
(ADR-0012) et le réglage (ADR-0017).

Le change `010-reglage-des-formulaires` rend la décision nécessaire **maintenant** : son ticket qui
pose la déclaration est le premier de la chaîne, et tout l'aval la lit — le noyau `core/formulaires/`,
le magasin des brouillons, les écrans de l'éditrice. **Aucun formulaire n'existe encore** : `content/`
ne porte que `pages/` et `reglages/`, et aucun fichier ne parle de champ, d'option ni de prix.

La décision engage **au-delà de ce change**. La story suivante (« Composer et envoyer une demande de
devis ») rendra le formulaire au visiteur, calculera dans son navigateur le total de sa sélection
comme la somme des options choisies (FR-052 à FR-054) et refusera l'envoi d'un champ obligatoire vide
(FR-058) ; elle lira la même déclaration. Le format doit donc porter dès maintenant ce que cette story
consomme — la nature de chaque champ, son caractère obligatoire, le prix de chaque option — même si
ce change n'en édite qu'une partie.

La situation est celle qu'ADR-0012 et ADR-0017 ont tranchée : une **structure** que l'intégrateur
pose site par site, hors administration — quels champs, de quelle nature, dans quel ordre —, que le
produit **lit** sans jamais l'écrire, et à laquelle le brouillon porté par D1 se rattache par des
**identifiants stables**. Seul le contenu des champs à choix — leurs options, leurs libellés, leurs
prix — revient à l'éditrice. Un formulaire ne porte **aucun texte riche** : la mention d'information
qui l'accompagne est un réglage (FR-043, ADR-0017).

Deux contraintes de forme s'ajoutent. Le prix est une donnée **sommée** dans le navigateur du
visiteur : sa représentation décide si la somme est exacte. Et chaque formulaire porte **son propre**
brouillon : sa représentation déposée décide si la publication d'un formulaire touche les autres —
ADR-0017 a dû accepter, pour `reglages.json`, qu'elle les touche.

## Décision
Nous déclarerons chaque formulaire de devis dans un **sous-répertoire de `content/formulaires/`**, à
côté de `content/pages/` et `content/reglages/`, au **même format que le contenu déposé à la
publication** :

- `content/formulaires/<id>/formulaire.json`, où **`<id>`, le nom du répertoire, est l'identifiant
  stable du formulaire** ;
- le fichier porte `{ nom, champs }` : `nom` est le nom écrit pour l'éditrice (« Devis gâteau »),
  `champs` une liste **ordonnée** d'entrées `{ id, nature, libelle, obligatoire?, avecPrix?, options? }` ;
- `id` est l'identifiant stable du champ, unique dans son formulaire ; `nature` ∈ `choix-unique` |
  `choix-multiple` | `texte` | `texte-long` | `email` | `telephone` ; `obligatoire` vaut `false`
  par défaut ;
- seuls les **champs à choix** (`choix-unique`, `choix-multiple`) portent `avecPrix` (`false` par
  défaut) et `options`, une liste **ordonnée** de `{ id, libelle, prix? }`, `id` unique dans son
  champ ;
- dans un champ `avecPrix: true`, chaque option porte un **`prix` en entier de centimes d'euro**,
  de `0` à `9999999` (99 999,99 €) ; dans un champ sans prix, un `prix` d'option est ignoré.

La **lecture de cette déclaration vit dans `core/`** (`src/core/formulaires/`), sans base, sans
HTTP, sans framework (`I2`) ; une entrée mal formée est écartée à la lecture sans empêcher celle des
autres, comme pour les pages et les réglages. Le produit **lit** cette déclaration ; il ne l'**écrit
jamais** depuis l'administration. Le brouillon d'un formulaire se rattache à lui par l'identifiant du
formulaire, à ses champs par l'identifiant du champ, à ses options par l'identifiant de l'option ;
**la nature d'un champ et sa marque `avecPrix` font foi depuis la déclaration**, jamais depuis ce
qu'une soumission annonce.

C'est l'extension, à un troisième objet, d'ADR-0012 et d'ADR-0017 : même lieu (un répertoire de
contenu), même forme (celle qui sera déposée), même sens (lue, jamais écrite), même ancrage du
brouillon (les identifiants). Elle s'en écarte sur un point, à dessein : **un fichier par objet
publiable**, là où les trois réglages partagent `reglages.json`.

## Conséquences
**Positives.**
- **Un fichier, un brouillon, un objet publiable.** Publier un formulaire dépose son seul
  `formulaire.json` ; les autres formulaires ne sont ni relus ni réécrits — la règle de composition
  qu'ADR-0017 impose à `reglages.json` n'a pas d'équivalent ici.
- **La somme est exacte.** Le total du visiteur (FR-053) additionne des entiers ; aucun arrondi, aucun
  `0,1 + 0,2`, aucune ambiguïté entre virgule et point dans le fichier. Le passage en euros n'a lieu
  qu'à l'affichage.
- **Un seul patron pour trois objets.** Déclaration lue en `core/`, chargée par `import.meta.glob`
  dans `src/platform/contenu/`, brouillon D1 rattaché par les identifiants : le code des formulaires
  copie celui des pages et des réglages.
- **La story suivante lit le même fichier sans conversion** : natures, caractère obligatoire et prix
  y sont déjà.
- **La logique se teste sans plateforme** : lire la déclaration, lire un prix, rattacher un brouillon
  sont des fonctions pures de `core/`.

**Négatives — ce à quoi le code s'engage.**
- **L'intégrateur écrit des centimes à la main** : `1250` pour 12,50 €. C'est la forme la moins
  lisible des alternatives ; une faute (`12` pour 12 €) se constate à l'écran de l'éditrice, pas à la
  lecture du fichier.
- **Renommer le répertoire d'un formulaire en fait un autre formulaire** : son brouillon, rattaché à
  l'ancien identifiant, devient orphelin et est ignoré à la lecture. Le nom affiché (`nom`), lui, se
  change librement.
- **La déclaration peut changer sous un brouillon.** Un champ ou un formulaire retiré laisse au
  brouillon des options orphelines, ignorées ; un champ dont la nature ou la marque `avecPrix` ne
  s'accorde plus au brouillon retombe sur ses options de départ ; un champ à choix nouvellement
  déclaré montre ses options de départ — jamais une erreur.
- **Les identifiants d'options créées par l'éditrice sont fabriqués par le produit** (forme `o<n>`,
  jamais réattribuée dans un champ). L'intégrateur écrit des identifiants parlants (`vanille`,
  `vingt-parts`) et n'emploie pas cette forme ; **rien ne l'en empêche** — une collision rattacherait
  au brouillon une option qui n'est pas la sienne.
- **Un formulaire est un répertoire d'un seul fichier.** Le répertoire n'apporte rien aujourd'hui ; il
  tient la forme d'ADR-0012 (un répertoire par objet) et laisse place à un `.md` si un formulaire
  porte un jour un texte riche.
- **La déclaration source et la copie déposée sont deux emplacements physiques** de même forme, comme
  pour les pages et les réglages : seule la publication reporte le brouillon vers la copie déposée.

## Alternatives considérées
- **Un fichier unique `content/formulaires.json` pour tous les formulaires** : écartée car la
  publication d'un formulaire réécrirait celui des autres, en reprenant leur état publié — la
  conséquence négative qu'ADR-0017 a dû accepter pour trois réglages, ici multipliée par le nombre de
  formulaires, sans gain en échange.
- **Des prix en euros décimaux (`12.5`)** : écartée car le total du visiteur additionnerait des
  nombres à virgule flottante, et chaque lecteur — l'écran de l'éditrice, le formulaire public,
  l'e-mail de la demande — devrait arrondir de la même façon.
- **Des prix en texte (`"12,50"`)** : écartée car chaque lecteur devrait analyser un montant écrit à
  la française, virgule ou point, et une faute de saisie de l'intégrateur ne se distinguerait plus
  d'un format inattendu.
- **Le formulaire déclaré dans `page.json`, comme un emplacement** : écartée car un même formulaire
  peut être posé sur plusieurs pages — FR-067 distingue le formulaire d'origine de la page d'origine
  d'une demande — et la liste de FR-045 se déduirait alors des pages au lieu d'être une liste d'objets.
- **Les formulaires dans `content/reglages/`** : écartée car un formulaire est un objet publiable à
  part entière, avec son brouillon et sa ligne propre au récapitulatif avant publication (FR-051,
  FR-083), et non un réglage transverse.
- **Une même clé `prix` pour la marque du champ et le montant de l'option** (forme proposée par le
  design du change 010) : écartée car une clé à deux sens dans un fichier écrit à la main est une
  faute qui attend son heure ; la marque du champ s'appelle `avecPrix`.

## Vérifiable ?
Pour l'essentiel non — décision de fondation qui se constate à la revue et, pour le format déposé, à
la recette de livraison (`ARCH-1`). Le seul volet à trace mécanique est le **placement de la lecture
dans `core/` sans dépendance de plateforme**, déjà tenu par `I1` et `I2` (`boundaries`) : aucun
contrôle neuf à dériver, et **aucun invariant n'est ajouté** à la table de `docs/architecture.md`.
Une règle « aucun fichier de `src/` n'écrit sous `content/` » a été écartée : elle serait inutile
aujourd'hui — le Worker n'a pas de système de fichiers, `content/` est empaqueté au build — et fausse
demain, quand la publication déposera la copie publiée par l'API de GitHub, ce qu'`I9` encadre déjà.
L'interdiction d'écrire la déclaration depuis l'administration et la forme exacte de
`formulaire.json` relèvent de la revue.

**Modèle** : aucun delta. `content/formulaires/` relève de `colibri-cms.contenu` (`sourceDir
content`), et la lecture emprunte des relations déjà modélisées (`colibri-cms.worker.platform →
colibri-cms.contenu`, `→ colibri-cms.worker.core`) ; pas de vue `adr-0018`.
