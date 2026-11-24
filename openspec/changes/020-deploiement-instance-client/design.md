## Context

Voir `proposal.md` § Why pour la motivation. État relevé le 2026-11-15, dans le code puis dans la
documentation des plateformes.

**Dans le dépôt**

- **Le fichier d'instance** `instance.json` porte `domain`, `senderAddress`, `compteCloudflare`,
  `depotDePublication` (facultatif) et `turnstilePublicKey`, que plus rien ne lit depuis l'ADR-0028.
  Son seul lecteur est `astro.config.ts` (lignes 70 à 98), qui valide à la main chaque champ sauf
  `domain`, et injecte trois constantes (`__ADRESSE_EXPEDITEUR__`, `__DEPOT_DE_PUBLICATION__`,
  `__COMPTE_CLOUDFLARE__`). Un champ inconnu passe sans bruit.
- **La configuration de déploiement** tient en deux fichiers, `wrangler.astro.jsonc` (lu par Astro)
  et `wrangler.jsonc` (tests). Aucun ne porte d'identifiant de compte, de base ni de domaine. La
  construction produit `dist/server/wrangler.json`, et `.wrangler/deploy/config.json` y renvoie :
  un `wrangler deploy` lancé à la racine déploie donc cette configuration **produite**, pas les
  fichiers versionnés (constaté sur le `dist/` local).
- **L'outillage de recette** (`.claude/skills/recette/scripts/recette.mjs`) est le seul chemin de
  déploiement existant. Il dérive `dist/server/wrangler.recette.json` (nom, domaine, base), applique
  les mises à niveau de la base à distance, sème l'adresse autorisée
  (`insert … where not exists`). Sa commande `depot` prépare un dépôt de recette, mais **réécrit les
  deux fichiers `wrangler`** pour y loger l'identifiant de la base, parce que la construction de
  Cloudflare ne connaît pas la configuration dérivée.
- **Les secrets du Worker** sont `JETON_DEPOT` et `JETON_ADRESSES_EMAIL`, tous deux facultatifs.
  La construction lit en plus `COLIBRI_CLE_LECTURE_DEPOT` pour atteindre la branche `media` d'un
  dépôt privé (`scripts/recuperer-images-publiees.mjs`).
- **`wrangler` 4.129 (la version du verrou) retrouve une base par son nom.** Sans `database_id`,
  la mise à niveau passe par `getDatabaseByNameOrBinding`, et le déploiement rattache la base
  existante du même nom (approvisionnement par défaut). Autre fait relevé dans son code :
  `wrangler d1 migrations apply` ne suit pas le renvoi de `.wrangler/deploy/config.json` ; lancé à
  la racine, il lit `wrangler.jsonc`.
- **Rien n'est programmé** : aucun déclencheur, aucun point d'entrée `scheduled`. L'ADR-0021 décide
  pourtant un appel hebdomadaire qui maintient la clé d'écriture en vie, « posé par la livraison ».
- **Aucun workflow ne déploie** (`docs/ci.md`). Le cahier de recette écarte SC-012 et SC-013 : « le
  compte est celui de l'opérateur » (`docs/cahier-de-test.md:20-25`).

**Sur les plateformes** (documentation officielle lue le 2026-11-15 ; « à constater » marque ce que
la documentation ne dit pas)

- **Workers Builds n'accepte qu'une clé d'utilisateur** : « Currently, only user tokens are
  supported ». Une clé d'utilisateur cesse de fonctionner quand son créateur est retiré du compte
  (écrit pour R2, impliqué ailleurs). Une clé de construction créée par l'intégrateur casserait donc
  la publication à son départ.
- **Le raccordement d'un dépôt** liste, depuis le 2026-11-10, les seuls dépôts de l'utilisateur
  GitHub qui raccorde : un dépôt personnel du client ne peut être raccordé que par le client.
- **Une clé GitHub à portée fine** peut être sans expiration, n'agit que sur les dépôts de son
  créateur, et devient inactive si celui-ci perd l'accès. Elle est révoquée après un an sans usage.
- **Les clés Cloudflare « du compte »** survivent au départ de leur créateur. La documentation ne
  confirme pas qu'elles acceptent la permission « Email Routing Addresses » : à constater.
- **L'envoi d'e-mails** exige un domaine géré par le DNS Cloudflare du compte, Email Routing activé,
  un expéditeur dans ce domaine et un destinataire vérifié. Une adresse `workers.dev` ne suffit pas.
