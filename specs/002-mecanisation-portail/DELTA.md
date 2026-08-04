# Delta : mécanisation du portail (lot L10) sur le portail de qualité

Statut : Proposé | Cible : `specs/001-ci-quality-gate/spec.md` · Créé : 2026-08-03

> **Marqueur de mode, posé par `kickoff-feature`.** Le corps de ce delta — Intention,
> invariants du comportement actuel, `[ADDED]` / `[MODIFIED]` / `[REMOVED]`, limites de
> scope, vérification — est écrit par `/scd-sdd:specify 002`. Ce fichier n'existe pour
> l'instant que pour rendre le mode **delta** dérivable après un `/clear`.

## Pourquoi delta et non greenfield

L10 **modifie le comportement livré** par la feature 001 (sémantique de périmètre vide du
runner, chemins protégés, émission des rapports, catalogue de versions, étape de CI) autant
qu'il en **ajoute** (marqueur d'approbation, re-vérification du diff par la CI, allowlist
réseau). Écrire une spec complète rejouerait 001 et risquerait d'halluciner des exigences
sur l'existant — le risque exact que le mode delta existe pour fermer.

## Avertissement pour `specify` — la spec de 001 n'est pas fidèle au code livré

Constaté à l'ouverture, par lecture du code. La section « Comportement actuel (invariants à
préserver) » doit décrire **le code**, jamais la spec de 001 :

- `runGate` **n'appelle jamais `applies()`** (`tooling/quality-gate/src/runner.ts`) ; le
  prédicat existe sur les onze contrôles et n'est consommé que par des tests unitaires.
- Cinq contrôles retournent **`passé`** sur un périmètre vide (`boundaries`,
  `read-sql-in-apps`, `write-handler`, `authz-coverage`, `migration-comment`) ; seuls
  `integration`, `turnstile-test` et `mutation` retournent `ignoré`.
- `bin/gate.ts` **n'émet ni `renderHuman` ni `renderMachine`** : `src/report.ts` n'est
  importé que par des tests. `FR-017`/`FR-018` de 001 ne sont tenues qu'en bibliothèque.
- `src/scope.ts` **n'existe pas**, bien que `plan.md` de 001 le nomme et que la tâche `T8`
  soit cochée. Aucune plomberie de diff n'existe.
- La suite de tests du portail **ne s'exécute pas en CI** : `ci.yml` n'a qu'une étape,
  `pnpm gate`, et `pnpm gate` ne lance jamais le vitest de `tooling/quality-gate`.

Conséquence de conception à porter dans la spec : **un contrôle résiduel doit être une
entrée du registre, jamais un test** — un test de `tooling/quality-gate/src/*.test.ts`
n'est appliqué par aucun check requis.

## Traçabilité amont

- Lot **L10** du chantier de remédiation de l'[audit de sécurité du 2026-08-01](../../docs/audit-securite-2026-08-01.md),
  décrit par `CLAUDE.md` § « Audit de sécurité ».
- Constats visés : `C-17e`, `C-17f`, `C-17h`, et le versant mécanique de `B-14`.
- ADR appliqués, **aucun amendé** : ADR-0006 (amdt 2026-08-01 points 2-5, amdt 2026-08-02 (b)),
  ADR-0009 (contraintes 4 et 6), ADR-0003 (amdt (d) point 6).
