# Tâches : Portail de qualité (CI + hooks + runner local)
Trace vers : plan.md (fichiers) · spec.md (FR/SC/SHALL) · docs/adr/ (0002 §3, 0006 §7/§9/§Seuils, 0004, 0005, 0003, 0008)

## Légende
- [ ] à faire · [x] fait · [P] parallélisable (aucune dépendance avec les autres [P] — fichiers disjoints)
- `Rn` = lot de review : une vertical slice, unité de livraison recommandée (≈ une PR reviewable d'un bloc)
- `Tn` = tâche : un critère observable = un commit = un test vert
- _Requirements:_ backref vers les FR/SC couverts (style Kiro)
- Les budgets en lignes sont des **ordres de grandeur** dérivés des « Fichiers touchés » du plan, destinés à déclencher la scission — **pas des mesures** (ce plugin ne lit pas le code).

> **Note de découpage.** Contrainte structurante récurrente : chaque lot de contrôle enregistre son/ses contrôle(s) dans `src/checks/index.ts` (le registre à source unique). Ce fichier partagé rend les lots de contrôles **non-`[P]` entre eux** (ils se suivent en ordre), même quand leur logique est indépendante. Les lots qui ne touchent pas le registre (`R2`, `R8`) sont `[P]`.
>
> **Note de régime.** Le registre tague chaque contrôle par **régime** ; `runGate(ctx, régime)` filtre. Le **régime par-changement** (gate de merge, CI par PR + local pré-push) porte tous les contrôles **sauf** la mutation. Le **régime planifié** (récurrent sur `main`, nightly) porte la mutation (`R6`) et sa gouvernance de baseline (`R7`), câblé en CI par `R11`. Sortie de la mutation du chemin PR = clause de repli d'ADR-0006 §Seuils ; enforcement **mécanique**, jamais discipline (ADR-0002 §3).

---

## R1 — Socle + moteur d'agrégation du portail
_Livre : FR-014, FR-015, FR-016, FR-019, FR-027_ · _~350 lignes est._ · _6 concepts_ · dépend de : —
Fichiers : `package.json` (racine), `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `tooling/quality-gate/package.json`, `tooling/quality-gate/src/types.ts`, `tooling/quality-gate/src/scope.ts`, `tooling/quality-gate/src/runner.ts`, `tooling/quality-gate/src/checks/index.ts`, `tooling/quality-gate/bin/gate.ts`, `tooling/quality-gate/**/*.test.ts`
Capability : `pnpm gate` tourne sur un registre de contrôles tagués par régime (contrôles d'exemple/fixtures), n'exécute que ceux du régime demandé, agrège un verdict fail-closed, sort avec un code. Le walking skeleton vérifiable de bout en bout.

- [x] T1 — Écrire le test : `runGate(ctx, régime)` exécute chaque contrôle du **registre unique appartenant au régime** sans court-circuit (un contrôle échoue, les suivants s'exécutent et sont rapportés ; un contrôle d'un autre régime n'est pas exécuté) _Requirements: FR-014, FR-019_ ; dépend de : —
- [x] T2 — Implémenter le registre ordonné (`checks/index.ts`, source unique, chaque entrée tagée `regimes`) + `runGate(ctx, régime)` qui filtre par régime et itère sans arrêt au premier échec, jusqu'à T1 vert _Requirements: FR-014, FR-019_ ; bloqué par : T1
- [x] T3 — Écrire le test : verdict = `TOUT VERT` ssi aucun contrôle `échoué`, sinon `BLOQUÉ` (avec `nbEchecs`) _Requirements: FR-015_ ; bloqué par : T2
- [x] T4 — Implémenter l'agrégation du verdict (`GateResult`) jusqu'à T3 vert _Requirements: FR-015_ ; bloqué par : T3
- [x] T5 — Écrire le test : fail-closed — un contrôle qui lève (ou outil absent) est rapporté `échoué` (jamais `passé`/`ignoré`) et contribue à `BLOQUÉ` _Requirements: FR-027_ ; _SC-003_ ; bloqué par : T2
- [x] T6 — Implémenter l'enveloppe `try/catch` fail-closed par contrôle jusqu'à T5 vert _Requirements: FR-027_ ; bloqué par : T5
- [x] T7 — Écrire le test : `bin/gate` sort avec un code **non-zéro** quand le verdict est `BLOQUÉ`, `0` sinon _Requirements: FR-016_ ; bloqué par : T4
- [x] T8 — Implémenter `types.ts` (`Regime`/`Check` avec `regimes`/`CheckResult`/`GateResult`), `scope.ts` (périmètre déterministe par commit) et `bin/gate.ts` (lecture du régime via `--regime`, défaut `par-changement` → `runGate(ctx, régime)` → `process.exit`) jusqu'à T7 vert _Requirements: FR-016_ ; bloqué par : T7

## R2 [P] — Double rapport lisible et machine, cohérents
_Livre : FR-017, FR-018, FR-028_ · _~200 lignes est._ · _4 concepts_ · dépend de : R1
Fichiers : `tooling/quality-gate/src/report.ts`, `tooling/quality-gate/src/types.ts` (schéma Zod machine), tests
Capability : le portail émet un rapport humain complet et une sortie machine Zod, tous deux dérivés du **même** `GateResult` (aucune divergence possible).

- [x] T9 — Écrire le test : `renderHuman` liste **chaque** contrôle avec son statut, et pour tout `échoué` un résumé de la cause (aucun contrôle muet) _Requirements: FR-017_ ; _SC-004_ ; dépend de : —
- [x] T10 — Implémenter `renderHuman(result)` jusqu'à T9 vert _Requirements: FR-017_ ; bloqué par : T9
- [x] T11 [P] — Écrire le test : `renderMachine` produit un JSON validé Zod `{ verdict, nbEchecs, checks:[{ contrôle, statut, cause? }] }` _Requirements: FR-018_ ; dépend de : —
- [x] T12 — Implémenter le schéma Zod (`types.ts`) + `renderMachine` dérivé du même `GateResult`, jusqu'à T11 vert _Requirements: FR-018_ ; bloqué par : T11
- [x] T13 — Écrire le test : statuts humain/machine **identiques** pour chaque contrôle d'un même résultat (divergence = défaut) _Requirements: FR-028_ ; bloqué par : T10, T12
- [x] T14 — Garantir la dérivation depuis un `GateResult` unique jusqu'à T13 vert _Requirements: FR-028_ ; bloqué par : T13

## R3 — Contrôles de frontières d'architecture (ADR-0004)
_Livre : FR-004, FR-005, FR-006_ · _~320 lignes est._ · _4 concepts_ · dépend de : R1
Fichiers : `src/checks/boundaries.ts`, `src/checks/read-sql-in-apps.ts`, `src/checks/write-handler.ts`, `.dependency-cruiser.cjs`, `eslint.config.mjs`, `src/checks/index.ts` (enregistrement), tests + fixtures
Capability : un diff qui viole une frontière de code ADR-0004 (import interdit, SQL de lecture dans `apps/*`, écriture hors `writeHandler`) est rapporté `échoué`.

- [ ] T15 — Écrire le test (fixture) : un import `cloudflare*` hors types dans `@colibri/core`, ou un import d'`apps/*` dans `@colibri/db`/`@colibri/core`, → `échoué` _Requirements: FR-004_ ; dépend de : —
- [ ] T16 — Implémenter le contrôle `boundaries` (dependency-cruiser) + `.dependency-cruiser.cjs` jusqu'à T15 vert _Requirements: FR-004_ ; bloqué par : T15
- [ ] T17 [P] — Écrire le test (fixture) : du SQL de lecture présent dans `apps/*` → `échoué` _Requirements: FR-005_ ; dépend de : —
- [ ] T18 — Implémenter `read-sql-in-apps` (analyse statique) + `eslint.config.mjs` (`no-restricted-paths`) jusqu'à T17 vert _Requirements: FR-005_ ; bloqué par : T17
- [ ] T19 [P] — Écrire le test (fixture) : un endpoint d'écriture ne passant pas par `writeHandler` → `échoué` _Requirements: FR-006_ ; dépend de : —
- [ ] T20 — Implémenter `write-handler` (analyse statique) jusqu'à T19 vert _Requirements: FR-006_ ; bloqué par : T19

## R4 — Contrôles statiques d'hygiène du dépôt
_Livre : FR-010, FR-011, FR-012, FR-013_ · _~340 lignes est._ · _5 concepts_ · dépend de : R3 _(partage `eslint.config.mjs`)_
Fichiers : `src/checks/typecheck.ts`, `src/checks/lint-format.ts`, `src/checks/migration-comment.ts`, `src/checks/versions-catalog.ts`, `eslint.config.mjs`, `prettier.config.mjs`, `.prettierignore`, `src/checks/index.ts`, tests
Capability : un diff qui casse une règle de forme du dépôt (type strict, lint/format, migration finissant par un commentaire, version hors catalogue) est rapporté `échoué`.

- [ ] T21 — Écrire le test : une erreur de vérification de types en mode strict → `échoué` _Requirements: FR-010_ ; dépend de : —
- [ ] T22 — Implémenter `typecheck` (`tsc --noEmit`) jusqu'à T21 vert _Requirements: FR-010_ ; bloqué par : T21
- [ ] T23 [P] — Écrire le test : lint ou contrôle de format en violation → `échoué` _Requirements: FR-011_ ; dépend de : —
- [ ] T24 — Implémenter `lint-format` (ESLint + `prettier --check`) + `prettier.config.mjs`/`.prettierignore` jusqu'à T23 vert _Requirements: FR-011_ ; bloqué par : T23
- [ ] T25 [P] — Écrire le test : une migration se terminant par un commentaire → `échoué` (bug #7739) _Requirements: FR-012_ ; dépend de : —
- [ ] T26 — Implémenter `migration-comment` jusqu'à T25 vert _Requirements: FR-012_ ; bloqué par : T25
- [ ] T27 [P] — Écrire le test : une version structurante hors catalogue centralisé, ou des majeures site/adaptateur mélangées → `échoué` _Requirements: FR-013_ ; dépend de : —
- [ ] T28 — Implémenter `versions-catalog` (`package.json` vs `catalog:`) jusqu'à T27 vert _Requirements: FR-013_ ; bloqué par : T27

## R5 — Contrôles liés aux tests (intégration, autorisation, anti-robot)
_Livre : FR-001, FR-007, FR-008, FR-009_ · _~300 lignes est._ · _4 concepts_ · dépend de : R1
Fichiers : `src/checks/integration.ts`, `src/checks/authz-coverage.ts`, `src/checks/turnstile-test.ts`, `src/checks/index.ts`, tests
Capability : le portail fait respecter le contrat de test (suite d'intégration passante, 100 % des écritures couvertes en autz, route publique couverte anti-robot ou `ignoré` si aucune).

- [ ] T29 — Écrire le test : la suite d'intégration (ressources de données locales) échoue → contrôle `échoué` _Requirements: FR-001_ ; dépend de : —
- [ ] T30 — Implémenter `integration` (vitest-pool-workers) jusqu'à T29 vert _Requirements: FR-001_ ; bloqué par : T29
- [ ] T31 [P] — Écrire le test : un endpoint d'écriture sans test d'autorisation → `échoué` ; 100 % couverts → `passé` _Requirements: FR-007_ ; _SC-005_ ; dépend de : —
- [ ] T32 — Implémenter `authz-coverage` (mapping endpoints↔tests) jusqu'à T31 vert _Requirements: FR-007_ ; bloqué par : T31
- [ ] T33 [P] — Écrire le test : une route publique sans test de rejet en l'absence de jeton anti-robot valide → `échoué` _Requirements: FR-008_ ; dépend de : —
- [ ] T34 — Implémenter `turnstile-test` jusqu'à T33 vert _Requirements: FR-008_ ; bloqué par : T33
- [ ] T35 — Écrire le test : aucune route publique existante → contrôle Turnstile `ignoré` (jamais `échoué`) _Requirements: FR-009_ ; bloqué par : T34
- [ ] T36 — Implémenter la sémantique `ignoré` à périmètre vide (`applies` faux) jusqu'à T35 vert _Requirements: FR-009_ ; bloqué par : T35

## R6 — Contrôle de mutation du `core` (régime planifié)
_Livre : FR-002, FR-003, FR-025_ · _~280 lignes est._ · _4 concepts_ · dépend de : R1
Fichiers : `src/checks/mutation.ts` (tagé `regimes: ['planifie']`), `src/mutation-baseline.ts` (chargement + comparaison), `stryker.conf.json`, `mutation-survivors.baseline.json`, `src/checks/index.ts`, tests
Capability : dans le **régime planifié** (hors chemin PR, ADR-0006 §Seuils), un mutant survivant du `core` non présent dans la base de référence fait `échouer` le contrôle ; aucun `core` encore existant ⇒ `ignoré`.

- [ ] T37 — Écrire le test : un mutant survivant absent de la base de référence → `échoué` (la base = ensemble **exhaustif** des survivants tolérés) _Requirements: FR-002, FR-025_ ; dépend de : —
- [ ] T38 — Implémenter `mutation` (Stryker sur le `core`, contrôle tagé `regimes: ['planifie']`) + chargement/comparaison de la baseline + `stryker.conf.json` jusqu'à T37 vert _Requirements: FR-002, FR-025_ ; bloqué par : T37
- [ ] T39 — Écrire le test : aucun `core` encore existant (greenfield, périmètre vide) → contrôle mutation `ignoré` (jamais `échoué`) _Requirements: FR-003_ ; bloqué par : T38
- [ ] T40 — Implémenter la sémantique `ignoré` à périmètre `core` vide jusqu'à T39 vert _Requirements: FR-003_ ; bloqué par : T39

## R7 — Gouvernance de la base de référence des survivants
_Livre : FR-024, FR-026, FR-029_ · _~240 lignes est._ · _4 concepts_ · dépend de : R6 _(durcit `mutation-baseline.ts`)_
Fichiers : `src/mutation-baseline.ts` (gouvernance), `mutation-survivors.baseline.json`, tests
Capability : la baseline est la seule source des survivants tolérés (jamais de seuil codé en dur), fail-closed si absente/illisible, et gouvernée par cliquet.

- [ ] T41 — Écrire le test : les survivants tolérés sont dérivés d'une base **versionnée explicite**, jamais d'une valeur implicite ni d'un seuil codé en dur _Requirements: FR-024_ ; dépend de : —
- [ ] T42 — Implémenter la dérivation explicite (aucun défaut implicite) jusqu'à T41 vert _Requirements: FR-024_ ; bloqué par : T41
- [ ] T43 [P] — Écrire le test : base absente ou illisible → mutation `échoué` ; base **explicitement vide** (fichier présent, zéro survivant) → valide _Requirements: FR-029_ ; dépend de : —
- [ ] T44 — Implémenter le fail-closed absente/illisible + vide-explicite-valide jusqu'à T43 vert _Requirements: FR-029_ ; bloqué par : T43
- [ ] T45 — Écrire le test : cliquet — un mutant tué doit être retiré de la base, et la base ne peut jamais être élargie pour faire passer le portail _Requirements: FR-026_ ; bloqué par : T42
- [ ] T46 — Implémenter la règle de cliquet jusqu'à T45 vert _Requirements: FR-026_ ; bloqué par : T45

## R8 [P] — Hooks de prévention des éditions interdites à l'IA
_Livre : FR-021, FR-022, FR-023_ · _~220 lignes est._ · _4 concepts_ · dépend de : R1
Fichiers : `.claude/settings.json`, `.claude/hooks/protect-paths.mjs`, `.claude/hooks/golden-lock.mjs`, `tooling/quality-gate/src/protected-paths.ts`, tests
Capability : pendant la génération, un hook local refuse **avant écriture** toute édition IA sous un chemin possédé par l'humain et toute mise à jour de golden, avec la raison renvoyée au modèle.

- [ ] T47 — Écrire le test : une écriture IA sous un chemin protégé (`tests/`, `migrations/`, `**/schema/`, config de frontières, seam d'auth) est refusée **avant** écriture, avec la raison renvoyée _Requirements: FR-021_ ; dépend de : —
- [ ] T48 — Implémenter `protect-paths.mjs` (PreToolUse `exit 2` + raison) + `protected-paths.ts` (liste unique) + `settings.json` (matcher `Edit|Write|MultiEdit`) jusqu'à T47 vert _Requirements: FR-021_ ; bloqué par : T47
- [ ] T49 [P] — Écrire le test : une tentative de mise à jour de golden (`--update`/`-u`) est refusée avec la raison _Requirements: FR-022_ ; dépend de : —
- [ ] T50 — Implémenter `golden-lock.mjs` (matcher `Bash`, `exit 2`) jusqu'à T49 vert _Requirements: FR-022_ ; bloqué par : T49
- [ ] T51 — Écrire le test : les chemins protégés du hook proviennent de la **même définition unique** (`protected-paths.ts`) que celle consommée par le portail _Requirements: FR-023_ ; bloqué par : T48
- [ ] T52 — Garantir la source unique `protected-paths.ts` (aucune duplication de liste) jusqu'à T51 vert _Requirements: FR-023_ ; bloqué par : T51

## R9 — Rejeu du régime par-changement en CI et blocage du merge
_Livre : FR-020_ · _~80 lignes est._ · _2 concepts_ · dépend de : R1, R2
Fichiers : `.github/workflows/ci.yml`, test de vérification de parité
Capability : la CI par PR rejoue le **même binaire** dans le **régime par-changement** (mutation exclue) ; pour un même commit et ce régime elle produit le même verdict qu'en local et échoue le build si `BLOQUÉ`.

- [ ] T53 — Écrire le test/vérif : pour un même commit et le **régime par-changement**, le verdict agrégé local `==` verdict CI (même `runGate`, même registre filtré) ; le contrôle de mutation n'y figure pas _Requirements: FR-020_ ; _SC-002_ ; dépend de : —
- [ ] T54 — Implémenter `.github/workflows/ci.yml` (étape unique `pnpm gate` = régime par-changement, consomme la sortie machine pour l'annotation, échoue le build si code non-zéro) jusqu'à T53 vert _Requirements: FR-020_ ; _SC-002_ ; bloqué par : T53

## R10 — Vérification bout-en-bout du portail (régime par-changement)
_Livre : SC-001, SC-004_ · _~60 lignes est._ · dépend de : R1, R2, R3, R4, R5, R8, R9
Capability : le scénario intégré du plan — une violation connue bloque le régime par-changement, un arbre propre passe.

- [ ] T55 — Sur une branche jetable portant **une violation déterministe connue** (import `cloudflare` sous le futur `packages/core`, ou une migration finissant par un commentaire) : lancer `pnpm gate` (**régime par-changement**) et exiger — code de sortie **non-zéro**, verdict **`BLOQUÉ`**, le contrôle fautif `échoué` avec sa cause dans le rapport lisible **et** dans la sortie machine (mêmes statuts), tous les autres contrôles rapportés avec un statut (aucun muet), **la mutation absente de ce régime** _Requirements: SC-001, SC-004, FR-028_ ; dépend de : —
- [ ] T56 — Arbre propre ⇒ **`TOUT VERT`, exit 0** (le verdict bascule) _Requirements: FR-015, FR-016_ ; bloqué par : T55

## R11 [P] — Régime planifié en CI (nightly) : mutation hors chemin PR
_Livre : FR-030, SC-006_ · _~90 lignes est._ · _3 concepts_ · dépend de : R1, R2, R6, R7
Fichiers : `.github/workflows/nightly.yml`, test de vérification (régime planifié → `BLOQUÉ` sur régression)
Capability : la mutation tourne dans un job **récurrent sur `main`** (hors PR) ; un mutant survivant hors baseline fait échouer le build planifié — enforcement **mécanique**, non discipline (ADR-0002 §3 ; ADR-0006 §Seuils). `[P]` : ne touche ni `src/checks/index.ts` ni un fichier d'un autre lot restant.

- [ ] T57 — Écrire le test/vérif : `pnpm gate --regime=planifie` sur un `core` portant un mutant survivant absent de la baseline → verdict **`BLOQUÉ`**, code **non-zéro** ; baseline exhaustive → `TOUT VERT` _Requirements: FR-030_ ; _SC-006_ ; dépend de : —
- [ ] T58 — Implémenter `.github/workflows/nightly.yml` (cron sur `main`, étape `pnpm gate --regime=planifie`, échoue le build planifié si code non-zéro, consomme la sortie machine pour l'annotation) jusqu'à T57 vert _Requirements: FR-030_ ; _SC-006_ ; bloqué par : T57
