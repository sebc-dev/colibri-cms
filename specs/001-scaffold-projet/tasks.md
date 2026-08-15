# Tâches : Scaffold du projet
Trace vers : [plan.md](./plan.md) (fichiers) · [spec.md](./spec.md) (FR/SC/SHALL)

## Légende
- [ ] à faire · [x] fait · [P] parallélisable (aucune dépendance avec les autres [P])
- `Rn` = **lot de review** : une *vertical slice* — une tranche qui traverse toutes les couches et
  livre un morceau de fonctionnalité complet, relisable seul (≈ une PR)
- `Tn` = **tâche** : un critère observable = un commit = une vérification au vert
- _vérif : \<mode\>_ = comment le lot prouve qu'il est fait — `TDD` (le test avant le code, défaut) ·
  `test-after` (le test après) · `check` (pas de test auto : une vérification observée) ·
  `inhérent` (la preuve est le résultat lui-même, ex. le pipeline CI qui passe au vert)
- _Requirements:_ = **backref** : les FR/SC que la tâche couvre — le fil qui dit pourquoi elle existe
- Un `Tn` est un **identifiant stable**, pas un rang : `T40` et `T41` ont été ajoutées après coup et
  se lisent à leur place logique — `T40` entre `T11` et `T12`, `T41` entre `T4` et `T5`.

> **Deux lots, et aucun n'est `[P]`.** `R2` constate `R1` : il n'y a rien à paralléliser entre eux.
> Les tâches `[P]` d'un même lot, elles, touchent des fichiers réellement disjoints — les scripts
> étant tous posés d'un coup en `T2`, chaque configuration d'outil vit ensuite seule dans son
> fichier.

> **Pourquoi aucun lot n'est en `TDD`.** La spec exclut explicitement toute unité de logique métier
> — « aucune unité de logique métier, donc aucun test » (§ NON inclus) : ce scaffold pose
> l'outillage qui *permettra* d'écrire des tests, il n'a lui-même rien à tester. Chaque lot porte
> donc sa justification de mode, et sa preuve reste un code de sortie ou un artefact observé, jamais
> une affirmation.

---