- **Gratuit** : Workers (100 000 requêtes par jour, 20 000 fichiers par version), D1 (500 Mo par
  base), Workers Builds (3 000 minutes par mois, une construction à la fois), Email Routing, l'envoi
  vers une adresse vérifiée. Aucune page ne dit explicitement « sans carte » : à constater.
- **Les secrets d'un Worker** survivent aux déploiements et ne se relisent pas.

## Goals / Non-Goals

**Goals :**
- Un tiers met en service une instance en suivant un document, sans connaissance orale.
- Deux dépôts de clients ne diffèrent que par `instance.json` et `content/`.
- Aucun objet de l'instance ne dépend de l'identité de l'intégrateur ; c'est éprouvé, pas supposé.
- La clé d'écriture ne meurt pas d'inactivité, et son maintien laisse une trace.
- Un inventaire qui se produit, plutôt qu'un inventaire qui se rédige de mémoire.

**Non-Goals :**
- Passer une instance en service à une nouvelle version, et prouver qu'elle n'y perd rien (story
  suivante). Ce design ne fait que ne pas l'empêcher.
- Le dossier d'instance et son rangement chez le client ; la reconstruction sans le CMS.
- Créer les comptes par une API, ou tout automatiser. Les gestes d'identité restent manuels : ce sont
  eux qui doivent se faire dans la session du client.
- Détecter que l'appel hebdomadaire a cessé (ADR-0021 l'assume) ; alerter qui que ce soit.
- Plusieurs instances dans un même compte, des environnements d'aperçu chez le client.

## Decisions

### D1 — Deux comptes au nom du client, et une règle : l'identité, c'est le client

Une instance vit dans deux comptes ouverts avec l'adresse du client : un compte Cloudflare, dont le
client est Super Administrateur, et un compte GitHub, propriétaire du dépôt. L'intégrateur y est
**membre** (Cloudflare) et **collaborateur** (GitHub), rien de plus. Le nom de domaine est géré par
le DNS du compte Cloudflare du client (ADR-0002).

La règle : **tout objet dont le fonctionnement dépend de son créateur se crée dans une session du
client.** Quatre objets sont dans ce cas.

| Objet | Où il vit | Créé dans la session |
|---|---|---|
| Clé du dépôt (`JETON_DEPOT`) : portée fine, ce seul dépôt, `Contents: Read and write`, sans expiration | secret du Worker | GitHub du client |
| Clé des adresses (`JETON_ADRESSES_EMAIL`) : « Email Routing Addresses Edit » | secret du Worker | Cloudflare du client |
| Clé de construction : celle que Workers Builds crée par défaut au raccordement | Workers Builds | Cloudflare du client |
| Raccordement du dépôt à Workers Builds, et l'application GitHub de Cloudflare | les deux comptes | les deux, du client |

**La construction n'emploie aucune clé du dépôt.** Constaté le 2026-11-18 sur la recette
(`constats/02-construction-dans-le-compte.md`) : sur un dépôt privé, sans aucun secret de
construction, elle récupère la branche `media`. Le clone que fait Workers Builds garde l'accès que
lui donne l'application GitHub de Cloudflare. Il n'y a donc ni clé de lecture séparée, qui serait
morte après un an sans publication, ni clé d'écriture confiée à la construction.
`COLIBRI_CLE_LECTURE_DEPOT` reste lue par le script, sans emploi à la livraison. C'est un écart avec
le candidat `cible-de-deploiement-worker-unique-workers-builds`, qui prévoyait une clé
`Contents: Read-only` ; il est à écrire dans l'ADR qui le promeut. La lecture de `media` dépend en
revanche du raccordement : c'est l'objet d'identité de la dernière ligne.

**Le nom de domaine** est acheté par le client chez un bureau d'enregistrement, hors du compte
Cloudflare, puis délégué au DNS de ce compte. Aucun achat ni renouvellement ne se fait dans le compte
Cloudflare : il y enregistrerait un moyen de paiement (SC-001). Le compte du bureau d'enregistrement
est un troisième compte du client ; il entre à l'inventaire. Son coût annuel est un prérequis du
client, comme sa boîte e-mail (voir `proposal.md`, point 5).

Tout le reste (le Worker, la base, la zone DNS, la ligne de l'adresse autorisée, le contenu du
dépôt) n'est attaché à personne : l'intégrateur membre peut le créer.

