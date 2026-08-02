---
id: ADR-0009
title: Portail de qualité (topologie, registre à source unique, contrat machine, fail-closed)
status: accepted
date: 2026-08-01
authors: [sebc-dev]
scope: tooling/, .claude/, .github/
supersedes: []
superseded-by: null
depends-on: [ADR-0002, ADR-0004, ADR-0005, ADR-0006, ADR-0008]
---

# ADR-0009 — Portail de qualité : topologie, registre à source unique, contrat machine, fail-closed

**Statut :** accepted — 2026-08-01 · *promu depuis `_candidates/`, rédigé le 2026-07-19*

> **Note de promotion — 2026-08-01** (suites de l'audit de sécurité, lot L7, constat `C-17f`).
> Cet ADR est resté **candidat** une semaine de trop : la feature `001-ci-quality-gate`
> a été livrée (lots R1 → R11, 2026-07-26) et le portail tourne — onze contrôles, deux hooks
> `PreToolUse`, CI par changement et build planifié —, si bien qu'un dispositif appliquait des
> règles qu'**aucun document accepté ne reconnaissait comme sources de vérifications
> déterministes** (ADR-0002 § 3). C'est l'inverse de la gouvernance : l'application existait, sa
> charte était une ébauche qui disait d'elle-même ne pas en être une.
>
> **La décision, les alternatives, les conséquences et les six contraintes ci-dessous sont celles
> du candidat, inchangées.** La promotion ne les rouvre pas.
>
> **Vérification faite à la promotion**, contrainte par contrainte, contre le code livré : cinq
> sont tenues à la lettre — `tooling/quality-gate` hors `packages/`/`apps/` ; registre unique
> `src/checks/index.ts` tagué par régime et `runGate()` appelé aussi bien par `pnpm gate` que par
> la CI ; mutation cantonnée au régime planifié (`nightly.yml`) et absente du gate de merge ;
> `renderHuman` et `renderMachine` dérivés du même `GateResult` ; enveloppe *fail-closed* du
> `runner`. **La sixième ne l'est qu'à moitié** : la baseline de survivants est bien versionnée,
> à cliquet, et son absence ou son illisibilité fait échouer le contrôle — mais
> `mutation-survivors.baseline.json` **n'est pas** dans `estCheminProtege()`
> (`tooling/quality-gate/src/protected-paths.ts`), donc pas « possédée par l'humain » au sens du
> § 5. Une génération peut y ajouter une entrée et faire verdir le build planifié — c'est-à-dire
> désarmer le cliquet qui borne le négatif assumé au § Conséquences.
>
> **Cause, écrite parce qu'elle est instructive** : la liste livrée est exactement celle
> d'ADR-0006 § 9, antérieur à la baseline que le présent ADR a inventée. Personne n'a écrit la
> jointure entre une contrainte nouvelle et la liste qui l'aurait appliquée — la même classe de
> défaut que `C-17f` lui-même. **Écart nommé, assigné au lot L10**, avec l'extension de la liste
> protégée demandée par `C-17f` : c'est le même geste, sur le même fichier.
>
> **Échéance, écrite ici pour ne pas dépendre d'un document de travail temporaire** : l'exposition
> est **nulle aujourd'hui** — la baseline vaut `[]` et le contrôle `mutation` retourne `ignoré`
> tant que `packages/core` n'existe pas —, et elle devient réelle **au premier commit de
> `packages/core`**. La correction est donc due **avant la première ligne du cœur**, condition
> vérifiable sans relire quoi que ce soit. *Contrainte d'ordre à ne pas manquer* : étendre
> `estCheminProtege()` rend `tooling/quality-gate/` protégé, donc **`protected-paths.ts` se protège
> lui-même à l'instant où on le modifie** — le marqueur d'approbation d'ADR-0006 (amdt 2026-08-01
> point 3) doit exister **avant ou dans la même tranche**, sans quoi le geste suivant sur ce fichier
> est bloqué sans issue.

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
> ~~À activer seulement une fois l'ADR promu en `accepted` (source de vérifications déterministes).~~
> **→ Levé le 2026-08-01 (promotion, lot L7).** L'ADR est `accepted` : ces six contraintes sont
> désormais des sources de vérifications déterministes au sens d'ADR-0002 § 3, compilées en hooks
> `PreToolUse` et en contrôles du portail. Cinq sont tenues par le code livré ; la sixième ne l'est
> qu'à moitié — voir la note de promotion en tête.
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
