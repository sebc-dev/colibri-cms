# Système documentaire optimal pour un développeur solo pilotant Claude Code

## TL;DR

- **Le jeu documentaire minimal suffisant tient en six artefacts hiérarchisés du plus stable au plus volatil** : (1) un **CLAUDE.md** court (contrat opérationnel, chargé à chaque session) ; (2) un **Brief/Vision** ; (3) une **Spec fonctionnelle/PRD** technology-agnostic centrée sur les critères d'acceptation ; (4) un **Plan technique** (le « comment ») ; (5) un **plan de tâches** traçable ; (6) des **ADR** pour les décisions. La **Definition of Done** est une section de CLAUDE.md matérialisée par des vérifications exécutables, pas un document séparé.
- **Le principe directeur, convergent entre la doc Anthropic (« context engineering ») et les praticiens (Harper Reed, GitHub Spec Kit, Armin Ronacher) : la spécification devient la source de vérité et le code est régénérable, MAIS tout document chargé en contexte a un coût.** D'où la règle de conception : soit court et permanent (CLAUDE.md), soit détaillé mais chargé à la demande (specs/plans dans `docs/`).
- **La doc seule ne suffit pas : CLAUDE.md est *advisory*, pas contraignant.** Ce qui doit arriver à 100 % (lint, tests, gates) doit être un **hook/linter/test déterministe** ; et la fidélité besoin→code se garantit par des **tests dérivés des critères d'acceptation** + une **revue adverse par sous-agent contre le plan**.

---

## Key Findings

1. **Deux contraintes techniques structurent toute la conception documentaire** (source primaire Anthropic, confiance Élevée) : (a) la fenêtre de contexte se remplit vite et la performance se dégrade quand elle se remplit (« context rot ») ; (b) CLAUDE.md est rechargé à chaque session et survit à la compaction — chaque ligne est donc payée en tokens en permanence.

2. **Bipartition documentaire obligatoire** : documents « toujours chargés » (CLAUDE.md, court) vs. documents « chargés à la demande » (specs, plans, ADR dans `docs/`, référencés par `@chemin` ou lus au moment voulu).

3. **La communauté n'est PAS alignée sur le nombre d'artefacts** : quatre écoles coexistent (minimalisme Harper Reed ; GitHub Spec Kit ; BMAD multi-agents ; boucles Ralph). Pour un solo, la recommandation tranchée est : **socle minimaliste + emprunts ciblés à Spec Kit**.

4. **La distinction advisory/déterministe est le point le plus mal compris** : la doc officielle est explicite — CLAUDE.md est traité « as context, not enforced configuration » ; seuls les hooks « guarantee the action happens ».

5. **Les tests sont le mécanisme central de traçabilité vivante** : sans vérification exécutable, « looks done » est le seul signal disponible pour l'agent.

---

## Details

### Partie 1 — Le jeu documentaire optimal

#### Cadre conceptuel : deux contraintes structurantes

Toute la conception découle de deux faits établis par Anthropic :

1. **La fenêtre de contexte se remplit vite et la performance se dégrade.** La doc Claude Code l'énonce comme contrainte n°1 : *« Most best practices are based on one constraint: Claude's context window fills up fast, and performance degrades as it fills. »* Le blog ingénierie Anthropic « Effective context engineering for AI agents » (29 sept. 2025) formalise l'objectif : trouver *« the smallest set of high-signal tokens that maximize the likelihood of your desired outcome »*. Confiance : **Élevée**.

2. **CLAUDE.md est chargé à CHAQUE session** et survit à la compaction (relu depuis le disque après `/compact`). Point crucial, corrigé et sourcé : **CLAUDE.md est chargé en entier quelle que soit sa longueur** — la doc officielle « How Claude remembers your project » précise que la limite des 200 lignes concerne MEMORY.md (auto memory), pas CLAUDE.md : *« The first 200 lines of MEMORY.md, or the first 25KB, whichever comes first, are loaded at the start of every conversation… This limit applies only to MEMORY.md. CLAUDE.md files are loaded in full regardless of length. »* C'est précisément pour cela que la doc best-practices martèle la concision : *« Keep it concise. For each line, ask: "Would removing this cause Claude to make mistakes?" If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions! »* Un CLAUDE.md long n'est pas tronqué — il dilue les règles qui comptent et se paie à chaque tour.

