---
id: ADR-0008
title: Stratégie de versionnage et de mise à jour de la flotte
status: accepted
date: 2026-07-17
authors: [arborescence-digital]
scope: .            # global — packaging, versions, migrations, déploiement
supersedes: []
superseded-by: null
depends-on: [ADR-0003, ADR-0004]
---

# ADR-0008 — Stratégie de versionnage et de mise à jour de la flotte

**Statut :** accepted — 2026-07-17

> **Pourquoi cet ADR.** ColibriCMS est appelé à évoluer, et une instance est déployée **par client**. Sans stratégie, chaque instance dérive et devient une maintenance séparée — l'inverse de SC-008. Cet ADR fixe **comment le cœur est versionné et comment une nouvelle version atteint chaque site client sans code divergent ni perte de contenu.**

---

## Contexte

- **SC-008** : une nouvelle version doit se déployer sur **toutes** les instances existantes sans code spécifique par client et sans perte de contenu.
- **Open source** (brief) : le cœur est public ; les sites clients (commerciaux, sur-mesure) ne le sont pas — ils ne peuvent pas vivre dans le dépôt open source.
- **Frontière cœur/client** posée par ADR-0004 : le cœur est un ensemble de paquets ; le projet client les consomme et fournit ses gabarits via le **contrat de gabarit**.
- Contrainte de sécurité des données : une migration fautive touche du **contenu client en production**.

---

## Décision

### 1. Distribution : cœur packagé, client épinglé
Le **cœur** (`@colibri/core`, `@colibri/db`, le moteur `apps/{site,admin}`) est publié en **paquets versionnés open source**. Chaque **site client** est un **projet privé** distinct qui **dépend d'une version épinglée** du cœur et fournit ses gabarits, thème et configuration. Le client **consomme** le cœur, ne le **forke jamais**. Ce qui varie d'un client à l'autre est de la **configuration** (valeurs de binding, e-mails, gabarits du projet client) — jamais du code divergent dans le cœur.

### 2. Versionnage : SemVer, la majeure signale le risque
`MAJEUR.MINEUR.CORRECTIF`.
- **MAJEUR** = rupture : **migration D1 non rétro-compatible** *ou* **changement du contrat de gabarit** (ADR-0004). C'est le signal « le client doit agir/vérifier avant de monter ».
- **MINEUR** = ajout compatible.
- **CORRECTIF** = correction sans rupture.

### 3. Mise à jour d'un client = bump + redéploiement, outillé
Monter un client = **bumper la version épinglée** du cœur puis **redéployer**. Chaque client monte **indépendamment**, quand il est prêt (les épinglages ne sont pas couplés). L'opération est **outillée sur la flotte** — jamais manuelle instance par instance.

