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
- Un `Tn` est un **identifiant stable**, pas un rang : `T40` et `T41` se lisent à leur place logique
  — `T40` entre `T11` et `T12`, `T41` entre `T4` et `T5`. `T38` et `T39` n'existent plus : le script
  de vérification a été réparti dans les tâches qu'il constate (voir l'encadré de `R1`), et la pièce
  datée du gel a rejoint `T5`, qui faisait déjà l'observation.

> **Chaque tâche `Vérif` écrit son assertion dans le script de vérification bout-en-bout.** Le script
> n'est pas rédigé après coup par un lot séparé : il **naît par morceaux**, dans la section dont il
> constate le résultat. C'est ce qui empêche qu'une observation soit faite deux fois — une fois à la
> main, une fois retranscrite. `R1` écrit ainsi les étapes 1 à 5, `R2` la 6ᵉ.

> **Pourquoi aucun lot n'est en `TDD`.** La spec exclut explicitement toute unité de logique métier
> — « aucune unité de logique métier, donc aucun test » (§ NON inclus) : ce scaffold pose
> l'outillage qui *permettra* d'écrire des tests, il n'a lui-même rien à tester. Les deux lots sont
> donc en `inhérent`, et leur preuve est le code de sortie du script, jamais une affirmation.

---

## R1 — Le dépôt devient un projet où les commandes de `docs/ci.md` s'exécutent réellement
_Livre : FR-001 à FR-011, FR-013 à FR-023, FR-025 à FR-027 ; SC-001 à SC-005, SC-007 à SC-010_ · _vérif : inhérent (le script de vérification **est** la preuve : son code de sortie nul atteste les critères, et un test écrit par-dessus ne ferait que le redire)_ · _~570 lignes est. (hors `package-lock.json` engendré)_ · _26 concepts_ · dépend de : —
Fichiers : `.npmrc`, `package.json`, `package-lock.json`, `tsconfig.json`, `src/core/zone.ts`, `src/render/zone.ts`, `src/platform/zone.ts`, `src/site/zone.ts`, `src/admin/zone.ts`, `eslint.config.js`, `eslint.config.boundaries.js`, `vitest.config.ts`, `knip.json`, `stryker.conf.json`, `astro.config.ts`, `instance.json`, `wrangler.jsonc`, `migrations/0001_amorce.sql`, `scripts/verif-bout-en-bout.sh` (étapes 1 à 5), `docs/preuves/`, `docs/ci.md` (le job de graphe d'imports, deux endroits)

> **Un seul sujet, et c'est le scaffold lui-même.** Ce lot ne fait qu'une chose : rendre réelles, sur
> un dépôt qui n'en portait aucune, les commandes que `docs/ci.md` déclare normatives — leur
> installation, leur configuration, et le squelette de sources sans lequel elles n'auraient rien à
> vérifier. Le build, la base migrée et la configuration de déploiement n'en sont pas des sujets
> distincts : ce sont les conditions sans lesquelles ces commandes ne s'exécutent pas.

> **Ce que la gate a retiré de ce lot, et pourquoi le reste tient — arbitré le 2026-08-15.**
> La tranche « serveur de développement local » **en est sortie** et forme `R2`. Le motif de fusion
> ne la couvrait pas : il tient à ce qu'aucune coupure ne laisse les jobs bloquants verts, or la
> mesure du plan montre que la sonde est injectée sous `command === 'dev'` et que le build « repasse
> à 0 page(s) / 3 fichiers » — la retirer ne rougit donc **rien**.
>
> Pour ce qui reste, le motif tient tel quel : la garde de scaffold des jobs CI teste
> `-f package.json` et se lève **dès que le manifeste est posé**, si bien que `build` et `test` —
> tous deux **bloquants** — s'exécuteraient pour de vrai avant que `astro.config.ts` et
> `wrangler.jsonc` n'aient atterri. Scinder plus avant ne fermerait pas la fenêtre rouge, ça la
> **déplacerait** ; et sous protection de branche, une PR dont un job bloquant est rouge ne se merge
> pas. Le dépassement des signaux de scission (~570 lignes contre ~400, 26 concepts contre ~7) est
> donc **assumé et documenté**, jamais silencieux. **`T6` est l'endroit où ce motif se vérifie** :
> sa liste de `bloqué par` est exactement la raison pour laquelle ces tranches-là n'en font qu'une.

### Installation verrouillée et gelée

- [ ] T1 [P] — Poser `.npmrc` portant le gel d'approvisionnement de sept jours, à l'endroit où le
  contrôle permanent le lit _Requirements: FR-019, FR-027_ ; dépend de : —
- [ ] T2 — Poser `package.json` — les scripts que `docs/ci.md` § Commandes nomme, repris à la lettre,
  et les dépendances — puis engendrer `package-lock.json` et le committer
  _Requirements: FR-001, FR-008, FR-018_ ; bloqué par : T1
- [ ] T3 — Vérif : sur un environnement dépourvu de `node_modules/`, l'installation verrouillée
  termine avec un code de sortie nul _Requirements: FR-001, SC-001_ ; bloqué par : T2
- [ ] T4 — Vérif : un `package.json` désynchronisé du lockfile fait échouer l'installation au lieu de
  resynchroniser le lockfile en silence (défaut injecté puis retiré, arbre rendu intact)
  _Requirements: FR-018_ ; bloqué par : T2
- [ ] T41 — Vérif : la période de gel est **déclarée** dans le fichier de configuration du
  gestionnaire de paquets, à l'endroit même où le contrôle permanent de la CI la lit — c'est cette
  déclaration, et elle seule, que ce contrôle lit à chaque intégration
  _Requirements: FR-027_ ; bloqué par : T1
- [ ] T5 — Vérif, **hors du script** : le **comportement** qui découle du gel — l'**ajout** d'une
  dépendance retient une version antérieure éligible plutôt qu'une version publiée depuis moins de
  sept jours, l'installation verrouillée n'étant pas concernée. La sortie est conservée, datée, dans
  `docs/preuves/` _Requirements: FR-019, SC-009_ ; bloqué par : T2
- [ ] T6 — Vérif : les jobs d'intégration n'empruntent plus leur garde de scaffold dès lors que
  `package.json` existe — chacun exécute sa commande réelle, **et chacun passe**. Les deux jobs
  **nocturnes** (code mort, mutation) lèvent la même garde, mais **sortent de ce « chacun passe »** :
  leur rouge est attendu et motivé aux cas limites de la spec. La liste ci-dessous est la raison
  pour laquelle ce lot n'est pas scindé davantage _Requirements: FR-008_ ;
  bloqué par : T7, T11, T17, T19, T22, T23, T27, T28

### Squelette des cinq zones, typé en strict

- [ ] T7 — Poser `tsconfig.json` en mode strict _Requirements: FR-003_ ; bloqué par : T2
- [ ] T8 — Poser un fichier source par zone (`core`, `render`, `platform`, `site`, `admin`), chacun
  n'important que vers le bas selon les cinq arêtes légales retenues au plan ; les cinq noms de zone
  y sont des **identifiants nus**, jamais des chemins écrits en dur — c'est la contrainte générale
  d'`I3` appliquée aux sources du plancher _Requirements: FR-009, FR-011, FR-026_ ; bloqué par : T2
- [ ] T9 — Vérif : une incohérence de type introduite dans une source de zone fait échouer la
  commande de typage avec un code de sortie non nul (défaut injecté puis retiré, arbre rendu intact)
  _Requirements: FR-003, SC-003_ ; bloqué par : T7, T8
- [ ] T10 — Vérif : les cinq répertoires de zone portent chacun au moins un fichier versionné, et sur
  les **dix invariants de la table** de `docs/archi.md` sept sont exercés — six par la vérification
  d'invariants d'architecture, `I1` par la commande de graphe d'imports — contre trois seuls hors
  portée. L'assertion porte sur ces dix-là, **jamais sur la ligne de bilan du script**, qui compte
  aussi trois contrôles réclamés par des ADR et lira `8 au vert · 4 hors portée`
  _Requirements: FR-009, SC-010_ ; bloqué par : T8

### Le sens des imports entre zones

- [ ] T11 — Poser la configuration de graphe d'imports portant la matrice `I1` **seule**, sur le
  graphe résolu ; le nom du fichier reste sous le glob que surveille le garde de configuration
  qualité, et les cinq zones s'y déclarent **sans barre finale** (point 10 du plan) — c'est ce
  fichier que la contrainte générale d'`I3` contraint le plus durement, et la forme qui retirerait
  le préfixe `src/` pour y échapper ne classerait plus aucun fichier
  _Requirements: FR-010, FR-020, FR-026_ ; bloqué par : T8
- [ ] T40 — Vérif : sur l'arbre **complet du lot** — tous fichiers d'extension source posés, y
  compris les configurations de lint, de test et du site —, le contrôle `I3` de la vérification
  d'invariants d'architecture est rapporté **passant** : ni hors portée, ni en violation. Une barre
  finale ajoutée au motif d'une zone l'y fait basculer (défaut injecté puis retiré, arbre rendu
  intact). La liste de dépendances ci-dessous **est** le périmètre de `FR-026` : le vérifier après
  `T11` seul laisserait quatre fichiers hors du champ du contrôle
  _Requirements: FR-026_ ; bloqué par : T11, T17, T19, T27
- [ ] T12 — Vérif : un import d'une zone vers une autre dans un sens que `I1` interdit est signalé
  comme violation par cette commande (défaut injecté puis retiré)
  _Requirements: FR-010, SC-004_ ; bloqué par : T11
- [ ] T13 — Vérif : un import d'une API propre à la plateforme depuis la zone `core` est signalé
  comme violation par la vérification d'invariants d'architecture **déjà en place**, sans qu'aucun
  fichier de `.github/` ne soit ajouté ni modifié _Requirements: FR-011, SC-005_ ; bloqué par : T8
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
- [ ] T18 — Vérif : la commande de lint rapporte ses diagnostics sans modifier aucun fichier source,
  **et une violation de règle injectée est signalée** (défaut injecté puis retiré, arbre rendu
  intact). Sans ce second volet, une configuration **sans une seule règle** satisferait le critère
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
- [ ] T24 — Vérif : la commande de code mort s'exécute sur le squelette et **rapporte son
  diagnostic**, la commande de mutation n'ayant pas été exécutée. Son code de sortie n'entre pas
  dans `SC-002` : il signale à juste titre un plancher qu'aucun point d'entrée n'atteint, et le
  faire taire neutraliserait le vérificateur _Requirements: FR-007_ ; bloqué par : T22
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
- [ ] T30 — Vérif : la commande de build écrit le site bâti dans le répertoire de sortie et termine
  avec un code de sortie nul dans un environnement dépourvu de tout identifiant de compte Cloudflare
  _Requirements: FR-002, FR-017, SC-008_ ; bloqué par : T27, T28

### La base migrée

- [ ] T31 [P] — Poser la première migration, **sans effet de schéma**
  _Requirements: FR-013, FR-014, FR-021_ ; dépend de : —
- [ ] T32 — Vérif : sur une base locale neuve, la commande de migration applique les migrations en
  attente dans leur ordre numéroté _Requirements: FR-013_ ; bloqué par : T2, T28, T31
- [ ] T33 — Vérif : relancée sans nouveau fichier de migration, la commande rapporte zéro migration
  en attente, et le schéma obtenu ne porte **aucun objet du produit** — ni table, ni index, ni vue —,
  seules subsistant les tables de service du mécanisme de migration **et du moteur**
  _Requirements: FR-014, FR-021, SC-007_ ; bloqué par : T32

### L'enchaînement complet

- [ ] T42 — Assembler les étapes 1 à 5 du script de vérification bout-en-bout, sur le patron de
  `.github/scripts/arch-invariants.sh`, et poser l'assertion d'ensemble que nulle section ne porte
  seule : **six** codes de sortie nuls sur le scaffold livré — build, typage, tests, lint,
  couverture, graphe d'imports — sans passer par la garde de scaffold. Critère d'acceptation : la
  commande termine avec un code de sortie nul sur un dépôt propre
  _Requirements: SC-002_ ; bloqué par : T3, T9, T10, T12, T13, T18, T20, T21, T24, T25, T30, T33, T40

---

## R2 — Le serveur de développement local démarre et lit la base migrée
_Livre : FR-012, FR-024 ; SC-006_ · _vérif : inhérent (le script rejoué de bout en bout **est** la preuve, son code de sortie nul attestant à la fois la nouvelle étape et les cinq précédentes sur l'arbre augmenté)_ · _~90 lignes est._ · _5 concepts_ · dépend de : R1
Fichiers : `src/platform/d1/sonde-dev.ts`, `astro.config.ts` (injection de route conditionnelle), `scripts/verif-bout-en-bout.sh` (étape 6), `docs/ci.md` (la ligne « Run local », à créer)

> **Pourquoi cette tranche est un lot à elle seule.** Elle livre une capacité nommable en une
> phrase, et son retrait ne rougit aucun job bloquant — c'est ce qui la distingue du reste du
> scaffold, où la garde de scaffold interdit toute coupure. Son `inhérent` rejoue **tout** le
> script, étapes 1 à 5 comprises : c'est ainsi que `FR-026` reste tenu sur l'arbre augmenté d'un
> fichier source, sans que ce lot ait à reprendre un critère qui appartient à `R1`.

- [ ] T34 — Poser la sonde de lecture de la base dans la zone `platform` et son injection de route
  **conditionnée au seul mode développement** _Requirements: FR-012, FR-024_ ; dépend de : —
- [ ] T35 — Vérif : la commande de run local démarre un serveur HTTP joignable sur la machine du
  développeur, et sa route de sonde rend le résultat lu sur la base même que `T32` a migrée
  _Requirements: FR-012, SC-006_ ; bloqué par : T34
- [ ] T36 — Vérif : la commande de build ne produit pas cette route — le répertoire de sortie ne
  porte aucun fichier d'entrée serveur, et le nom de la sonde n'y apparaît nulle part ; constaté sur
  l'arbre même qui vient de servir `T35` _Requirements: FR-024_ ; bloqué par : T35
- [ ] T37 — Reporter la commande de run local dans `docs/ci.md` § Commandes du projet : **créer** la
  ligne « Run local », qui n'existe pas, **et retirer** le paragraphe qui la suit — « Aucune commande
  de run local n'existe […] Elle se pose au scaffold, dans ce tableau » —, faux dès l'instant où la
  ligne existe _Requirements: FR-012_ ; bloqué par : T35

---

> Les cases seront cochées au niveau implémentation, pas ici. Ce fichier part rempli et vierge.
