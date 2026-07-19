# Le premortem comme étape finale de validation d'un workflow spec → plan → découpage — Document de référence pour un skill Claude Code

## TL;DR
- Le premortem (Gary Klein, HBR 2007) est une technique de **réduction de la surconfiance** qui, en postulant que le plan **a déjà échoué**, fait générer davantage de causes de défaillance qu'une revue de risques classique ; c'est le mécanisme socio-cognitif (légitimation de la dissidence + cadrage de certitude), et non le seul « prospective hindsight », qui en fait la valeur — un point capital pour l'adaptation agentique.
- Pour un agent de coding (Claude Code et équivalents, 2024-2026), le premortem répond directement à un problème mesuré : la **surconfiance systématique** des agents (un agent post-exécution GPT-5.2-Codex prédit 73 % de succès pour un taux réel de 35 %) ; le levier le plus efficace démontré est le **recadrage adversarial** (« trouve les bugs » plutôt que « vérifie que c'est correct »), qui donne la meilleure calibration.
- Ce document fournit un protocole réutilisable étape par étape, une banque de prompts, une taxonomie de risques logiciels, un template de sortie risques→probabilité/impact→mitigations, et des critères go/no-go — en distinguant systématiquement ce qui est appuyé par la recherche de ce qui relève de la pratique empirique.

---

## Key Findings

1. **Fait établi (confiance Élevée).** Le premortem a été formalisé par Gary Klein dans *Performing a Project Premortem*, Harvard Business Review, septembre 2007 (vol. 85, n° 9, p. 18-19). Le principe : après avoir été briefée sur un plan, l'équipe imagine que le projet **a échoué de façon spectaculaire** et génère les raisons de cet échec, qui deviennent la critique du plan.

2. **Fait établi mais nuancé (confiance Élevée sur l'existence, Moyenne sur l'ampleur).** Klein s'appuie sur Mitchell, Russo & Pennington (1989), « Back to the future », *Journal of Behavioral Decision Making*, 2(1), 25-38. Klein en tire la formule fréquemment citée : *« prospective hindsight—imagining that an event has already occurred—increases the ability to correctly identify reasons for future outcomes by 30% »*. **Point critique** : l'étude de 1989 mesurait la *quantité* de raisons, pas leur justesse ; ses auteurs concluent explicitement que *« although prospective hindsight produces more reasons for an event, these reasons are typically episodic in nature. This is 'seeing' more, which is not necessarily the same as 'seeing' better »*. L'étude a par ailleurs eu des difficultés de réplication.

3. **Opinion d'expert documentée (confiance Élevée).** Daniel Kahneman qualifiait le premortem d'une de ses techniques de débiaisage favorites. Fait crucial rapporté par Michael Mauboussin (Head of Consilient Research, Morgan Stanley), dans « Remembering Daniel Kahneman » (*Behavioral Scientist*, 2024) : lorsqu'il a signalé à Kahneman que la recherche sur la prospective hindsight ne se répliquait pas, *« Danny explained that my concern was misplaced and that prospective hindsight was not central to the premortem. Rather, it was that the technique legitimizes dissent and allows organizations the opportunities to consider and close potential loopholes in their plans. »* Kahneman écrivait déjà dans *Thinking, Fast and Slow* (2011, ch. 24, p. 264) : *« The suppression of doubt contributes to overconfidence in a group where only supporters of the decision have a voice. The main virtue of the premortem is that it legitimizes doubts. »*

4. **Fait établi (confiance Élevée).** L'étude de validation la plus citée est Veinott, Klein & Wiggins (2010), présentée à la 7ᵉ conférence ISCRAM : 178 participants, plan pandémie H1N1, 5 conditions. Le premortem a réduit la confiance dans le plan **plus fiablement** que les autres méthodes (Critique, Pro/Cons, Cons-only, baseline). Elle mesurait la réduction de surconfiance, pas la précision prédictive finale.

5. **Fait établi (confiance Moyenne).** Gallop & Bischoff (2016), « How to catch a black swan », *Journal of Enterprise Transformation*, 6(2), 87-106 : 101 chefs de programme/ingénieurs expérimentés répartis aléatoirement en équipes de 4-6. Conclusion verbatim : *« teams using the premortem technique identified better quality risks, more quality changes to the plan, and identified more black swan risks than their brainstorming counterparts. »* Le scénario réel : ajout d'un détonateur de proximité à une torpille.

6. **Tendance observée (confiance Élevée).** Les agents de coding LLM sont mesurablement **surconfiants**. Kaddour et al. (2026), « Agentic Uncertainty Reveals Agentic Overconfidence » (arXiv:2602.06948, preprint 9 février 2026 ; SWE-bench Pro, 100 tâches, GPT-5.2-Codex, Gemini-3-Pro, Claude Opus 4.5) : *« GPT-5.2-Codex-based post-execution agents predict 73% success against a true rate of 35% averaged over 100 SWE-Bench-Pro tasks »* ; résumé : *« some agents that succeed only 22% of the time predict 77% success… Adversarial prompting reframing assessment as bug-finding achieves the best calibration. »* De plus, l'évaluation **pré-exécution** (moins d'information) discriminait mieux que la revue post-exécution, l'observation d'un patch produisant un ancrage sur sa plausibilité de surface.