### 4. Migrations D1 : versionnées, ordonnées, rejouables, sous filet
- Migrations **versionnées et ordonnées**, livrées **avec le cœur**, appliquées par un **registre** par instance (chaque migration appliquée une fois, dans l'ordre).
- Application par une **étape explicite outillée**, **jamais** automatiquement au déploiement — précédée d'une **sauvegarde du D1 client** et suivie d'une **vérification**. C'est le garde-fou anti-perte de contenu (SC-008).
- **Testées sur données réelles-locales** (workerd/Miniflare, ADR-0005) **avant** tout déploiement de flotte.
- Migrations **possédées par l'humain** (ADR-0006) : jamais éditées par l'IA pour faire verdir un test.

### 5. À formaliser à l'implémentation (défauts recommandés, non figés ici)
- **Orchestration du redéploiement** : recommandé — **un dépôt/pipeline CI par client** déclenchant le bump + migrate + deploy, plutôt qu'un orchestrateur central (plus simple, isole les pannes). À trancher à la 2ᵉ instance réelle.
- **Format des migrations** et table de registre : `[À VÉRIFIER]` aligné sur l'outillage D1 (`wrangler d1 migrations`) au jour de l'installation.
- ~~**Rollback** : par restauration de la sauvegarde pré-migration ; procédure à écrire et à tester.~~ **→ Écrit le 2026-08-01** (amendement (b) point 4) : le rollback est la **restauration au point relevé** — *bookmark* Time Travel consigné avant l'application —, et il est **destructif** (la base est écrasée en place). Reste à tester sur une instance de recette.

---

## Amendement 2026-08-01 — l'entrée et la sortie d'une instance

Cet ADR décrivait la **montée de version** d'une flotte existante, et rien d'autre : ni comment une instance **entre** dans la flotte, ni comment un accès en **sort**. Trois décisions du 2026-08-01 ont rendu ce manque visible.

### a. Le jeu de pages d'un client se provisionne, il ne se migre pas

`FR-082` (l'intégrateur définit le jeu de pages, l'éditrice n'en crée pas) est servi par une **déclaration dans le projet client** + une **étape outillée** — délibérément **ni migration, ni graine ad hoc**. Motif : une migration est livrée **avec le cœur** (§4) et serait donc la même pour tous les clients ; le jeu de pages est précisément ce qui les distingue. Le confondre avec une migration ferait entrer du sur-mesure client dans le cœur, ce que la contrainte première de cet ADR interdit.

**Conséquence sur SemVer** : ajouter ou retirer une page chez un client **n'est pas une montée de version du cœur**. C'est une opération d'instance, sans incidence sur l'épinglage ni sur les autres clients — donc sans le filet du §4 (sauvegarde, étape de migration), qu'elle n'a pas lieu de déclencher.

### b. Ce qu'une instance exige au provisionnement

La liste était implicite, éparpillée entre ADR ; elle est ici pour qu'une deuxième instance ne se découvre pas par tâtonnement :

- zone Cloudflare avec le domaine du client, et les bindings **D1 / R2 / KV** ;
- l'**application Access** de l'admin — durée de session **7 jours** au niveau application, et les adresses autorisées en politique (ADR-0003 amendement (b)) ;
- `workers_dev: false` **et** `preview_urls: false` sur le Worker d'admin — sans quoi Access est contournable (ADR-0003 amendement (b)) ;
- l'**adresse de destination vérifiée** pour l'acheminement des formulaires (`FR-046`, ADR-0007 amendement (b)). Sa vérification est un courriel que **la cliente** doit confirmer : c'est une étape **avec elle**, pas seulement pour elle — la seule du provisionnement dans ce cas, donc la seule qui puisse rester en attente sans que personne ne s'en aperçoive ;
- les secrets : URL de Deploy Hook, clés Turnstile, jeton d'API D1, jeton d'API Workers Builds ;
- le **jeu de pages** déclaré (§a).

Aucun de ces éléments n'est du code : ce sont des **valeurs**. C'est ce qui permet à la contrainte « aucun code spécifique client dans le cœur » de tenir alors que chaque instance est différente.

### c. La sortie d'une personne est une procédure, pas un geste

Couper l'accès d'une personne — une cliente qui quitte l'agence, un intégrateur qui s'en va — demande **deux gestes, dans cet ordre** : retirer son adresse de la **politique** Access, **puis** révoquer sa session. L'un sans l'autre ne coupe rien durablement (ADR-0003 amendement (b) en donne le détail et le motif).

S'y ajoute une exigence de provisionnement, pas de code : le **jeton d'API Workers Builds** est *user-scoped* par obligation de la plateforme, donc attaché à une personne. Il est créé depuis un **membre de compte non nominatif** — sinon le départ d'un intégrateur emporte la publication de **toutes** les instances, et l'échec est silencieux jusqu'à la première mise en ligne qui ne part pas.

### d. Ce qui n'est plus à trancher

La question de flotte ouverte le 2026-08-01 — « un compte Resend par client, ou un domaine d'agence unique avec `Reply-To` vers la cliente ? » — **s'éteint sans avoir été tranchée** : l'acheminement revient dans l'écosystème Cloudflare (ADR-0007 amendement (b)). Aucun fournisseur tiers à provisionner par instance, aucune clé d'API tierce à faire tourner au départ d'une personne, aucun quota partagé entre clients. C'est consigné parce qu'une question éteinte sans motif écrit se rouvre d'elle-même à la prochaine relecture.

---

## Amendement 2026-08-01 (b) — la distribution, les secrets, l'exploitation

Suites de l'[audit de sécurité du 1<sup>er</sup> août 2026](../audit-securite-2026-08-01.md)
(lot L8). L'amendement (a) a décrit l'**entrée** et la **sortie** d'une instance. Restait tout ce
qui vit **entre le dépôt et une instance en production** : le canal par lequel le cœur voyage, les
comptes où les instances se posent, les secrets qui les ouvrent, le filet d'une migration, et ce
qu'un exploitant voit quand quelque chose casse. Dix points, qui ferment `A-03`, `A-04`, `B-12`,
`B-13`, `C-02`, `C-10`, `C-16`, `C-17i`, `C-17j`, `D-06` et `D-08`.

Le premier est le plus grave du lot, et l'audit en donne le motif en une phrase : le jeton d'API
Workers Builds a reçu un traitement soigné — jusqu'au **membre de compte non nominatif** de (a) §c —
et **ce soin n'a jamais été étendu au canal de distribution lui-même**, qui est pourtant le point
unique de compromission de toute la flotte.

### 1. Sécurité de la distribution

Le §1 publie le cœur en paquets versionnés ; le §3 les déploie **fidèlement** partout, par
l'outillage de flotte. Ces deux décisions, prises pour la fiabilité, forment ensemble un
amplificateur : **un correctif malveillant poussé au registre atteint toutes les instances au
rythme des montées de version**, servi par le mécanisme même qui devait rendre la flotte sûre. Rien
du corpus ne disait qui a le droit de publier, depuis où, ni avec quoi.

**Décision : le cœur est publié depuis l'intégration continue par *trusted publishing* OIDC, et il
n'existe aucun jeton de publication.** Le *runner* obtient un justificatif de courte durée lié au
dépôt et au workflow déclarés auprès du registre ; le paquet est configuré pour **refuser toute
publication par jeton**, et l'**attestation de provenance** est émise à chaque publication, ce qui
permet à quiconque de vérifier de quel dépôt et de quel workflow vient un tarball.

C'est le même geste qu'au lot L6 sur `B-01` : **la question du secret est réglée par la disparition
du secret**. Un jeton de publication de longue durée se fuit, se copie, se retrouve dans un
historique de shell, et doit tourner à chaque départ (point 3) ; celui-ci n'existe pas. Et
l'interdiction « jamais de publication depuis un poste », qui serait restée déclarative, devient
**mécanique** : le registre refuse.

Ce que cela ne couvre pas, écrit pour n'être pas cru :
- **le compte du registre reste un point unique**, déplacé et non supprimé — un attaquant qui en
  prend le contrôle change la configuration du *trusted publisher* et publie. La **2FA** sur ce
  compte n'est donc pas décorative : c'est ce qui protège la configuration, faute de jeton à voler ;
- le *trusted publishing* suppose un *runner* **hébergé par la forge** ; un *runner* auto-hébergé
  ferait retomber dans le régime du jeton et exigerait un nouvel ADR ;
- le **workflow de publication** est un fichier de `.github/workflows/`, déjà **zone protégée** au
  sens d'ADR-0006 (amendement 2026-08-01 point 5) : le modifier passe par la revue humaine ciblée.
  C'est ce qui empêche qu'une génération élargisse elle-même le déclencheur de publication.

### 2. Un compte Cloudflare par client

`B-13` a été fermé à moitié au lot L6 — jeton D1 du build en lecture seule, scopé à une base,
distinct par instance — en laissant explicitement la **topologie de comptes** à cet ADR. Elle n'est
pas un détail d'exploitation : le chemin de l'API D1 est
`/accounts/{account_id}/d1/database/{id}/query`, si bien que la frontière de compte est la frontière
au-dessus de laquelle plus aucun scopage de jeton ne protège rien.

**Décision : une instance cliente = un compte Cloudflare dédié.** Deux instances clientes ne
cohabitent jamais dans le même compte.

Le motif décisif n'est pas celui qu'on attend, et il ne vient pas de `B-13` : **les quotas de
l'offre gratuite se comptent par compte**. `C-04` (lot L6) a analysé l'épuisement de quota comme un
vecteur de déni de service et lui a donné sa parade ; dans un compte d'agence partagé, un flood chez
un client consomme les 100 000 requêtes/jour et les 3 000 minutes de build **des autres**, et la
parade de périphérie, qui est par instance, n'y peut rien. La séparation de comptes est ce qui rend
`SC-001` vrai *par client* et non *en moyenne*.

S'y ajoutent trois isolements qui tombent gratuitement :
- **rayon d'un jeton compromis** borné à une instance — l'argument propre de `B-13` ;
- **rejeu de jeton Turnstile** : la réponse `siteverify` porte un `hostname` parce qu'un jeton
  obtenu sur *un autre site du même compte* est rejouable (ADR-0007 amendement (e) point 5). Un
  compte par client supprime la classe entière. Le contrôle du `hostname` **reste** — deux barrières
  indépendantes, jamais une qui rattrape l'autre (ADR-0011 § 1) ;
- **Zero Trust** : politiques Access, listes d'adresses et sessions vivent dans un compte ; la liste
  d'une cliente ne peut pas déborder sur celle d'une autre.

Prix assumé : N comptes à administrer, N jeux de secrets, aucun tableau de bord transversal. C'est
exactement ce que l'outillage de flotte du §3 existe pour absorber, et un compte n'est pas du code —
c'est une **valeur de provisionnement** de plus (point 10), donc compatible avec la contrainte
première de cet ADR.

### 3. La sortie d'une personne gagne un troisième geste : la rotation

(a) §c décrit deux gestes — retirer l'adresse de la politique Access, puis révoquer la session — et
ne couvre que **l'accès**. Un intégrateur qui s'en va a pu **connaître** l'URL du Deploy Hook, le
jeton d'API D1 du build, le jeton d'API Workers Builds et la clé secrète Turnstile de **chaque**
instance. Le membre non nominatif protège la *continuité* de la publication ; il ne protège pas la
*confidentialité* de ce qui a déjà été vu.

**Décision : couper l'accès d'une personne comporte un troisième geste — faire tourner les secrets
d'instance auxquels elle a eu accès**, sur toutes les instances concernées :
- **URL de Deploy Hook** : régénérée. Le geste existait déjà comme réponse standard à toute
  suspicion de fuite (ADR-0003 amendement (d) point 3) ; il gagne ici un **déclencheur** ;
- **jeton d'API D1 du build** : révoqué et réémis, par instance (secret de **build**, donc dans la
  configuration du projet Workers Builds et non par `wrangler secret put` — ADR-0003 amendement (d)
  point 5) ;
- **clé secrète Turnstile** : réémise ;
- **identifiants du membre de compte non nominatif**, si la personne les détenait — et elle les
  détenait dès lors qu'elle publiait. Le jeton Builds *user-scoped* qui en dépend est réémis dans la
  foulée. C'est le point que (a) §c ne pouvait pas voir : le membre non nominatif résout la
  dépendance à une personne, il ne résout pas le partage d'un identifiant entre plusieurs.

Il n'y a **aucun jeton de publication npm à faire tourner** — point 1.

**Pas de rotation calendaire**, et le motif est écrit : une périodicité que personne ne tient est
pire qu'un déclencheur, parce qu'elle fait croire à un contrôle inexistant ; et chaque rotation est
elle-même une manipulation de secret, donc une occasion de fuite. Les déclencheurs sont **la sortie
d'une personne** et **toute suspicion de fuite**.

Exigence pour l'outillage de flotte : la rotation doit être **praticable en lot**. À N clients, un
troisième geste qui se fait instance par instance dans un tableau de bord n'est pas fait — c'est le
même raisonnement que le §3 tient déjà pour la montée de version.

### 4. Le filet de migration complété : point de restauration, vérification, rollback, exécutant

Le §4 pose le bon principe — **jamais automatique, sauvegarde avant, vérification après** — avec
quatre trous que `C-16` relève : la vérification n'a aucun **contenu** défini, donc n'est pas
testable ; le **rollback** est marqué « procédure à écrire » alors qu'il est le seul filet ; le
mécanisme de **sauvegarde** n'est pas nommé ; et **qui a le droit** d'exécuter n'est pas dit.
`C-10` attaque le même endroit par l'autre bout : une sauvegarde de D1 contient les coordonnées et
les devis en clair, sans lieu, ni accès, ni rétention — et une restauration ferait **réapparaître**
des demandes que `FR-064`/`FR-065` effacent inconditionnellement.

**Décision (a) — la « sauvegarde » du §4 n'est pas une copie, c'est un point de restauration
relevé.** Le mécanisme est **Time Travel**, la reprise à un instant de D1 : toujours active, sans
coût, restaurant à la minute près sur **7 jours** dans l'offre gratuite qui est la nôtre (30 jours
sur l'offre payante). L'étape outillée **relève et consigne le *bookmark*** avant d'appliquer la
première migration, et refuse d'appliquer si elle ne l'a pas.

Ce n'est pas un affaiblissement du §4, c'est sa précision — et elle **éteint `C-10` en grande
partie faute d'objet** : il n'existe aucun fichier de sauvegarde, donc aucun lieu à choisir, aucune
liste d'accès à tenir, aucune rétention à borner, et aucune copie des données personnelles hors du
périmètre de l'instance. En conséquence, **produire un export de D1 hors de l'instance est interdit
sans nouvel ADR** : ce serait recréer délibérément l'artefact que le constat reproche.

**Décision (b) — la vérification post-migration a un contenu, et elle échoue fermé.** Au minimum,
sur la base migrée :
- les **invariants d'ADR-0010** : toute table de valeur de contenu porte `state ∈ ('draft','live')`
  dans sa clé primaire, aucune ligne de contenu sans `state`, les deux états présents là où ils
  l'étaient ;
- **comptages avant / après par table**, comparés au **delta déclaré par la migration** — une
  migration qui ne déclare pas son delta attendu n'est pas vérifiable, donc pas applicable ;
- **conformité des clés naturelles** au charset fermé d'ADR-0010 amendement (c) point 1.

Une vérification qui ne peut pas s'exécuter vaut **échec** — même règle que le portail de qualité
(ADR-0009) : un contrôle absent n'est jamais un contrôle réussi.

**Décision (c) — le rollback est la restauration au point relevé, et il est destructif.** La
restauration **écrase la base en place** : tout ce qui a été écrit depuis le point relevé est perdu,
migration comprise. Conséquence à annoncer et non à découvrir : la fenêtre de migration est une
**interruption de service éditorial**, et l'étape outillée la borne au lieu de la subir.

Un effet de bord heureux, qui répond exactement à la « re-purge post-restauration » que `C-10`
réclame : la purge de la corbeille est un `DELETE … WHERE expires_at < now` exécuté par le **Cron
idempotent** (ADR-0007 amendement (e) point 2), donc un **invariant récurrent** et non un événement
unique. Une restauration qui ressusciterait des demandes expirées est corrigée **au tick suivant**,
sans geste ni procédure. C'est la forme idempotente qui l'achète — elle n'a pas été choisie pour ça.

Reste un résiduel, écrit comme tel : **l'historique de 7 jours de la plateforme échappe à
l'effacement inconditionnel** de `FR-064`/`FR-065`. Il est borné (7 jours, contre 30 de rétention
applicative), il appartient à la plateforme et non au produit, il n'est lisible que par une
restauration — laquelle n'est pratiquée que comme rollback de migration — et il est couvert par la
même juridiction que la base (point 8). Nommé plutôt que masqué.