Qui tient le clavier n'est pas l'objet de la règle. La vision veut que l'éditrice ne visite aucun
compte (SC-006) et l'ADR-0032 qu'elle soit présente à la livraison : l'intégrateur opère les sessions
du client en sa présence, et les moyens d'accès à ces comptes lui restent. Où ils sont rangés relève
du dossier d'instance.

*Écarté.* Un compte Cloudflare créé depuis l'utilisateur de l'intégrateur, puis cédé : le compte
reste rattaché à l'intégrateur tant qu'un autre Super Administrateur n'existe pas, et l'offre
« partenaire » exige un contrat. Une clé « du compte » pour la construction : pas encore acceptée par
Workers Builds. Transférer un dépôt créé chez l'intégrateur : l'ancien propriétaire reste
collaborateur, et le sort du raccordement n'est pas documenté.

**Conforme à** SEC-3, ADR-0021 (clé à portée fine, un dépôt), ADR-0033 (clé limitée aux adresses).
**ADR-0035**, accepté le 2026-11-18, fixe la règle des identités avec la cible de déploiement.

### D2 — Le dépôt du client : le produit, plus `instance.json` et `content/`

Le dépôt du client est privé. Il reçoit les fichiers d'une version du produit (`git archive` d'une
étiquette) qui servent à construire le site. N'y entrent pas : `.github/` (la publication n'y écrit
jamais, I9 et ADR-0025 ; aucune automatisation de la forge n'est nécessaire, et FR-102 préfère qu'il
n'y en ait pas) ; `.claude/`, `openspec/`, `docs/`, `recette/`, `CLAUDE.md`, qui sont l'outillage et
les documents de travail de l'intégrateur et portent ses identifiants (`colibri.sebc.dev`). La liste
des exclusions est une constante de l'outil. Le dépôt porte en plus son `instance.json` et son
`content/`. Ce que la reconstruction sans le CMS devra y trouver comme documentation relève de sa
story (FR-109).

La commande `depot` de l'outil de livraison généralise celle de la recette, avec deux différences :
elle ne réécrit aucun fichier `wrangler` (D3 le rend inutile), et, rejouée avec la même version,
elle ne touche ni à `content/` ni à la branche `media`. La rejouer avec une autre version est une
montée de version : cela relève de la story FR-105. Elle amorce `media` avec les images que le contenu de départ
désigne, sans quoi la première construction échoue sur une image absente.

Avant d'écrire quoi que ce soit, elle applique la lecture structurelle du fichier d'instance, celle
de la construction. Le contrôle complet (`controler`, D8) reste un geste distinct, joué après.

*Écarté.* Un dépôt public : plus de clé de lecture, mais le contenu, les réglages et tout
l'historique des publications deviennent publics. Un « fork » : il rattache le dépôt du client à
celui de l'intégrateur. Le bouton « Deploy to Cloudflare » : il exige un dépôt public et ne sait ni
l'e-mail ni les mises à niveau de la base.

### D3 — Le domaine est dérivé de `instance.json` ; la base se rattache par son nom

`instance.json` ne gagne aucun champ. Il en perd un, `turnstilePublicKey`. Ses quatre champs sont
`domain`, `senderAddress`, `depotDePublication`, `compteCloudflare`.

Un script, joué en fin de construction (`postbuild`), lit `instance.json` et complète
`dist/server/wrangler.json`, que `wrangler deploy` emploie par le renvoi de
`.wrangler/deploy/config.json` :

- `routes` ← `[{ pattern: <domain>, custom_domain: true }]` ;
- `workers_dev: false`, `preview_urls: false`.

Il le fait toujours, y compris dans le dépôt du produit, où le domaine est celui d'exemple : personne
ne déploie cette configuration-là, et les tests emploient `wrangler.jsonc`.

**Le serveur de recette déploie cette configuration telle quelle.** Arbitré le 2026-11-21, à la
review du ticket de la dérivation : rien ne pose de valeur de recette par-dessus. Le serveur
principal de recette est donc une instance comme celle d'un client, Worker `colibri-cms` et base
`colibri`, adresse par défaut et aperçus fermés. `preview_urls: false` coupe toutes les adresses
d'aperçu du Worker déployé, alias compris : les aperçus de branche et les variantes du site factice
vivent sur un second Worker du compte de recette, `colibri-recette`, sans domaine, lié à la même
base. Ce second Worker n'appartient qu'à l'outillage de recette ; aucun client n'en a.

