---
id: ADR-0009
title: Portail de qualité (topologie, registre à source unique, contrat machine, fail-closed)
status: candidate    # CANDIDAT — à promouvoir manuellement en `proposed` puis `accepted`
date: 2026-07-19
authors: [sebc-dev]
scope: tooling/, .claude/, .github/
supersedes: []
superseded-by: null
depends-on: [ADR-0002, ADR-0004, ADR-0005, ADR-0006, ADR-0008]
---

# ADR-0009 (candidat) — Portail de qualité : topologie, registre à source unique, contrat machine, fail-closed

> **Statut : candidat.** Ébauche produite pendant le plan de la feature `001-ci-quality-gate`.
> À promouvoir manuellement (`_candidates/` → `docs/adr/`) après approbation. Tant qu'il est ici,
> il n'est **pas** une source de vérifications déterministes.

## Contexte

ADR-0002 §3 et ADR-0006 §7/§9 imposent *qu'un* portail déterministe existe (couche « ce qui ne peut
pas passer ») et *que* des hooks Claude Code protègent en amont les fichiers possédés par l'humain.
Ils ne tranchent **pas** : où vit ce portail dans le monorepo, comment ses contrôles sont définis pour
garantir la parité local/CI, quel est le format de sa sortie machine, ni comment il se comporte quand
un contrôle ne peut pas s'exécuter. La feature 001 doit fixer ces points structurants — hérités par
**chaque instance client** de la flotte — d'où ce candidat ADR.

## Décision