**Corollaire de conception :** on sépare les documents « toujours chargés » (CLAUDE.md, court) des documents « chargés à la demande » (`docs/`, référencés par `@docs/fichier.md`). Cette bipartition est la clé (aligné doc officielle + praticien Cuong Tham). Confiance : **Élevée**.

#### Inventaire, rôle et valeur réelle

| Artefact | Rôle | Chargé quand ? | Indispensable ? |
|---|---|---|---|
| **CLAUDE.md** | Contrat opérationnel : commandes, conventions, workflow, gotchas, Definition of Done | À chaque session (auto) | **Oui — pivot du système** |
| **Brief / Vision** | Le « pourquoi » et le périmètre macro | À la demande / phase amont | Oui (léger) |
| **PRD / Spec fonctionnelle** | Le « quoi » et le « pourquoi » : user stories, critères d'acceptation, périmètre exclu | À la demande, par feature | **Oui — source de vérité** |
| **Plan technique** | Le « comment » : architecture, stack, contrats, fichiers touchés | À la demande, par feature | Oui |
| **Plan de tâches** | Découpage exécutable + suivi d'état inter-sessions | À la demande / pendant l'implémentation | Oui |
| **ADR** | Décisions d'architecture figées + rationale | Au moment d'une décision structurante | Recommandé |
| **Definition of Done** | Critères de complétion vérifiables | Intégrée à CLAUDE.md | Oui (section, pas doc séparé) |

**Redondances à éviter comme documents séparés :**
- Spec technique ET plan technique distincts → pour un solo, fusionner en un seul `plan.md` (confiance Moyenne).
- Doc d'API recopiée dans CLAUDE.md → la doc officielle recommande de **lier** (« Detailed API documentation (link to docs instead) ») (confiance Élevée).
- Plan de tâches figé DANS CLAUDE.md → anti-pattern : les plans changent trop souvent, CLAUDE.md doit rester stable (confiance Élevée).

#### Hiérarchie et séquence de production (greenfield)

Séquence consensuelle : **research → spec → plan → tasks → implement → validate**, en **boucles discrètes**.

1. **Brief/Vision** — rédigé par l'humain ou co-écrit en interviewant l'agent.
2. **Spec fonctionnelle** — Harper Reed recommande une phase d'« idea honing » où l'agent pose **une question à la fois** puis compile une spec sauvegardée en `spec.md` (il écrit explicitement : *« I like to save it as `spec.md` in the repo »*). La doc Claude Code propose le même pattern via `AskUserQuestion` : *« have Claude interview you first… Keep interviewing until we've covered everything, then write a complete spec to SPEC.md. »*
3. **CLAUDE.md** — généré via `/init` (analyse le repo) puis élagué à la main.
4. **Plan technique** — dans une session fraîche, l'agent lit la spec et produit un plan détaillé (**plan mode**). Harper Reed : donner la spec à un modèle de raisonnement et découper en petites étapes ; il sauvegarde ce plan en `prompt_plan.md` (*« I like to save this as `prompt_plan.md` in the repo »*).
5. **Plan de tâches** — Harper Reed produit un `todo.md` avec cases `[ ]` (*« I then have it output a `todo.md` that can be checked off… good for keeping state across sessions »*) ; pattern confirmé par la doc « memory tool » d'Anthropic pour agents longue durée.
6. **Implémentation** boucle par boucle, avec vérification à chaque étape.
7. **ADR** rédigés au moment où une décision structurante est prise.

Harper Reed note que les phases 1-2 prennent « maybe 15 minutes ». Confiance sur la séquence : **Élevée** (convergence Anthropic + Harper Reed + Spec Kit + BMAD).

#### Approches concurrentes (à choisir selon taille/criticité)

**A. Minimalisme « spec + plan + todo » (Harper Reed / Simon Willison).** Trois fichiers markdown (`spec.md`, `prompt_plan.md`, `todo.md`), boucles discrètes, pas de framework. **Idéal solo, petits/moyens projets.** Confiance : **Élevée** pour le solo.

