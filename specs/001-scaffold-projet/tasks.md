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

> **Aucun lot n'est `[P]`, et ce n'est pas un oubli.** `R2` a besoin des dépendances installées par
> `R1` ; `R3` écrit dans la configuration du site que `R2` vient de poser ; `R4` constate les trois
> autres. Les tâches `[P]` d'un même lot, elles, touchent des fichiers réellement disjoints — les
> scripts étant tous posés d'un coup en `T2`, chaque configuration d'outil vit ensuite seule dans
> son fichier.

> **Pourquoi aucun lot n'est en `TDD`.** La spec exclut explicitement toute unité de logique métier
> — « aucune unité de logique métier, donc aucun test » (§ NON inclus) : ce scaffold pose
> l'outillage qui *permettra* d'écrire des tests, il n'a lui-même rien à tester. Chaque lot porte
> donc sa justification de mode, et sa preuve reste un code de sortie ou un artefact observé, jamais
> une affirmation.

---

## R1 — Les commandes de `docs/ci.md` deviennent réelles sur le squelette des cinq zones
_Livre : FR-001, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-018, FR-019, FR-020, FR-023_ · _vérif : check (aucune logique métier dans ce lot : la preuve est le code de sortie de chaque commande, observé sur un défaut injecté puis retiré)_ · _~300 lignes est. (hors `package-lock.json` engendré)_ · _15 concepts_ · dépend de : —
Fichiers : `.npmrc`, `package.json`, `package-lock.json`, `tsconfig.json`, `src/core/zone.ts`, `src/render/zone.ts`, `src/platform/zone.ts`, `src/site/zone.ts`, `src/admin/zone.ts`, `eslint.config.js`, `eslint.config.boundaries.js`, `vitest.config.ts`, `knip.json`, `stryker.conf.json`

> **Dépassement du signal de scission, arbitré le 2026-08-15.** Quinze concepts contre un signal
> de ~7 — le budget en lignes, lui, reste sous les ~400. Le quinzième est `FR-023`, née de la
> scission de `FR-007` par la correction post-gate : elle nomme séparément la commande de mutation
> et celle de code mort, dont l'exigence est précisément d'être **exécutables l'une sans l'autre**.
> Elle n'ajoute donc ni fichier ni travail au lot, seulement un identifiant à tracer — l'arbitrage
> rendu tient tel quel. Le regroupement de l'installation, du squelette des zones et des commandes
> de mesure a été retenu **pour qu'aucun job bloquant ne soit
> rouge entre deux lots** : la garde de scaffold se lève dès que `package.json` existe, si bien que
> `test` et `build` s'exécuteraient pour de vrai avant que leur configuration n'ait atterri. La
> déviation est ici documentée, jamais silencieuse.

### Installation verrouillée et gelée

- [ ] T1 — Poser `.npmrc` portant le gel d'approvisionnement de sept jours, à l'endroit où le
  contrôle permanent le lit _Requirements: FR-019_ ; dépend de : —
- [ ] T2 — Poser `package.json` — les scripts que `docs/ci.md` § Commandes nomme, repris à la lettre,
  et les dépendances — puis engendrer `package-lock.json` et le committer
  _Requirements: FR-001, FR-008, FR-018_ ; bloqué par : T1
- [ ] T3 — Vérif : sur un environnement dépourvu de `node_modules/`, l'installation verrouillée
  termine avec un code de sortie nul _Requirements: FR-001_ ; bloqué par : T2
- [ ] T4 — Vérif : un `package.json` désynchronisé du lockfile fait échouer l'installation au lieu de
  resynchroniser le lockfile en silence (défaut injecté puis retiré, arbre rendu intact)
  _Requirements: FR-018_ ; bloqué par : T2
- [ ] T5 — Vérif : la période de gel est lue là où le contrôle permanent la cherche, et une
  installation retient une version antérieure éligible plutôt qu'une version publiée depuis moins de
  sept jours _Requirements: FR-019_ ; bloqué par : T2
- [ ] T6 — Vérif : les jobs CI n'empruntent plus leur garde de scaffold dès lors que `package.json`
  existe — chacun exécute sa commande réelle _Requirements: FR-008_ ; bloqué par : T2

### Squelette des cinq zones, typé en strict

