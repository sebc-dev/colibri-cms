# Journal des décisions d'architecture — ColibriCMS

Ce répertoire est l'**Architecture Decision Log** du projet. Chaque décision porteuse y vit sous forme d'ADR immuable (voir [ADR-0001](./ADR-0001-record-architecture-decisions.md)). Cet index est le point d'entrée pointé par `CLAUDE.md` ; l'agent le lit à chaque session, puis lit les ADR complets **à la demande**.

## Index

| N° | Titre | Statut | Scope | Dépend de |
|---|---|---|---|---|
| [0001](./ADR-0001-record-architecture-decisions.md) | Enregistrer les décisions d'architecture | accepted | `docs/adr/` | — |
| [0002](./ADR-0002-gouvernance-adr-claude-code.md) | Gouvernance ADR-driven (Claude Code) | accepted | `docs/adr/`, `CLAUDE.md`, `.claude/` | 0001 |
| [0003](./ADR-0003-socle-technique.md) | Socle technique (versions figées) | accepted | `.` | 0002 |
| [0004](./ADR-0004-architecture-du-code.md) | Architecture du code (cœur packagé + tranches par contenu) | accepted | `packages/`, `apps/` | 0003 |
| [0005](./ADR-0005-strategie-de-test.md) | Stratégie de test | accepted | `tests/`, configs | 0003, 0004 |
| [0006](./ADR-0006-generation-ia-verification.md) | Génération IA & portail de vérification | accepted | `.claude/`, `tests/` | 0002, 0004, 0005 |
| [0007](./ADR-0007-constructeur-de-formulaires.md) | Constructeur de formulaires (générique, borné) | accepted | `core/form`, `admin` | 0003, 0004 |
| [0008](./ADR-0008-mise-a-jour-de-la-flotte.md) | Versionnage & mise à jour de la flotte | accepted | `.` | 0003, 0004 |

## Graphe de dépendance

```
0001  Pratique ADR
  └─ 0002  Gouvernance agent (3 couches)
       └─ 0003  Socle technique
            └─ 0004  Architecture (cœur packagé + tranches)
                 ├─ 0005  Stratégie de test
                 ├─ 0006  Génération IA & vérification   ←(aussi 0002, 0005)
                 ├─ 0007  Constructeur de formulaires     ←(aussi 0003)
                 └─ 0008  Mise à jour de la flotte         ←(aussi 0003)
```

Principe : **un ADR ne dépend que de ceux qui le précèdent.** La gouvernance précède le socle, le socle précède l'architecture, l'architecture définit les seams que le test vise, que la génération IA verrouille, que le constructeur de formulaires consomme, et que le versionnage de flotte exploite (frontière cœur/client).

## Documents amont (hors ADR)

Les ADR tracent vers la chaîne de documents produit : [brief](../brief.md) → [PRD](../prd.md) → [stack](../stack.md) → ADR → [CLAUDE.md](../../CLAUDE.md). La recherche sourcée détaillée (note « Socle de versions stables gelées », 9 juillet 2026) est conservée en archive sous [`docs/research/`](../research/), pointée par ADR-0003.

## Conventions

- **Immuabilité** : on ne supprime jamais un ADR ; on change son `status` (`proposed → accepted → deprecated / superseded`) et on lie `supersedes` ↔ `superseded-by`.
- **Un ADR = une décision** ; fichier `ADR-NNNN-titre-court.md`, numérotation monotone.
- **Front-matter YAML** obligatoire (parsable) ; section **`## Constraints`** = source des vérifications déterministes (hooks/CI, cf. ADR-0002).
- **Écrit dans la même PR** que le changement de code ; une PR introduisant un patron structurant sans ADR est rejetée en revue.

## Contraintes actives (agrégées, pour compilation en hooks/CI)

Les règles INTERDIT/OBLIGATOIRE vivent dans la section `## Constraints` de chaque ADR ; leur agrégat est la base des hooks `PreToolUse` et des checks CI. Les plus porteuses sont reprises en impératif dans `CLAUDE.md`.
