# Dynamic Workflows de Claude Code — Document de référence technique (à jour juillet 2026)

> **Statut de la feature au 18 juillet 2026 :** **Disponibilité générale (GA)** depuis le 2 juillet 2026, sur tous les plans payants (Pro inclus). Lancée en *research preview* le 28 mai 2026 avec Claude Code v2.1.154 et Opus 4.8. Documentation officielle : `code.claude.com/docs/en/workflows`.

## TL;DR

- **Un dynamic workflow est un script JavaScript que *Claude écrit lui-même* et qu'un runtime exécute en arrière-plan pour orchestrer des dizaines à des centaines de subagents ; seuls les appels `agent()` consomment des tokens, la logique d'orchestration (boucles, branchements, résultats intermédiaires) reste dans les variables du script et non dans le contexte de Claude.** C'est « le plan qui sort de la tête de Claude et passe dans du code » : contrôle de flux déterministe, jugement délégué aux modèles.
- **Pour authorer un skill de création de workflow, la couche critique est le format de fichier :** `export const meta` littéral pur en première instruction, corps async utilisant les primitives injectées (`agent()`, `parallel()`, `pipeline()`, `phase()`, `log()`, `workflow()`, plus les globals `args` et `budget`), sorties structurées par `schema` (JSON Schema), et règles de déterminisme strictes (interdiction de `Date.now()`, `Math.random()`, `new Date()` sans argument).
- **Distinction preview → GA (à surveiller) :** en preview, l'outil était gated derrière la variable d'environnement `CLAUDE_CODE_WORKFLOWS=1` (documenté par les skills tiers) ; en GA, l'activation se fait via `/config` (ligne « Dynamic workflows ») et le keyword déclencheur historique `workflow` a été **renommé `ultracode`** en v2.1.160 (2 juin 2026).

---

## Key Findings

1. **Modèle mental (confiance : Élevée, doc officielle).** La différence fondamentale entre workflow et subagents/skills/agent teams est *qui tient le plan*. Avec les subagents, skills et agent teams, **Claude est l'orchestrateur** et décide tour par tour ; chaque résultat intermédiaire atterrit dans une fenêtre de contexte. Un workflow **déplace le plan dans le code** : le script tient la boucle, le branchement et les résultats intermédiaires, si bien que le contexte de Claude ne voit que la réponse finale. Le blog officiel « A harness for every task » (Thariq Shihipar & Sid Bidasaria, 2 juin 2026) le résume : « Claude can now write its own harness on the fly, custom-built for the task at hand. » C'est ce qui permet de passer à l'échelle de centaines d'agents sans noyer la conversation.

2. **Les trois modes d'échec que les workflows corrigent (confiance : Élevée, blog Anthropic « A harness for every task »).** *Agentic laziness* — « Claude stops before finishing a particularly complex, multi-part task and declares the job done after partial progress, for example addressing 35 of the 50 items in a security review » ; *self-preferential bias* (Claude préfère ses propres résultats quand il juge son travail) ; et *goal drift* (perte de fidélité à l'objectif au fil des tours, surtout après compaction). Le workflow combat structurellement ces modes en donnant à chaque subagent un contexte isolé et un objectif borné, et en séparant producteur et vérificateur.

3. **API du runtime (confiance : Élevée pour les primitives cœur ; Moyenne pour options/constantes de détail).** Les primitives injectées et documentées officiellement (via l'exemple des docs et l'Agent SDK) sont `agent()` et `pipeline()` ; les sources d'ingénierie et les skills d'authoring documentent en plus `parallel()`, `phase()`, `log()`, `workflow()`, et les globals `args` et `budget`.

4. **Caps runtime (confiance : Élevée pour 16/1000, doc officielle).** Jusqu'à **16 agents concurrents** (moins sur machines à faible nombre de cœurs), **1 000 agents au total par run** (garde-fou anti-boucle-folle). Les caps additionnels (taille de script, timeouts, cap d'items par appel) sont documentés par des sources tierces et à traiter comme [À VÉRIFIER].

5. **Coût (confiance : Élevée sur le principe et le prix modèle, Faible/Moyenne sur les estimations de run).** Un workflow consomme « substantiellement plus de tokens qu'une session Claude Code classique » (Anthropic). Prix Opus 4.8 confirmé par l'annonce officielle : **5 $/M input, 25 $/M output** (usage normal), **10 $/M input, 50 $/M output** en fast mode. Les runs comptent dans les limites de plan. Claude Code affiche un avertissement « Large workflow » au-delà de 25 agents ou de 1,5 M tokens projetés.

6. **Prior art d'authoring (confiance : Moyenne, dépôts communautaires).** Plusieurs skills existent déjà pour *créer* des workflows : `ray-amjad/claude-code-workflow-creator`, `workflow-builder` (msm47/gitskil, largement réutilisé), et le skill dans `alirezarezvani/claude-skills`. Tous convergent sur une procédure intake → scaffold → validate → run et sur une liste commune de règles parser-fatales.

---

## Details

### 1. Fondamentaux & modèle mental

**Définition officielle (Élevée).** « A dynamic workflow is a JavaScript script that orchestrates subagents at scale. Claude writes the script for the task you describe, and a runtime executes it in the background while your session stays responsive. » (docs officielles, code.claude.com/docs/en/workflows). Le script tient la boucle, le branchement et les résultats intermédiaires ; seul le résultat final atteint le contexte de Claude.

**« Le plan sort de la tête de Claude et passe dans du code ».** C'est la formulation centrale. Le tableau officiel de comparaison :