- [ ] T7 — Poser `tsconfig.json` en mode strict _Requirements: FR-003_ ; bloqué par : T2
- [ ] T8 — Poser un fichier source par zone (`core`, `render`, `platform`, `site`, `admin`), chacun
  n'important que vers le bas selon les cinq arêtes légales retenues au plan
  _Requirements: FR-009, FR-011_ ; bloqué par : T2
- [ ] T9 — Vérif : une incohérence de type introduite dans une source de zone fait échouer la
  commande de typage avec un code de sortie non nul (défaut injecté puis retiré, arbre rendu intact)
  _Requirements: FR-003_ ; bloqué par : T7, T8
- [ ] T10 — Vérif : les cinq répertoires de zone portent chacun au moins un fichier versionné, et la
  vérification d'invariants d'architecture cesse de se déclarer hors portée sur les contrôles qui les
  nomment _Requirements: FR-009_ ; bloqué par : T8

### Le sens des imports entre zones

- [ ] T11 — Poser la configuration de graphe d'imports portant la matrice `I1` **seule**, sur le
  graphe résolu ; le nom du fichier reste sous le glob que surveille le garde de configuration
  qualité _Requirements: FR-010, FR-020_ ; bloqué par : T8
- [ ] T12 — Vérif : un import d'une zone vers une autre dans un sens que `I1` interdit est signalé
  comme violation par cette commande (défaut injecté puis retiré) _Requirements: FR-010_ ;
  bloqué par : T11
- [ ] T13 — Vérif : un import d'une API propre à la plateforme depuis la zone `core` est signalé
  comme violation par la vérification d'invariants d'architecture **déjà en place**, sans qu'aucun
  fichier de `.github/` ne soit ajouté ni modifié _Requirements: FR-011_ ; bloqué par : T8
- [ ] T14 — Vérif : chacune des deux détections rapporte sa violation indépendamment de l'issue des
  autres commandes — build ou lint en échec par ailleurs ne la supprime pas _Requirements: FR-020_ ;
  bloqué par : T12, T13

### Les commandes de mesure, correctes sur un dépôt sans test

- [ ] T15 [P] — Poser la configuration de lint de style _Requirements: FR-005_ ; bloqué par : T8
- [ ] T16 — Vérif : la commande de lint rapporte ses diagnostics et ne modifie aucun fichier source
  _Requirements: FR-005_ ; bloqué par : T15
- [ ] T17 [P] — Poser la configuration de test dans l'exécutable de la plateforme, la couverture
  écrivant `coverage/lcov.info` _Requirements: FR-004, FR-006_ ; bloqué par : T8
- [ ] T18 — Vérif : la commande de test termine avec un code de sortie nul alors qu'aucun fichier de
  test n'existe _Requirements: FR-004_ ; bloqué par : T17
- [ ] T19 — Vérif : la commande de couverture produit `coverage/lcov.info`, et ce rapport est vide
  _Requirements: FR-006_ ; bloqué par : T17
- [ ] T20 [P] — Poser la configuration de détection de code mort, exécutable sans que celle de
  mutation le soit _Requirements: FR-007_ ; bloqué par : T8
- [ ] T21 [P] — Poser la configuration de test de mutation, exécutable sans que celle de code mort
  le soit _Requirements: FR-023_ ; bloqué par : T8
- [ ] T22 — Vérif : la commande de code mort s'exécute sur le squelette et rapporte son diagnostic,
  la commande de mutation n'ayant pas été exécutée _Requirements: FR-007_ ; bloqué par : T20
- [ ] T23 — Vérif : la commande de mutation rapporte son refus d'exécuter faute de test ayant tourné
  — plutôt qu'un succès —, la commande de code mort n'ayant pas été exécutée
  _Requirements: FR-023_ ; bloqué par : T21

---