*Écarté.* Faire réécrire par `depot` le nom du Worker et de la base : le dépôt de recette garderait
des fichiers `wrangler` propres, ce que cette décision supprime. Donner à la recette son propre
fichier de configuration : sa commande de mise en ligne ne serait plus celle d'un client, alors que
la recette est le seul endroit où cette commande s'exerce.

**La base n'a d'identifiant nulle part.** Elle s'appelle `colibri` dans chaque compte, comme le
Worker s'appelle `colibri-cms` : un compte ne porte qu'une instance. `wrangler` la retrouve par ce
nom, à la mise à niveau comme au déploiement (voir Context). Les fichiers versionnés restent donc
exactement ceux d'aujourd'hui, et l'ADR-0005 n'est pas touché : le rattachement D1 reste une liaison
de la configuration du déploiement. **Constaté le 2026-11-16 sur le compte de recette**
(`constats/01-base-rattachee-par-son-nom.md`) : sans identifiant, la mise à niveau applique les 17
fichiers sur la base `colibri`, le déploiement s'y rattache, le Worker y écrit, aucune seconde base
n'est créée, et le compte refuse deux bases du même nom. Sans base, la mise à niveau échoue en la
nommant et ne crée rien.

La lecture et la validation du fichier d'instance quittent `astro.config.ts` pour un module unique de
`src/platform/instance/`, à côté de `expediteur.ts`, que la configuration Astro, le script de
dérivation et le contrôle (D8) emploient tous les trois. Le script n'ajoute ni ne retire aucune
liaison.

*Écarté.* Écrire le domaine dans les deux fichiers `wrangler` du dépôt du client, comme la recette le
fait : trois fichiers diffèrent alors chez chaque client au lieu d'un, et toute version qui touche à
un fichier `wrangler` entre en conflit dans chaque dépôt (FR-105). Les variables de construction de
Workers Builds, voie que l'ADR-0005 laissait « inexplorée » : elles créent un cinquième lieu, saisi à
la main dans un tableau de bord et invisible du dépôt, pour une valeur que `instance.json` porte déjà.

**Conformité.** ADR-0005 respecté tel quel. L'invariant candidat I8 (« les valeurs d'instance ne
figurent que dans `instance.json` ») s'étend aux quatre champs réels. Le candidat
`invariant-i10-restreint-a-la-configuration-astro` disait la configuration de déploiement hors de
portée du fichier d'instance : la configuration **effective** en dérive désormais le domaine.
**ADR-0034**, accepté le 2026-11-18, reprend `valeurs-d-instance-dans-le-fichier-d-instance` dans sa
forme à quatre champs, remplace ce candidat, promeut `I8`, retire `I10` et crée `I19`.

### D4 — Une commande de mise en ligne, jouée par Workers Builds dans le compte du client

`package.json` gagne `mise-en-ligne` :
`wrangler d1 migrations apply DB --remote && wrangler deploy`.

Workers Builds, raccordé à la branche `main` du dépôt du client, joue `npm run build` puis
`npm run mise-en-ligne`. Les aperçus de construction sont désactivés. La branche `media` ne déclenche
rien (FR-089). Le `&&` garantit qu'une mise à niveau en échec ne déploie rien. `wrangler` tient le
compte des mises à niveau déjà appliquées : rejouer la commande sur une base à niveau n'écrit rien.
La mise à niveau lit `wrangler.jsonc`, à la racine, qui désigne la base par son nom (D3). La base
doit exister avant la première construction : c'est le geste `base` de l'outil (D5).

Cet ordre a une conséquence pour plus tard : entre les deux temps, la version en ligne tourne sur une
base déjà mise à niveau, et une mise à niveau interrompue laisse la base à un niveau intermédiaire.
Chaque mise à niveau future doit donc rester lisible par la version précédente. À une première mise
en service, il n'y a pas de version précédente ; la règle est à arbitrer par la story FR-105/106.

La même commande sert la première mise en service, chaque publication de l'éditrice, et plus tard
chaque nouvelle version. Aucun poste de l'intégrateur n'a besoin d'atteindre la base.