| | Subagents | Skills | Agent teams | Workflows |
|---|---|---|---|---|
| Ce que c'est | Un worker que Claude spawn | Des instructions que Claude suit | Un lead qui supervise des sessions pairs | Un script que le runtime exécute |
| Qui décide la suite | Claude, tour par tour | Claude, suivant le prompt | Le lead, tour par tour | Le script |
| Où vivent les résultats intermédiaires | Contexte de Claude | Contexte de Claude | Une task list partagée | Variables du script |
| Ce qui est répétable | La définition du worker | Les instructions | La définition de l'équipe | L'orchestration elle-même |
| Échelle | Quelques tâches déléguées/tour | Idem subagents | Une poignée de pairs longue-durée | Dizaines à centaines d'agents/run |
| Interruption | Redémarre le tour | Redémarre le tour | Les coéquipiers continuent | Reprenable dans la même session |

**Critères de décision (synthèse doc + skill workflow-builder, Moyenne-Élevée) :**
- **Un seul subagent, une tâche** → outil Agent (subagent) simple. Emballer un seul `agent()` dans un workflow n'apporte rien.
- **Procédure réutilisable, Claude choisit les étapes dynamiquement** → un **Skill**.
- **Sustained/large-scale/cross-session parallelism** avec des pairs qui communiquent → **Agent teams**.
- **Beaucoup de subagents dans une topologie fixe, déterministe et reprenable** → **Workflow**. Un workflow gagne son coût quand le travail est parallèle ou multi-étapes, doit être reproductible, est assez long pour échouer à mi-course (donc resume compte), ou bénéficie de l'isolation de chaque étape dans son propre contexte.
- **Règle d'or (retour d'ingénierie, productcompass.pm) :** utiliser les subagents quand le job est *un tour de jugement parallèle* ; utiliser un workflow quand *la sortie de l'étape N détermine l'étape N+1* (route, score, filtre, boucle, retry, génère, vérifie, build).

**Différence avec `/deep-research` et `/goal` :** `/deep-research` **est** un workflow bundled (fan-out de recherches web → cross-check → vote adversarial par claim → rapport cité). `/goal` est un mécanisme distinct (v2.1.139+) : il fixe une condition de complétion et un **modèle évaluateur séparé** (Haiku par défaut) juge, après chaque tour, si la condition est remplie à partir du transcript (l'évaluateur ne lance pas de commandes ; la condition doit être démontrable par la sortie de Claude). `/goal` et les workflows sont complémentaires : la doc et le blog Anthropic recommandent de coupler workflows répétables avec `/loop` (récurrence) et `/goal` (exigence de complétion dure). Le *plan mode* est encore autre chose : Claude planifie avant d'exécuter, mais reste l'orchestrateur.

### 2. Format de fichier & API du runtime (couche authoring — la plus critique)

**Emplacement des fichiers.** Les workflows sauvegardés vivent dans `.claude/workflows/<name>.js` (projet, versionné/partagé) ou `~/.claude/workflows/` (personnel ; sous `CLAUDE_CONFIG_DIR` si défini). En monorepo (v2.1.178+), la sauvegarde projet écrit dans le `.claude/workflows/` le plus proche entre le cwd et la racine ; si un workflow projet et un workflow personnel partagent un nom, c'est le projet qui l'emporte.

**Structure : exactement deux parties, dans l'ordre.** (1) un export `meta` littéral, (2) un corps async qui utilise les globals injectés. Le corps est du JavaScript ordinaire avec top-level `await`. Pas d'imports, pas d'accès filesystem, entrées via `args`, résultats via `return`.

**L'export `meta` (règles dures — parser).** `meta` doit être **la première instruction** et un **littéral d'objet pur** — aucune variable, spread, template string, ou appel de fonction à l'intérieur. Les clés réservées (`__proto__`, `constructor`, `prototype`) sont rejetées par le parser. `name` et `description` sont requis (chaînes non vides) ; `whenToUse` et `phases` optionnels. Chaque entrée de `phases` correspond à un appel `phase()`, ce qui alimente la vue de progression `/workflows`.

```javascript
// SQUELETTE MINIMAL COMMENTÉ
// 1) meta = PREMIÈRE instruction, littéral pur (pas de variable/appel/template)
export const meta = {
  name: 'audit-routes',                         // requis, string non vide
  description: 'Audit route handlers for auth', // requis
  whenToUse: 'Quand lancer ce workflow',        // optionnel
  phases: [                                      // optionnel : une entrée par phase()
    { title: 'Discover', detail: 'lister les fichiers' },
    { title: 'Audit', detail: 'un agent par fichier', model: 'haiku' },
  ],
}

// 2) Corps async : JS pur + globals injectés, top-level await
phase('Discover')
const found = await agent('List every .ts file under src/routes/.', {
  schema: {
    type: 'object',
    required: ['files'],
    properties: { files: { type: 'array', items: { type: 'string' } } },
  },
})

phase('Audit')
const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file, phase: 'Audit' }),
)

return audits.filter(Boolean)   // toujours filtrer les agents skipped/failed (=> null)
```
*(Ce squelette suit l'exemple officiel des docs et la structure documentée par le skill workflow-builder.)*

**Tableau de l'API des primitives injectées** (cœur = doc officielle/SDK ; le reste = sources d'ingénierie + api_reference du skill workflow-builder ; confiance annotée) :

| Global | Signature | Rôle | Confiance |
|---|---|---|---|
| `agent(prompt, opts?)` | `→ Promise<string\|object>` | Spawn 1 subagent ; texte, ou objet validé si `schema` fourni | Élevée |
| `pipeline(items, ...stages)` | `→ Promise<any[]>` | Chaque item traverse toutes les étapes indépendamment, **sans barrière** ; callback reçoit `(prevResult, originalItem, index)` | Élevée |
| `parallel(thunks)` | `→ Promise<any[]>` | Exécute des thunks `() => Promise` en concurrence ; **barrière** (attend tout). Un thunk qui throw résout à `null` | Élevée |
| `phase(title)` | `→ void` | Démarre un groupe de progression | Élevée |
| `log(message)` | `→ void` | Ligne de narration dans le log du workflow | Élevée |
| `workflow(nameOrRef, args?)` | `→ Promise<any>` | Exécute un autre workflow inline (composition) ; **un seul niveau de nesting** | Moyenne |
| `args` | any | Entrée passée au lancement (données structurées ; `undefined` si absent) | Élevée |
| `budget` | `{ total, spent(), remaining() }` | Suivi de tokens ; `total` = cible utilisateur ou `null` ; `remaining()` = `Infinity` si pas de cible | Moyenne |
| `console` | `.log()/.error()` | Routé dans le log du workflow | Moyenne |

**Options de `agent()`** (Moyenne — cœur `schema`/`model`/`isolation` corroboré par plusieurs sources ; `label`/`phase`/`agentType`/`stallMs` par le skill api_reference) :
- `schema` : un JSON Schema. Force le subagent à renvoyer des données structurées validées **au niveau du tool-call**, avec retry sur non-conformité. Bien plus fiable que « please return JSON ». À utiliser dès qu'une étape aval consomme le résultat.
- `label` : nom affiché dans l'UI de progression.
- `phase` : assigne l'agent à un groupe de progression (à utiliser dans `parallel()`/`pipeline()` pour éviter les courses sur l'état global de `phase()`).
- `model` : `'haiku' | 'sonnet' | 'opus' | 'inherit' | <full-model-id>`. Défaut = hérite du modèle de session. Haiku pour classification/extraction, Opus pour synthèse/raisonnement dur.
- `isolation: 'worktree'` : exécute l'agent dans un git worktree frais (à réserver aux écritures concurrentes qui entreraient en conflit).
- `agentType` : type de subagent custom au lieu du subagent workflow par défaut.
- `stallMs` : override du timeout de stall par agent. [À VÉRIFIER — source unique]