7. **Pratique empirique établie (confiance Élevée).** La culture SRE (Google SRE Book, ch. 15 ; SRE Workbook) fournit le pendant *post-mortem* : blameless, centré sur les causes systémiques, action items *owned* et datés, séparés en mitigatifs vs préventifs. Le premortem est explicitement présenté comme « le meilleur moyen d'éviter un post-mortem douloureux » (Klein 2007).

---

## Details

### Axe 1 — Fondements et preuves

**Origine et définition (fait établi, confiance Élevée).** Gary Klein, chief scientist alors chez Klein Associates (division d'Applied Research Associates), a publié le premortem dans HBR en septembre 2007. Klein construit l'analogie médicale : un post-mortem (autopsie) détermine la cause du décès mais n'aide plus le patient ; le premortem « avance l'autopsie » avant le lancement. Klein l'avait déjà décrit dans son livre *Sources of Power* (1998).

**Le mécanisme officiel : « prospective hindsight ».** Klein cite l'unique étude de Mitchell, Russo & Pennington (1989). **Nuance de rigueur (confiance Élevée)** : (a) l'étude mesurait le *nombre* de raisons générées, pas leur qualité ni la justesse ; les auteurs concluaient eux-mêmes que la prospective hindsight fait « voir *plus*, ce qui n'est pas nécessairement voir *mieux* » — les raisons générées sont souvent « épisodiques » ; (b) dans leur première expérience, l'effet de la perspective temporelle était faible — c'était l'**incertitude** (la certitude que l'événement a eu lieu) qui pesait le plus. Ne pas présenter le « +30 % » comme une amélioration de la précision des prévisions : c'est une augmentation du nombre de raisons dans un contexte expérimental.

**L'hypothèse concurrente de Kahneman (opinion d'expert, confiance Élevée).** Kahneman considérait le premortem comme un débiaisage précieux. Mais confronté à la non-réplication de la prospective hindsight, il a soutenu que ce mécanisme n'est **pas** central : la vraie valeur du premortem est **sociale** — il légitime le doute et brise « la suppression du doute qui contribue à la surconfiance dans un groupe où seuls les partisans de la décision ont voix au chapitre ». Ceci a une conséquence directe pour l'adaptation agentique (voir Axe 4).

**Données d'efficacité (fait établi, confiance Moyenne à Élevée).**
- *Veinott, Klein & Wiggins (2010, ISCRAM)* : le premortem réduit la confiance dans le plan de manière plus fiable que Critique, Pro/Cons et Cons-only. Explication proposée : le cadrage de certitude (« une boule de cristal infaillible montre le fiasco ») + la focalisation sur les raisons d'échec. L'étude ne mesure pas la précision prédictive réelle, mais la réduction de surconfiance. Elle rappelle aussi (Koriat et al. 1980) que générer *seulement* des raisons *pour* un jugement accroît la surconfiance — le fondement cognitif du cadrage d'échec.
- *Gallop & Bischoff (2016)* : les équipes premortem produisent plus de risques « de qualité » et repèrent mieux les cygnes noirs que le brainstorming classique.

**Limites et critiques documentées (à distinguer : preuve vs opinion).**
- *Non-réplication du mécanisme* (fait établi, confiance Élevée) : la recherche sur la prospective hindsight ne se réplique pas de façon robuste (rapporté par Mauboussin/Kahneman) ; la littérature académique sur le premortem lui-même reste mince (Jason Collins, *Course notes on behavioural economics*).
- *Risques d'usage* (opinion d'expert / pratique, confiance Moyenne) : humeur négative, prophétie auto-réalisatrice, « analysis paralysis » si trop de causes générées, et risque d'identifier de faux risques dont la mitigation nuit à l'exécution (ProjectManager). Le Devil's Advocate — technique cousine — est jugé **inefficace** par la recherche (Nemeth et al. 2001, cité par Veinott) car les critiques sont perçues comme inauthentiques et l'équipe « externalise » son scepticisme.
- *Sensibilité au contexte* : la présence de cadres seniors « fait s'effondrer la candeur dont l'exercice dépend » (analyses de la culture SRE et pratiques premortem).