**Constaté le 2026-11-18 sur la recette** (`constats/02-construction-dans-le-compte.md`) : la clé
que Workers Builds crée par défaut suffit. Avec elle, la construction a appliqué une mise à niveau
d'essai sur la base, puis déployé ; une mise à niveau fautive n'a rien déployé, n'a pas été inscrite,
et la construction suivante a abouti. Hors terminal interactif, `wrangler` répond oui de lui-même à
sa question de confirmation. Aucune clé sur mesure n'est donc à créer. La documentation de Cloudflare
ne liste pas D1 parmi les droits de cette clé : le constat est à refaire à la répétition de
l'épreuve, sur un compte neuf, où la clé sera créée à neuf.

Workers Builds crée le Worker à la première construction. Les secrets du Worker se posent après, et
ils sont facultatifs : entre-temps, la publication se refuse en le disant (capacité `publication`).

**Conforme au** candidat `cible-de-deploiement-worker-unique-workers-builds` et au candidat
`acces-aux-donnees-api-d1-native-et-migrations-wrangler` (« rejouées à chaque déploiement »).
**L'ADR-0035 promeut le premier**, amendé.

### D5 — L'outil de livraison : cinq gestes, aucun sur une identité

`scripts/livraison.mjs`, lancé depuis un clone du produit, sur le poste de qui livre :

| Geste | Effet | Accès employé |
|---|---|---|
| `controler <dépôt> [--proscrire a,b,…]` | D8. Ne modifie rien. | aucun |
| `depot <dépôt> --version <étiquette> --instance <fichier>` | D2 | git local |
| `base` | crée la base `colibri` si le compte n'en a pas | `wrangler`, membre |
| `semer <adresse>` | D6 | `wrangler`, membre |
| `inventaire <adresse du client>` | D9 | `wrangler`, membre |

L'outil ne pose aucun secret : les clés se créent dans le navigateur, session du client, et se
collent dans le tableau de bord du compte du client, même session. Leur valeur ne passe ni par un
terminal ni par le poste de l'intégrateur. L'outil n'a aucun geste sur le code de secours.

L'outil ne lit aucun fichier d'environnement : le compte visé est celui de `compteCloudflare` dans
l'`instance.json` du dépôt du client, passé à `wrangler` par `CLOUDFLARE_ACCOUNT_ID`. Un `wrangler`
connecté à un autre compte échoue au lieu d'écrire au mauvais endroit.

La logique décidable (contrôle, composition de l'inventaire, forme d'une adresse) vit en TypeScript
sous `src/` et se teste ; le script n'est qu'une enveloppe qui lit des fichiers et appelle `wrangler`.

L'outillage de recette est ramené sur ce chemin : sa commande `depot` cesse de réécrire les fichiers
`wrangler`, et refuse de composer le dépôt si le Worker ou la base de recette ne portent pas les
noms du produit (D3). Le serveur de recette a pris ces noms le 2026-11-21.

### D6 — Le premier semis : une ligne, seulement si la table est vide

`semer` valide la forme de l'adresse avec la fonction que la connexion emploie déjà, lit la table
`adresses_autorisees`, puis :

- table vide → `insert` ;
- la même adresse déjà en place → rien, et il le dit ;
- une autre adresse en place → refus, sans écrire.