## R2 — Le build produit un artefact déployable, configuré depuis le fichier d'instance
_Livre : FR-002, FR-015, FR-016, FR-017, FR-022_ · _vérif : check (configuration de build : la preuve est l'artefact produit et le code de sortie observé, il n'y a pas d'unité à tester)_ · _~90 lignes est._ · _5 concepts_ · dépend de : R1
Fichiers : `astro.config.ts`, `instance.json`, `wrangler.jsonc`

- [ ] T24 — Poser le fichier de configuration d'instance à la racine, portant le domaine et la clé
  publique Turnstile en valeurs d'exemple documentées comme telles _Requirements: FR-015_ ;
  dépend de : —
- [ ] T25 — Poser la configuration du site — adaptateur de la plateforme, réglages du pipeline
  d'images d'ADR-0019 — lisant le domaine depuis le fichier d'instance **au moment où elle
  s'évalue** _Requirements: FR-002, FR-015, FR-017_ ; bloqué par : T24
- [ ] T26 [P] — Poser la configuration de déploiement statique : liaison de base de données par son
  nom de liaison, son nom de base et son répertoire de migrations, **sans identifiant de base** et
  sans aucune valeur propre à l'instance _Requirements: FR-016, FR-022_ ; dépend de : —
- [ ] T27 — Vérif : la configuration de déploiement ne porte aucune valeur propre à l'instance, et le
  contrôle `I10` s'exerce sur la configuration du site — il ne se déclare pas hors portée et il passe
  _Requirements: FR-015, FR-016, FR-022_ ; bloqué par : T25, T26
- [ ] T28 — Vérif : la commande de build produit l'artefact déployable et termine avec un code de
  sortie nul dans un environnement dépourvu de tout identifiant de compte Cloudflare
  _Requirements: FR-002, FR-017_ ; bloqué par : T25, T26

---

## R3 — La boucle de développement local sur la base de données migrée
_Livre : FR-012, FR-013, FR-014, FR-021, FR-024_ · _vérif : check (mécanisme de plateforme : la preuve est la sortie des deux applications de migration, le schéma obtenu, la réponse HTTP de la sonde et son absence de l'artefact bâti)_ · _~90 lignes est._ · _6 concepts_ · dépend de : R2
Fichiers : `migrations/0001_amorce.sql`, `src/platform/d1/sonde-dev.ts`, `astro.config.ts` (injection de route en développement seulement), `docs/ci.md` (ligne « Run local »)

- [ ] T29 — Poser la première migration, **sans effet de schéma**
  _Requirements: FR-013, FR-014, FR-021_ ; dépend de : —
- [ ] T30 — Vérif : sur une base locale neuve, la commande de migration applique les migrations en
  attente dans leur ordre numéroté _Requirements: FR-013_ ; bloqué par : T29
- [ ] T31 — Vérif : relancée sans nouveau fichier de migration, la commande rapporte zéro migration
  en attente, et le schéma obtenu ne porte que les tables de service du mécanisme de migration —
  aucun objet propre au produit _Requirements: FR-014, FR-021_ ; bloqué par : T30
- [ ] T32 — Poser la sonde de lecture de la base dans la zone `platform` et son injection de route
  **conditionnée au seul mode développement** _Requirements: FR-012, FR-024_ ; bloqué par : T29
- [ ] T33 — Vérif : la commande de run local démarre un serveur HTTP joignable sur la machine du
  développeur, et sa route de sonde rend le résultat lu sur la base même que T30 a migrée
  _Requirements: FR-012_ ; bloqué par : T31, T32
- [ ] T34 — Vérif : la commande de build ne produit pas cette route — l'artefact ne porte aucun
  fichier d'entrée serveur, et le nom de la sonde n'y apparaît nulle part ; constaté sur l'arbre même
  qui vient de servir T33 _Requirements: FR-024_ ; bloqué par : T33
- [ ] T35 — Reporter la commande de run local dans la case vide de `docs/ci.md` § Commandes du projet
  _Requirements: FR-012_ ; bloqué par : T33

---

## R4 — Vérification bout-en-bout
_Livre : SC-001 à SC-010_ · _vérif : inhérent (le script de vérification **est** la preuve : son code de sortie nul atteste les critères, et un test écrit par-dessus ne ferait que le redire)_ · _~150 lignes est._ · _2 concepts_ · dépend de : R1, R2, R3
Fichiers : `scripts/verif-bout-en-bout.sh`

- [ ] T36 — Écrire le script de vérification bout-en-bout sur le patron de
  `.github/scripts/arch-invariants.sh` — les six étapes du plan, refus au premier écart, arbre rendu
  intact après chaque défaut injecté ; critère d'acceptation : la commande termine avec un code de
  sortie nul sur un dépôt propre
  _Requirements: SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-010_ ;
  dépend de : —
- [ ] T37 [P] — Produire la pièce datée du gel de sept jours, **hors du script** : une installation
  retient une version antérieure alors qu'une plus récente de moins de sept jours existe ; la sortie
  est conservée, datée _Requirements: SC-009_ ; dépend de : —

---

> Les cases seront cochées au niveau implémentation, pas ici. Ce fichier part rempli et vierge.