**B. GitHub Spec Kit (spec-driven development).** Workflow gaté en 4 phases : **Specify → Plan → Tasks → Implement**, plus un `constitution.md` de principes non-négociables. Sépare strictement le « what/why » (spec, technology-agnostic) du « how » (plan). Outillé (CLI `specify`, commandes `/speckit.*`, `/speckit.analyze` comme quality gate). Le dépôt github/spec-kit affiche **118k étoiles et 10,5k forks** (page Issues de github/spec-kit, consultée le 10 juil. 2026 : « Fork 10.5k · Star 118k »). **Idéal projets sérieux/mission-critical.** Confiance : **Élevée** (source primaire GitHub + Microsoft).

**C. BMAD-METHOD (multi-agents « équipe Agile virtuelle »).** Agents spécialisés (Analyst, PM, Architect, PO, Scrum Master, Dev, QA) produisant Brief → PRD → Architecture → « story files ». Deux phases : Agentic Planning puis Context-Engineered Development. **Puissant mais lourd pour un solo.** Confiance sur pertinence solo : **Faible/Moyenne**.

**D. Ralph / boucles autonomes (Geoffrey Huntley).** Boucle relisant un `PROMPT.md`/specs à chaque itération, l'état survivant via fichiers + git (`while :; do cat PROMPT.md | claude-code ; done`). **Expérimental, tâches vérifiables automatiquement.** Armin Ronacher exprime une réserve nette pour du code auquel on tient (« The Coming Loop », juin 2026). Confiance recommandation solo : **Faible**.

**Position tranchée (solo, stacks variées, doc-contract) :** adopter **A comme socle** + emprunter à **B** la **séparation stricte spec (what) / plan (how)** et le **`constitution.md`** (fusionnable dans CLAUDE.md pour un solo). Réserver **C** aux projets à forte complexité produit ; ignorer **D** hors cas outillés. Confiance : **Moyenne-Élevée**.

---

### Partie 2 — Écrire pour un agent LLM (angle prioritaire)

**Ce qui distingue un doc « pour Claude Code » d'un doc « pour humain » :**

1. **Densité et « altitude » juste.** Le blog context engineering décrit la « right altitude » : ni logique if-else fragile, ni généralités vagues — *« specific enough to guide behavior effectively, yet flexible enough to provide the model with strong heuristics. »*

2. **Structure parsable.** Markdown, titres hiérarchiques, listes, tableaux, blocs de code. Critères atomiques et numérotés (FR-001, SC-001…) pour la traçabilité.

3. **Verbes impératifs vérifiables plutôt qu'adjectifs.** Guide Augment Code (repris de Thoughtworks) : *« "Make it fast," "ensure high security," and "handle errors gracefully" give agents no actionable target. Replace adjectives with verifiable behaviors: "return structured error codes for all 4xx/5xx responses," "P99 latency < 50ms," "pass OWASP ZAP scan." »* Un adjectif = une hallucination potentielle.

4. **Gestion explicite du contexte.** Concevoir pour NE PAS tout charger : index court + détails à la demande. La doc mémoire officielle avertit : *« Splitting into @path imports helps organization but does not reduce context, since imported files load at launch »* — pour vraiment économiser le contexte, utiliser `.claude/rules/` avec scoping par chemins ou `docs/` chargé à la demande, pas les imports `@`.

5. **Rôle central des exemples.** La doc privilégie « montrer un patron existant » : *« Reference existing patterns… HotDogWidget.php is a good example. follow the pattern… »*

6. **Emphase pour la compliance.** Anthropic reconnaît utiliser des marqueurs : *« adding emphasis (e.g., "IMPORTANT" or "YOU MUST") to improve adherence »* — à user avec parcimonie.

