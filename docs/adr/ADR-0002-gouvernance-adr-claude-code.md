---
id: ADR-0002
title: Gouvernance ADR-driven d'un projet codé par agent (Claude Code)
status: accepted
date: 2026-07-10
authors: [arborescence-digital]
scope: docs/adr/, CLAUDE.md, .claude/
supersedes: []
superseded-by: null
depends-on: [ADR-0001]
---

# ADR-0002 — Gouvernance ADR-driven d'un projet codé par agent (Claude Code)

**Statut :** accepted — 2026-07-10

> **Le maillon manquant.** ADR-0001 crée la mémoire de décision. ADR-0002 la rend *effective* face à un agent, car **un ADR chargé dans le contexte infléchit le comportement de l'agent mais ne le contraint pas** : la doc Claude Code est explicite — la mémoire (CLAUDE.md) est traitée comme du contexte, pas comme une configuration imposée. Pour ce qui *ne doit pas* arriver, il faut une couche déterministe.

## Contexte

- Le code métier V1 est majoritairement écrit par l'agent. Repère d'usage (Anthropic, « How Claude Code is used in practice », 2026) : en moyenne l'humain prend ~70 % des décisions de *planification* mais l'agent ~80 % des décisions d'*exécution*. L'ADR est précisément la couche où le « quoi/pourquoi » humain est capturé et rendu opposable à l'exécution déléguée.
- Chaque session d'agent démarre avec un contexte vierge ; la performance se dégrade quand le contexte se remplit (biais de récence : les instructions du milieu « se noient »). Un ADR long injecté intégralement **réduit** donc l'adhérence — l'inverse de l'effet recherché.
- Évidence empirique (Gloaguen et al., 2026, sur AGENTbench/SWE-bench) : les fichiers de contexte **écrits à la main** n'apportent qu'un gain modeste (~+4 %), et ceux **générés par LLM** *dégradent* le taux de succès (~-3 %) tout en coûtant >20 % d'inférence. → écrire à la main et élaguer, ne pas auto-générer en masse.

## Décision

Gouvernance à **trois couches**, chacune pour ce qu'elle sait faire :

1. **ADR (`docs/adr/`) — la mémoire (« pourquoi »).** Versionnés près du code, greppables par l'agent, immuables (ADR-0001).
2. **`CLAUDE.md` — l'index injecté (« quoi respecter maintenant »).** < 200 lignes, chargé à chaque session. Il **pointe** vers `docs/adr/README.md` (`@docs/adr/README.md`) et ne recopie que les **5-15 contraintes actives** en style impératif. Il ne **duplique jamais** un ADR entier (répétition = gaspillage de contexte + dérive). Les ADR complets sont lus **à la demande** (progressive disclosure).
3. **Hooks & CI — l'application (« ce qui ne peut pas passer »).** Les sections `## Constraints` des ADR (INTERDIT/OBLIGATOIRE) sont **compilées en vérifications déterministes** : `PreToolUse` (bloque une écriture qui viole une contrainte — exit 2 renvoie la raison au modèle, prioritaire même en `--dangerously-skip-permissions`), `PostToolUse` (lint/format), CI (relit le diff, récupère les ADR touchés, échoue le build en cas de violation).

Règle d'aiguillage : **si une violation devrait bloquer un merge → CI/hook ; si elle ferait tiquer un reviewer → `CLAUDE.md` ; jamais compter sur `CLAUDE.md` pour ce qui ne doit pas arriver.**

Boucle de travail (détail opérationnel en ADR-0006) : en **Plan Mode**, l'agent lit d'abord les ADR pertinents et **signale tout conflit** avec un ADR accepté au lieu de le contourner silencieusement ; s'il introduit une nouvelle décision structurante, il rédige un ADR *proposed* soumis à approbation humaine **avant** d'écrire du code.

## Consequences
- Positif : les décisions porteuses deviennent effectivement appliquées, pas seulement suggérées.
- Positif : contexte d'agent maîtrisé (index léger + lecture à la demande) → meilleure adhérence.
- Positif : `## Constraints` sert double emploi — lisible par l'humain **et** compilable par un outil.
- Négatif : coût de maintien des hooks/CI et de l'élagage de `CLAUDE.md`.
- Second ordre : la valeur dépend de la discipline « ADR dans la même PR » (ADR-0001) et de la propriété humain/IA des fichiers (ADR-0006).

## Alternatives Considered
- **Tout mettre dans `CLAUDE.md`** (contraintes en prose). *Rejeté* : contexte ≠ contrainte ; les règles se noient et l'agent peut les violer.
- **Auto-générer ADR/CLAUDE.md en masse par l'agent.** *Rejeté* : Gloaguen et al. — dégrade le succès, coût d'inférence.
- **`AGENTS.md` remplace les ADR** (thèse « plans de contrôle exécutables »). *Rejeté* : confond mémoire de décision et instructions opérationnelles ; Claude Code lit `CLAUDE.md`, pas `AGENTS.md` (import ou symlink si besoin).
- **Outil d'enforcement dédié** (type compilateur ADR→contraintes). *Différé* : prometteur mais jeune/mono-dépôt ; on part de hooks maison + CI, réévaluer à maturité.

## Constraints
- **OBLIGATOIRE** : `CLAUDE.md` < 200 lignes, pointant vers `docs/adr/README.md`.
- **INTERDIT** : recopier un ADR entier dans `CLAUDE.md` ; **INTERDIT** : auto-générer des fichiers de contexte en masse.
- **OBLIGATOIRE** : toute règle « ne doit pas arriver » est appliquée par un hook `PreToolUse` ou la CI, jamais par le seul `CLAUDE.md`.
- **OBLIGATOIRE** : chaque section `## Constraints` d'ADR est la source des vérifications déterministes correspondantes.
- **OBLIGATOIRE** : en Plan Mode, l'agent lit les ADR du `scope` concerné avant d'implémenter.

## Related
- Fondé sur : ADR-0001 (pratique ADR).
- Applique la gouvernance à : ADR-0003, ADR-0004, ADR-0005 (leurs `## Constraints`).
- Détaille le portail de vérification de la génération IA : ADR-0006.
- Sources : doc Claude Code (Memory, Best practices, Hooks) ; Anthropic « How Claude Code is used in practice » (2026) ; Gloaguen et al. (2026) ; ThoughtWorks Radar (« Curated shared instructions », Adopt).