La lecture puis l'écriture ne sont pas atomiques. Peu importe : `adresse` est unique en base, et
l'outil est joué par une personne, une fois. L'adresse doit d'abord être une destination vérifiée du
compte (le clic de l'éditrice dans sa boîte) ; la preuve en est le premier code de connexion reçu.

*Écarté.* Une adresse initiale dans `instance.json`, semée par la mise en ligne : l'ADR-0005 a logé
l'adresse autorisée en base pour qu'elle se remplace depuis l'administration, et un fichier qui la
porterait aussi mentirait après le premier remplacement. Une route d'amorçage dans le produit : une
surface publique de plus, ouverte le temps qu'une instance n'a pas d'adresse.

### D7 — L'appel hebdomadaire : un déclencheur, un point d'entrée, une trace

Les deux fichiers `wrangler` gagnent `triggers: { crons: ["17 4 * * 1"] }` (le lundi à 4 h 17 UTC),
identique partout : c'est une liaison de plateforme (ADR-0005). Le Worker gagne un point d'entrée
`scheduled`, qui appelle une fonction de `src/platform/publication/` : une lecture de la référence
`main` du dépôt, par l'adaptateur de la forge existant, avec `JETON_DEPOT`. Aucune écriture, aucun
accès à la base.

La trace suit le patron de `[publication] dépôt non abouti` (change 019) : une ligne
`[maintien] clé du dépôt` avec `issue` parmi `acceptee`, `acces-refuse`, `depot-introuvable`,
`depot-injoignable`, `depot-non-configure`. Jamais la clé. Les journaux de la plateforme sont déjà
activés (`observability`).

**Première chose à établir dans le ticket** : comment `@astrojs/cloudflare` 14 expose un point
d'entrée `scheduled`. Le commentaire de `wrangler.astro.jsonc` rapporte qu'un champ `main` fait bâtir
Astro depuis lui : c'est la piste, un fichier d'entrée qui réexporte le gestionnaire d'Astro et
ajoute `scheduled`. Si l'adaptateur ne le permet pas, le ticket s'arrête et le dit ; aucun
contournement par une route publique (FR-097).

*Écarté.* Une route appelée par un service extérieur : un traitement hors des comptes du client
(FR-102). Profiter d'une visite de l'administration : une éditrice absente un an est le cas visé.

**Conforme à** ADR-0021, qui a déjà décidé ce déclencheur ; I9 (rien sous `.github/`) ; le budget de
50 sous-requêtes (un seul appel).

### D8 — Le contrôle d'instance : trois familles de refus

Une fonction pure reçoit le contenu d'`instance.json`, la liste des fichiers versionnés avec leur
texte, et la liste des identifiants à proscrire. Elle rend une liste de refus.

1. **Le fichier d'instance** : les quatre champs présents et bien formés ; aucun champ inconnu ; aucune
   valeur d'exemple du produit (`exemple.colibri.test`, le compte `0123…cdef`, un domaine réservé
   `.test`, `.example`, `example.com`, `example.org`) ; l'adresse d'expéditeur dans le domaine de
   l'instance ou l'un de ses sous-domaines.
2. **Les identifiants proscrits** : recherche sans égard à la casse dans tout fichier versionné du
   dépôt du client. La liste vient de la ligne de commande, jamais d'un fichier : le contrôle n'en
   ouvre aucun pour la composer.
3. **Les secrets** : les formes connues de clé (`github_pat_…`, `ghp_…`, et les préfixes de clé
   Cloudflare en vigueur) dans tout fichier versionné. Le refus nomme le fichier et la ligne.

La construction (D3) applique le premier point dans sa partie structurelle : champ inconnu ou mal
formé. La complétude et les valeurs d'exemple ne sont exigées que par le contrôle, parce que le
dépôt du produit doit continuer de se construire avec ses valeurs d'exemple.

Ce contrôle donne enfin une vérification mécanique, partielle, à « aucun secret dans le fichier
d'instance », que l'ADR-0005 laissait à la recette (`docs/architecture.md:133-135`).

### D9 — L'inventaire : composé depuis une liste déclarée, confronté à l'instance

Le produit déclare en un lieu la liste de ce qu'une instance porte : chaque liaison, chaque secret
d'exécution, chaque secret de construction, chaque raccordement, chaque compte. Chaque entrée dit son
lieu (parmi les quatre de l'ADR-0005, plus « Workers Builds » et « compte »), sa portée attendue, et
le geste que son absence refuse. Un test statique vérifie que tout nom lu sur `env` dans `src/`, et
toute variable lue par les scripts de construction, figure dans cette liste : un secret ajouté plus
tard entre à l'inventaire ou fait rougir un test.

`inventaire` confronte cette liste à ce que `wrangler` observe (noms des secrets posés, base
rattachée, déclencheur, domaine) et écrit un fichier Markdown daté : une ligne par entrée, avec
« posé », « absent » ou « inconnu du produit ». Deux colonnes restent à la main de qui livre, parce
qu'aucune API ne les donne : « au nom de », et « où la valeur est rangée ». Ce sont des constats, pas
des preuves : la preuve de la règle des identités est l'épreuve de révocation (D10). Le format n'a
aucun champ de valeur ; l'outil ne lit aucune valeur (la plateforme n'en rend pas).

