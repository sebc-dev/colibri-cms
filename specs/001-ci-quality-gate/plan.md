# Plan technique : Portail de qualité (CI + hooks + runner local)
Trace vers : specs/001-ci-quality-gate/spec.md · docs/stack.md · docs/adr/ (0002 §3, 0006 §7/§9/§Seuils, 0004, 0005, 0003, 0008)

> **Feature fondatrice, greenfield.** Le dépôt ne contient que `docs/`, `specs/`, `CLAUDE.md`
> (aucun `packages/`, `apps/`, `package.json`, `pnpm-workspace.yaml`, `.claude/`, CI). Cette feature
> matérialise la **couche déterministe** d'ADR-0002 §3 et le **portail de merge non-négociable**
> d'ADR-0006 §7/§9. **Décisions actées** : périmètre = *portail + socle minimal* (squelettes
> `packages/*`/`apps/*` différés à leurs propres features) ; lint/format = *ESLint + Prettier*.

## Approche

Un **paquet de tooling unique** `tooling/quality-gate` expose un **registre ordonné de contrôles**
(source de définition unique, FR-019/FR-023) où chaque contrôle est **tagué par régime**, et un
`runGate(ctx, régime)` qui exécute les contrôles du régime demandé sans court-circuit
(FR-014), agrège un verdict (FR-015), et dérive **d'un seul objet `GateResult`** un rapport lisible
(FR-017) et une sortie machine (FR-018) — garantissant leur cohérence (FR-028). Chaque contrôle est
enveloppé en **fail-closed** : toute exception ou outil absent ⇒ `échoué`, jamais `passé`/`ignoré`
(FR-027).

**Deux régimes, un registre.** Le **régime par-changement** (`pnpm gate`, défaut) est l'entrée locale
pré-push *et* l'étape CI par PR : c'est le **gate de merge**, tous les contrôles *sauf* la mutation ⇒
parité par construction (FR-020, SC-002). Le **régime planifié** (`pnpm gate --regime=planifie`, aussi
lançable en local) porte le contrôle **lourd** de mutation + la gouvernance de sa baseline ; il est câblé
en **CI récurrente sur `main`** (nightly), hors du chemin PR — exercice de la clause de repli
pré-enregistrée d'ADR-0006 §Seuils (donc **pas** une dérogation à ADR-0006, mais l'activation d'un repli
qu'il prévoit). Une régression y échoue le build planifié (FR-030) : enforcement **mécanique**, jamais
discipline (ADR-0002 §3). `runGate` filtre le même registre par régime ⇒ pas de seconde liste, parité
préservée *par régime*. Les contrôles *composent* l'outillage déjà tranché par le socle ; ils
ne le redécident pas. Les hooks Claude Code (`.claude/`) protègent en amont les chemins possédés par
l'humain et bloquent les `--update` de golden, en dérivant leur liste de chemins de **la même
définition** que le contrôle de frontières (FR-021→FR-023). Périmètre borné au *portail + socle
minimal nécessaire pour le faire tourner et le tester* : les squelettes `packages/*`/`apps/*` sont
différés ; jusque-là, les contrôles sans cible réelle sont `ignoré` ou passants à vide.

## Réutilisation du socle (cité, jamais redécidé)

- **Stack (docs/stack.md, ADR-0003)** : TypeScript `strict`, versions via `catalog:` pnpm,
  monorepo **pnpm workspaces + Turborepo**, **Vitest + @cloudflare/vitest-pool-workers** (intégration
  workerd), **Playwright** (hors gate v1). L'outillage est nommé par le socle ; le plan le câble.
- **ADR-0006** : **Stryker** (mutation, cantonnée au `core` pur, §3), **dependency-cruiser /
  ESLint `no-restricted-paths`** (frontières, §4), portail de merge non-négociable (§7), hooks
  post-génération + protection + golden-lock (§9), pas de couverture-ligne comme cible (§8),
  baseline de survivants sans seuil codé en dur (§Seuils). **§Seuils** prévoit explicitement, si le
  coût mutation dépasse le budget CI, de l'exécuter « en nightly/pré-merge ciblé plutôt qu'à chaque
  PR » — repli **activé ici** (mutation → régime planifié).
- **ADR-0008** : `main` n'est **pas** déployé automatiquement (release délibérée, migrations par étape
  outillée après sauvegarde) — ce qui rend acceptable le décalage nightly du contrôle de mutation.