**Sorties structurées (schema).** Le pattern fiable : définir des constantes de schéma JSON en amont, les passer via `schema`, filtrer `results.filter(Boolean)` (agents skipped/failed = `null`), puis passer l'objet validé à l'étape suivante. Côté Agent SDK, l'équivalent est `output_format`/structured output, et la doc recommande de préférer ça à « demander du JSON dans le prompt puis JSON.parse ».

**Contraintes de déterminisme (règles dures — confiance Élevée, corroborées par 3+ sources dont blog d'ingénierie alexop.dev et skills).** Interdits car ils cassent la reprise (le runtime journalise chaque appel `agent()` par un hash de `(prompt, opts)` ; le non-déterminisme invaliderait ce cache) :
- `Date.now()` → passer les timestamps via `args`.
- `Math.random()` → varier le prompt/label par index pour la variété.
- `new Date()` sans argument → utiliser `new Date(valeurSpécifique)`.
- Pas d'accès filesystem, ni APIs Node (`require`, `fs`, `process`), ni réseau **depuis l'orchestrateur**. Tout ça se fait *dans* les prompts `agent()` (les subagents ont accès aux outils).

### 3. Patterns d'orchestration

**La forme qui généralise : fan out → reduce → synthesize.** Interchanger les sources et prompts transforme ce squelette en scan de marché, audit de dépendances, code review, ou rapport de recherche.

**Règle par défaut : `pipeline()` plutôt que `parallel()`.** `pipeline()` streame chaque item à travers les étapes sans barrière (les items rapides finissent tôt, zéro temps mort) ; `parallel()` est une barrière qui attend le plus lent. Ne recourir à une barrière `parallel()` que quand une étape a besoin de *tous* les résultats précédents d'un coup (dedup/merge sur l'ensemble, early-exit sur un total, prompt qui référence « les autres findings »). Mauvaises raisons : « je dois flatten/filtrer d'abord » (faites-le dans une étape de pipeline), « les étapes semblent séparées », « c'est plus propre ».

Les patterns nommés par le blog Anthropic (« A harness for every task ») et les retours d'ingénierie :

1. **Fan-out-and-synthesize** — découper en petites étapes, un agent par étape, puis un agent de synthèse (barrière). Idéal quand chaque étape bénéficie d'un contexte propre.
2. **Pipeline** (défaut) — items indépendants qui traversent les étapes sans barrière.
3. **Classify-and-act** — un agent classifieur route vers différents agents/comportements selon le type de tâche (aussi utile pour le *model/intelligence routing* : router vers Sonnet ou Opus selon la complexité estimée).
4. **Adversarial verification** — pour chaque finding, spawn N sceptiques indépendants chargés de le *réfuter* ; on tue le finding sauf si une majorité survit. Producteur et sceptique ne partagent jamais de contexte (tue le self-preferential bias).
5. **Generate-and-filter / Tournament** — générer N idées/tentatives, puis filtrer/juger. Pour le tri qualitatif à grande échelle, préférer une comparaison **par paires** (jugement comparatif plus fiable que le scoring absolu) tenue par la boucle déterministe.
6. **Judge panel** — générer N tentatives sous différents angles, scorer avec des juges parallèles, synthétiser à partir du gagnant.
7. **Loop-until-done / loop-until-dry / loop-until-budget** — pour un volume de travail inconnu, boucler jusqu'à une condition d'arrêt (K rondes consécutives sans nouveauté, ou `budget.remaining()` sous un seuil). **Détail vital :** dédupliquer contre tout ce qui a été *vu* (un `Set`), pas seulement contre les résultats confirmés, sinon les findings rejetés reviennent chaque ronde et la boucle ne converge jamais.
8. **Dependency-aware waves** — pour du travail avec dépendances : une phase de découverte produit un tri topologique, puis on traite par vagues.
9. **Quarantine (sécurité/triage)** — les agents qui lisent du contenu public non fiable sont *barrés* de toute action à privilège élevé ; ce sont des agents séparés « acteurs » qui agissent sur l'information. Empêche l'injection de prompt de déclencher des actions dangereuses.