**Décision (d) — l'exécutant est l'identité d'agence.** Une migration n'est déclenchée ni par la
cliente, ni par le déploiement (§4 le disait déjà), ni par une génération d'IA — ADR-0006 possède
déjà les fichiers de migration, cet ADR possède le **geste** de les appliquer.

### 5. Un correctif de sécurité est une classe de version, à déploiement poussé

« Chaque client monte de version quand il est prêt » (§3) est la bonne règle pour une évolution
fonctionnelle et la **mauvaise pour un correctif de sécurité** : elle laisse des instances
vulnérables aussi longtemps que personne ne demande rien. Et à la question « lesquelles ? », le
corpus n'a aucune réponse — il n'existe **aucun inventaire des versions déployées**.

**Décision (a) — le correctif de sécurité est une classe de version distincte, poussée par
l'agence** sur toutes les instances affectées, sans attendre la disponibilité de chaque client.
C'est une **nuance du §3, pas son renversement** : l'indépendance des épinglages reste la règle pour
tout le reste, et c'est parce qu'elle reste la règle qu'une exception nommée est nécessaire.

Le cas gênant est écrit : un correctif de sécurité est normalement un **CORRECTIF** sur la mineure
courante de la majeure courante (`SECURITY.md` : pas de rétroportage). S'il exige une **migration
non rétro-compatible**, il reste une **MAJEURE** — le §2 ne plie pas —, et le déploiement poussé
emprunte alors intégralement le filet du point 4.

