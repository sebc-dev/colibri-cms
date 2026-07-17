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

## Related
- Repose sur : ADR-0003 (déploiement Workers + Static Assets) et ADR-0004 (frontière cœur/client, contrat de gabarit).
- Migrations possédées par l'humain : ADR-0006.
- Migrations testées avant flotte : ADR-0005.
- Répond à : SC-008 (brief, PRD, stack.md).