### Axe 2 — Protocole d'animation canonique

**Étapes de Klein (2007) / Veinott (2010) (fait établi, confiance Élevée) :**
1. **Préparation** : se familiariser avec le plan (briefing).
2. **Prémisse d'échec** : le facilitateur annonce que le plan **a échoué** — « une boule de cristal infaillible montre que ce plan a été un fiasco ». Le cadrage de **certitude** (pas « pourrait échouer » mais « a échoué ») est le cœur actif.
3. **Génération indépendante** : chacun écrit **seul, en silence**, pendant ~2 minutes, toutes les raisons de l'échec — surtout celles qu'on ne mentionnerait pas d'ordinaire par politesse ou politique.
4. **Consolidation en round-robin** : en commençant par le chef de projet, chacun énonce une raison à tour de rôle, jusqu'à épuisement des listes ; le facilitateur enregistre tout sans critique.
5. **Renforcement du plan** : passer la liste en revue, chacun propose une action pour réduire la probabilité du fiasco ; réviser le plan.
6. **Suivi** : revisiter périodiquement la liste pour détecter les signaux précoces.

**Techniques de génération de causes.** La phase d'écriture silencieuse individuelle **avant** partage est la **Nominal Group Technique** (Delbecq & Van de Ven, années 1960) : elle réduit l'ancrage et la pensée de groupe car personne n'est influencé par la première idée énoncée. Durée typique : 20-30 min (analyses de la méthode), jusqu'à 1-3 h pour un projet complexe (guides PM).

**Gestion des biais (recherche + pratique) :**
- *Pensée de groupe / suppression du doute* → écriture individuelle silencieuse d'abord (NGT) ; round-robin égalitaire ; retirer/neutraliser la hiérarchie.
- *Excès d'optimisme / planning fallacy* → le cadrage « a échoué » force la génération de raisons *contre* le plan (Koriat et al. : générer seulement des raisons *pour* accroît la surconfiance).
- *Ancrage* → génération indépendante avant toute discussion ; en contexte agentique, éviter de montrer une solution déjà produite (elle ancre sur sa plausibilité de surface — Kaddour et al. 2026).

**Pièges fréquents / anti-patterns (pratique, confiance Élevée) :**
- Rester **vague** : « le projet pourrait échouer » est inutile ; exiger des scénarios concrets et nommés.
- Utiliser la session pour **régler des comptes** ou ventiler : tout doit être actionnable.
- Présence de décideurs seniors qui inhibent la candeur.
- Confondre premortem (avant, hypothétique) et post-mortem (après, réel).
- Ne pas assigner d'owner ni de trigger aux risques prioritaires → les action items « meurent en deux semaines » (retours SRE).

### Axe 3 — Adaptation à la planification de features logicielles

**Artefacts à soumettre.** En fin de workflow spec → plan → découpage, le premortem porte sur les **trois** artefacts : la **spec** (le bon problème est-il défini ?), le **plan** (l'architecture/l'approche tient-elle ?), le **découpage en tâches/tickets** (les tâches sont-elles atomiques, ordonnées, testables, sans dépendances cachées ?). La pratique agentique 2025-2026 (spec-driven development ; GitHub Spec Kit `/analyze` lancé après `/tasks` et avant `/implement`) confirme la valeur d'un gate de cohérence croisée spec/plan/tasks avant implémentation.