## R1 — Le dépôt devient un projet où toutes les commandes de `docs/ci.md` sont réelles
_Livre : FR-001 à FR-027_ · _vérif : check (aucune logique métier dans ce lot : la preuve est le code de sortie de chaque commande, observé sur un défaut injecté puis retiré)_ · _~490 lignes est. (hors `package-lock.json` engendré)_ · _29 concepts_ · dépend de : —
Fichiers : `.npmrc`, `package.json`, `package-lock.json`, `tsconfig.json`, `src/core/zone.ts`, `src/render/zone.ts`, `src/platform/zone.ts`, `src/platform/d1/sonde-dev.ts`, `src/site/zone.ts`, `src/admin/zone.ts`, `eslint.config.js`, `eslint.config.boundaries.js`, `vitest.config.ts`, `knip.json`, `stryker.conf.json`, `astro.config.ts`, `instance.json`, `wrangler.jsonc`, `migrations/0001_amorce.sql`, `docs/ci.md` (deux éditions : la case « Run local », et la part du job de graphe d'imports que ce lot referme)

> **Un seul sujet, et c'est le scaffold lui-même.** Ce lot ne fait qu'une chose : rendre réelles, sur
> un dépôt qui n'en portait aucune, les commandes que `docs/ci.md` déclare normatives — leur
> installation, leur configuration, et le squelette de sources sans lequel elles n'auraient rien à
> vérifier. L'installation, les zones, le build, la base migrée et le serveur local n'en sont pas les
> parties : ce sont les faces d'un même geste, et **aucune n'est livrable seule**.

> **Pourquoi la fusion, et pourquoi le dépassement de seuil est assumé — arbitré le 2026-08-15.**
> Vingt-neuf concepts contre un signal de ~7, et ~490 lignes contre un signal de ~400. Ce lot était
> découpé en trois ; la gate du 15/08 a montré que **le point de coupure n'existe pas**. La garde de
> scaffold des jobs CI teste `-f package.json` : elle se lève **dès que le manifeste est posé**, si
> bien que `build` et `test` — tous deux **bloquants** — s'exécuteraient pour de vrai avant que
> `astro.config.ts` et `wrangler.jsonc` n'aient atterri. Scinder ne fermerait donc pas la fenêtre
> rouge, ça la **déplacerait** ; et sous protection de branche, une PR dont un job bloquant est rouge
> ne se merge pas. Ce que la scission coûterait ici est supérieur à ce que la review y gagnerait. La
> déviation est documentée, jamais silencieuse. **`T6` est l'endroit où ce motif se vérifie** : sa
> liste de `bloqué par` est exactement la raison pour laquelle les trois lots n'en font qu'un.
>
> *Le compte est passé de 27 à 29 le 2026-08-15, sans que le motif soit entamé : le dédoublement de
> `FR-019` en `FR-019`/`FR-027` et la naissance de `FR-026` sont des contraintes sur des fichiers que
> le lot posait déjà. Deux concepts de plus, **aucun fichier de plus**, budget en lignes inchangé.*

### Installation verrouillée et gelée

- [ ] T1 [P] — Poser `.npmrc` portant le gel d'approvisionnement de sept jours, à l'endroit où le
  contrôle permanent le lit _Requirements: FR-019, FR-027_ ; dépend de : —
- [ ] T2 — Poser `package.json` — les scripts que `docs/ci.md` § Commandes nomme, repris à la lettre,
  et les dépendances — puis engendrer `package-lock.json` et le committer
  _Requirements: FR-001, FR-008, FR-018_ ; bloqué par : T1
- [ ] T3 — Vérif : sur un environnement dépourvu de `node_modules/`, l'installation verrouillée
  termine avec un code de sortie nul _Requirements: FR-001_ ; bloqué par : T2
- [ ] T4 — Vérif : un `package.json` désynchronisé du lockfile fait échouer l'installation au lieu de
  resynchroniser le lockfile en silence (défaut injecté puis retiré, arbre rendu intact)
  _Requirements: FR-018_ ; bloqué par : T2
- [ ] T41 — Vérif : la période de gel est **déclarée** dans le fichier de configuration du
  gestionnaire de paquets, à l'endroit même où le contrôle permanent de la CI la lit — c'est cette
  déclaration, et elle seule, que ce contrôle lit à chaque intégration
  _Requirements: FR-027_ ; bloqué par : T1
- [ ] T5 — Vérif : le **comportement** qui en découle — une installation retient une version
  antérieure éligible plutôt qu'une version publiée depuis moins de sept jours
  _Requirements: FR-019_ ; bloqué par : T2
- [ ] T6 — Vérif : les jobs CI n'empruntent plus leur garde de scaffold dès lors que `package.json`
  existe — chacun exécute sa commande réelle, **et chacune passe**, ce qui n'est vrai qu'une fois
  toutes les configurations de ce lot posées _Requirements: FR-008_ ;
  bloqué par : T7, T11, T17, T19, T27, T28

### Squelette des cinq zones, typé en strict

- [ ] T7 — Poser `tsconfig.json` en mode strict _Requirements: FR-003_ ; bloqué par : T2
- [ ] T8 — Poser un fichier source par zone (`core`, `render`, `platform`, `site`, `admin`), chacun
  n'important que vers le bas selon les cinq arêtes légales retenues au plan ; les cinq noms de zone
  y sont des **identifiants nus**, jamais des chemins écrits en dur — c'est la contrainte générale
  d'`I3` appliquée aux sources du plancher _Requirements: FR-009, FR-011, FR-026_ ; bloqué par : T2
- [ ] T9 — Vérif : une incohérence de type introduite dans une source de zone fait échouer la
  commande de typage avec un code de sortie non nul (défaut injecté puis retiré, arbre rendu intact)
  _Requirements: FR-003_ ; bloqué par : T7, T8
- [ ] T10 — Vérif : les cinq répertoires de zone portent chacun au moins un fichier versionné, et la
  vérification d'invariants d'architecture cesse de se déclarer hors portée sur les contrôles qui les
  nomment _Requirements: FR-009_ ; bloqué par : T8

### Le sens des imports entre zones

- [ ] T11 — Poser la configuration de graphe d'imports portant la matrice `I1` **seule**, sur le
  graphe résolu ; le nom du fichier reste sous le glob que surveille le garde de configuration
  qualité, et les cinq zones s'y déclarent **sans barre finale** (point 10 du plan) — c'est ce
  fichier que la contrainte générale d'`I3` contraint le plus durement, et la forme qui retirerait
  le préfixe `src/` pour y échapper ne classerait plus aucun fichier
  _Requirements: FR-010, FR-020, FR-026_ ; bloqué par : T8
- [ ] T40 — Vérif : sur l'arbre qui porte cette configuration, le contrôle `I3` de la vérification
  d'invariants d'architecture est rapporté **passant** — ni hors portée, ni en violation — et une
  barre finale ajoutée au motif d'une zone l'y fait basculer (défaut injecté puis retiré, arbre
  rendu intact) _Requirements: FR-026_ ; bloqué par : T11
- [ ] T12 — Vérif : un import d'une zone vers une autre dans un sens que `I1` interdit est signalé
  comme violation par cette commande (défaut injecté puis retiré) _Requirements: FR-010_ ;
  bloqué par : T11
- [ ] T13 — Vérif : un import d'une API propre à la plateforme depuis la zone `core` est signalé
  comme violation par la vérification d'invariants d'architecture **déjà en place**, sans qu'aucun
  fichier de `.github/` ne soit ajouté ni modifié _Requirements: FR-011_ ; bloqué par : T8
- [ ] T14 — Vérif : chacune des deux détections rapporte sa violation indépendamment de l'issue des
  autres commandes — build ou lint en échec par ailleurs ne la supprime pas _Requirements: FR-020_ ;
  bloqué par : T12, T13
- [ ] T15 — Reporter dans `docs/ci.md` ce que ce lot referme du job de graphe d'imports — la matrice
  `I1` — et ce qu'il **laisse ouvert** : le reliquat d'`I3` qu'un contrôle littéral ne voit pas. Les
  deux endroits qui portent la même affirmation se corrigent ensemble : la ligne « Graphe d'imports »
  du § Commandes du projet, et la ligne `ADR-0021` du § Registre des ADR vérifiés en CI, dont la
  colonne « Non rendu » cesse d'être vraie _Requirements: FR-025_ ; bloqué par : T12
- [ ] T16 — Vérif : le document dit de lui-même que cette case n'est refermée **que pour moitié** —
  aucune des lignes touchées ne laisse croire le job clos, et le reliquat d'`I3` y reste porté comme
  restant à poser _Requirements: FR-025_ ; bloqué par : T15

### Les commandes de mesure, correctes sur un dépôt sans test

- [ ] T17 [P] — Poser la configuration de lint de style _Requirements: FR-005_ ; bloqué par : T8
- [ ] T18 — Vérif : la commande de lint rapporte ses diagnostics et ne modifie aucun fichier source
  _Requirements: FR-005_ ; bloqué par : T17
- [ ] T19 [P] — Poser la configuration de test dans l'exécutable de la plateforme, la couverture
  écrivant `coverage/lcov.info` _Requirements: FR-004, FR-006_ ; bloqué par : T8
- [ ] T20 — Vérif : la commande de test termine avec un code de sortie nul alors qu'aucun fichier de
  test n'existe _Requirements: FR-004_ ; bloqué par : T19
- [ ] T21 — Vérif : la commande de couverture produit `coverage/lcov.info`, et ce rapport est vide
  _Requirements: FR-006_ ; bloqué par : T19
- [ ] T22 [P] — Poser la configuration de détection de code mort, exécutable sans que celle de
  mutation le soit _Requirements: FR-007_ ; bloqué par : T8
- [ ] T23 [P] — Poser la configuration de test de mutation, exécutable sans que celle de code mort
  le soit _Requirements: FR-023_ ; bloqué par : T8
- [ ] T24 — Vérif : la commande de code mort s'exécute sur le squelette et rapporte son diagnostic,
  la commande de mutation n'ayant pas été exécutée _Requirements: FR-007_ ; bloqué par : T22
- [ ] T25 — Vérif : la commande de mutation rapporte son refus d'exécuter faute de test ayant tourné
  — plutôt qu'un succès —, la commande de code mort n'ayant pas été exécutée
  _Requirements: FR-023_ ; bloqué par : T23

### Le build, configuré depuis le fichier d'instance

- [ ] T26 [P] — Poser le fichier de configuration d'instance à la racine, portant le domaine et la
  clé publique Turnstile en valeurs d'exemple documentées comme telles _Requirements: FR-015_ ;
  dépend de : —
- [ ] T27 — Poser la configuration du site — adaptateur de la plateforme, réglages du pipeline
  d'images d'ADR-0019 — lisant le domaine depuis le fichier d'instance **au moment où elle
  s'évalue** _Requirements: FR-002, FR-015, FR-017_ ; bloqué par : T2, T26
- [ ] T28 [P] — Poser la configuration de déploiement statique : liaison de base de données par son
  nom de liaison, son nom de base et son répertoire de migrations, **sans identifiant de base** et
  sans aucune valeur propre à l'instance _Requirements: FR-016, FR-022_ ; dépend de : —
- [ ] T29 — Vérif : la configuration de déploiement ne porte aucune valeur propre à l'instance, et le
  contrôle `I10` s'exerce sur la configuration du site — il ne se déclare pas hors portée et il passe
  _Requirements: FR-015, FR-016, FR-022_ ; bloqué par : T27, T28
- [ ] T30 — Vérif : la commande de build produit l'artefact déployable et termine avec un code de
  sortie nul dans un environnement dépourvu de tout identifiant de compte Cloudflare
  _Requirements: FR-002, FR-017_ ; bloqué par : T27, T28

### La boucle de développement local sur la base migrée

- [ ] T31 [P] — Poser la première migration, **sans effet de schéma**
  _Requirements: FR-013, FR-014, FR-021_ ; dépend de : —
- [ ] T32 — Vérif : sur une base locale neuve, la commande de migration applique les migrations en
  attente dans leur ordre numéroté _Requirements: FR-013_ ; bloqué par : T28, T31
- [ ] T33 — Vérif : relancée sans nouveau fichier de migration, la commande rapporte zéro migration
  en attente, et le schéma obtenu ne porte que les tables de service du mécanisme de migration —
  aucun objet propre au produit _Requirements: FR-014, FR-021_ ; bloqué par : T32
- [ ] T34 — Poser la sonde de lecture de la base dans la zone `platform` et son injection de route
  **conditionnée au seul mode développement** _Requirements: FR-012, FR-024_ ; bloqué par : T27, T31
- [ ] T35 — Vérif : la commande de run local démarre un serveur HTTP joignable sur la machine du
  développeur, et sa route de sonde rend le résultat lu sur la base même que T32 a migrée
  _Requirements: FR-012_ ; bloqué par : T33, T34
- [ ] T36 — Vérif : la commande de build ne produit pas cette route — l'artefact ne porte aucun
  fichier d'entrée serveur, et le nom de la sonde n'y apparaît nulle part ; constaté sur l'arbre même
  qui vient de servir T35 _Requirements: FR-024_ ; bloqué par : T30, T35
- [ ] T37 — Reporter la commande de run local dans la case vide de `docs/ci.md` § Commandes du projet
  _Requirements: FR-012_ ; bloqué par : T35

---

## R2 — Vérification bout-en-bout
_Livre : SC-001 à SC-010_ · _vérif : inhérent (le script de vérification **est** la preuve : son code de sortie nul atteste les critères, et un test écrit par-dessus ne ferait que le redire)_ · _~150 lignes est._ · _2 concepts_ · dépend de : R1
Fichiers : `scripts/verif-bout-en-bout.sh`

- [ ] T38 — Écrire le script de vérification bout-en-bout sur le patron de
  `.github/scripts/arch-invariants.sh` — les six étapes du plan, refus au premier écart, arbre rendu
  intact après chaque défaut injecté ; critère d'acceptation : la commande termine avec un code de
  sortie nul sur un dépôt propre
  _Requirements: SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-010_ ;
  dépend de : —
- [ ] T39 [P] — Produire la pièce datée du gel de sept jours, **hors du script** : une installation
  retient une version antérieure alors qu'une plus récente de moins de sept jours existe ; la sortie
  est conservée, datée _Requirements: SC-009_ ; dépend de : —

---

> Les cases seront cochées au niveau implémentation, pas ici. Ce fichier part rempli et vierge.