**Décision (b) — l'outillage de flotte tient un inventaire des instances**, avec pour chacune son
compte, sa version épinglée et la date de son dernier déploiement réussi. Il est **mis à jour par le
déploiement lui-même** : un déploiement qui ne met pas l'inventaire à jour n'est pas terminé. Motif :
un inventaire tenu à la main diverge, et il diverge **exactement le jour où il sert**.

C'est aussi ce qui rend tenable la promesse de `SECURITY.md` : la divulgation est **coordonnée**,
donc postérieure à la publication du correctif — mais « la flotte est montée avant la divulgation »
n'est une phrase vérifiable que s'il existe une liste de ce qu'est la flotte.

**Décision (c) — une version compromise se déprécie, elle ne se dépublie pas.** Une version publiée
est immuable ; la dépublier casse l'installation des instances qui l'ont déjà épinglée, sans la
retirer des miroirs ni des caches. La réponse est : marquer la version dépréciée avec son motif,
publier la version corrigée, et pousser (a).

**Raccord avec l'état du dépôt, à ne pas rouvrir** : les détecteurs existent déjà — alertes de
vulnérabilité de la forge et `pnpm audit` au nightly (ADR-0003 amendement (d) point 6). Les **mises
à jour automatiques de dépendances restent désactivées** tant que le portail ne sait pas refuser le
diff qu'elles produiraient : un check requis vert sur un tel diff serait un contrôle qui ment. Le
chemin d'urgence défini ici est **humain et en aval des détecteurs** ; il ne réactive rien.