1. **Topologie `tooling/`.** Le portail vit dans `tooling/quality-gate`, un workspace **hors**
   `packages/` et `apps/`. C'est de l'outillage de dev, non livré au client, et il n'est donc pas
   soumis aux frontières d'imports d'ADR-0004 (il peut dépendre de n'importe quel outil).

2. **Registre de contrôles à source unique.** Les contrôles sont un **tableau ordonné** de
   descripteurs `Check` en TypeScript. Le **même** `runGate()` est appelé en local (`pnpm gate`) et
   en CI. La parité (ADR-0006 §7) est garantie *par construction* : il n'existe aucune seconde liste
   de contrôles à maintenir (pas de duplication script local ↔ YAML CI).

3. **Contrat machine stable.** Le portail émet, en plus du rapport lisible, une **représentation
   machine** (JSON validé Zod) `{ verdict, nbEchecs, checks: [{ contrôle, statut, cause? }] }`, dérivée
   du **même** objet `GateResult` que le rapport lisible (⇒ statuts jamais divergents). Ce contrat est
   inhérité par toute la flotte ; une rupture de sa forme est traitée comme une rupture porteuse.

4. **Fail-closed + `ignoré` ≠ `passé`.** Chaque contrôle est enveloppé : toute exception, tout outil
   absent ⇒ `échoué` (jamais `passé` ni silencieusement `ignoré`). Le statut `ignoré` est réservé à un
   **périmètre vérifié vide** (ex. aucun `core` touché, aucune route publique), jamais utilisé comme
   repli d'erreur. Un contrôle ne court-circuite jamais la suite (rapport complet).

5. **Baseline de survivants gouvernée par cliquet.** L'ensemble des mutants survivants tolérés vient
   d'un **fichier versionné explicite** (jamais un seuil codé en dur — ADR-0006 §8). Il est **possédé
   par l'humain** (chemin protégé par le hook) : un mutant tué doit en être retiré, et la base ne peut
   être élargie pour verdir. Absente/illisible ⇒ le contrôle de mutation est `échoué` ; un fichier
   présent et vide signifie « zéro survivant toléré ».

6. **Deux régimes d'exécution, un seul registre.** Chaque contrôle est **tagué par régime** dans le
   registre unique, et `runGate(ctx, régime)` filtre. Le **régime par-changement** (local pré-push + CI
   par PR) est le **gate de merge** : tous les contrôles *sauf* la mutation, pour rester léger sur le
   chemin d'itération. Le **régime planifié** (récurrent sur `main`, ex. nightly ; aussi lançable en
   local) porte le contrôle **lourd** de mutation et la gouvernance de sa baseline. La parité local/CI
   (ADR-0006 §7) s'entend **par régime**. C'est l'exercice de la clause pré-enregistrée d'ADR-0006
   §« Seuils qui feraient reconsidérer » (« coût mutation > budget CI → nightly/pré-merge ciblé plutôt
   qu'à chaque PR ») — donc **pas** une dérogation à ADR-0006, mais l'activation d'un repli qu'il
   prévoit. Une régression détectée par le régime planifié échoue le build planifié : enforcement
   **mécanique**, jamais laissé à la seule discipline locale (ADR-0002 §3).

## Alternatives considérées

- **Portail dans `packages/quality-gate`** — *rejeté* : le drague sous les frontières ADR-0004 alors
  qu'il n'est pas du cœur livré.
- **Portail en scripts shell / `scripts/` racine** — *rejeté* : pas de typage ni de tests propres,
  pas de parité de build Turborepo, dérive plus facile.
- **Deux définitions de contrôles (local + CI YAML)** — *rejeté* : dérive garantie, casse la parité.
- **Score de mutation en pourcentage** — *rejeté* : ADR-0006 §8 (l'IA gonfle la couverture ;
  viser le risque, pas un score).
- **Mutation en « local only » (hors CI)** — *rejeté* : déplacerait la mutation vers la discipline du
  dev ; plus rien n'empêcherait mécaniquement un test creux de merger — contre ADR-0002 §3. Le régime
  planifié (nightly) garde l'enforcement mécanique tout en sortant la mutation du chemin PR.
- **Mutation par PR scopée au diff (incrémentale)** — *rejeté* : même ciblée, elle alourdit chaque
  itération ; le décalage nightly est préférable car `main` n'est pas déployé automatiquement (ADR-0008).

## Conséquences

- **Positif** : parité local/CI par construction (par régime) ; un gate qui ne verdit jamais sans avoir
  vérifié ; un contrat machine réutilisable (annotations CI) et stable pour la flotte ; des PR légères
  (mutation hors du chemin d'itération) sans perdre l'enforcement mécanique de la mutation.
- **Négatif** : un workspace de plus à câbler (`catalog:`/`package.json`) ; la valeur du fail-closed
  dépend de la discipline « ne pas rattraper une exception dans un contrôle pour verdir ».
- **Négatif (assumé)** : un test creux généré par l'IA peut atteindre `main` et y vivre **jusqu'au
  prochain passage du régime planifié** (≤ un cycle) avant d'être attrapé. Acceptable car (a) `main`
  n'est **pas** déployé automatiquement (ADR-0008 : release délibérée, migrations par étape outillée) et
  (b) l'enforcement reste **mécanique** (build planifié échoué, bloquant la suite), pas discipline. Le
  repli « local only » a été écarté précisément pour préserver ce (b).

## Constraints
> À activer seulement une fois l'ADR promu en `accepted` (source de vérifications déterministes).
- **OBLIGATOIRE** : le portail vit dans `tooling/` (hors frontières ADR-0004).
- **OBLIGATOIRE** : contrôles définis une seule fois (registre TS, tagués par régime) ; local et CI appellent le même `runGate(ctx, régime)`.
- **OBLIGATOIRE** : le régime par-changement (gate de merge) exclut la mutation ; la mutation vit dans le régime planifié (récurrent sur `main`), exécuté **mécaniquement** en CI — jamais laissé à la seule discipline locale.
- **OBLIGATOIRE** : rapport lisible et sortie machine dérivés du même `GateResult` (statuts non divergents).
- **OBLIGATOIRE** : fail-closed — exception/outil absent ⇒ `échoué` ; `ignoré` uniquement sur périmètre vérifié vide.
- **OBLIGATOIRE** : baseline de survivants versionnée, possédée par l'humain, à cliquet ; absente/illisible ⇒ `échoué`.

## Related
- Impose l'existence du portail/hooks : ADR-0002 (§3), ADR-0006 (§7/§9).
- Repli d'exécution pré-enregistré (mutation nightly/pré-merge ciblé) : ADR-0006 §« Seuils qui feraient reconsidérer ».
- Frontières verrouillées par le portail : ADR-0004.
- Cibles de test réutilisées : ADR-0005.
- Release délibérée de `main` (justifie le décalage nightly du contrôle de mutation) : ADR-0008.
- Spec source : specs/001-ci-quality-gate/spec.md · plan : specs/001-ci-quality-gate/plan.md
