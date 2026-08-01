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
- **Rollback** : par restauration de la sauvegarde pré-migration ; procédure à écrire et à tester.

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

## Related
- Repose sur : ADR-0003 (déploiement Workers + Static Assets) et ADR-0004 (frontière cœur/client, contrat de gabarit).
- Amendement 2026-08-01 : reprend les décisions d'exploitation d'ADR-0003 amendement (b) (session Access, révocation, surface d'accès du Worker, jeton Builds) et le retour à Cloudflare Email Service d'ADR-0007 amendement (b) (qui éteint la question du domaine d'envoi).
- Migrations possédées par l'humain : ADR-0006.
- Migrations testées avant flotte : ADR-0005.
- Répond à : SC-008 (brief, PRD, stack.md).