### 6. Ce que l'agence doit voir

Toute la visibilité du produit converge vers **l'éditrice** — état de mise en ligne (`FR-087`),
motif d'échec traduit (`FR-094`), corbeille. Vers l'**intégrateur**, rien. Or les documents nomment
eux-mêmes des échecs silencieux : un jeton Builds mort après un départ, un Cron sans réessai
plateforme, une corbeille qui n'alerte que « si elle regarde ». À l'échelle d'une flotte, cela
signifie découvrir les pannes par l'appel du client.

**Décision : un jeu minimal de signaux est acheminé à l'agence, par le seam `sendMail` déjà
déclaré.** Aucun service nouveau, aucun hôte nouveau dans l'allowlist réseau d'ADR-0006, aucune
dépendance de plus. Les signaux :
- **mise en ligne en échec** après que la boucle de réconciliation a fait son office (`FR-056`) —
  l'échec persistant, pas la première tentative ;
- **`current_build_uuid` inconnu** de `site_build_state` : ADR-0003 amendement (d) point 3 décide
  que la boucle le **signale sans redéclencher**, et laisse explicitement à cet ADR le soin de dire
  *à qui*. C'est ici : à l'agence, parce que c'est une suspicion de fuite de Deploy Hook, donc le
  déclencheur d'une régénération (point 3) — pas une information d'éditrice ;
- **acheminement en échec** ayant épuisé ses réessais, c'est-à-dire une ligne qui entre en corbeille ;
- **Cron muet** : aucun tick enregistré sur une fenêtre écrite.

L'adresse de destination de ces signaux est une **adresse d'agence, provisionnée par instance**, et
elle **n'entre pas dans `verified_recipients`** : cette table sert `FR-046` et la destination des
formulaires ; y ranger une adresse d'exploitation en ferait une destination possible pour un
formulaire, ce qui n'est pas son objet.

Borne, sans quoi le remède devient le mal : **un signal par changement d'état, pas par tick**. Une
boîte d'exploitant noyée est un nouvel échec silencieux, avec une étape de plus.

### 7. Le cycle de vie des données de l'éditrice

La sortie d'une personne coupe son accès (a) §c et fait désormais tourner les secrets (point 3),
mais ne dit rien du **devenir de ses données** : sa ligne dans `users`, une éventuelle adresse dans
`verified_recipients`, son entrée dans le cache d'identité KV. Les volumes sont minimes ; ce sont
des données personnelles sans fin de vie documentée.

**Décision : la ligne `users` survit, l'adresse est neutralisée.** La ligne ne peut pas être
supprimée sans casser autre chose — `pages.created_by` / `updated_by` la référencent sous
`PRAGMA foreign_keys = ON`, et une suppression en cascade réécrirait l'historique d'autorat du
contenu. Mais l'**adresse est la seule donnée personnelle de la table** : elle est remplacée par un
**jeton de sépulture déterministe et non identifiant**, qui préserve `NOT NULL UNIQUE`. Rien n'est
perdu de ce que la table sert à faire, puisque **Access est l'unique source d'autorisation**
(ADR-0004 amendement (c) point 5) : une ligne neutralisée n'ouvre rien.

**L'entrée du cache KV est supprimée au même instant.** Son TTL borné (ADR-0004) limite la fenêtre ;
la suppression la ferme. Sans ce geste, une identité neutralisée continue de se résoudre jusqu'à
expiration — la même classe d'erreur que « retirer de la politique sans révoquer ».

**`verified_recipients`** : une adresse qui appartenait à la personne qui part est **retirée** ;
celle de la cliente ne l'est pas — c'est la sienne, pas celle de l'agence. Conséquence assumée et
écrite : retirer une adresse peut mettre un formulaire publié dans un état où l'acheminement
**échoue**, puisque l'appartenance est revérifiée à chaque envoi (ADR-0007 amendement (e) point 6).
C'est **voulu** : l'échec est visible — corbeille, plus le signal du point 6 —, alors qu'un envoi
silencieux vers la boîte d'une personne partie ne l'est pas.

Ces trois gestes s'exécutent **au même moment que les deux d'Access et la rotation du point 3** :
une sortie est une procédure unique, pas une collection de gestes à retrouver.

### 8. Chiffrement, transport, localisation

`D-08` ne relevait pas un défaut mais un **silence** : rien dans le corpus sur le chiffrement au
repos, le transport, ni la localisation — trois faits dont la mention d'information (`FR-105`) et un
registre de traitement ont besoin.