**Templates par pattern (squelettes, d'après le skill workflow-builder / retours d'ingénierie) :**

```javascript
// FAN-OUT → SYNTHESIZE (barrière justifiée : synthèse a besoin de tout)
phase('Research')
const raw = await parallel(SOURCES.map((s) => () =>
  agent(s.prompt, { label: `res:${s.key}`, phase: 'Research', schema: ITEM_SCHEMA })))
const items = raw.filter(Boolean).flatMap(r => r.items)
phase('Synthesize')
return await agent(`Synthesize:\n${JSON.stringify(items)}`, { model: 'opus' })
```
```javascript
// PIPELINE (défaut : pas de barrière entre les étapes)
const results = await pipeline(
  DIMENSIONS,
  d => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS }),
  review => parallel((review?.findings ?? []).map(f => () =>
    agent(`Adversarially verify: ${f.title}`, { schema: VERDICT }))),
)
```
```javascript
// LOOP-UNTIL-DRY + budget guard (JAMAIS de boucle non gardée)
const seen = new Set(); const confirmed = []; let dry = 0
while (dry < 2 && (budget.total ? budget.remaining() > 30_000 : confirmed.length < 100)) {
  const found = (await parallel(FINDERS.map(f => () =>
    agent(f.prompt, { phase: 'Find', schema: BUGS })))).filter(Boolean).flatMap(r => r.bugs)
  const fresh = found.filter(b => !seen.has(key(b)))
  if (!fresh.length) { dry++; continue }
  dry = 0; fresh.forEach(b => seen.add(key(b)))
  confirmed.push(...fresh)
}
```
```javascript
// JUDGE / ADVERSARIAL (majorité survit)
const votes = await parallel(Array.from({length: 3}, (_, i) => () =>
  agent(`Try hard to REFUTE this claim, return {refuted:boolean}:\n${claim}`,
        { label: `skeptic:${i+1}`, schema: VERDICT })))
const survives = votes.filter(v => v && !v.refuted).length >= 2
```

**Exemple réel bundled — `/deep-research` (5 phases) :** Scope (1 agent décompose la question en ~5 angles) → Search (5 recherches web en parallèle) → Fetch (dedup des URLs, ~15 sources, extraction de claims) → Verify (vote adversarial à 3 par claim) → Synthesize (1 agent écrit le rapport cité). À partir de v2.1.196, un claim non vérifiable (rate limit/erreur API) est listé comme « unverified » plutôt que compté comme réfuté.

### 4. Activation, exécution & cycle de vie

**Versions et dates (confiance Élevée, changelog officiel) :**
- **v2.1.154 (28 mai 2026)** : introduction des dynamic workflows (research preview) + Opus 4.8 + `/workflows` + fast mode « 2.5× la vitesse, trois fois moins cher que pour les modèles précédents » (annonce Opus 4.8).
- **v2.1.160 (2 juin 2026)** : le keyword déclencheur `workflow` est **renommé `ultracode`** (breaking change) ; le mot « workflow » ne déclenche plus, mais la demande en langage naturel (« use a workflow ») fonctionne toujours. Documentation complète publiée le 2 juin. Ajout du garde-fou d'écriture acceptEdits sur les fichiers de config exécutables.
- **v2.1.178** : workflows en monorepo (multiples `.claude/`).
- **v2.1.196** : gestion des claims « unverified » dans `/deep-research`.
- **v2.1.202 (6 juil. 2026)** : réglage « Dynamic workflow size » dans `/config` (small/medium/large — advisory, pas un cap dur).
- **v2.1.203** : `claude --effort ultracode` au lancement ; avertissement « Large workflow ».
- **v2.1.208** : le dialogue de sauvegarde affiche le chemin résolu de `CLAUDE_CONFIG_DIR`.
- **v2.1.210 (14 juil. 2026)** : le keyword ne déclenche plus depuis un webhook/commentaire de PR relayé (durcissement).
- **2 juillet 2026** : passage en **GA** — « Anthropic has upgraded Claude Code's Dynamic Workflows from research preview to general availability, extending access to Pro plan subscribers for the first time » (Tech Times, 2 juil. 2026).

**[INCERTAIN — divergence de sources] Version d'introduction :** l'api_reference du skill workflow-builder cite « v2.1.147 » comme introduction de l'outil Workflow, tandis que le changelog officiel et la majorité des sources datent l'annonce publique à v2.1.154. Hypothèse la plus probable (confiance Moyenne) : l'outil Workflow *caché* a pu shipper dans le binaire dès ~v2.1.147, avant l'annonce/activation publique en v2.1.154. À traiter comme non tranché.

