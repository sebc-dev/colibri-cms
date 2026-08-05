# Delta : mécanisation du portail (lot L10) sur le portail de qualité

Statut : Proposé | Cible : `specs/001-ci-quality-gate/spec.md` · Créé : 2026-08-03

> **Marqueur de mode, posé par `kickoff-feature`.** Le corps de ce delta — Intention,
> invariants du comportement actuel, `[ADDED]` / `[MODIFIED]` / `[REMOVED]`, limites de
> scope, vérification — est écrit par `/scd-sdd:specify 002`. Ce fichier n'existe pour
> l'instant que pour rendre le mode **delta** dérivable après un `/clear`.

## Pourquoi delta et non greenfield

L10 **modifie le comportement livré** par la feature 001 (sémantique de périmètre vide du
runner, chemins protégés, émission des rapports, catalogue de versions, étape de CI) autant
qu'il en **ajoute** (marqueur d'approbation signé, re-vérification du diff par la CI, résolution
de la racine du dépôt). Écrire une spec complète rejouerait 001 et risquerait d'halluciner des exigences
sur l'existant — le risque exact que le mode delta existe pour fermer.

## Avertissement pour `specify` — la spec de 001 n'est pas fidèle au code livré

Constaté à l'ouverture, par lecture du code. La section « Comportement actuel (invariants à
préserver) » doit décrire **le code**, jamais la spec de 001 :

- `runGate` **n'appelle jamais `applies()`** (`tooling/quality-gate/src/runner.ts`) ; le
  prédicat existe sur les onze contrôles et n'est consommé que par des tests unitaires.
- **Sept** contrôles retournent **`passé`** sur un périmètre absent — `boundaries`,
  `read-sql-in-apps`, `write-handler`, `authz-coverage`, `migration-comment`, **`typecheck`**
  (aucun `tsconfig.json` trouvé) et **`versions-catalog`** (`pnpm-workspace.yaml` absent ⇒
  catalogue vide ⇒ zéro cause) ; trois retournent `ignoré` (`integration`, `turnstile-test`,
  `mutation`) ; et `lint-format` a un périmètre jamais vide (`existsSync(racine)`).
  *(Compte corrigé de cinq à sept le 2026-08-05, sur relecture du code — la gate `analyze` avait
  relevé que la section « Comportement actuel » n'était pas fidèle sur le point même que cet
  avertissement exige de vérifier.)*
- **La racine sur laquelle le portail conclut n'est pas celle du dépôt.** `pnpm gate` délègue par
  `pnpm --filter @colibri/quality-gate`, `bin/gate.ts` passe `ctx: {}`, et chaque contrôle
  retombe sur `process.cwd()` — soit `tooling/quality-gate/`. `versions-catalog` y lit un
  `pnpm-workspace.yaml` absent : **`FR-013` de 001 n'a jamais vérifié le vrai catalogue**, ni en
  local ni en CI. Porté en `É-06`.
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
- Constats visés : `C-17e`, `C-17f`, `C-17h`, `D-09`, le versant mécanique de `B-14`, et cinq
  résiduels dormants — `A-03`, `B-05`, `C-07`, `C-17b`, `D-07` (versant mécanique).
- ADR appliqués, **aucun amendé** : ADR-0006 (amdt 2026-08-01 points 2-5, amdt 2026-08-02 (b)),
  ADR-0009 (contraintes 2, 4 et 5), ADR-0003 (amdt (d) points 6 et 8), ADR-0011 (§ 1, § 4, § 5),
  ADR-0004 (amdt (c)), ADR-0002 (§ 3, § 4).
- ADR **à créer, deux** : **ADR-0012 — preuve d'attribution de l'approbation**, entré au périmètre
  en `clarify` le 2026-08-04 ; et **ADR-0013 — régime d'amorçage du mécanisme d'application**, né
  en `plan` le 2026-08-05 de la réponse à `H-04` (l'IA écrit un lot dont 31 des 35 fichiers sont
  les chemins qu'ADR-0006 lui interdit d'éditer). ADR-0013 ne porte aucun `SHALL` du delta : c'est
  un régime d'**écriture** du lot, à expiration mécanique par `FR-036`.
- Exigence de 001 **restreinte** : `FR-020` (parité de verdict local/CI), en `[MODIFIED]`.
- Exigence de 001 **enfin tenue** : `FR-013` (provenance depuis le catalogue centralisé), que
  `É-06` débloque — voir l'avertissement ci-dessus.

> **Ce bloc est tenu à jour, et l'a été deux fois pour la même raison.** Il avait divergé de
> `spec.md` entre `specify` et `clarify` (quatre constats listés pour dix couverts, ADR-0012
> absent) ; il avait divergé de nouveau après `plan` (ADR-0013 absent, allowlist réseau encore
> annoncée comme ajoutée alors que le § *NON inclus* l'exclut, compte d'`É-02` faux). Les deux
> écarts ont été relevés par une gate `analyze`, jamais à la rédaction — **ce fichier ne se
> maintient pas tout seul** : le relire fait partie de toute passe corrective.