**Les faits, vérifiés en source primaire.** D1, R2 et KV chiffrent **au repos**, en **AES-256-GCM**,
automatiquement et sans configuration ; les clés sont gérées par la plateforme. D1 est couvert par
ses certifications SOC 2 et ISO 27001. Le transport est **TLS** de bout en bout : les seams sortants
déclarés (ADR-0006) n'atteignent que des hôtes `https`, et l'acheminement des formulaires n'échappe
pas à la règle.

**Décision — la localisation se pose au provisionnement, et elle ne se rattrape pas.** La base D1
est créée avec la **juridiction `eu`** ; le bucket R2 avec la **restriction juridictionnelle EU**.
Fait de plateforme qui commande la forme de la règle : la juridiction d'une base D1 se fixe **à la
création** et ne peut être ni ajoutée ni modifiée ensuite. Une instance provisionnée sans elle ne se
corrige donc pas — elle se recrée, et son contenu se migre. C'est ce qui en fait une **case de
provisionnement bloquante** (point 10) plutôt qu'un réglage.

**Deux renoncements, écrits.**

*Pas de chiffrement applicatif de `payload_json`* — le seul contenu personnel persistant. Il ne
protégerait de rien contre le modèle de menace réel : la clé devrait être lisible par le Worker,
donc vivre dans le même compte que la donnée qu'elle protège, si bien qu'un accès au compte les
obtient toutes deux. Il casserait en outre l'affichage de la corbeille (`FR-064`), qui est sa raison
d'être. La parade est ailleurs et elle existe : la **rétention bornée à 30 jours**, inconditionnelle.

*KV n'est pas localisable.* Le cache d'identité est répliqué globalement par construction. Le
donné mis en cache est une **résolution d'identité** — adresse d'éditrice vers identifiant —, à TTL
borné (ADR-0004), et **aucun contenu de soumission ne transite jamais par KV**. C'est la limite du
raisonnement de localisation, et elle est nommée ici plutôt que découverte à la rédaction de la
mention d'information.

### 9. La règle qui vit hors du portail

ADR-0004 amendement (c) point 1 a rendu `set:html` **inutile** — `toBlocks()` retourne un arbre de
blocs typés, rendu nœud par nœud avec l'échappement natif — puis l'a **interdit** au contrat de
gabarit. Mais le **rendu appartient au projet client** (§1), qui est un dépôt privé, **hors du
portail de qualité** (ADR-0006, ADR-0009). L'interdiction est donc écrite là où elle ne peut pas
être violée, et absente de l'endroit où elle peut l'être. C'est ce qui fait d'`A-03` un constat
critique : le défaut se répète à chaque nouveau client, et le mécanisme de flotte ne rejoue jamais
le portail sur un projet client.

**Décision : le cœur livre la règle, le projet client l'active, le provisionnement le vérifie.** Le
cœur exporte une **configuration de lint** couvrant les fichiers de gabarit, qui refuse `set:html`
et tout rendu d'une valeur de zone hors du **contexte de rendu déclaré** par le descripteur
(ADR-0011 § 3). Le modèle de projet client la livre **activée**, et l'intégration continue du projet
client l'exécute.

**Ce que cette barrière ne vaut pas, écrit sans détour** : un projet client peut la désactiver. Ce
n'est pas un contrôle du portail, c'est une règle que le cœur **prête** à un dépôt qu'il ne possède
pas. Deux choses la font tenir plutôt qu'une : elle arrive **activée par défaut**, et le
provisionnement a une case. C'est une barrière d'une nature inférieure aux autres du corpus, et
c'est dit.

Symétrie avec les deux arbitrages de placement du chantier, qui se complète ici : au lot L6, le
contrôle vit **dans le dépôt** parce que le portail peut le lire ; au lot L7, **hors du dépôt** parce
que l'agent peut l'écrire ; ici, dans un dépôt que **ni l'un ni l'autre n'atteint** — d'où les deux
seuls leviers dont le cœur dispose sur un projet qu'il ne possède pas : **livrer du code** et
**cocher une case**.

### 10. Ce que le provisionnement exige désormais

La liste de (a) §b existait pour qu'une deuxième instance ne se découvre pas par tâtonnement. Cet
amendement l'allonge, et l'ordre compte — le premier élément contient tous les autres :

- le **compte Cloudflare dédié à ce client** (point 2), puis la zone avec son domaine et les
  bindings **D1 / R2 / KV** ;
- **D1 créé avec la juridiction `eu`, R2 sous restriction juridictionnelle EU** (point 8) — **à la
  création, sans rattrapage possible** ;
- la **règle de limitation de débit en périphérie** sur `<apex>/api/forms/*/submit` (ADR-0007
  amendement (e) point 5, ADR-0003 amendement (d) point 4) — l'étage que le Worker ne peut pas
  tenir, puisqu'il absorbe le flood *sans consommer d'invocation* ;
- l'**adresse d'agence** destinataire des signaux d'exploitation (point 6), distincte de l'adresse
  de destination des formulaires ;
- la **configuration de lint du cœur, active** dans le projet client et exécutée par son intégration
  continue (point 9) ;
- les **mentions légales** et l'**information de confidentialité** (`FR-105` → `FR-109`). Elles ne
  sont pas une option : `FR-109` **refuse la publication d'un formulaire** tant que l'information de
  confidentialité n'est pas renseignée. Le partage des rôles est écrit — l'agence fournit une base
  rédigée et adaptée à l'instance ; la **cliente**, responsable de traitement, la valide et peut
  ensuite l'éditer (`FR-106`, `FR-108`). Comme l'adresse de destination de (a) §b, c'est une étape
  **avec elle**, pas seulement pour elle ;