L'inventaire porte aussi les personnes qui ont accès : les membres du compte Cloudflare et les
collaborateurs du dépôt, relevés par l'API quand la connexion de qui livre le permet, sinon recopiés
depuis la session du client, et il marque « à retirer » chacun de ceux qui ne sont pas le client.
La plateforme rend les membres du compte par leur adresse, le dépôt rend ses collaborateurs par leur
nom de compte : le client se reconnaît donc par deux identités. Son nom de compte du dépôt se lit
dans `depotDePublication` ; son adresse sur le compte de la plateforme est donnée au geste par qui
livre (`inventaire <adresse du client>`, comme `semer <adresse>`), et ne rejoint pas le fichier
d'instance. Le geste refuse une adresse absente ou mal formée avant toute lecture. Il
est produit **avant** le retrait des accès : après, plus aucune connexion de l'intégrateur ne peut le
produire. Ce qui se constate après le retrait se constate dans une session du client.

Le fichier n'est versionné nulle part par ce change. Il rejoint les preuves de la recette de
livraison ; le dossier d'instance (story suivante) dira où il se range chez le client.

### D10 — La procédure et l'épreuve : `docs/livraison.md`, et une section du cahier

`docs/livraison.md` est le document de l'intégrateur. Il donne, dans l'ordre : les prérequis (nom de
domaine, adresse du client, présence de l'éditrice), puis chaque geste avec sa session.

1. *Session du client* — ouvrir les deux comptes ; inviter l'intégrateur ; passer le domaine au DNS
   Cloudflare ; activer Email Routing ; vérifier l'adresse de destination.
2. *Intégrateur* — `base`, `depot`, `controler`, pousser `main` et `media`.
3. *Session du client* — créer la clé du dépôt et la clé des adresses ; installer l'application et
   raccorder le dépôt, ce qui crée la clé de construction ; régler la commande de mise en ligne.
4. Première construction, constatée en ligne. *Session du client* — poser les deux secrets du Worker.
5. *Intégrateur* — `semer`. *Éditrice* — première connexion, création du code de secours.
6. *Intégrateur* — `inventaire`, puis l'épreuve, qui commence par le retrait de chaque accès que
   l'inventaire marque « à retirer », des adresses de destination de test, et par `wrangler logout`.

**L'épreuve** entre au `docs/cahier-de-test.md`, section « Livraison ». Elle retire le membre
Cloudflare, le collaborateur GitHub et la connexion `wrangler` du poste, puis joue : une page
publique, une connexion par code, une correction publiée et vue en ligne, une demande envoyée, un
passage de l'appel hebdomadaire (déclenché à la main depuis le compte du client), puis, dans une
session du client, la liste des membres et celle des collaborateurs sans aucun de ceux que
l'inventaire marquait « à retirer », et la page de facturation sans moyen de paiement. Elle est jouée
à chaque livraison.

Elle ne peut pas se jouer sur `colibri.sebc.dev`. Elle exige des comptes qui ne sont pas ceux de
l'opérateur, et un nom de domaine dans le compte Cloudflare (D1). Arbitré le 2026-11-16 : elle est
d'abord jouée en répétition, sur deux comptes témoins et un nom de domaine que l'humain fournit,
avant la livraison du premier client.

## Architecture

**Éléments touchés (FQN) :**

- `colibri-cms.worker.platform` — module d'instance (lecture, contrôle, liste d'inventaire) ; appel
  de maintien en vie dans la publication.
- `colibri-cms.worker.routes` — le point d'entrée `scheduled`, surface d'entrée du Worker au même
  titre que les routes. À confirmer par le ticket de D7 : si le fichier d'entrée vit hors de
  `src/pages/`, le modèle gagne un élément, écrit dans le `.c4` par ce ticket.
- `colibri-cms.d1` — aucune table nouvelle ; la mise à niveau passe désormais par la mise en ligne.
- `github`, `workers-builds`, `email-routing` — inchangés comme éléments.
- `integrateur` — une relation d'accès révocable vers les comptes du client, à modéliser.

**Relations ajoutées / retirées :**

- `workers-builds -[async]-> colibri-cms.d1 'met la base au niveau de la version'` (D4), dans
  `docs/architecture/context.c4`, par le ticket de la mise en ligne.
- `integrateur -> workers-builds` et `integrateur -> github`, étiquetées « accès de membre et de
  collaborateur, retiré à la livraison » (D1), dans `context.c4`, par le ticket de la procédure.
- Le déclencheur hebdomadaire comme source du point d'entrée programmé (D7), par le ticket de D7.
  `colibri-cms.worker.platform -[sync]-> github` existe déjà et porte l'appel lui-même.