**Activation (confiance Élevée pour l'état GA) :**
- **GA :** disponible CLI, Desktop, extension VS Code, `claude -p`, Agent SDK ; sur Pro, l'activer via la ligne « Dynamic workflows » de `/config`. Sur Max/Team, activé par défaut ; sur Enterprise, désactivé par défaut (l'admin l'active).
- **Désactivation :** toggle `/config` ; `"disableWorkflows": true` dans `~/.claude/settings.json` ou en managed settings ; `CLAUDE_CODE_DISABLE_WORKFLOWS=1` (lu au démarrage).
- **[Preview historique — À VÉRIFIER en GA] Variable d'env `CLAUDE_CODE_WORKFLOWS=1` :** documentée par les skills d'authoring (ray-amjad, workflow-builder) comme le moyen d'activer l'outil quand il était pré-release/gated. **En GA, l'activation officielle passe par `/config`**, pas par cette variable. Les skills écrits en preview qui référencent `CLAUDE_CODE_WORKFLOWS=1` sont probablement périmés sur ce point.

**Manières de lancer un run (confiance Élevée) :**
1. **Mot en langage naturel** — « use a workflow » / « run a workflow » dans un prompt. Fonctionne dans les deux versions (pré et post-v2.1.160).
2. **Keyword `ultracode`** dans un prompt — lance une tâche unique comme workflow sans changer le niveau d'effort de la session. Claude surligne le keyword (en violet). `Option+W` (macOS) / `Alt+W` (Win/Linux) pour rejeter le surlignage.
3. **`/effort ultracode`** (session-wide) — combine raisonnement `xhigh` + orchestration automatique : Claude décide pour chaque tâche substantielle si elle mérite un workflow (un seul prompt peut devenir plusieurs workflows en série : comprendre → changer → vérifier). Dure la session, reset au redémarrage ; `/effort high` pour revenir. Nécessite un modèle supportant `xhigh`.
4. **Commande sauvegardée / bundled** — `/deep-research`, ou tout `/‹name›` sauvegardé.
5. **Le keyword ne déclenche PAS** depuis : `-p`, un prompt Agent SDK non estampillé comme humain, une scheduled task, ou (depuis v2.1.210) un webhook/commentaire PR relayé.

**Où le keyword fonctionne :** uniquement dans un prompt tapé par l'humain (prompt interactif, panneau IDE, client Remote Control, ou app Agent SDK qui estampille l'input `origin: { kind: "human" }`).

**Vue `/workflows` et contrôles :** liste runs en cours/terminés ; vue de progression par phase (compte d'agents, tokens, temps). Touches : `↑/↓` sélection, `Enter/→` drill-in, `Esc/←` back, `p` pause/resume, `x` stop agent/workflow, `r` restart agent, `f` filtre par statut (v2.1.186+), `s` **sauver le script comme commande**. `Ctrl+G` ouvre le script dans l'éditeur ; `Tab` ajuste le prompt avant lancement.

**Sauvegarde d'un run en commande :** `s` dans `/workflows` → Tab bascule entre `.claude/workflows/` (projet) et `~/.claude/workflows/` (perso). Le workflow devient `/‹name›` et apparaît en autocomplétion `/`. Chaque run écrit aussi son script sous `~/.claude/projects/` (Claude reçoit le chemin ; on peut le lire, le diff, l'éditer et relancer).

**Passage d'arguments :** un workflow sauvegardé lit `args` (global). Claude passe les données en structuré, donc le script peut appeler directement les méthodes array/objet sur `args`. `undefined` si omis.