**CLAUDE.md — conventions officielles :**
- **Emplacements** : `~/.claude/CLAUDE.md` (global) ; `./CLAUDE.md` (racine, versionné) ; `./CLAUDE.local.md` (perso, gitignoré) ; répertoires parents (monorepo) ; sous-répertoires (à la demande).
- **Contenu** (tableau officiel Include/Exclude) — Inclure : commandes non-devinables, règles de style qui diffèrent des défauts, instructions de test, étiquette du repo, décisions d'architecture spécifiques, quirks d'environnement, gotchas. Exclure : ce que l'agent déduit du code, conventions standard, doc d'API (lier), infos changeantes, descriptions fichier-par-fichier, platitudes.
- **Longueur** : la doc officielle ne fixe **pas** de limite chiffrée pour CLAUDE.md (le fichier est chargé en entier) mais insiste sur la concision. Le repère « ~150-200 lignes » est une **heuristique communautaire** (maketocreate, Bijit Ghosh), pas une règle Anthropic. [À VÉRIFIER : le chiffre « ~150-200 instructions fiablement suivies » attribué à HumanLayer n'est pas une donnée officielle Anthropic.]
- **`/init`** génère un CLAUDE.md de départ. Le raccourci `#` inline a été discontinué ; utiliser `/memory` ou demander conversationnellement.
- **Auto memory** : la doc « How Claude remembers your project » indique *« Auto memory requires Claude Code v2.1.59 or later »* et *« Auto memory is on by default »* ; Claude écrit ses apprentissages dans `~/.claude/projects/<projet>/memory/`. Distinction : **vous écrivez CLAUDE.md ; Claude écrit l'auto memory.**

**Advisory vs. déterministe (essentiel) :** La doc mémoire officielle : *« Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead. »* La doc best-practices : *« Hooks… are deterministic and guarantee the action happens »*, contrairement aux instructions CLAUDE.md « advisory ». **Implication :** tout ce qui DOIT arriver sans exception (lint, tests bloquants, interdiction d'écrire dans certains dossiers) doit être un **hook** ou un **linter**, pas une phrase. Confiance sur le principe : **Élevée**. Les chiffres de compliance précis (« 25-40 % vs 95 % ») proviennent d'un audit interne d'un praticien non reproductible → à ne PAS présenter comme fait établi (confiance Faible).

---

### Partie 3 — Traçabilité besoin → code

**Chaîne recommandée :** Besoin (Brief) → User story + critère d'acceptation (Spec) → tâche (Plan de tâches) → test exécutable → code. Chaque maillon référence le précédent par identifiant (Spec Kit et Kiro tracent les tâches vers les numéros de requirements).

**Critères d'acceptation comme contrat** — format Given/When/Then, entrées/sorties concrètes. Template officiel spec-kit : *« Given [initial state], When [action], Then [expected outcome] »*, + critères de succès mesurables (SC-001 « Users can complete account creation in under 2 minutes »).

**Tests comme contrat exécutable — mécanisme central.** La doc best-practices : *« Give Claude a check it can run… It's the difference between a session you watch and one you walk away from. »* Deux stratégies de fidélité PRD→code :
1. **Tests dérivés des critères d'acceptation** : le code est « fait » quand les tests passent.
2. **Revue adverse par sous-agent** en contexte frais, contre le plan : *« Use a subagent to review the rate limiter diff against PLAN.md. Check that every requirement is implemented, the listed edge cases have tests, and nothing outside the task's scope changed. Report gaps, not style preferences. »*

Spec Kit propose un mode TDD non-négociable dans sa constitution par défaut : *« No implementation code shall be written before: 1. Unit tests are written 2. Tests are validated and approved by the user 3. Tests are confirmed to FAIL (Red phase) »*. Confiance : **Élevée** que les tests soient le meilleur garant ; **Moyenne** sur l'imposition d'un TDD strict (contesté — Ronacher préfère souvent la conversation directe aux templates rigides).

**Gates déterministes :** un **Stop hook** exécutant tests/lint bloque la fin de tour tant que ça échoue. Précision sourcée : depuis Claude Code v2.1.143, *« If a Stop hook returns "decision": "block"… 8 times in a row for the same turn, Claude Code short-circuits the loop and ends the session with a warning »* (surchargeable via `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`). C'est la version « dure » de la Definition of Done.

---

### Partie 4 — Maintenabilité dans le temps

**Prévenir la dérive documentaire :**
1. **Un seul endroit par info** (« Repetition wastes context and increases the chance of drift » — doc officielle). Lier, ne pas recopier.
2. **Déplacer les invariants stables vers ce qui ne dérive pas** : linter (source de vérité du style), hooks, tests.
3. **CLAUDE.md stable, plans volatils** : racine petite et stable ; le changeant va dans `docs/` ou rules scoped.
4. **Revue périodique** (pratique communautaire Bijit Ghosh) : ~30 min trimestriels — vérifier que chaque commande tourne encore, supprimer les règles désormais appliquées par la CI. Confiance : **Moyenne** (bon sens, pas reco Anthropic).
5. **Traiter CLAUDE.md comme du code** : le relire quand ça déraille, l'élaguer, tester l'effet des changements (reco officielle).

**ADR pour figer les décisions** (format Nygard : titre, contexte, décision, conséquences). Valeur nouvelle avec les agents, bien formulée par Mneme HQ : *« An agent can touch twenty files in a minute, open a pull request… It has no shared memory of the last standup and no scar tissue from the outage that produced a given rule. »* Deux usages : (a) **référencer le dossier ADR dans CLAUDE.md** (« Before making any architectural choice… check `docs/adrs/` for existing decisions. Do not contradict accepted ADRs. ») ; (b) **générer les ADR avec l'agent** en scannant le code. Attention : charger un ADR en prompt ≠ le faire respecter — sans test/hook, il reste advisory. Confiance : **Élevée** sur l'utilité ; **Moyenne** sur l'enforcement (outillage émergent).

**Boucle research → plan → implement → validate** (boucle officielle « Explore, plan, code, commit ») :
- **Séparer recherche/plan de l'implémentation** (plan mode) pour éviter de « résoudre le mauvais problème ».
- **Sessions fraîches par tâche** (`/clear`) : *« A clean session with a better prompt almost always outperforms a long session with accumulated corrections. »*
- **État inter-sessions dans des fichiers** (`todo.md` coché, journal de progression), pas dans le contexte.
- **Sous-agents pour l'investigation** afin de ne pas polluer le contexte principal.

*Repère d'échelle sur l'usage réel* : le rapport Anthropic « How Claude Code is used in practice » repose sur *« a privacy-preserving analysis of around 400,000 interactive sessions from around 235,000 people between October 2025 and April 2026 »* et observe que l'humain prend l'essentiel des décisions de planification (le « quoi ») tandis que Claude prend celles d'exécution (le « comment ») — ce qui valide la centralité des documents de spécification pilotés par l'humain.

---

## Partie 5 — Templates copy-paste

> Annotations entre `[crochets]`. Templates volontairement courts et technology-agnostic.

### Template 1 — CLAUDE.md (racine projet, garder court et à haut signal)

```markdown
# [Nom du projet]

## Vue d'ensemble (3-5 bullets max)
- Objet : [ce que fait le produit, en une phrase]
- Utilisateurs : [qui]
- Voir @docs/brief.md pour la vision, @docs/specs/ pour les specs par feature

## Commandes (ce que Claude ne peut pas deviner)
- Build : `[commande]`
- Test (unitaire) : `[commande]`  # préférer lancer un seul test, pas toute la suite
- Lint/format : `[commande]`       # SOURCE DE VÉRITÉ du style — ne pas documenter les règles de style ici
- Run local : `[commande]`

## Architecture (à-plat, index — pas de description fichier-par-fichier)
- [module A] : [rôle] — patron de référence : `[chemin/fichier exemple]`
- [module B] : [rôle]
- Décisions figées : voir @docs/adr/ — NE PAS contredire un ADR accepté

## Conventions qui diffèrent des défauts du langage
- [ex : ES modules, pas CommonJS]
- [ex : pas de dépendance nouvelle sans justification]

## Workflow imposé
- Explorer + planifier AVANT de coder (plan mode) pour toute tâche multi-fichiers
- Typecheck + tests + lint AVANT de considérer une tâche terminée
- Commits : [convention]

## Definition of Done (une tâche n'est "done" que si)
- [ ] Tests correspondant aux critères d'acceptation écrits ET passants
- [ ] Lint + typecheck verts
- [ ] Rien hors périmètre de la tâche n'a été modifié
- [ ] Preuve fournie (sortie de test / build), pas seulement "ça a l'air fait"

## Gotchas / comportements non-évidents
- [ex : en mode debug, les emails sont loggés sur stdout — consulter le log pour le lien]

# IMPORTANT
- YOU MUST montrer la preuve (sortie de commande) au lieu d'affirmer le succès.
```
*Note : ce qui doit être garanti à 100 % (lint, tests bloquants) doit AUSSI être un hook dans `.claude/settings.json` — CLAUDE.md est advisory. Le fichier étant chargé en entier à chaque session, chaque ligne se paie en tokens : gardez-le à haut signal.*

### Template 2 — Brief / Vision (`docs/brief.md`)

```markdown
# Brief — [Projet]

## Problème
[Quel problème, pour qui, pourquoi maintenant. 3-5 phrases.]

## Objectif & résultat attendu
[Le "done" au niveau produit, mesurable si possible.]

## Utilisateurs & cas d'usage principaux
- [persona] → [job-to-be-done]

## Périmètre
- Inclus (v1) : [...]
- EXCLU (v1) : [...]   # crucial : borne l'agent, évite le sur-engineering

## Contraintes
- [techniques, légales, budget tokens, plateformes cibles]

## Critères de succès (mesurables)
- SC-001 : [métrique, ex "création de compte < 2 min"]
```

### Template 3 — Spec fonctionnelle par feature (`docs/specs/<feature>.md`) — inspiré spec-kit

```markdown
# Spec : [NOM FEATURE]
Statut : Draft | Créé : [date]

## User stories (priorisées)
### US1 — [titre] (Priorité : P1)
[Parcours en langage clair.]
- Pourquoi cette priorité : [valeur]
- Test indépendant : [comment vérifier isolément que ça délivre la valeur]
- Scénarios d'acceptation :
  1. **Given** [état initial], **When** [action], **Then** [résultat attendu]
  2. **Given** [...], **When** [...], **Then** [...]

## Cas limites
- Que se passe-t-il si [condition frontière] ?
- Comment le système gère [scénario d'erreur] ?

## Exigences fonctionnelles (atomiques, testables)
- **FR-001** : Le système DOIT [capacité précise]
- **FR-002** : L'utilisateur DOIT pouvoir [interaction]
- **FR-003** : Le système DOIT [ex : retourner un code d'erreur structuré pour tout 4xx/5xx]
  # Marquer l'incertitude explicitement :
- **FR-00X** : [NEEDS CLARIFICATION : question précise]

## Contrats d'entrée/sortie (schémas machine-lisibles)
[ex : schéma JSON de la requête/réponse, codes d'erreur]

## NON inclus (frontière de périmètre)
- [ce que la feature ne fait PAS — empêche les hallucinations d'ajout]

## Critères de succès mesurables
- **SC-001** : [métrique vérifiable]

> Règle de séparation : ce fichier reste technology-agnostic (WHAT & WHY).
> Aucun framework/lib/DB ici → cela va dans le plan technique.
```

### Template 4 — Plan technique par feature (`docs/specs/<feature>/plan.md`)

```markdown
# Plan technique : [feature]
Trace vers : docs/specs/<feature>.md

## Approche
[2-4 phrases : la stratégie retenue.]

## Stack & dépendances
- [langage, framework, libs — réutiliser l'existant sauf justification]

## Fichiers touchés (nommer précisément)
- `[chemin]` : [ce qui change]
- Patron à suivre : `[fichier exemple existant]`

## Contrats d'interface
- [signatures, endpoints, schémas]

## Décisions & alternatives écartées
- [décision] car [raison]. Écarté : [alternative]. → candidat ADR si structurant.

## Étape de vérification bout-en-bout
- [commande/test unique qui prouve que la feature marche]
```

### Template 5 — Plan de tâches (`docs/specs/<feature>/tasks.md`)

```markdown
# Tâches : [feature]
Trace vers : plan.md (fichiers) et spec.md (FR/SC)

- [ ] T1 — [action] → couvre FR-001 ; dépend de : —
- [ ] T2 — [action] → couvre FR-002 ; bloqué par T1
- [ ] T3 — Écrire les tests pour US1 (Given/When/Then) AVANT l'implémentation
- [ ] T4 — Implémenter US1 jusqu'à ce que T3 passe
- [ ] T5 — Revue adverse : sous-agent relit le diff contre plan.md

> Chaque tâche : assez petite pour être sûre, assez grande pour faire avancer.
> Claude coche les cases au fur et à mesure (état inter-sessions).
```

### Template 6 — ADR (`docs/adr/NNNN-titre.md`) — format Nygard + section agent

```markdown
# ADR-[NNNN] : [titre de la décision]
Statut : Proposé | Accepté | Remplacé par ADR-XXXX
Date : [date]

## Contexte
[Forces en présence, contraintes.]

## Décision
[La décision, en voix active : "Nous utiliserons X".]

## Conséquences
[Positives et négatives, ce à quoi le code s'engage désormais.]

## Alternatives considérées
- [alternative] : écartée car [raison]

## Contexte agent (optionnel)
- Modèle : [ex Claude ...] | Décision influencée/générée par l'agent : oui/non
- Revue humaine : [date, ajustements]
```

### Template 7 — Prompts de la séquence (d'après Harper Reed, verbatim)

**Idea honing (une question à la fois) :**
> « Ask me one question at a time so we can develop a thorough, step-by-step spec for this idea. Each question should build on my previous answers, and our end goal is to have a detailed specification I can hand off to a developer. Let's do this iteratively and dig into every relevant detail. Remember, only one question at a time. Here's the idea: <IDEA> »

**Compilation de la spec :**
> « Now that we've wrapped up the brainstorming process, can you compile our findings into a comprehensive, developer-ready specification? Include all relevant requirements, architecture choices, data handling details, error handling strategies, and a testing plan so a developer can immediately begin implementation. »

**Planning (blueprint TDD) :**
> « Draft a detailed, step-by-step blueprint for building this project. Then, once you have a solid plan, break it down into small, iterative chunks that build on each other… make sure that the steps are small enough to be implemented safely with strong testing, but big enough to move the project forward… provide a series of prompts for a code-generation LLM that will implement each step in a test-driven manner… no hanging or orphaned code… <SPEC> »

**Alternative native Claude Code (doc officielle) :**
> « I want to build [description]. Interview me in detail using the AskUserQuestion tool. Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs… Keep interviewing until we've covered everything, then write a complete spec to SPEC.md. »

---

## Partie 6 — Checklist anti-patterns

**Sur-documentation / contexte surchargé**
- [ ] CLAUDE.md long et bavard → il n'est pas tronqué mais il dilue les règles (« Bloated CLAUDE.md files cause Claude to ignore your actual instructions! » — doc officielle).
- [ ] Règles de style recopiées dans CLAUDE.md → déléguer au linter.
- [ ] Doc d'API recopiée → lier, ne pas dupliquer.
- [ ] Plan de tâches / checklist figé dans CLAUDE.md → le mettre dans `docs/`.
- [ ] Imports `@` utilisés en croyant économiser du contexte → ils chargent au lancement ; utiliser `docs/` à la demande ou `.claude/rules/` scoped.

**Ambiguïtés qui font halluciner**
- [ ] Adjectifs non vérifiables (« rapide », « sécurisé », « robuste ») → remplacer par des comportements mesurables.
- [ ] Contradictions entre sections (« pas d'appel API externe » vs. un critère en exige un) → l'agent tranche silencieusement. Croiser les sections avant handoff.
- [ ] Exigences vagues non marquées → utiliser `[NEEDS CLARIFICATION]`.
- [ ] Périmètre EXCLU absent → l'agent sur-engineere.

**Doc morte / dérive**
- [ ] Specs et code divergent → tests dérivés des critères = garde-fou vivant.
- [ ] Décisions seulement « dans la tête » → ADR actionnables, référencés dans CLAUDE.md.
- [ ] Commandes documentées qui ne tournent plus → revue périodique.
- [ ] Confondre advisory et déterministe → ce qui DOIT arriver = hook/linter/test, pas une phrase.

**Boucle & session**
- [ ] Session « kitchen sink » (tâches mélangées) → `/clear` entre tâches non liées.
- [ ] Corriger 3× la même chose → `/clear` + meilleur prompt initial.
- [ ] Laisser l'agent coder sans vérification → toujours fournir un check exécutable ; « If you can't verify it, don't ship it. »
- [ ] Investigation non bornée → sous-agents / scope étroit.
- [ ] Faire confiance sans preuve → exiger la sortie de test/build.

---

## Recommendations

**Étape 0 — Décider de l'échelle (avant tout).** Petit/moyen projet solo → **approche A (Harper Reed)** : `spec.md`, `plan.md`, `tasks.md`, `CLAUDE.md`. Projet sérieux/mission-critical ou multi-features → **A + emprunts Spec Kit** (séparation stricte spec/plan, `constitution.md`). *Seuil de bascule vers Spec Kit :* dès que vous avez > 3-4 features indépendantes ou des exigences de conformité/sécurité.

**Étape 1 — Poser le socle (jour 1).** Lancer `/init` pour un CLAUDE.md de départ, puis l'élaguer agressivement (test : chaque ligne, « sa suppression ferait-elle échouer Claude ? »). Y intégrer la Definition of Done. Créer `docs/brief.md`.

**Étape 2 — Rendre le contrat exécutable (jour 1-2).** Mettre en place AU MOINS un hook `PreToolUse`/`Stop` qui lance lint + tests. C'est ce qui transforme la doc advisory en contrat. *Benchmark de réussite :* une tâche ne peut pas se terminer si les tests échouent.

**Étape 3 — Par feature, dérouler la boucle.** `spec.md` (via interview « une question à la fois ») → `plan.md` (en plan mode, session fraîche) → `tasks.md` avec cases à cocher → implémentation boucle par boucle → revue adverse par sous-agent contre `plan.md`. `/clear` entre features.

**Étape 4 — Capturer les décisions au fil de l'eau.** Rédiger un ADR dès qu'une décision structurante est prise ; référencer `docs/adr/` dans CLAUDE.md.

**Étape 5 — Entretenir.** Revue trimestrielle de CLAUDE.md ; migrer vers des linters/hooks toute règle stable ; supprimer les docs obsolètes.

**Seuils qui changeraient ces recommandations :**
- Si l'agent **ignore régulièrement une règle** de CLAUDE.md malgré sa présence → le fichier est trop long OU la règle doit devenir un hook.
- Si l'agent **pose des questions déjà répondues** dans CLAUDE.md → la formulation est ambiguë.
- Si vous vous surprenez à **corriger le code à la main** plutôt que la spec/le prompt → vous avez quitté le modèle « spec = source de vérité » ; corrigez le document, pas le symptôme.
- Si le projet devient **une équipe** (plus solo) → réévaluer vers BMAD ou des conventions d'équipe (les workflows solo « ne passent pas à l'échelle en équipe », dixit Harper Reed lui-même).

---

## Caveats

- **Domaine à évolution très rapide.** Claude Code publie des fonctionnalités quasi chaque semaine ; certaines mécaniques citées (auto memory v2.1.59, Stop hook cap v2.1.143, `/goal`, agent teams) sont récentes et peuvent changer. Vérifiez la version avec `claude --version` et la doc à jour.
- **Distinction des statuts épistémiques appliquée dans tout le rapport :** recommandation officielle Anthropic (doc + blog ingénierie) > pratique communautaire convergente (Harper Reed, Spec Kit, Ronacher) > opinion isolée. Les chiffres non sourcés officiellement (compliance « 25-40 % vs 95 % », « 150-200 instructions ») sont explicitement marqués comme heuristiques non établies.
- **Le TDD strict est contesté.** Spec Kit l'impose ; Ronacher préfère souvent la conversation directe. La position retenue (tests = garant de fidélité) est robuste ; l'imposition d'un cycle Red-Green formel est un choix, pas un consensus.
- **La limite « 200 lignes » ne concerne PAS CLAUDE.md** mais MEMORY.md (auto memory) — correction importante par rapport à de nombreux articles communautaires qui l'appliquent à tort à CLAUDE.md. CLAUDE.md est chargé en entier ; la contrainte réelle est le coût en tokens et la dilution, pas une troncature.
- **Les études d'usage (rapport Anthropic ~400 000 sessions) décrivent des tendances agrégées, pas des garanties** pour un projet donné où l'agent génère 100 % du code — un cas plus exigeant que la moyenne des sessions observées.
- **Le sur-engineering est un risque réel de la revue adverse** : la doc officielle avertit qu'un relecteur à qui l'on demande de trouver des lacunes en trouvera toujours ; ne corriger que ce qui affecte la correction ou les exigences déclarées.