- `docs/architecture/deployment.c4` gagne un environnement `production` (« Comptes du client »), avec
  un nœud pour le Worker et un pour la base, et sa vue ; le commentaire « Aucune production n'est
  encore déployée » est mis à jour. Par le ticket de la procédure.

Chaque ticket concerné liste son `.c4` dans ses fichiers et joue
`likec4 validate --no-layout --json --project colibri-cms docs/architecture`.

**Invariants.** ADR-0034 promeut I8, retire I10 et crée I19 ; l'ADR-0005 reste tel quel. I9 et I18 sont
respectés tels quels. Aucun invariant promu n'est franchi.

## Risks / Trade-offs

- [La clé de construction par défaut n'a pas, sur un compte neuf, le droit qu'elle a sur la recette] →
  constat refait à la répétition de l'épreuve ; sinon, une clé d'utilisateur du client avec le droit
  sur D1, créée dans sa session.
- [La permission des adresses n'existe pas en clé « du compte »] → clé d'utilisateur du client : elle
  ne dépend pas de l'intégrateur non plus. L'inventaire note laquelle des deux.
- [L'adaptateur Astro ne laisse pas exporter `scheduled`] → le ticket de D7 s'arrête et rend la main ;
  l'ADR-0021 serait alors à amender. Les autres tickets n'en dépendent pas.
- [L'appel hebdomadaire s'arrête sans que personne le voie] → assumé par l'ADR-0021. La trace datée
  permet au moins de le constater lors d'une visite ; rien n'alerte.
- [Le script de dérivation dépend de la forme de `dist/server/wrangler.json`, produite par
  l'adaptateur] → il échoue bruyamment s'il n'y trouve pas ce fichier ou la liaison `DB` ; un test le
  joue sur une construction réelle.
- [Un `instance.json` strict casse une instance existante au passage de version] → aucune instance de
  client n'existe ; le dépôt de recette est mis à jour par le ticket qui retire `turnstilePublicKey`.
- [Les valeurs de clés passent par le presse-papiers du poste qui opère la session du client] →
  inévitable tant qu'une personne les crée ; la procédure demande une fenêtre privée fermée à la fin.
- [La base se rattache par son nom : une seconde base `colibri` dans le compte tromperait l'outil] →
  un compte ne porte qu'une instance ; `base` refuse d'en créer une seconde ; constat sur la recette.
- [La lecture de `media` par la construction tient au raccordement du dépôt] → c'est déjà un objet
  d'identité créé dans la session du client ; l'épreuve de révocation publie une image.
- [Quatre clés et raccordements au nom du client, tous sans rotation] → c'est la dette que l'ADR-0021
  nomme déjà ; l'inventaire la rend au moins visible.
- [La gratuité « sans carte » n'est écrite nulle part] → constatée à l'épreuve, capture conservée.

## Migration Plan

1. Les ADR-0034 et ADR-0035 sont posés le 2026-11-18, avant les tickets. Ils ont déjà écrit dans le
   modèle les relations et l'environnement `production` décrits en § Architecture, marqués
   `#planned` : les tickets retirent la marque en posant le code.
2. Trois constats sur la recette ont précédé les tickets : la base rattachée par son nom (D3,
   2026-11-16), la mise à niveau jouée par la construction (D4) et la branche `media` atteinte sans
   clé (D1), tous deux le 2026-11-18. Le fichier d'instance strict et la dérivation
   arrivent ensuite ; l'outillage de recette suit dans
   le même ticket, pour que `colibri.sebc.dev` se rebâtisse.
3. La commande de mise en ligne est en place sur le serveur de recette depuis le 2026-11-18 ; le
   ticket de la mise en ligne l'inscrit dans `package.json` et corrige `SKILL.md` de la recette.
4. L'appel hebdomadaire est déployé sur la recette et déclenché une fois à la main.
5. L'épreuve de révocation est jouée selon l'arbitrage du point 4 du proposal.

Retour arrière : chaque étape est additive. Retirer le script de dérivation du `postbuild` rend la
configuration d'avant ; retirer le déclencheur des fichiers `wrangler` arrête l'appel.

## Open Questions

- **Quel rôle de membre suffit à l'intégrateur chez Cloudflare** pour `base`, `semer` et
  `inventaire` ? Administrateur convient ; un rôle plus étroit se constate à l'épreuve.