**Gates d'approbation (confiance Élevée) :** en CLI, le prompt par run montre les phases planifiées + options (Yes run it / Yes and don't ask again for ‹name› in ‹path› / View raw script / No). Selon le mode de permission : **Default/accept edits** = chaque run (sauf « don't ask again ») ; **Auto** = premier lancement seulement (et *skippé entièrement* si ultracode est on) ; **Bypass/`claude -p`/Agent SDK** = jamais, le run démarre immédiatement.

**Resume :** un run stoppé est reprenable **dans la même session** : les agents déjà terminés renvoient leurs résultats cachés, les autres tournent live. Un agent qui tournait au moment du stop n'est pas sauvé et repart de zéro → un workflow fait de nombreux petits agents préserve plus de progrès. **Quitter Claude Code fait repartir le workflow de zéro à la prochaine session.**

**Plateformes supportées (GA) :** CLI, Desktop, VS Code, extensions IDE, `claude -p` (headless), Agent SDK ; Anthropic API, Amazon Bedrock, Google Cloud (Vertex AI / Agent Platform), Microsoft Foundry.

### 5. Pièges, anti-patterns, garde-fous & coûts

**Caps runtime (confiance Élevée pour 16/1000 — doc officielle ; le reste [À VÉRIFIER]) :**

| Limite | Valeur | Comportement | Source/confiance |
|---|---|---|---|
| Agents concurrents | 16 (moins si peu de cœurs) | Excédent en file | Doc officielle — Élevée |
| Agents au total/run | 1 000 | Empêche les boucles folles ; throw `WorkflowAgentCapError` | Doc off. (1000) + skill (nom d'erreur) — Élevée/Moyenne |
| Formule de concurrence | `min(16, cœurs−2)` ou `min(16, max(2, cœurs−2))` | — | Divergence sources tierces — Faible |
| Items par `parallel()`/`pipeline()` | 4096 | — | Source tierce unique — Faible [À VÉRIFIER] |
| Taille de script | 524 288 octets (512 Kio) | Rejeté avant parsing | Skill api_reference — Faible [À VÉRIFIER] |
| Stall par agent | 180 000 ms (3 min), retry ×5 | Aborté puis retenté | Skill api_reference — Faible [À VÉRIFIER] |
| Timeout synchrone | 30 000 ms | Attrape les boucles sync infinies | Skill api_reference — Faible [À VÉRIFIER] |
| Budget tokens | throw `WorkflowBudgetExceededError` quand `spent()` atteint `total` | — | Skill api_reference — Faible [À VÉRIFIER] |

**Anti-patterns (liste explicite) :**
- **Boucle non gardée** → touche le cap de 1 000 agents. Garder chaque boucle ouverte avec un compteur ET/OU `budget.remaining()`.
- **`meta` non littéral** (variable, template string, appel, spread dans `meta`) → erreur parser fatale.
- **Non-déterminisme** (`Date.now()`, `Math.random()`, `new Date()` argless) → casse le resume.
- **`parallel()` avec des promesses nues** au lieu de thunks `() => agent(...)` → incorrect ; `parallel` prend des thunks.
- **Barrière inutile** (`parallel → transform → parallel` sans dépendance cross-item) → gaspillage de wall-clock ; utiliser `pipeline`.
- **Handoffs en free-text** entre étapes au lieu de schémas → non fiable ; utiliser `schema` dès qu'une étape aval consomme le résultat.
- **Ne pas filtrer** `results.filter(Boolean)` → les agents skipped/failed (`null`) polluent l'aval.
- **« Too clever »** — pipelines à 7 étapes pour un job à 3 agents. Interrompre et simplifier ; « use at most N agents ».
- **Oublier de scoper** — pointer la racine du repo au lieu de chemins/dossiers explicites ; workflow sur petite tranche d'abord.
- **Utiliser un workflow là où un seul agent suffit** — la plupart des tâches de code n'ont pas besoin d'un panel de 5 reviewers.
- **Régénérer au lieu de rejouer** — le même prompt peut produire des scripts différents ; pour reproductibilité, sauver le script et le relancer.

**Coûts (confiance : Élevée sur le principe et le prix modèle ; les estimations de run sont des retours tiers, Faible-Moyenne).** Anthropic : les workflows « consomment substantiellement plus de tokens ». Les tokens ne sont **pas partagés** entre agents : un run à 10 agents coûte ~10× un run mono-agent pour le même temps. Prix Opus 4.8 confirmé par l'annonce officielle « Introducing Claude Opus 4.8 » : **5 $/M input et 25 $/M output** (usage normal), **10 $/M input et 50 $/M output** en fast mode. Ordres de grandeur *rapportés par des tiers* (non officiels, donc Faible) : audit codebase ~50-150 $, migration ~100-500 $, run parallèle de 24 h ~400-600 $ ; un développeur a rapporté avoir brûlé sa limite Max de 5 h en ~10 min avec ~70 agents, un autre 24,2 M tokens en 62 min sur un audit à 627 agents. **Avertissement « Large workflow »** (v2.1.203+) au-delà de 25 agents ou 1,5 M tokens projetés — advisory, ne stoppe pas. Réglage `/config` « Dynamic workflow size » : small (<5 agents), medium (<15), large (<50) — advisory. Budget par prompt possible (« use 10k tokens »).

**Sécurité & permissions (confiance Élevée — doc officielle) :**
- Les subagents d'un workflow tournent **toujours en mode `acceptEdits`** et héritent de la tool allowlist, **quel que soit** le mode de permission de la session. **Les éditions de fichiers sont auto-approuvées.**
- Les commandes shell, web fetches et MCP tools hors allowlist peuvent encore prompter en cours de run (sauf en `claude -p`/SDK où il n'y a personne à prompter → suivent les règles configurées sans confirmation). Pré-allowlister avant un long run.
- **Garde-fou d'écriture (v2.1.160+) :** les écritures vers des « fichiers de config potentiellement exécutables » requièrent une confirmation préalable même en acceptEdits.
- **Pattern quarantine** (voir §3) pour le contenu non fiable. Un PreToolUse hook basé sur `agent_id` peut encore gater les écritures des subagents.
- **Erreurs parser-fatales & linting :** les skills d'authoring embarquent un validateur (`validate_workflow.py` / `validate-workflow.mjs`) qui vérifie AVANT le run : `meta` littéral en 1re instruction, pas de non-déterminisme, pas d'APIs Node/fs/réseau dans l'orchestrateur, `parallel()` avec thunks, boucles gardées, `filter(Boolean)`. Bug corrigé (mi-2026) : les erreurs de parsing de workflow montrent désormais la ligne fautive au lieu de toujours blâmer TypeScript ; les échappements de guillemets unicode ne corrompent plus le script.

### 6. Prior art & authoring de skills

**Skills/plugins d'authoring de workflows recensés (confiance Moyenne — dépôts communautaires) :**
- **`ray-amjad/claude-code-workflow-creator`** — skill dédié à l'*authoring* de scripts Workflow. Contenu : `SKILL.md` (procédure), `references/api-reference.md` (chaque global/option/cap), `references/patterns.md` (fan-out, pipeline, loop-until-budget, judge panel), `assets/templates/` (fan-out, pipeline, loop), `assets/examples/` (6 exemples runnable), `scripts/validate-workflow.mjs` (linter des règles dures). Écrit en preview (mentionne `CLAUDE_CODE_WORKFLOWS=1`) ; détails « vérifiés directement contre le binaire Claude Code ».
- **`workflow-builder`** (msm47/gitskil, largement réutilisé — 14 plugins le reprennent) — « Design and write deterministic multi-agent workflow scripts (.js in .claude/workflows/) ». Structure : `SKILL.md`, `references/api_reference.md`, `references/orchestration_patterns.md`, `references/decision_and_intake_guide.md`, `assets/templates/` (fan-out, pipeline, loop-until-budget), `assets/examples/pr-triage.js`, et scripts Python `workflow_intake.py`, `scaffold_workflow.py`, `validate_workflow.py`.
- **`alirezarezvani/claude-skills`** (workflow-builder, 5 200+ étoiles) — même famille, procédure intake → scaffold → validate → run.
- **Autres à ne PAS confondre (prior art « workflow » au sens large, pas la feature dynamic workflows) :** `shinpr/claude-code-workflows` (recipes de dev multi-agents via plugins), `ruvnet/ruflo` (ex-Claude Flow ; `ruflo-workflows` avec 10 tools `workflow_*` MCP, orchestration de swarms — architecture différente), `catlog22/Claude-Code-Workflow` (framework JSON multi-agent, archivé), `rohitg00/pro-workflow` (mémoire/skills, pas de l'authoring de .js). À noter aussi les portages non-Anthropic de la feature : `michaelliv/pi-dynamic-workflows` et une issue de portage sur `QwenLM/qwen-code` — utiles pour comprendre le contrat du parser mais pas la source de vérité.

**Procédure type encodée par ces skills (synthèse) :**
1. **Intake (non négociable, toujours en premier) :** ne pas sauter au code. Questions d'ouverture : quelle tâche répétable multi-étapes ? quelle est l'unité de travail d'un subagent ? combien d'unités (liste connue vs boucle de découverte) ? les étapes aval ont-elles besoin de tous les résultats d'un coup, ou chaque item peut-il avancer seul ? une étape a-t-elle besoin de données structurées en retour (verdict, liste, scores) ? Si l'utilisateur est vague, ne pas bloquer : produire 1-2 propositions concrètes.
2. **Décider si un workflow est même le bon outil** (table : 1 subagent/1 tâche → Agent ; procédure réutilisable, étapes dynamiques → Skill ; topologie fixe, déterministe, reprenable → Workflow).
3. **Confirmer la forme** (topologie + phases + parallel-vs-pipeline) avec l'utilisateur — seule gate d'approbation.
4. **Scaffold** un starter selon la topologie confirmée.
5. **Éditer** : `meta` littéral en 1re instruction, puis corps avec les globals.
6. **Valider** avec le linter (PASS/WARN/FAIL avec numéros de ligne) — attrape les erreurs parser-fatales.
7. **Lancer** via `/workflows`, watch live (P pause, X skip), sauver si concluant.

**Partage via skill (blog Anthropic) :** mettre les fichiers `.js` dans le dossier du skill, les référencer dans `SKILL.md`, et prompter Claude de les traiter comme des **templates** (pas des scripts à rejouer verbatim) — pour que chaque réutilisation s'adapte à la tâche.

---

## Recommendations

**Ce qu'un bon skill de création de workflow doit encoder (synthèse — la section finale demandée) :**

1. **Une gate d'intake obligatoire avant tout code** — les 5-6 questions ci-dessus, avec un fallback qui produit 1-2 propositions concrètes si l'utilisateur est vague. La seule gate d'approbation humaine = confirmer topologie + phases + parallel/pipeline.
2. **Un arbre de décision « workflow ou pas »** — refuser explicitement de générer un workflow pour un job mono-agent, une tâche à budget prévisible (→ subagent custom), ou quand un seul contexte suffit.
3. **Le format de fichier comme contrat dur** — `meta` littéral pur en 1re instruction (name/description requis) ; corps async ; globals injectés ; règles de déterminisme. Un template commenté par topologie (fan-out, pipeline, loop-until-budget/dry, judge).
4. **`schema` par défaut pour tout handoff inter-étapes** — encoder « jamais de free-text quand une étape aval consomme le résultat » ; toujours `filter(Boolean)`.
5. **`pipeline()` par défaut, `parallel()` seulement pour une barrière justifiée** — avec le smell test (barrière = étape a besoin de TOUT le set précédent).
6. **Garde-fous de boucle systématiques** — tout `while`/boucle ouverte gardé par compteur ET `budget.remaining()` ; dédup contre un `Set` de tout ce qui est *vu*.
7. **Un validateur/linter exécutable** qui échoue AVANT le run sur : meta non littéral, non-déterminisme, APIs interdites dans l'orchestrateur, promesses nues dans `parallel`, boucles non gardées, absence de `filter(Boolean)`.
8. **Une couche coût/sécurité** — scoper les chemins explicitement, injecter des directives de modèle (Haiku pour classification, Opus pour synthèse), rappeler que les subagents auto-approuvent les éditions (acceptEdits) et encoder le pattern quarantine pour le contenu non fiable.
9. **Une note preview↔GA** — le skill doit détecter/annoter l'état de la feature (env var historique vs `/config`, keyword `workflow`→`ultracode`) et traiter ses propres exemples comme des templates adaptables, pas des scripts figés.

**Étapes concrètes (staged) pour le demandeur :**
- **Étape 1 (maintenant) :** partir du format de fichier officiel (docs code.claude.com/docs/en/workflows) comme source de vérité pour `meta`, `agent()`, `pipeline()`, les caps 16/1000, les gates de permission et le resume. C'est le socle non contesté.
- **Étape 2 :** enrichir avec la surface API détaillée (`parallel`, `phase`, `log`, `workflow`, `budget`, options `schema`/`model`/`isolation`/`label`/`phase`) depuis les blogs d'ingénierie (alexop.dev) et le skill api_reference — en marquant [À VÉRIFIER] tout ce qui n'a qu'une source tierce (4096 items, 512 Kio, timeouts, noms d'erreurs).
- **Étape 3 :** encoder la procédure intake→scaffold→validate→run et le validateur en s'inspirant de ray-amjad et workflow-builder, mais réécrire l'activation pour l'état GA (`/config`, pas `CLAUDE_CODE_WORKFLOWS=1`).
- **Seuils qui changent la recommandation :** si Anthropic publie une référence officielle de l'Agent SDK « Workflow tool » (attendue), elle remplace les sources tierces pour la surface API et les caps — re-vérifier alors 4096/512 Kio/timeouts/noms d'erreurs. Si le keyword ou le mode d'activation change à nouveau (historique de churn rapide), re-vérifier le changelog.

---

## Caveats

- **Feature à évolution rapide.** Entre le 28 mai et le 18 juillet 2026, l'activation, le keyword (`workflow`→`ultracode`) et le statut (preview→GA) ont tous changé. Tout skill ou doc doit dater ses affirmations et pointer vers le changelog officiel.
- **Distinction preview vs GA à maintenir en permanence.** Les meilleures sources sur la *surface API détaillée* (skills d'authoring, blogs d'ingénierie) ont été écrites en preview et référencent `CLAUDE_CODE_WORKFLOWS=1` ; en GA, l'activation est `/config`. Ne pas propager la variable d'env comme méthode d'activation actuelle.
- **Sources primaires vs tierces.** Confiance Élevée : docs officielles (code.claude.com/docs/en/workflows, /goal, /agent-sdk), blog Anthropic (« Introducing dynamic workflows », « A harness for every task »), changelog GitHub anthropics/claude-code, annonce Opus 4.8. Confiance Moyenne : blogs d'ingénierie datés et crédibles (alexop.dev, productcompass.pm, claudefa.st). Confiance Faible : estimations de coût rapportées par des tiers et constantes runtime à source unique (skill api_reference).
- **Divergences non tranchées, signalées :** (a) version d'introduction v2.1.147 (skill) vs v2.1.154 (changelog officiel) ; (b) formule de concurrence `min(16, cœurs−2)` vs `min(16, max(2, cœurs−2))` ; (c) caps 4096 items / 512 Kio / timeouts / noms d'erreurs (`WorkflowAgentCapError`, `WorkflowBudgetExceededError`) — à source tierce unique, marqués [À VÉRIFIER].
- **Les noms de primitives et options non issus de la doc officielle** (`agentType`, `stallMs`, `console` injecté, `whenToUse` dans meta) proviennent de skills/blogs et non d'une référence Anthropic ; probables mais à confirmer contre une future doc SDK officielle du Workflow tool.
- **Chiffres du port de Bun.** Anthropic cite 750 000 lignes de Rust / 11 jours (premier commit → merge) / 99,8 % des tests. Des analyses tierces précisent que la sortie de ~750 000 lignes de Rust provient d'environ 960 000 lignes de Zig en entrée, que Jarred Sumner a évoqué « ~6 jours de temps de codage pur par l'IA » (run du 3 au 14 mai 2026), avec un coût estimé cité autour de 165 000 $, et que Claude Code v2.1.181+ (17 juin) utilise le port Rust. Traiter comme un cas emblématique, pas comme un benchmark reproductible.

---

## Annexe — Sources primaires (liens)

**Documentation officielle Anthropic (confiance Élevée)**
- `https://code.claude.com/docs/en/workflows` — référence des dynamic workflows (définition, tableau de comparaison, `/deep-research`, format `meta`+corps, caps 16/1000, gates de permission, resume, coûts, désactivation).
- `https://code.claude.com/docs/en/goal` — commande `/goal` (évaluateur séparé, conditions).
- `https://platform.claude.com/docs/en/agent-sdk/typescript` et `/agent-sdk/python` — Agent SDK (Workflow tool, structured output, options).
- `https://www.anthropic.com/news/claude-opus-4-8` — annonce Opus 4.8, dynamic workflows en preview, prix (5 $/25 $ ; fast mode 10 $/50 $, 2,5× vitesse).
- `https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md` et `/releases/tag/v2.1.160` — changelog officiel (introduction v2.1.154, renommage `ultracode`).

**Blogs Anthropic (confiance Élevée)**
- `https://claude.com/blog/introducing-dynamic-workflows-in-claude-code` — annonce (mise à jour GA), cas Bun, use cases.
- `https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code` — Thariq Shihipar & Sid Bidasaria : modes d'échec, 6+ patterns, partage via skill, budgets.

**Retours d'ingénierie datés (confiance Moyenne)**
- `https://alexop.dev/posts/claude-code-workflows-deterministic-orchestration/` — primitives, `pipeline` vs `parallel`, déterminisme, exemple complet `vue-newsletter.js`.
- `https://www.productcompass.pm/p/claude-code-dynamic-workflows` — modèle mental « qui tient le plan », subagents vs workflow.
- `https://claudefa.st/blog/guide/development/dynamic-workflows` — 3 modes d'échec, 6 patterns, quarantine.
- `https://kenhuangus.substack.com/p/claude-code-orchestration-dynamic` ; `https://www.techtimes.com/articles/319532/...` (GA, 2 juil.) ; `https://www.infoq.com/news/2026/06/dynamic-workflows-claude-code/`.

**Dépôts d'authoring (prior art de skills, confiance Moyenne)**
- `https://github.com/ray-amjad/claude-code-workflow-creator` — skill d'authoring (API reference, patterns, templates, validateur).
- `https://github.com/msm47/gitskil` → `engineering/workflow-builder/skills/workflow-builder/` (`SKILL.md`, `references/api_reference.md`, `references/orchestration_patterns.md`, scripts intake/scaffold/validate).
- `https://github.com/alirezarezvani/claude-skills` — workflow-builder (procédure intake→scaffold→validate→run).
- `https://github.com/FlorianBruniaux/claude-code-ultimate-guide/blob/main/guide/workflows/dynamic-workflows.md` — guide communautaire (globals, caps, arbre de décision).