**Taxonomie des risques logiciels (synthèse de sources).** Fondée sur : Boehm, « Software Risk Management: Principles and Practices », *IEEE Software* 8(1):32-41, 1991, et sa *Top-Ten list* ; SEI Taxonomy-Based Risk Identification ; base PERIL (Kendrick, PMI) ; Wallace & Keil (6 dimensions) ; et sur les risques spécifiques au code généré par IA (2025-2026). La Top-Ten de Boehm (verbatim) : #1 *Personnel shortfalls*, #2 *Unrealistic schedules and budgets*, #3 *Developing the wrong functions and properties*, #4 *Developing the wrong user interface*, #5 *Gold plating*, #6 *Continuing stream of requirement changes*, #7 *Shortfalls in externally furnished components*, #8 *Shortfalls in externally performed tasks*, #9 *Real-time performance shortfalls*, #10 *Straining computer-science capabilities*.

| Catégorie | Contenu | Ancrage source |
|---|---|---|
| **Technique / conception** | mauvaise architecture, complexité algorithmique, performance/latence, scalabilité, « straining computer-science capabilities » | Boehm #9-10 ; PayPal premortem |
| **Périmètre / dérive** | scope creep (catégorie la plus fréquente et coûteuse de PERIL), gold-plating (Boehm #5), exigences floues/changeantes | Boehm #3, #6 ; PERIL |
| **Dépendances / intégration** | composants externes défaillants (Boehm #7), tâches externes (Boehm #8), intégration inter-modules, APIs indisponibles, non-respect de SLA | Boehm #7-8 ; PayPal |
| **Estimation / planning** | sous-estimation (planning fallacy), délais irréalistes (Boehm #2), ordre de tâches erroné | Boehm #2 ; Kahneman |
| **Dette technique** | code livré vite mais fragile, complexité cyclomatique accrue, code inliné au lieu d'extrait | études dette IA 2025-2026 |
| **Sécurité** | vulnérabilités OWASP/CWE, injection, XSS, secrets en dur, RLS mal configurée | Veracode/CSA 2025-2026 |
| **Personnel / organisation** | pénurie de compétences (Boehm #1), mauvaise communication, mauvaise définition des rôles | Boehm #1 ; Wallace-Keil |
| **Spécifique agentique** | hallucination d'API, sur-confiance, perte de contexte, exécution prématurée, dérive vs intention | voir Axe 4 |

**Risques spécifiques au code généré par IA (tendance observée, confiance Élevée sur l'existence, Moyenne sur les chiffres).** Plusieurs études indépendantes 2025-2026 rapportent qu'une part importante du code généré par IA contient des vulnérabilités mappées OWASP/CWE (analyses Veracode, Checkmarx, Cloud Security Alliance) ; XSS (CWE-79/80) et injection de logs (CWE-117) figurent parmi les pires catégories ; incidents documentés (ex. CVE-2025-48757 sur la plateforme Lovable ; suppression d'une base de données par un outil IA en juillet 2025 rapportée par Fortune). **Contrainte** : ces pourcentages varient fortement selon la méthodologie (API brute vs outil agentique) ; les traiter comme des ordres de grandeur, pas comme des constantes.

### Axe 4 — Anticipation de risque dans les workflows de coding assistés par IA (2024-2026)

**Le problème mesuré : surconfiance agentique (tendance observée, confiance Élevée).** Kaddour et al. (2026) établissent trois enseignements directement exploitables pour un skill premortem :
1. **Surconfiance systématique et asymétrique** : 62 % des prédictions sur des tâches qui échouent sont surconfiantes (≥0,7) contre 11 % de sous-confiance sur des tâches qui réussissent — un agent est ~5,5× plus susceptible de prédire à tort le succès que de douter à tort d'une réussite.
2. **Le cadrage adversarial aide** : demander « quels bugs peux-tu trouver ? » plutôt que « est-ce correct ? » réduit la surconfiance jusqu'à 15 points de pourcentage et donne la meilleure calibration. C'est l'analogue exact du cadrage de certitude/échec de Klein.
3. **Moins d'information = meilleure discrimination** : l'évaluation *pré-exécution* (sans voir la solution) discrimine mieux succès/échec que la revue *post-exécution*, car observer un patch ancre l'agent sur sa plausibilité de surface. **Implication forte** : un premortem doit se faire **sur le plan, avant l'implémentation**, précisément quand l'agent a moins de raisons de s'ancrer sur du code déjà écrit.

**Autres limites de LLM pertinentes (tendance observée, confiance Moyenne-Élevée) :**
- *Fenêtre de contexte finie* : dégradation du signal, « context rot » sur longues sessions, éviction d'informations utiles ; le premortem doit être court et produire un artefact persistant (fichier Markdown) relu avant chaque phase.
- *Hallucinations* : d'API, de fichiers, de « corrections » annoncées sans preuve ; d'où l'exigence de vérification (tests, fail-first). Un des modes de défaillance : l'agent « hallucine "corrigé" sans preuve », donc annonce confiante ≠ changement fonctionnel (Nimbalyst).
- *Absence de mémoire du terrain / cold-start amnesia* : chaque session repart à zéro ; sans fichiers d'état, l'agent « reprend avec confiance d'un état qui n'existe plus » (retours praticiens, expérience BagHolderAI).
- *Exécution prématurée* : l'agent édite/exécute avant que le problème soit cadré — mode de défaillance commun, distinct de l'hallucination.
- *Faiblesse de l'auto-revue* : un agent qui relit son propre code « trouve des problèmes cosmétiques et rate les bugs structurels » ; d'où la nécessité d'une session/auditeur **séparé** avec contexte frais.

**Comment un agent peut conduire ou simuler un premortem (pratique émergente 2026).**
- *Séparation des rôles* : Anthropic documente des **sous-agents** de revue/vérification à contexte séparé, un `security-reviewer` en lecture seule, et le **Plan mode** (lecture/raisonnement sans écriture) — décrit par des praticiens comme « le plus grand levier de fiabilité » de Claude Code. Toutefois, aucune documentation first-party d'Anthropic ne nomme une étape « premortem » ou « kill-the-plan » adversariale.
- *Pattern Critic/Hostile Agent* (ASDLC.io, 2026) : un « Critic Agent » distinct, à session fraîche (« Context Swap / Fresh Eyes »), évalue les artefacts contre la spec avec pour constitution « tu es sceptique ; favorise les faux positifs aux faux négatifs ». Il existe une déclinaison en amont : « Adversarial Requirement Review » (phase design). *Contenu partiellement prospectif ; orchestration en partie manuelle en 2025-2026.*
- *Skills premortem communautaires* (2026) : des skills Claude Code encodent explicitement Klein — assumer que la décision a échoué et travailler à rebours, matrice P×I, tripwires datés, triage ; certains lancent un `/pre-mortem` qui « valide le plan le plus récent », avec mode `--deep` (plusieurs agents-juges) et `--debate` (revue adversariale en deux tours) et une « interrogation temporelle » (« Heure 1, 2, 4, 6+ : qu'est-ce qui bloque ? qu'est-ce qui échoue silencieusement ? qu'est-ce qui s'aggrave si non détecté ? »). *Maturité et adoption faibles ; signaux, pas standards.*
- *Skill adversarial-review* (dementev-dev, 2026) : « revoir le plan AVANT d'écrire du code ; attraper tôt les erreurs d'architecture, étapes manquantes et risques » ; « le reviewer part par défaut du scepticisme et cherche ce qui échouera en production ». Chaque finding doit répondre à 4 questions : que peut-il mal tourner, pourquoi vulnérable, impact, recommandation. Boucle jusqu'à 5 tours, verdict APPROVED/REVISE.
- *Précédent humain (hors fenêtre, à titre de cadre)* : le PayPal Technology Blog, « Pre-Mortem: Working Backwards in Software Design » (Seema Thapar, 2021) — cadre en 3 étapes (one-pager de user story → premortem d'équipe → premortem inter-équipes avec architectes) et questions-types (« is this scalable, is the data available to make the decision or do we need an API call, will the additional call meet SLA or latency requirements? »). À réutiliser pour le fond, en gardant à l'esprit qu'il concerne des équipes humaines et non un agent IA.

**Hypothèses concurrentes sur ce qui rend un premortem efficace en contexte agentique (avec niveau de confiance).**

- **H1 — Le recadrage adversarial (falsification) est le moteur principal (confiance Élevée).** L'agent, comme l'humain surconfiant, génère surtout des raisons *pour*. Le passage « imagine que ça a échoué / trouve les bugs » inverse la charge et améliore mesurablement la calibration (Kaddour et al. 2026 ; convergent avec Klein/Koriat). C'est l'hypothèse la mieux étayée empiriquement dans le contexte LLM.
- **H2 — La séparation de contexte / fraîcheur de session est décisive (confiance Moyenne-Élevée).** Un agent qui critique ses propres artefacts dans le même contexte est ancré et complaisant ; un juge à contexte frais, sans la trace de raisonnement du builder, discrimine mieux (ASDLC « Fresh Eyes » ; pré-exécution > post-exécution de Kaddour ; retours « Auditor session »). Ce n'est pas la métaphore temporelle mais l'**élimination de l'ancrage**.
- **H3 — La valeur « sociale » de Klein (légitimer la dissidence) a un analogue faible mais réel en agentique (confiance Faible-Moyenne).** Chez l'humain, le premortem lève l'autocensure ; un LLM n'a pas de peur hiérarchique, mais il a un biais d'obséquiosité/alignement sur l'intention perçue de l'utilisateur et sur son propre plan. Donner explicitement à l'agent le *mandat* et la *permission* de contredire le plan (rôle de red-team) pourrait jouer un rôle analogue. Spéculatif ; peu de preuve directe.
- **H4 — La structuration (taxonomie + P×I + owner/trigger) compte autant que le cadrage (confiance Moyenne).** Le premortem produit des raisons « épisodiques » (Mitchell et al.) ; sans taxonomie de couverture ni priorisation, l'agent produit une longue liste plate. Le forçage par catégories (technique, sécurité, dépendances…) et la matrice probabilité×impact transforment le brainstorm en décision. Appuyé par la pratique PM/SRE, pas par une étude LLM dédiée.
- **H5 — Le placement temporel (avant l'implémentation, sur le plan) est un facteur d'efficacité en soi (confiance Moyenne-Élevée).** Faire le premortem sur le plan, quand aucun code n'est écrit, exploite le résultat « moins d'information → meilleure discrimination » et évite l'ancrage sur un patch. Convergent avec RPI (« aucun code écrit avant qu'un artefact de plan existe », Dex Horthy/HumanLayer, 2025) et Plan mode.

### Axe 5 — Restitution actionnable

**Format de sortie recommandé (synthèse recherche + pratique SRE/PM) :** un tableau de risques priorisés, chacun avec probabilité, impact, score, mitigation concrète, owner et **trigger/tripwire** (signal observable qui déclenche l'action), plus un verdict go/no-go. La matrice P×I (ISO 31010 / PMI ; 3×3 pour triage rapide, 5×5 pour granularité) sert à prioriser ; score = probabilité × impact. Distinguer, à la manière SRE, les action items **mitigatifs** (traitent ce risque précis) des **préventifs** (traitent la classe de défaillance).

---

## Recommendations — protocole réutilisable pour le skill

### Quand déclencher
En **dernière étape** du workflow, une fois spec + plan + découpage produits et **avant** toute écriture de code (Plan mode / avant `/implement`). Bénéfice maximal quand : ≥5 fichiers touchés, ≥3 dépendances séquentielles, sécurité/données/auth impliquées, ou estimation « suspicieusement confiante ».

### Protocole étape par étape (à encoder dans le SKILL.md)

**Étape 0 — Ingestion des artefacts.** Charger spec, plan, découpage. Résumer en ≤10 lignes l'intention et le périmètre. Signaler d'emblée toute ambiguïté (analogue de `/clarify`).

**Étape 1 — Poser la prémisse d'échec (cadrage de certitude, non conditionnel).** Prompt canonique :
> « Nous sommes [horizon : ex. 2 semaines / la fin du sprint] plus tard. Cette feature a été implémentée selon le plan et le découpage actuels, et c'est un **échec complet** : bug en production, dépassement massif, ou la mauvaise chose a été construite. Ce n'est pas hypothétique — **c'est arrivé**. Rédige l'autopsie : pourquoi a-t-elle échoué ? »

**Étape 2 — Génération adversariale, indépendante et par catégorie (NGT simulée).** Pour maximiser la couverture et casser l'ancrage :
- Adopter explicitement le **rôle de red-team** : « Ton travail est de faire échouer ce plan, pas de le valider. Par défaut, sceptique. Cherche ce qui casse en production. »
- Générer les causes **catégorie par catégorie** (voir taxonomie) — au moins une passe par catégorie, y compris les risques spécifiques agentiques.
- Idéalement, exécuter dans une **session/sous-agent séparé à contexte frais** (H2), n'ayant accès qu'aux artefacts, pas à la trace de raisonnement qui a produit le plan.

**Étape 3 — Interrogation temporelle (option « deep »).** Dérouler la timeline d'implémentation (Heure 1, 2, 4, jour 2+ / ticket par ticket) : à chaque étape — qu'est-ce qui **bloque** ? qu'est-ce qui **échoue silencieusement** ? qu'est-ce qui **s'aggrave** si non détecté ?

**Étape 4 — Consolidation & déduplication.** Regrouper, éliminer les doublons, exiger la **spécificité** (rejeter « ça pourrait mal tourner » ; exiger un scénario nommé et un mécanisme).

**Étape 5 — Scoring P×I & priorisation.** Attribuer probabilité et impact (échelle 1-5 ou faible/moyen/élevé), score = P×I ; trier décroissant.

**Étape 6 — Mitigations & boucle de rétroaction.** Pour chaque risque prioritaire : mitigation concrète, owner, et **trigger** observable. Réinjecter dans les artefacts amont :
- vers la **spec** si le risque est « mauvais problème / exigence floue » ;
- vers le **plan** si c'est architecture/dépendances/séquencement ;
- vers le **découpage** : ajouter/redécouper des tickets (ex. ticket de spike, ticket de test fail-first, ticket de revue sécurité), réordonner pour lever tôt les dépendances risquées.

**Étape 7 — Verdict go/no-go & artefact.** Émettre un verdict et écrire un fichier premortem persistant (Markdown) relu au début de l'implémentation.

### Banque de prompts par catégorie (à intégrer au skill)
- **Technique/conception** : « Quelle hypothèse d'architecture, si fausse, ferait tout s'effondrer ? Où la complexité ou la latence dépasse-t-elle ce que le plan suppose ? Le plan est-il scalable ? »
- **Périmètre** : « Où le périmètre est-il flou au point que l'implémentation va dériver ? Quel "petit ajout" (gold-plating) va faire exploser le scope ? Construit-on la bonne chose ? »
- **Dépendances/intégration** : « Quelle dépendance externe/API suppose-t-on disponible mais ne l'est peut-être pas ? Les données nécessaires à la décision sont-elles réellement accessibles, ou faut-il un appel supplémentaire ? Respecte-t-on les SLA/latence ? Quel module s'intègre mal ? »
- **Estimation/planning** : « Quel ticket est sous-estimé d'un facteur 2+ ? Quel ordre de tâches crée un blocage ? »
- **Dette technique** : « Quel raccourci pris ici deviendra ingérable ? Où le plan inline-t-il une logique qui devrait être extraite ? »
- **Sécurité** : « Quel vecteur (injection, XSS/CWE-79-80, injection de logs/CWE-117, secrets en dur, autorisation/RLS) le plan laisse-t-il ouvert ? »
- **Spécifique agentique** : « Où risque-je d'halluciner une API/un fichier ? Quelle information hors de ma fenêtre de contexte me manque-t-il ? Où vais-je annoncer "corrigé" sans preuve ? Quel état du terrain (session précédente) m'échappe ? »

### Template de sortie (tableau) à produire par le skill

| # | Risque (scénario concret) | Catégorie | Probabilité (1-5) | Impact (1-5) | Score (P×I) | Signal/trigger observable | Mitigation concrète | Owner | Rétroaction (spec/plan/ticket) |
|---|---|---|---|---|---|---|---|---|---|
| R1 | … | … | … | … | … | … | … | … | … |

Plus une section « Hypothèses critiques » (ce qui, si faux, invalide le plan) et « Risques hors contrôle » (à escalader).

### Critères go/no-go (à paramétrer dans le skill)
- **NO-GO (bloquant)** : présence d'au moins un risque score ≥ [seuil élevé, ex. 20/25] **sans** mitigation crédible ; OU une hypothèse critique non vérifiée dont la fausseté invaliderait l'architecture ; OU un risque sécurité de classe connue (injection/XSS/secrets/autorisation) non traité ; OU ambiguïté de spec telle que « la bonne chose » n'est pas définie.
- **GO CONDITIONNEL** : risques moyens (score intermédiaire) tous dotés d'un owner, d'une mitigation et d'un trigger ; tickets ajoutés/réordonnés en conséquence ; spikes planifiés pour les inconnues techniques.
- **GO** : aucun risque élevé non mitigé ; hypothèses critiques vérifiées ou couvertes par un spike ; couverture de test définie pour les zones à risque.
- **Seuils qui changent la décision** : rehausser l'exigence (baisser les seuils) si la feature touche auth/paiements/données personnelles, si le blast radius est large (mode autonome/YOLO), ou si l'agent affiche une confiance élevée non étayée (rappel : surconfiance mesurée à 73 % vs 35 % réel).

### Mise en œuvre progressive
1. **V1 (minimal viable)** : Étapes 0-2 + 5-7, un seul agent en Plan mode, cadrage adversarial, tableau P×I, verdict.
2. **V2** : ajouter l'exécution en **sous-agent/session séparée à contexte frais** (H2) et la génération par catégorie forcée.
3. **V3** : ajouter l'interrogation temporelle, le mode `--debate` (deux tours adversariaux / plusieurs juges), et la boucle automatique de réécriture des tickets.

Benchmark de progression : suivre la proportion de risques identifiés au premortem qui se sont réellement matérialisés en post-mortem (calibration), et ajuster seuils/prompts.

---

## Caveats

- **Distinguer preuve et pratique.** Les *données d'efficacité* (Mitchell 1989 ; Veinott 2010 ; Gallop & Bischoff 2016 ; Kaddour 2026) sont réelles mais limitées : petites populations, contextes spécifiques, et surtout elles mesurent la **réduction de surconfiance / le nombre de raisons / la calibration**, pas la réduction prouvée du taux d'échec final des projets. Le protocole détaillé (banque de prompts, taxonomie, template, go/no-go) relève de la **synthèse de bonnes pratiques**, pas d'un protocole validé expérimentalement tel quel.
- **Le « +30 % » est fragile.** Il concerne le *nombre de raisons* (« more reasons… typically episodic in nature »), pas la qualité ni la précision, et le mécanisme sous-jacent (prospective hindsight) a des difficultés de réplication. Ne pas le citer comme une amélioration de précision des prévisions. [À VÉRIFIER : ampleur exacte de la non-réplication — sourcée via témoignage Mauboussin/Kahneman, pas via une méta-analyse.]
- **Chiffres sur le code IA.** Les taux de vulnérabilité du code généré par IA varient fortement selon la méthodologie (API brute vs outil agentique) ; ordres de grandeur, non constantes.
- **Skills et patterns agentiques 2026.** Les skills premortem communautaires, ASDLC.io et dementev-dev sont des exemples réels mais de **maturité et d'adoption faibles** ; certains contenus sont partiellement prospectifs (« Future Automation Potential »). Aucune documentation **first-party** d'Anthropic ne qualifie explicitement une étape de « premortem » ou de « kill-the-plan » adversarial avant implémentation ; le cadrage adversarial vient d'outils tiers/communautaires et de la recherche (Kaddour et al.). RPI (Horthy/HumanLayer), Spec Kit (GitHub) et les sous-agents Anthropic fournissent des gates de plan/cohérence, mais pas nommément un premortem.
- **Limite structurelle du premortem par un LLM.** Un agent qui conduit son propre premortem reste soumis à la surconfiance et à l'auto-complaisance mesurées ; la mitigation (session/agent séparé, cadrage falsification, moins d'information) réduit mais n'élimine pas ce biais. Le premortem agentique **complète** mais ne remplace pas la revue humaine, en particulier pour la logique métier, le domaine et le code critique de sécurité.
- **Le PayPal Tech Blog (« Pre-Mortem: Working Backwards in Software Design », Seema Thapar) date de 2021** et concerne des équipes humaines, pas un agent IA — utile pour le cadre à 3 étapes et les questions-types (scalabilité, disponibilité des données, SLA/latence), mais hors de la fenêtre 2024-2026 pour le volet agentique.