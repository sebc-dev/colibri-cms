---
id: ADR-0001
title: Enregistrer les décisions d'architecture
status: accepted
date: 2026-07-10
authors: [arborescence-digital]
scope: docs/adr/
supersedes: []
superseded-by: null
depends-on: []
---

# ADR-0001 — Enregistrer les décisions d'architecture

**Statut :** accepted — 2026-07-10

> **Racine de la famille.** ADR méta au sens de Nygard (2011) : il acte *que* le projet documente ses décisions, et *comment*. Tous les autres ADR en découlent.

## Contexte

ColibriCMS est un CMS sur-mesure dont la **majorité du code métier V1 est générée par un agent IA** (Claude Code). Une nouvelle personne — ou un agent, à chaque session au contexte vierge — arrivant sur une décision passée n'a que deux mauvais choix sans trace : l'accepter aveuglément ou la changer aveuglément. Le projet est répliqué par client : la mémoire de décision doit voyager avec le code, être greppable et lisible par l'agent avec ses outils de fichiers.

## Décision

Le projet documente chaque **décision d'architecture significative** dans un **ADR** — un fichier markdown court, versionné dans le dépôt sous `docs/adr/`, au format Nygard enrichi (front-matter YAML + sections `Context / Decision / Consequences / Alternatives Considered / Constraints / Related`).

Règles de tenue :
- **Un ADR = une décision.** Au-delà d'une page dense, scinder.
- **Numérotation séquentielle 4 chiffres, jamais réutilisée** : `ADR-NNNN-titre-court.md`.
- **Titre = syntagme nominal décrivant la décision**, pas le problème.
- **Immuabilité** : un ADR n'est jamais supprimé ; seul son `status` évolue (`proposed → accepted → deprecated / superseded`). Une supersession lie les deux sens (`supersedes` ↔ `superseded-by`).
- **Écrit pendant la décision**, dans la **même PR** que le changement de code — jamais rétroactivement.

## Consequences
- Positif : journal d'audit de l'évolution de l'architecture ; onboarding humain et agent accéléré ; l'« Alternatives Considered » empêche de re-débattre l'écarté.
- Positif : chaque décision est opposable au code généré (traçabilité PR ↔ ADR).
- Négatif : discipline de rédaction à tenir ; coût léger par décision.
- Second ordre : l'*application* des décisions n'est pas garantie par leur simple existence — d'où ADR-0002.

## Alternatives Considered
- **Wiki / Confluence / Notion.** *Rejeté* : se désynchronise du code, invisible aux outils de l'agent (ThoughtWorks recommande le contrôle de version).
- **Aucune documentation formelle** (mémoire orale / commits). *Rejeté* : mémoire perdue au premier départ ; illisible par l'agent.
- **Y-statements seuls.** *Rejeté comme format unique* : utiles en complément haut-volume/faible-enjeu, insuffisants pour les décisions porteuses.

## Constraints
- **OBLIGATOIRE** : tout patron structurant introduit (par un humain ou l'agent) est accompagné d'un ADR dans la **même PR**.
- **INTERDIT** : supprimer ou réécrire un ADR accepté (changer le `status`, superseder).
- **OBLIGATOIRE** : numérotation monotone `ADR-NNNN`.

## Related
- Applique la pratique : Nygard (2011), MADR 4.0.0, ThoughtWorks « Lightweight ADR » (Adopt).
- Mise en œuvre agent : ADR-0002.
- Index : `docs/adr/README.md`.