- **ADR-0002 §3** : hooks `PreToolUse` (`exit 2` = bloque, renvoie la raison au modèle) /
  `PostToolUse` (lint/format) ; `## Constraints` = source unique des vérifications.
- **ADR-0004** : frontières d'imports interdites (`cloudflare*` dans `@colibri/core` ; `apps/*` dans
  `@colibri/db`/`@colibri/core`), `writeHandler({auth})`, pas de SQL de lecture dans `apps/*`.
- **ADR-0005** : intégration dans workerd, migration D1 ne finissant pas par un commentaire (#7739),
  Deploy Hook / e-mail / Turnstile mockés.
- **ADR-0003** : `catalog:` obligatoire, ne pas mélanger les majeures Astro/adaptateur.

Outil **non tranché par le socle**, décidé ici (choix utilisateur) : **Prettier** (`--check`) pour
le contrôle de format ; ESLint reste l'outil de lint et des frontières intra-app.

## Fichiers touchés (nommer précisément)

**Paquet portail — `tooling/quality-gate/`** (hors frontières ADR-0004 : tooling, non livré au client)
- `src/types.ts` — `Regime` (`'par-changement' | 'planifie'`), `Check` (porte `regimes: Regime[]`),
  `CheckResult` (`statut ∈ {passé,échoué,ignoré}`, `cause?`), `GateResult`
  (`{ verdict ∈ {TOUT VERT,BLOQUÉ}, nbEchecs, regime, checks[] }`). Schéma **Zod** = contrat machine (FR-018).
- `src/scope.ts` — périmètre depuis `git diff` vs base de merge (déterministe par commit, FR-020).
- `src/runner.ts` — `runGate(ctx, régime)` : sélectionne les contrôles du registre appartenant au régime,
  les exécute tous, `try/catch` fail-closed (FR-027), n'arrête jamais au premier échec (FR-014),
  agrège le verdict (FR-015).
- `src/report.ts` — `renderHuman(result)` + `renderMachine(result)` dérivés du **même** `GateResult`
  (FR-017/FR-018/FR-028).
- `src/checks/index.ts` — **registre ordonné** = source unique local+CI, chaque entrée tagée `regimes`
  (FR-019). Tous les contrôles sont `par-changement` **sauf** `mutation`, tagé `planifie`.
- `src/checks/*.ts` — un fichier par contrôle : `integration` (FR-001, vitest-pool-workers),
  `mutation` (FR-002/FR-003, Stryker + baseline — **régime `planifie`**, hors chemin PR),
  `boundaries` (FR-004, dependency-cruiser),
  `read-sql-in-apps` (FR-005, statique ts-morph/ESLint), `write-handler` (FR-006, statique),
  `authz-coverage` (FR-007, mapping endpoints↔tests), `turnstile-test` (FR-008/FR-009),
  `typecheck` (FR-010, `tsc --noEmit`), `lint-format` (FR-011, ESLint + `prettier --check`),
  `migration-comment` (FR-012), `versions-catalog` (FR-013, package.json vs catalog).
- `src/mutation-baseline.ts` — chargement + comparaison + **cliquet** (FR-024→FR-026, FR-029 :
  absente/illisible ⇒ `échoué` ; fichier présent vide ⇒ valide).
- `src/protected-paths.ts` — **liste unique** des chemins possédés par l'humain, consommée par le hook
  ET le contrôle de frontières (FR-023).
- `bin/gate.ts` — entrée locale : lit le régime (`--regime`, défaut `par-changement`) → `runGate(ctx, régime)`
  → rapports → `process.exit` non-zéro si BLOQUÉ (FR-016).
- `package.json` — `bin`/script `gate`, deps outillage (`@stryker-mutator/*`, `dependency-cruiser`,
  `ts-morph`, `zod` en `catalog:`).
- `**/*.test.ts` — tests du portail (**possédés par l'humain**, ADR-0006) : agrégation, fail-closed,
  cohérence humain/machine, sémantique `ignoré` à périmètre vide, cliquet baseline.

**Racine des survivants tolérés (gouvernée)**
- `mutation-survivors.baseline.json` — versionné, explicite ; possédé par l'humain (ajouté aux
  chemins protégés) pour empêcher l'élargissement silencieux (FR-026).
- `stryker.conf.json` — Stryker scopé au `core` pur (ADR-0006 §3, coût CI).

**Hooks Claude Code — `.claude/`**
- `settings.json` — `PreToolUse` : matcher `Edit|Write|MultiEdit` → `hooks/protect-paths.mjs` ;
  matcher `Bash` → `hooks/golden-lock.mjs`. (`exit 2`, jamais `exit 1`.)
- `hooks/protect-paths.mjs` — refuse une écriture sous un chemin protégé, renvoie la raison (FR-021).
  Importe `protected-paths` (FR-023).
- `hooks/golden-lock.mjs` — refuse `--update`/`-u` sur snapshots (FR-022).

**Config frontières (possédée par l'humain, ADR-0006)**
- `.dependency-cruiser.cjs` — encode les imports interdits ADR-0004 (FR-004).
- `eslint.config.mjs` — lint + `no-restricted-paths` (FR-005/FR-011).
- `prettier.config.mjs` + `.prettierignore`.

**Socle minimal (prérequis pour faire tourner/tester le portail)**
- `package.json` (racine), `pnpm-workspace.yaml` (bloc `catalog:` d'ADR-0003 §Décision),
  `turbo.json`, `tsconfig.base.json`.
- `.github/workflows/ci.yml` — **par PR** : étape unique appelant `pnpm gate` (régime par-changement) ;
  consomme la sortie machine pour l'annotation ; échoue le build si non-zéro (FR-016, US2). N'exécute
  **pas** la mutation.
- `.github/workflows/nightly.yml` — **récurrent sur `main`** (cron) : appelle `pnpm gate --regime=planifie`
  (mutation + baseline) ; échoue le build planifié si un mutant survivant est hors baseline (FR-030, US4,
  SC-006). Hors du chemin PR (ADR-0006 §Seuils).

**Patrons de référence** : greenfield — aucun code à réutiliser. Les patrons *à suivre* sont les
configs prescrites par les ADR (bloc `catalog:` d'ADR-0003 §Décision ; frontières d'ADR-0004
§Constraints ; setup `applyD1Migrations`/pool d'ADR-0005 §e) et les **contrats d'E/S de la spec** (§).

## Contrats d'interface

- `interface Check { id: string; regimes: Regime[]; applies(ctx): boolean; run(ctx): Promise<CheckResult> }`
  — `regimes` = régime(s) où le contrôle tourne ; `applies` faux ⇒ `ignoré` (périmètre vérifié vide,
  FR-003/FR-009) ; jamais `ignoré` par erreur (FR-027).
- `runGate(ctx, régime): Promise<GateResult>` — n'exécute que les contrôles dont `regimes` inclut `régime` ;
  `GateResult = { verdict, nbEchecs, regime, checks: CheckResult[] }`, `verdict = 'TOUT VERT'` ⇔ aucun
  `échoué`, sinon `'BLOQUÉ'` (FR-015). Parité local/CI **par régime** (FR-020, SC-002).
- **Code process** : `0` ⇔ `TOUT VERT` ; non-zéro ⇔ `BLOQUÉ` (FR-016).
- **Sortie machine** : JSON validé Zod `{ verdict, nbEchecs, checks:[{ contrôle, statut, cause? }] }`,
  dérivé du même `GateResult` que le rapport lisible (FR-018/FR-028).
- **Baseline** : `mutation-survivors.baseline.json` = ensemble exhaustif des survivants tolérés
  (clé de mutant stable) ; absent/illisible ⇒ `échoué` (FR-029) ; vide explicite ⇒ « zéro toléré ».
- **Hook** : `exit 2` + message de raison sur `stderr`/JSON `PreToolUse` (FR-021/FR-022).

_Couverture FR → composant :_ FR-001..013 → `src/checks/*` (dont `mutation` FR-002/003 en régime `planifie`) ;
FR-014..016 → `runner.ts`/`bin/gate.ts` ; FR-017/018/028 → `report.ts` (+ `types.ts` Zod) ; FR-019/020 →
`checks/index.ts` (tag `regimes`) + `runGate(ctx, régime)` + entrée unique ; FR-021..023 →
`.claude/hooks/*` + `protected-paths.ts` ; FR-024..026/029 → `mutation-baseline.ts` ; FR-027 →
`runner.ts` ; FR-030 → `.github/workflows/nightly.yml` + `runner.ts` (verdict BLOQUÉ du régime planifié).
**Les 30 FR sont couverts.**

## Décisions & alternatives écartées

- **Topologie `tooling/` (hors `packages/`/`apps/`).** Le portail est de l'outillage de dev, non livré
  au client ; le placer dans `packages/` le soumettrait à tort aux frontières ADR-0004. Écarté :
  `packages/quality-gate` (drague les règles de frontière), `scripts/` racine (pas de typage/tests
  propres, pas de parité de build Turborepo).
- **Registre TS à source unique + `runGate()` unique appelé en local ET en CI.** Garantit la parité
  (FR-019/FR-020) par construction. Écarté : dupliquer la liste des contrôles entre un script local et
  un YAML CI (dérive garantie) ; steps CI séparés par contrôle (perte de la parité et du verdict agrégé).
- **Fail-closed par `try/catch` autour de chaque `run`.** Un gate qui verdit sans avoir vérifié est
  pire qu'absent (FR-027, SC-003). Écarté : laisser une exception d'outil remonter (arrêterait la suite,
  violant FR-014).
- **Baseline de survivants versionnée + possédée par l'humain + cliquet.** Pas de seuil codé
  (ADR-0006 §8/§Seuils) ; la protéger empêche l'IA de l'élargir pour verdir (FR-026). Écarté :
  pourcentage de score de mutation (rejeté par ADR-0006 §8) ; baseline éditable par l'IA (ouvre la triche).
- **FR-005/FR-006/FR-007 en analyse statique custom (ts-morph / règle ESLint).** Ces contraintes sont
  mécanisables sans faux positif ; les règles qui en produiraient (Row/Input, `createRepository`)
  restent *advisory* hors gate (spec §NON inclus). Écarté : grep brut (faux positifs sur commentaires/chaînes).
- **Mutation sortie du chemin PR → régime planifié (nightly sur `main`), pas « local only ».** Un même
  registre tagé par régime + `runGate(ctx, régime)` : le régime par-changement (gate merge) exclut la
  mutation pour rester léger ; le régime planifié la porte, câblé en CI récurrente. C'est l'exercice de
  la clause de repli d'ADR-0006 §Seuils. **Écarté : « local only »** — déplacerait la mutation vers la
  discipline du dev (rien n'empêcherait mécaniquement un test creux de merger), contre ADR-0002 §3.
  **Écarté : mutation par-PR scopée au diff** — même incrémentale, elle alourdit chaque itération ;
  le décalage nightly est acceptable car `main` n'est pas déployé automatiquement (ADR-0008). Coût
  assumé : un test creux peut vivre sur `main` jusqu'au prochain nightly (≤ un cycle) avant d'être
  attrapé — l'enforcement reste mécanique (FR-030), seulement décalé.
- **→ Candidat ADR (structurant ET nouveau)** : `docs/adr/_candidates/0009-portail-qualite-draft.md`
  — topologie `tooling/`, **registre de contrôles à source unique**, **deux régimes d'exécution**
  (par-changement = gate merge ; planifié = mutation hors chemin PR, ADR-0006 §Seuils), **contrat
  machine stable** (hérité par toute la flotte), sémantique **fail-closed** + `ignoré`≠`passé`,
  gouvernance de la baseline par cliquet. ADR-0006 impose *qu'un* portail existe ; sa topologie, ses
  régimes et son contrat machine sont neufs et porteurs → candidat, **jamais** un ADR final (à promouvoir
  manuellement).

## Étape de vérification bout-en-bout

Sur une branche jetable portant **une violation déterministe connue** (import `cloudflare` ajouté dans
un fichier sous le futur `packages/core`, ou une migration finissant par un commentaire),
lancer `pnpm gate` (**régime par-changement**) et exiger : **code de sortie non-zéro**, verdict
**`BLOQUÉ`**, le contrôle fautif à `échoué` avec sa cause dans le rapport lisible **et** dans la sortie
machine (mêmes statuts, FR-028), tous les autres contrôles rapportés avec un statut (aucun muet, SC-004)
— et **la mutation absente de ce régime** ; puis, arbre propre ⇒ **`TOUT VERT`, exit 0**. Pour le
**régime planifié** : sur une baseline portant un survivant retiré artificiellement (ou un mutant
survivant injecté), lancer `pnpm gate --regime=planifie` et exiger **`BLOQUÉ`, exit non-zéro** (FR-030,
SC-006) ; baseline exhaustive ⇒ `TOUT VERT`. Complété par la suite de tests du portail
(`pnpm --filter @colibri/quality-gate test`) couvrant fail-closed, cohérence humain/machine, `ignoré` à
périmètre vide, filtrage par régime et cliquet de baseline. (Prouve SC-001, SC-002, SC-003, SC-004, SC-006.)
