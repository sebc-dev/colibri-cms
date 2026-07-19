# Document de référence avancé — Workflows Claude Code 2026 pour docs & specs (SDD solo)

> Document de contexte front-loadé. Portée : UNIQUEMENT les capacités net-new 2026 et leur branchement sur une structure SDD déjà maîtrisée (docs/constitution.md, docs/adr/, specs/NNN-feature/{spec,plan,tasks}.md, critères EARS). Les concepts déjà connus (hooks PreToolUse/Stop/PostToolUse, Skills, subagents, plan mode, @import, .claude/rules/, OpenSpec deltas, EARS/Gherkin, CLAUDE.md <200 lignes, discipline /clear) ne sont PAS ré-expliqués.

## TL;DR
- **`/loop` et `/goal` sont RÉELS et officiels.** `/goal` (v2.1.139, fenêtre officielle « May 11–15, 2026 », daté ~12 mai 2026 par les mirrors du CHANGELOG) : condition d'arrêt vérifiée à chaque tour par un modèle-juge Haiku séparé. `/loop` (v2.1.72) : ré-exécution d'un prompt sur intervalle OU en mode « self-paced ». `loop.md` est réel (fichier `.claude/loop.md` documenté). La « Ralph Loop » est un pattern communautaire (Geoffrey Huntley, post canonique « Ralph Wiggum as a "software engineer" », ghuntley.com, 13 juillet 2025), ensuite empaqueté dans un plugin officiel `ralph-wiggum`.
- **Channels (v2.1.80), Routines/`/schedule` (~14 avr. 2026), dynamic workflows/`/workflows` (v2.1.154, 28 mai 2026), `/ultraplan` (v2.1.91+), `/ultrareview` (v2.1.86+), `opusplan` : tous RÉELS et documentés.** Le vrai terme pour « second shift »/overnight est **« loop engineering »** (Boris Cherny, créateur de Claude Code) — ce n'est PAS un primitif nommé, mais une pratique combinant Routines cloud + `/loop`/`/goal`.
- **Branchement recommandé : les ADR restent immuables (jamais dans une boucle d'écriture, protégés par un hook PreToolUse `exit 2`) ; `/goal` piloté par les critères EARS ; `loop.md` ou une Skill de vérification pour la maintenance docs ; Stop hooks pour l'enforcement déterministe.**

## Niveaux de preuve utilisés
- **[OFFICIEL]** : documentation Anthropic (code.claude.com/docs, claude.com/blog, CHANGELOG GitHub anthropics/claude-code, issue tracker officiel).
- **[PRATICIEN]** : pratique émergente de praticiens nommés/reconnus.
- **[OPINION]** : opinion isolée, non vérifiée.
- Confiance : Élevé / Moyen / Faible. Marqueurs [INCERTAIN] / [À VÉRIFIER] où les sources primaires manquent.

---

## 1. Vérification de chaque primitif nommé

### 1.1 `/goal` — OFFICIEL ✅ [OFFICIEL, Confiance : Élevé]
- **Doc** : https://code.claude.com/docs/en/goal
- **Version** : v2.1.139. La page officielle "What's new" place v2.1.139–2.1.142 sur « May 11–15, 2026 » ; les mirrors du CHANGELOG datent v2.1.139 au 12 mai 2026. Ligne CHANGELOG citée par les mirrors : « Added `/goal` command: set a completion condition and Claude keeps working across turns until it's met. Works in interactive, `-p`, and Remote Control. »
- **Mécanique (citée doc)** : « `/goal` is a wrapper around a session-scoped prompt-based Stop hook. Each time Claude finishes a turn, the condition and the conversation so far are sent to your configured small fast model, which defaults to Haiku. The model returns a yes-or-no decision and a short reason. » L'évaluateur « does not call tools, so it can only judge what Claude has already surfaced in the conversation ».
- Condition jusqu'à 4 000 caractères. Une clause d'arrêt (« or stop after 20 turns ») borne la boucle. Fonctionne en interactif, `-p` (headless), Desktop, Remote Control. Nécessite l'acceptation du trust dialog (car repose sur le système de hooks) ; indisponible si `disableAllHooks` ou `allowManagedHooksOnly`.

### 1.2 `/loop` + mode self-paced + `loop.md` — OFFICIEL ✅ [OFFICIEL, Confiance : Élevé]
- **Doc** : https://code.claude.com/docs/en/scheduled-tasks
- **Version** : « Scheduled tasks require Claude Code v2.1.72 or later » (citation doc). Date de release exacte de v2.1.72 non confirmée par source primaire [À VÉRIFIER] ; sources tierces la situent vers mars 2026.
- **Deux modes** : intervalle fixe (`/loop 5m …`, converti en cron) OU **self-paced** (prompt sans intervalle → Claude choisit un délai entre 1 min et 1 h et peut terminer seul via l'outil `ScheduleWakeup` avec `stop: true`). Depuis v2.1.202, une itération sans reprogrammation ni arrêt planifie un fallback ~20 min plus tard.
- **`loop.md`** : réel et documenté. « A `loop.md` file replaces the built-in maintenance prompt with your own instructions. » Chemins : `.claude/loop.md` (projet, priorité) ou `~/.claude/loop.md` (utilisateur). Aucune structure requise ; tronqué au-delà de 25 000 octets. Version d'introduction non précisée dans les sources primaires [INCERTAIN].
- **Limites structurelles** : tâches session-scoped ; expiration à 7 jours des tâches récurrentes ; ne se déclenche que session ouverte et idle ; `/clear` (nouvelle conversation) efface tout. `/loop` n'est plus promu dans les sessions remote depuis v2.1.172 (« pending loops don't keep the container alive »).

### 1.3 « Ralph Loop » — PATTERN COMMUNAUTAIRE + plugin officiel ✅ [PRATICIEN → OFFICIEL partiel, Confiance : Élevé]
- **Origine** : Geoffrey Huntley, post canonique **« Ralph Wiggum as a "software engineer" »** (ghuntley.com, 13 juillet 2025) — « Ralph is a technique. In its purest form, Ralph is a Bash loop. » Ce n'est PAS un primitif officiel Claude Code à l'origine.
- **Coût réel annoncé par l'auteur** : Huntley (podcast Dev Interrupted/LinearB) : « Sonnet 4.5 on a loop with a bash loop, Ralph… it costs $10.42 US an hour ». Chiffre auto-déclaré, non benchmarké indépendamment. [PRATICIEN, Confiance : Moyen]
- **Plugin officiel** : Anthropic l'a empaqueté dans `plugins/ralph-wiggum` (dépôt anthropics/claude-code), formalisé par les ingénieurs Anthropic Daisy Hollman et Boris Cherny (source : shiqimei.github.io). Installation : `/plugin marketplace add anthropics/claude-code` puis `/plugin install ralph-wiggum@claude-plugins-official`. Commandes `/ralph-loop` et `/cancel-ralph`. Mécanique : un **Stop hook** intercepte les sorties et ré-injecte le même prompt jusqu'à `--completion-promise "DONE"` ou `--max-iterations N`.
- **Critique praticien nommée** : sur le blog HumanLayer (« A Brief History of Ralph »), l'auteur juge le plugin décevant (« It dies in cryptic ways unless you have `--dangerously-skip-permissions` … it misses the key point of ralph which is not "run forever" but in "carve off small bits of work into independent context windows" »). [PRATICIEN, Confiance : Moyen]
- **Verdict** : pour du travail autonome long, préférer les primitifs supportés (`/goal`, `/loop`, Stop hooks maison) qui survivent aux mises à jour ; réserver le plugin `ralph-wiggum` si son comportement de Stop hook exact est souhaité.

### 1.4 Channels (push d'événements CI) — OFFICIEL ✅ [OFFICIEL, Confiance : Élevé]
- **Doc** : https://code.claude.com/docs/en/channels
- **Version** : « Channels are in research preview and require Claude Code v2.1.80 or later » (citation doc). Lancement ~20 mars 2026 (date par sources tierces, non confirmée par source primaire) [À VÉRIFIER].
- **Mécanique** : un channel est un serveur MCP avec la capacité `claude/channel` qui **pousse** des événements dans une session ouverte. CI/Sentry/deploy peuvent POSTer un webhook (« ~30-line MCP server »). Événements livrés sous forme `<channel source="…">`. Nécessite auth claude.ai/Console ; indisponible Bedrock/Vertex/Foundry ; désactivé par défaut sur Team/Enterprise. **Contrainte clé** : ne reçoit que session ouverte (sinon événement silencieusement perdu). Allowlist d'expéditeurs obligatoire (vecteur d'injection de prompt sinon).