- l'**entrée dans l'inventaire de flotte** (point 5) — une instance absente de l'inventaire est
  invisible le jour d'une vulnérabilité, ce qui est le seul jour où l'inventaire sert.

La remarque de (a) §b tient toujours et se renforce : **aucun de ces éléments n'est du code**. Ce
sont des valeurs et de la configuration de compte, et c'est exactement ce qui permet à « aucun code
spécifique client dans le cœur » de rester vrai alors que chaque instance diffère.

---

## Alternatives Considered
- **Monorepo unique de toute la flotte** (cœur + tous les clients). *Rejeté* : les sites clients commerciaux ne peuvent pas vivre dans le dépôt open source ; MAJ tout-ou-rien (impossible de laisser un client sur une version antérieure).
- **Dépôt modèle forké par client.** *Rejeté* : les forks divergent, les fusions amont génèrent des conflits — exactement le « code divergent » que SC-008 interdit.
- **Migrations automatiques au déploiement.** *Rejeté* : une migration fautive touche la prod cliente sans filet.
- **CalVer / incrément simple** (schéma de version). *Rejeté* : ne signalent pas le risque d'une montée ; SemVer rend la rupture explicite.

---

## Conséquences
- **Positif** : la flotte se met à jour sans dérive ; open source et sur-mesure coexistent ; chaque client monte à son rythme ; le contenu est protégé (sauvegarde + migrations testées).
- **Positif** : réutilise la frontière cœur/client d'ADR-0004 — pas de motif neuf.
- **Négatif** : N projets clients à bumper → **exige l'outillage** de flotte (sinon la promesse « facilement » s'effondre) ; le contrat de gabarit doit être versionné avec discipline (une rupture = majeure).
- **Second ordre** : la valeur dépend de la stabilité du contrat de gabarit (ADR-0004) et de la discipline de sauvegarde avant migration.

---

## Seuils qui feraient reconsidérer
- Si le nombre de clients rend le « dépôt par client » ingérable → orchestrateur central de flotte.
- Si les ruptures de contrat de gabarit deviennent fréquentes → stabiliser/étendre le contrat avant d'ajouter des clients.
- Si une restauration de sauvegarde se révèle trop lente/risquée → stratégie de migration rétro-compatible systématique (expand/contract) avant tout déploiement.

---

