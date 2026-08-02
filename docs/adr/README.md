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
| [0009](./ADR-0009-portail-qualite.md) | Portail de qualité (registre unique, contrat machine, *fail-closed*) | accepted | `tooling/`, `.claude/`, `.github/` | 0002, 0004, 0005, 0006, 0008 |
| [0010](./ADR-0010-modele-brouillon-publie.md) | Modèle brouillon/publié à deux contenus | accepted | `packages/`, `apps/` | 0004 |
| [0011](./ADR-0011-frontieres-de-contenu-hostile.md) | Frontières de contenu hostile | accepted | `packages/`, `apps/` | 0004 |

*(La numérotation ne saute plus rien : `0009`, resté candidat depuis le 2026-07-19, a été **promu `accepted` le 2026-08-01** — lot L7, constat `C-17f`. `0001` → `0011` existent tous ; le prochain ADR est `0012`. `_candidates/` est vide : il sera recréé au premier candidat suivant.)*

## Graphe de dépendance

```
0001  Pratique ADR
  └─ 0002  Gouvernance agent (3 couches)
       └─ 0003  Socle technique
            └─ 0004  Architecture (cœur packagé + tranches)
                 ├─ 0005  Stratégie de test
                 ├─ 0006  Génération IA & vérification   ←(aussi 0002, 0005)
                 │    └─ 0009  Portail de qualité         ←(aussi 0002, 0004, 0005, 0008)
                 ├─ 0007  Constructeur de formulaires     ←(aussi 0003)
                 ├─ 0008  Mise à jour de la flotte         ←(aussi 0003)
                 ├─ 0010  Modèle brouillon/publié
                 └─ 0011  Frontières de contenu hostile
```

Principe : **un ADR ne dépend que de ceux qui le précèdent.** La gouvernance précède le socle, le socle précède l'architecture, l'architecture définit les seams que le test vise, que la génération IA verrouille, que le constructeur de formulaires consomme, et que le versionnage de flotte exploite (frontière cœur/client).

ADR-0009 est le seul ADR dont le sujet n'est pas le produit mais **l'outillage qui le vérifie**. ADR-0002 §3 et ADR-0006 §7/§9 imposent *qu'un* portail déterministe existe ; 0009 tranche où il vit, comment ses contrôles sont définis, ce qu'il émet et comment il se comporte quand un contrôle ne peut pas s'exécuter (*fail-closed*). Il dépend d'ADR-0008 parce que la publication délibérée de `main` est ce qui rend acceptable le décalage du contrôle de mutation vers le régime planifié.

ADR-0010 se greffe sur 0004 : il fixe *où vit le contenu et quand il devient public*, et amende par ricochet 0004 (modèle de données), 0007 (définition publiée) et 0005 (cibles de test).

ADR-0011 se greffe sur 0004 de la même façon, sur l'autre face : il fixe *ce que devient un contenu que le produit n'a pas écrit* — frontière d'entrée (schéma), de rendu (contexte déclaré) et de transport (en-têtes). C'est la racine « sécurité » que la chaîne documentaire n'avait pas (audit du 2026-08-01) ; elle appelle des suites dans 0004 (sortie de `toBlocks()`, `LinkTarget`, aperçu SSR), 0007 (chemin de soumission), 0008 (règle livrée au projet client) et 0005 (cibles de test).

## Documents amont (hors ADR)

Les ADR tracent vers la chaîne de documents produit : [brief](../brief.md) → [PRD](../prd.md) → [stack](../stack.md) → ADR → [CLAUDE.md](../../CLAUDE.md). La recherche sourcée qui a nourri le socle technique a été condensée dans sa forme décisionnelle, [ADR-0003](./ADR-0003-socle-technique.md).

## Conventions

- **Immuabilité** : on ne supprime jamais un ADR ; on change son `status` (`proposed → accepted → deprecated / superseded`) et on lie `supersedes` ↔ `superseded-by`.
- **Un ADR = une décision** ; fichier `ADR-NNNN-titre-court.md`, numérotation monotone.
- **Front-matter YAML** obligatoire (parsable) ; section **`## Constraints`** = source des vérifications déterministes (hooks/CI, cf. ADR-0002).
- **Écrit dans la même PR** que le changement de code ; une PR introduisant un patron structurant sans ADR est rejetée en revue.

## Contraintes actives (agrégées, pour compilation en hooks/CI)

Les règles INTERDIT/OBLIGATOIRE vivent dans la section `## Constraints` de chaque ADR ; leur agrégat est la base des hooks `PreToolUse` et des checks CI. Les plus porteuses sont reprises en impératif dans `CLAUDE.md`.