### 1.5 Routines cloud / `/schedule` — OFFICIEL ✅ [OFFICIEL, Confiance : Élevé]
- **Doc** : https://code.claude.com/docs/en/routines ; blog : https://claude.com/blog/introducing-routines-in-claude-code
- **Lancement** : research preview, ~14 avril 2026 (blog Anthropic). Aucune version CLI unique donnée dans les sources primaires [INCERTAIN].
- **Mécanique** : config sauvegardée (prompt + repos + connectors) tournant sur l'infra cloud Anthropic, indépendamment de la machine. Trois déclencheurs combinables : **Scheduled** (cron, minimum 1 h), **API** (POST HTTP), **GitHub** (événements PR/release). `/schedule` en CLI crée uniquement des routines à trigger schedule ; pour API/GitHub, éditer sur claude.ai/code/routines. Push limité aux branches `claude/` par défaut.
- **Limites quotidiennes (blog officiel, verbatim)** : « Pro users can run up to 5 routines per day, Max users can run up to 15 routines per day, and Team and Enterprise users can run up to 25 routines per day. »
- **Cas docs officiel (blog, verbatim)** : « Docs drift: scan merged PRs weekly, flag docs that reference changed APIs, and open update PRs. »

### 1.6 Dynamic workflows / `/workflows` — OFFICIEL ✅ [OFFICIEL, Confiance : Élevé]
- **Doc** : https://code.claude.com/docs/en/workflows
- **Version** : v2.1.154, 28 mai 2026 (ligne CHANGELOG confirmée verbatim : « Introducing dynamic workflows: ask Claude to create a workflow and it orchestrates work across tens to hundreds of agents in the background… Run `/workflows` to view your runs »). Research preview.
- **Mécanique** : Claude écrit un script JS d'orchestration exécuté en arrière-plan, fan-out de dizaines à centaines de subagents (jusqu'à 1 000/run, 16 en parallèle). Déclencheur : mot « workflow » dans un prompt (avant v2.1.160 : mot-clé littéral ; mot-clé `ultracode` déclenche aussi). `/deep-research` bundlé. Adéquat : audits de codebase, migrations massives, recherche vérifiée avec agents adverses. Consomme beaucoup plus de tokens (recommandation Anthropic : piloter sur une petite tranche d'abord).

### 1.7 `/ultraplan` — OFFICIEL ✅ [OFFICIEL, Confiance : Élevé]
- **Doc** : https://code.claude.com/docs/en/ultraplan
- **Version** : research preview, la doc dit « requires Claude Code v2.1.91 or later » ; certaines sources tierces mentionnent v2.1.101. [À VÉRIFIER — divergence de sources sur la version exacte]
- **Mécanique** : délègue la phase de planification à une session Claude Code on the web (cloud), review dans le navigateur (commentaires inline, réactions emoji, sidebar outline), puis exécution cloud (PR) ou « teleport » vers le terminal local. Trois voies de lancement : `/ultraplan <prompt>`, le mot-clé « ultraplan » dans un prompt, ou depuis un plan local (« No, refine with Ultraplan »). Nécessite repo GitHub + compte claude.ai ; indisponible Bedrock/Vertex/Foundry. Incompatible simultanément avec Remote Control (les deux occupent l'interface claude.ai/code).

### 1.8 `/ultrareview` — OFFICIEL ✅ [OFFICIEL, Confiance : Élevé]
- **Doc** : https://code.claude.com/docs/en/ultrareview
- **Version** : research preview, v2.1.86+ ; invoqué désormais `/code-review ultra` (`/ultrareview` reste alias). Lancé ~16 avril 2026 avec Opus 4.7.
- **Mécanique** : flotte d'agents reviewers en sandbox cloud ; chaque finding est reproduit indépendamment avant d'être remonté (haute précision, « verified bugs rather than style suggestions »). **Coût (doc officielle, verbatim)** : « each review is billed to usage credits and typically costs $5 to $20 depending on the size of the change… A review typically takes 5 to 10 minutes. » 3 runs gratuits Pro/Max non renouvelables (expirés le 5 mai 2026 selon buildthisnow.com). Indisponible Bedrock/Vertex/Foundry et orgs ZDR. Ne se lance jamais tout seul.

### 1.9 `opusplan` — OFFICIEL ✅ [OFFICIEL, Confiance : Élevé]
- **Doc** : https://code.claude.com/docs/en/model-config
- **Mécanique (citée doc)** : alias de modèle — « In plan mode: uses opus for complex reasoning and architecture decisions ; In execution mode: automatically switches to sonnet for code generation and implementation ». Suffixe `[1m]` pour contexte 1M (`opusplan[1m]`). Sur Bedrock/Vertex/Foundry, `opus`/`sonnet` résolvent vers des versions plus anciennes. Économise quota/coût sans sacrifier la qualité du plan.

### 1.10 « Auto cloud env » — précision
- Le CHANGELOG mentionne « Auto cloud env - /ultraplan and other remote-session features now auto-create a default cloud environment ». Cohérent avec la doc ultraplan.

### 1.11 « Second shift » / overnight loops = « loop engineering » — TERMINOLOGIE PRATICIEN ✅ [PRATICIEN, Confiance : Moyen]
- **Statut** : PAS un primitif nommé Claude Code. Le terme réel documenté est **« loop engineering »**. Boris Cherny (créateur de Claude Code, interview The New Stack, janvier 2026, relayée via noqta.tn) : « I don't prompt Claude anymore. I write loops, and the loops do the work. My job is to write loops. » Il cite des loops récurrents nommés — « 5m /babysit », « 30m /slack-feedback », « 1h /pr-pruner » — et des runs nocturnes lançant « hundreds, sometimes thousands of agents » pendant 5 à 20 h. Le nom « loop engineering » a été popularisé par Addy Osmani (juin 2026). Aucune page de doc officielle nommée « second shift ». À implémenter via les primitifs réels ci-dessus.

### 1.12 Boucles de vérification autonomes (drift spec/code/test) — PATTERN, pas un primitif nommé [PRATICIEN + OFFICIEL sur les briques, Confiance : Moyen]
- Aucun primitif officiel « drift detector ». Le blog officiel « Getting started with loops » recommande explicitement (verbatim) : **« Use a second agent for code reviews: A reviewer with fresh context is less biased and not influenced by the [model that wrote it]. »** Le pattern se construit avec `/goal` + subagent vérificateur, ou `/loop` + juge externe Haiku, ou dynamic workflow avec agents adverses.

---

## 2. `/loop` & `/goal` appliqués au cycle spec→plan→tasks→verify

### 2.1 `/goal` comme état final vérifiable dérivé des critères EARS
Les critères d'acceptation EARS (« WHEN … SHALL … ») se traduisent directement en condition `/goal` mesurable. Règle d'or (doc) : l'évaluateur ne lit que ce que Claude a fait apparaître dans la conversation → la condition doit être **prouvable par une sortie** (résultat de test, exit code), pas subjective.

Exemple :
```
/goal Tous les tests dérivés de specs/034-auth/spec.md passent : exécute `pytest tests/auth -q`,
la sortie doit montrer 0 failed. Chaque critère SHALL du spec a un test correspondant qui passe.
Ne modifie aucun fichier sous docs/adr/. Stop après 15 tours si non atteint.
```
Pourquoi c'est robuste : critère booléen (`0 failed`), preuve explicite (commande dont la sortie atterrit dans le transcript), contrainte d'immuabilité ADR, cap de tours. **[OFFICIEL, Confiance : Élevé]**

### 2.2 Self-paced `/loop` pour itérer EARS→test
`/loop` self-paced (sans intervalle) convient quand la vérif est honnêtement auto-constatable par Claude (tests verts). Mais **biais d'auto-évaluation** : Claude « note sa propre copie ». Un praticien (buildtolaunch) résume le risque : Claude « is good at looking done ». Donc :
- Pour du **feature work** où un faux « done » coûte cher → préférer `/goal` (juge Haiku indépendant).
- Pour du polling / re-run mécanique → `/loop`.

### 2.3 `loop.md` pour la maintenance docs/specs
Exemple `.claude/loop.md` (maintenance living specs, sans toucher aux ADR) :
```markdown
# Boucle de maintenance docs/specs (bare /loop)
Pour chaque spec sous specs/*/ :
1. Lis spec.md, plan.md, tasks.md. Vérifie que chaque critère EARS (WHEN…SHALL)
   a un test correspondant et que tasks.md reflète l'état réel du code.
2. Si un écart spec↔code↔test est détecté, note-le dans specs/<id>/DRIFT.md
   (ne corrige PAS automatiquement le code — propose seulement).
3. Vérifie la cohérence avec docs/constitution.md. NE MODIFIE JAMAIS docs/adr/*.
4. Si une décision d'architecture nouvelle est implicite dans le code mais absente
   des ADR, rédige un CANDIDAT dans docs/adr/_candidates/NNN-draft.md (jamais dans adr/ final).
5. Si tout est cohérent, écris une ligne d'état dans docs/_maintenance/log.md.
```
Rappel : `loop.md` est ignoré si un prompt est fourni en ligne de commande.

---

## 3. Boucles de vérification autonomes du drift spec/code/test

### 3.1 Trois hypothèses concurrentes (pratique non stabilisée)
- **H1 — `/goal` + subagent vérificateur** [Confiance : Moyen] : le subagent (contexte frais, accès outils) exécute les tests et rapporte ; `/goal` boucle jusqu'à convergence. Avantage : le vérificateur a accès aux outils, contrairement au juge `/goal` natif.
- **H2 — `/goal` + juge Haiku natif** [Confiance : Moyen-Élevé] : le juge Haiku ne lit que le transcript. Plus léger, mais ne peut vérifier que ce qui est déjà affiché. Le blog VibeReady note : « `/goal` makes a separate model confirm your condition every turn (use it when a false "done" is costly) ».
- **H3 — dynamic workflow avec agents adverses** [Confiance : Moyen] : un agent produit, un autre tente de réfuter. Le blog officiel workflows décrit ce pattern (« adversarially review each other's findings »). Plus coûteux ; réservé aux gros audits multi-specs.

### 3.2 Ralph + Stop hooks pour travail autonome long
Le pattern Ralph (Stop hook `exit 2` → re-injecte le prompt) force Claude à continuer. **Pièges documentés (doc hooks)** :
- « Claude Code overrides a Stop hook after it blocks eight times in a row without progress » → ajuster via `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`.
- Vérifier `stop_hook_active` dans l'input JSON pour éviter les boucles infinies (`exit 0` si `true`).
- **Exit code 2 = bloquer/continuer ; exit code 1 = erreur NON bloquante ignorée** (piège majeur : une gate écrite en `exit 1` ne bloque rien — « the day your tests actually go red is the day you discover the gate was never closed »).

---

## 4. Anti-patterns & pièges 2026

| Anti-pattern | Description | Parade | Preuve |
|---|---|---|---|
| Boucle sans condition d'arrêt | `/loop` sans « until » → tourne jusqu'à intervention | Toujours une clause d'arrêt + cap de tours | [OFFICIEL] doc scheduled-tasks |
| Auto-évaluation biaisée | Claude note sa propre copie | Juge séparé (`/goal` Haiku, subagent, ou `/code-review`) | [OFFICIEL] blog loops + [PRATICIEN] |
| Fragilité session-scoped | `/loop`/`/goal`/Channels meurent à la fermeture de session ou `/clear` | Routines cloud pour la durabilité | [OFFICIEL] doc routines |
| Boucles qui « faussent » le done | Route autour du hard part, résume comme succès | Condition prouvable par sortie mécanique | [PRATICIEN] buildtolaunch |
| Coût token multiplié par itération | Chaque tour re-envoie l'historique ; loops multi-agents ~15× | Cap `--max-iterations`, budget, modèle plus léger | [PRATICIEN] MindStudio |
| Sur-automatisation de la doc | Docs vivants générés sans revue humaine → dérive silencieuse | Humain dans la boucle pour ADR/constitution | [PRATICIEN] |

**Cas de coût réel (anecdotique, auto-déclaré, NON benchmarké)** : selon Yanli Liu (Medium/All in AI, juin 2026), « one engineer on X claimed he delivered a $50,000 contract for about $297 in API costs by letting Ralph grind overnight ». À traiter comme témoignage isolé, non vérifié. [OPINION/PRATICIEN, Confiance : Faible]

---

## 5. « Loop engineering » / workflows overnight pour la maintenance documentaire

Implémentation recommandée avec primitifs réels (pas un primitif nommé) :
- **Routine cloud hebdomadaire (docs drift)** — scan des PR mergées, flag des docs référençant des APIs changées, ouverture de PR de mise à jour sur branche `claude/docs-drift`. C'est littéralement le cas d'usage docs du blog officiel Routines (« Docs drift: scan merged PRs weekly, flag docs that reference changed APIs, and open update PRs »).
- **`/goal` overnight** sur specs living : « chaque critère SHALL a un test qui passe ; DRIFT.md mis à jour ; candidats ADR proposés dans _candidates/ ; stop après N tours ».
- **Checklist de cohérence** via Skill de vérification (SKILL.md) invoquée par la boucle.

Prompt Routine proactif (structure directement calquée sur l'exemple officiel du blog loops : « /schedule every hour: check #project-feedback for bug reports. /goal: don't stop until every report found this run is triaged, actioned, and responded to. ») :
```
/schedule chaque nuit à 2h : pour chaque spec sous specs/, vérifie l'alignement
spec↔code↔test. /goal : ne t'arrête pas tant que chaque écart n'est pas consigné
dans DRIFT.md et qu'une PR de doc n'est pas ouverte sur claude/docs-sync. N'édite
jamais docs/adr/. Utilise la skill verify-spec pour la procédure de vérification.
```

---

## 6. Intégration sur la structure existante (sans casser l'immuabilité ADR)

### 6.1 Où placer les instructions
| Besoin | Emplacement | Raison |
|---|---|---|
| Fait permanent (« ne jamais éditer docs/adr/ ») | CLAUDE.md ou rule | Toujours chargé |
| Procédure de vérification spec↔test | Skill (SKILL.md) | Chargée à la demande, ~100 tokens à froid |
| Prompt de maintenance par défaut de `/loop` | `.claude/loop.md` | Défini une fois, réutilisé par bare `/loop` |
| Enforcement dur (bloquer toute écriture dans docs/adr/*) | Hook PreToolUse (exit 2) | Déterministe, hors contexte |
| Condition d'arrêt de fin de tâche | `/goal` (session) | Juge indépendant |

**Blog officiel « Steering Claude Code »** : sept méthodes (CLAUDE.md, rules, skills, subagents, hooks, output styles, system prompt append). Principe : « facts in CLAUDE.md, procedures in skills, scoped constraints in rules, heavy lifting in subagents, anything that must happen in hooks ». Le même blog note que les hooks et skills « are also the building blocks of designing agent loops ».

### 6.2 Protéger l'immuabilité ADR dans une boucle
Hook PreToolUse déterministe (parade la plus sûre) :
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/block-adr-edits.sh" }
        ]
      }
    ]
  }
}
```
`block-adr-edits.sh` : parse `tool_input.file_path` ; si le chemin matche `docs/adr/` (hors `_candidates/`), `exit 2` avec un message stderr. Ainsi, même une boucle autonome (`/goal`, Ralph, Routine) ne peut jamais éditer un ADR superseded. Les nouveaux ADR ne sont créés qu'en `_candidates/` puis promus manuellement (superseded, jamais édités).

### 6.3 Interaction loop × hooks × rules
- **Ordre de priorité (doc hooks)** : pour les décisions PreToolUse, « the most restrictive answer applies, in the order deny, defer, ask, allow ». Un hook `deny` gagne toujours sur une instruction de Skill/CLAUDE.md.
- **`/goal` = Stop hook prompt-based session-scoped** : si `disableAllHooks` est actif, `/goal` est indisponible.
- **Piège plugin (issue GitHub officielle #10412)** : les Stop hooks avec `exit 2` installés via le système de plugins échouent à faire continuer Claude, alors qu'ils fonctionnent depuis `.claude/hooks/`. **Préférer `.claude/hooks/` pour les boucles critiques.** [OFFICIEL — issue tracker, Confiance : Moyen]

---

## 7. Tableau de correspondance « primitif 2026 → élément de structure »

| Primitif 2026 | constitution.md | docs/adr/ | spec.md | plan.md | tasks.md |
|---|---|---|---|---|---|
| `/goal` | Lecture (contrainte) | **Jamais écrit** (immuable) | Critère d'arrêt = SHALL prouvés | Guide l'exécution | Coche tasks jusqu'à done |
| `/loop` self-paced | — | — | Itère EARS→test | — | Avance tâche par tâche |
| `loop.md` | Vérif cohérence | Propose candidats en _candidates/ | Détecte drift | — | Sync état |
| Channels (CI push) | — | — | Réagit à échec CI d'un test de spec | — | — |
| Routines / `/schedule` | Revue périodique | PR de candidats ADR | Docs-drift hebdo | — | — |
| Dynamic workflows | — | Audit multi-ADR | Audit cohérence à grande échelle | Draft multi-angles | — |
| `/ultraplan` | — | Éclaire décisions → futur ADR | — | **Draft/refine plan.md** | — |
| `/ultrareview` | — | — | Vérifie conformité au spec | — | Valide avant merge |
| `opusplan` | — | Raisonnement archi (plan) | — | Plan Opus / exécution Sonnet | Exécution Sonnet |

---

## 8. Verdicts Impact / Effort / Confiance par pratique

| Pratique | Impact | Effort | Confiance | Preuve |
|---|---|---|---|---|
| `/goal` piloté par EARS | Élevé | Faible | Élevé | [OFFICIEL] |
| Hook PreToolUse anti-édition ADR | Élevé | Faible | Élevé | [OFFICIEL] |
| Skill de vérification spec↔test | Élevé | Moyen | Élevé | [OFFICIEL] blog loops |
| `loop.md` maintenance docs | Moyen | Faible | Moyen | [OFFICIEL] |
| Routine cloud docs-drift | Élevé | Moyen | Moyen-Élevé | [OFFICIEL] blog routines |
| `/goal` + subagent vérificateur (anti-drift) | Élevé | Moyen | Moyen | [PRATICIEN] |
| Dynamic workflow audit ADR/spec | Moyen | Élevé | Moyen | [OFFICIEL] |
| `/ultraplan` pour plan.md complexe | Moyen | Faible | Moyen | [OFFICIEL] |
| `/ultrareview` pré-merge | Moyen | Faible (mais coût $5–20/run) | Moyen | [OFFICIEL] |
| Plugin `ralph-wiggum` | Faible-Moyen | Moyen | Faible-Moyen | [PRATICIEN critique] |
| `opusplan` par défaut | Moyen | Faible | Élevé | [OFFICIEL] |
| Channels pour CI push sur specs | Moyen | Moyen | Moyen | [OFFICIEL] |

---

## 9. Contradictions & incertitudes signalées
- **Version `/ultraplan`** : la doc officielle dit v2.1.91+ ; certaines sources tierces disent v2.1.101. [À VÉRIFIER]
- **Dates de release v2.1.72 (`/loop`) et v2.1.80 (Channels)** : versions confirmées par doc primaire, dates exactes (mars 2026) non confirmées par source primaire. [À VÉRIFIER]
- **Version d'introduction de `loop.md`** : non précisée dans les sources primaires. [INCERTAIN]
- **`/schedule` vs `/workflows`** : ce sont DEUX features distinctes. `/schedule` (Routines cloud, ~14 avr. 2026) n'a pas de version CLI unique documentée ; `/workflows` (dynamic workflows) = v2.1.154, 28 mai 2026. Ne pas les confondre.
- **Fable 5 / Opus 4.8** : modèles récents (Opus 4.8 par défaut haute-effort) ; interaction précise avec `opusplan` évolutive. [À VÉRIFIER]
- **Contenu orienté vendeur signalé** : MindStudio, Verdent, Shipyard poussent leurs propres outils ; leurs guides `/loop`/`/goal` sont utiles mais orientés produit — traiter les affirmations comme [OPINION/PRATICIEN orienté vendeur].

---

## Recommandations (staged)
1. **Immédiat (Impact Élevé, Effort Faible)** : installer le hook PreToolUse anti-édition `docs/adr/` (dans `.claude/hooks/`, PAS via plugin — cf. issue #10412) ; adopter `/goal` avec conditions dérivées EARS ; passer `opusplan` par défaut via `/model`.
2. **Court terme** : écrire une Skill `verify-spec` (procédure spec↔code↔test) ; créer `.claude/loop.md` de maintenance ; utiliser `/ultrareview` (`/code-review ultra`) en gate pré-merge sur les branches touchant des critères SHALL critiques (budgéter $5–20/run).
3. **Moyen terme** : mettre en place une Routine cloud « docs-drift » hebdomadaire (cf. cas officiel) ; expérimenter `/goal` + subagent vérificateur pour l'anti-drift nocturne ; réserver dynamic workflows aux audits multi-specs.
4. **Seuils de bascule** : si le coût token d'une boucle dépasse le budget fixé → réduire l'intervalle, router vers un modèle plus léger, ou passer d'un `/loop` continu à une Routine event-driven (Channels/GitHub). Si `/goal` « fake » le done → renforcer la clause de preuve mesurable ou ajouter un Stop hook déterministe. Si les tâches doivent survivre à la fermeture de la session → migrer de `/loop` vers Routines cloud.

## Caveats
- **Fenêtre temporelle** : document arrêté au 11 juillet 2026 ; toutes les features en « research preview » (Channels, Routines, dynamic workflows, `/ultraplan`, `/ultrareview`) peuvent voir leur comportement, syntaxe, pricing et disponibilité changer — revérifier la doc officielle avant toute mise en production.
- **Sources primaires vs praticiens** : les versions et mécaniques marquées [OFFICIEL] proviennent de code.claude.com/docs, claude.com/blog ou du CHANGELOG GitHub anthropics/claude-code. Les termes « loop engineering »/« second shift », les critiques du plugin Ralph et les chiffres de coût sont [PRATICIEN]/[OPINION] et explicitement attribués.
- **Disponibilité par provider** : plusieurs primitifs (Channels, `/ultraplan`, `/ultrareview`, Routines) sont indisponibles sur Amazon Bedrock, Google Cloud Vertex/Agent Platform et Microsoft Foundry, et/ou sur les orgs Zero Data Retention. Vérifier son provider avant d'architecturer un workflow.
- **Aucune statistique non sourcée** n'a été inventée ; les seuls chiffres cités (limites Routines, coût `/ultrareview`, coût horaire Ralph, contrat $50k/$297) sont attribués à leur source, et les chiffres non primaires sont marqués comme auto-déclarés/anecdotiques.