## Constraints
> Compilées en CI/outillage de flotte (cf. ADR-0002).
- **INTERDIT** : tout code spécifique à un client dans le cœur ; le sur-mesure vit dans le projet client (config + gabarits).
- **INTERDIT** : forker le cœur par client (épinglage de version uniquement).
- **OBLIGATOIRE** : une rupture de migration ou de contrat de gabarit incrémente la **MAJEURE** SemVer.
- **OBLIGATOIRE** : les migrations D1 sont versionnées, ordonnées, rejouables, et appliquées par une étape outillée **après sauvegarde et avec vérification** — **INTERDIT** de les appliquer automatiquement au déploiement.
- **OBLIGATOIRE** : toute migration est testée sur données réelles-locales avant déploiement de flotte.
- **OBLIGATOIRE** *(2026-08-01)* : le jeu de pages d'un client est **déclaré dans le projet client** et appliqué par une étape outillée ; **INTERDIT** de le livrer par une migration du cœur ou une graine ad hoc.
- **INTERDIT** *(2026-08-01)* : incrémenter une version du cœur pour l'ajout ou le retrait d'une page chez un client — c'est une opération d'instance.
- **OBLIGATOIRE** *(2026-08-01)* : couper l'accès d'une personne = retirer son adresse de la **politique** Access **puis** révoquer sa session ; **INTERDIT** de s'en tenir à l'un des deux.
- **OBLIGATOIRE** *(2026-08-01)* : le jeton d'API Workers Builds est créé depuis un **membre de compte non nominatif** ; **INTERDIT** de le créer depuis le compte personnel d'un intégrateur.
- **OBLIGATOIRE** *(2026-08-01)* : le provisionnement d'une instance fait **confirmer par la cliente** l'adresse de destination de ses formulaires (FR-046) avant qu'un formulaire puisse être publié.
- **OBLIGATOIRE** *(2026-08-01)* : le cœur est publié **depuis l'intégration continue par *trusted publishing* OIDC**, avec émission de l'attestation de **provenance** ; **INTERDIT** de publier depuis un poste, et **INTERDIT** qu'un jeton de publication de longue durée existe — le paquet refuse la publication par jeton.
- **OBLIGATOIRE** *(2026-08-01)* : le compte de registre qui possède le paquet porte la **2FA** ; **INTERDIT** d'élargir le *trusted publisher* déclaré (dépôt, workflow) hors de la revue humaine ciblée d'ADR-0006, `.github/workflows/` étant zone protégée.
- **OBLIGATOIRE** *(2026-08-01)* : **une instance cliente = un compte Cloudflare dédié** ; **INTERDIT** de faire cohabiter deux instances clientes dans le même compte — les quotas de l'offre gratuite se comptent par compte, et la frontière de compte est celle au-delà de laquelle aucun scopage de jeton ne protège plus.
- **OBLIGATOIRE** *(2026-08-01)* : couper l'accès d'une personne comporte un **troisième geste** — faire tourner les secrets d'instance auxquels elle a eu accès (URL de Deploy Hook régénérée, jeton d'API D1 du build, clé secrète Turnstile, et les identifiants du membre de compte non nominatif si elle les détenait) ; **INTERDIT** de s'en tenir aux deux gestes d'Access.
- **OBLIGATOIRE** *(2026-08-01)* : l'étape outillée de migration **relève et consigne le point de restauration** (*bookmark* Time Travel) **avant** d'appliquer ; **INTERDIT** d'appliquer une migration sans point de restauration relevé.
- **INTERDIT** *(2026-08-01)* : produire un export de D1 hors du périmètre de l'instance — aucune copie durable de données personnelles n'existe hors de la base, et en créer une exige un nouvel ADR.
- **OBLIGATOIRE** *(2026-08-01)* : la vérification post-migration contrôle les invariants d'ADR-0010 (`state` dans la clé primaire, aucune ligne de contenu sans état, les deux états présents), les **comptages avant/après par table** comparés au delta **déclaré par la migration**, et la conformité des clés naturelles ; une vérification qui ne peut pas s'exécuter vaut **échec** (*fail-closed*).
- **OBLIGATOIRE** *(2026-08-01)* : une migration D1 est exécutée par l'**identité d'agence** ; **INTERDIT** qu'elle soit déclenchée par la cliente, par le déploiement ou par une génération d'IA.
- **OBLIGATOIRE** *(2026-08-01)* : un **correctif de sécurité** est poussé par l'agence sur toutes les instances affectées sans attendre la disponibilité de chaque client, et la flotte est montée **avant** la divulgation coordonnée (`SECURITY.md`) ; **INTERDIT** de dépublier une version compromise — elle est **dépréciée** et remplacée.
- **OBLIGATOIRE** *(2026-08-01)* : l'outillage de flotte tient un **inventaire des instances** (compte, version épinglée, dernier déploiement réussi), **mis à jour par le déploiement lui-même** ; un déploiement qui ne le met pas à jour n'est pas terminé.
- **OBLIGATOIRE** *(2026-08-01)* : les échecs d'exploitation — mise en ligne en échec après réconciliation, `current_build_uuid` inconnu, acheminement ayant épuisé ses réessais, Cron muet — sont signalés à une **adresse d'agence** par le seam `sendMail`, **un signal par changement d'état** ; **INTERDIT** que la seule surface d'un échec soit celle de l'éditrice, et **INTERDIT** d'inscrire cette adresse dans `verified_recipients`.
- **OBLIGATOIRE** *(2026-08-01)* : à la sortie d'une personne, son adresse est **neutralisée dans `users`** par un jeton de sépulture, son entrée de cache KV **supprimée**, et son adresse retirée de `verified_recipients` ; **INTERDIT** de supprimer la ligne `users` (références d'autorat) comme **INTERDIT** d'y conserver l'adresse.
- **OBLIGATOIRE** *(2026-08-01)* : la base D1 est créée avec la **juridiction `eu`** et le bucket R2 sous **restriction juridictionnelle EU**, au provisionnement ; **INTERDIT** de reporter — la juridiction d'une base D1 se fixe à la création et ne se modifie plus.
- **OBLIGATOIRE** *(2026-08-01)* : le cœur **livre** une configuration de lint refusant `set:html` et tout rendu hors du contexte déclaré, le projet client la reçoit **activée** et son intégration continue l'exécute ; le provisionnement le vérifie.
- **OBLIGATOIRE** *(2026-08-01)* : le provisionnement fournit les **mentions légales** et l'**information de confidentialité** (`FR-105` → `FR-109`), validées par la cliente comme responsable de traitement, avant la première publication d'un formulaire.

## Related
- Repose sur : ADR-0003 (déploiement Workers + Static Assets) et ADR-0004 (frontière cœur/client, contrat de gabarit).
- Amendement 2026-08-01 : reprend les décisions d'exploitation d'ADR-0003 amendement (b) (session Access, révocation, surface d'accès du Worker, jeton Builds) et le retour à Cloudflare Email Service d'ADR-0007 amendement (b) (qui éteint la question du domaine d'envoi).
- Origine de l'amendement (b) : [audit de sécurité du 2026-08-01](../audit-securite-2026-08-01.md), constats `A-04` (canal de distribution npm), `B-13` (topologie de comptes, second volet), `C-02` (rotation des secrets), `C-10` et `C-16` (sauvegarde, vérification, rollback, exécutant), `C-17i` (urgence CVE et inventaire), `C-17j` (monitoring opérateur), `D-06` (cycle de vie des données de l'éditrice), `D-08` (chiffrement, transport, localisation), plus les seconds volets d'`A-03` (règle de lint livrée au projet client) et de `B-12` (mentions légales et information de confidentialité au provisionnement). Consomme : ADR-0003 amendement (d) (jeton D1 du build, Deploy Hook, quotas, étages de secrets), ADR-0007 amendement (e) (limite de débit de périphérie, purge idempotente, revérification du destinataire), ADR-0010 amendement (c) (invariants et clés naturelles vérifiés après migration), ADR-0011 (contexte de rendu déclaré) et ADR-0006 amendement 2026-08-01 (seams déclarés, zones protégées, revue humaine ciblée).
- Migrations possédées par l'humain : ADR-0006.
- Migrations testées avant flotte : ADR-0005.
- Répond à : SC-008 (brief, PRD, stack.md).
