# Dimensionner un découpage de specs et de tâches "review-able" par un humain : état de l'art et framework opérationnel

## Executive Summary

Pour maximiser la qualité de la review humaine d'artefacts (specs, listes de tâches) générés par IA, dimensionnez chaque unité à reviewer autour d'un budget cognitif borné, pas d'un volume brut arbitraire : la littérature empirique sur l'inspection converge sur des unités **petites** (l'analogue documentaire des ~200–400 lignes de code du study SmartBear/Cisco), revues en **sessions de 60 minutes maximum** avant chute de la détection de défauts, à un **rythme lent**. Trois hypothèses concurrentes expliquent la "reviewability" — (H1) la **taille brute**, (H2) la **cohésion sémantique / indépendance** (une unité = une capability testable, style INVEST/vertical slice), et (H3) la **structuration qui force l'attention** (EARS, critères d'acceptation, traçabilité). Notre conclusion : **H2 et H3 dominent H1** — la taille est une condition nécessaire mais non suffisante ; une unité petite mais incohérente ou plausible-mais-fausse échappe quand même à la détection, surtout avec des artefacts IA sujets au biais d'automatisation. Le framework proposé enchaîne spec → design → tâches avec une **gate de review humaine bornée** à chaque transition, une **checklist de reviewability** pondérée, et une notation EARS pour rendre chaque exigence vérifiable en une seule interprétation. Aucun seuil universel "X items = optimal" n'est empiriquement établi pour les specs elles-mêmes ; les seuils chiffrés proviennent du code et de l'inspection et sont transposés par analogie, ce que nous signalons explicitement.

## Key Findings

- **Fait empirique établi (code) :** Le study SmartBear/Cisco (Jason Cohen, *Best Kept Secrets of Peer Code Review*, 2006 ; ~2 500 reviews, 3,2 M lignes, ~50 développeurs) fixe l'unité de review optimale à **moins de 200–400 lignes de code**, un rythme d'inspection sous ~**500 lignes/heure**, une session de **60 (max 90) minutes**, pour un rendement de détection de **70–90 %** des défauts ("reviewing 200-400 LOC in about 60-90 minutes for 70-90% of defects found"). Confiance : Élevée (source primaire).
- **Fait empirique établi (cognition) :** La mémoire de travail est bornée (Miller 1956, "7±2 chunks" ; révisé par Cowan 2001 à ~4 chunks) et le **vigilance decrement** dégrade mesurablement la performance attentionnelle après des durées courtes (Mackworth 1948 ; décrément observable dès ~10–30 minutes selon les tâches). Ces limites plafonnent ce qu'un humain peut reviewer avec fiabilité en une passe. Confiance : Élevée.
- **Tendance/consensus d'ingénierie :** Google Engineering Practices recommande des CL petits — verbatim : *"100 lines is usually a reasonable size for a CL, and 1000 lines is usually too large, but it's up to the judgment of your reviewer"* — en soulignant que "l'auteur a le contexte, le reviewer non" — directement transposable aux specs générées par IA. Confiance : Moyenne (pratique documentée, pas étude contrôlée).
- **Nuance empirique importante :** Bacchelli & Bird (Microsoft Research, ICSE 2013 ; sondage de 165 managers et 873 programmeurs chez Microsoft) montrent que la review moderne trouve **moins de défauts qu'attendu** — verbatim : *"while finding defects remains the main motivation for review, reviews are less about defects than expected and instead provide additional benefits such as knowledge transfer... code and change understanding is the key aspect of code reviewing."* Implication pour l'IA : la review d'une spec sert surtout à valider l'intention et à débusquer les hypothèses fausses, pas seulement à "chasser les bugs".
- **Risque spécifique IA :** Le biais d'automatisation (over-reliance) fait accepter des sorties plausibles mais fausses — erreurs de commission et d'omission. Les artefacts IA sont sur-complets et verbeux, créant un faux sentiment de complétude. Contre-mesure structurelle : forcer la vérification par découpage, notation contrainte (EARS) et critères d'acceptation testables.
- **Découpage :** Les patterns matures (INVEST de Bill Wake 2003 ; SPIDR de Mike Cohn ; les ~21 patterns de Richard Lawrence/Peter Green, Humanizing Work) privilégient les **vertical slices** (une tranche de valeur end-to-end) plutôt que des couches horizontales — ce qui maximise l'indépendance et la testabilité, donc la reviewability.
- **Une mise en garde de provenance :** La courbe populaire "détection 87 % pour <100 lignes → 28 % pour >1000 lignes" **n'est PAS** de SmartBear ni de McConnell ; elle provient d'un blog vendeur (Propel Code, 2025), auto-rapportée sans méthodologie. À NE PAS citer comme fait empirique établi.

## Details

### Angle 1 — Qu'est-ce qu'une review humaine optimale

**Fondements cognitifs (fait établi).** La capacité de la mémoire de travail est limitée. George Miller (1956, "The Magical Number Seven, Plus or Minus Two") a proposé ~7±2 "chunks" ; Nelson Cowan (2001, *Behavioral and Brain Sciences*) a révisé cette capacité à ~4 chunks avec des contrôles plus stricts (élimination de la répétition et des artefacts de chunking). La conséquence opérationnelle : un artefact à reviewer doit tenir dans un petit nombre de chunks sémantiques simultanément manipulables. Au-delà, le reviewer "skimme" au lieu de lire, mécanisme décrit explicitement dans les analyses du study Cisco.

Le **vigilance decrement** (Mackworth, 1948 ; synthèses Parasuraman) est la baisse monotone de la performance attentionnelle avec le temps sur tâche. Les études de laboratoire l'observent sur des sessions de 10–60 minutes ; les théories dominantes l'attribuent à la déplétion de ressources cognitives et au mind-wandering. Cela fonde empiriquement la limite de session : au-delà d'une durée, la détection de défauts chute quelle que soit la volonté du reviewer.

**Fondements empiriques (inspection et code review).**

- **Fagan (IBM, 1976).** L'inspection formelle Fagan (rôles définis, entry/exit criteria, réunion) rapporte des taux d'élimination de défauts élevés. Chiffres verbatim du système IBM étudié : *"38 defects per KLOC were found by inspection vs 8 per KLOC found by unit tests. Inspection found 82% of the total defects found for the released product."* Rythme de préparation de ~100–125 lignes/heure et d'inspection de ~130–150 lignes/heure. Confiance : Élevée (référence fondatrice, toujours citée). S'applique aux specs : Fagan inspecte explicitement les documents de requirements et de design, pas seulement le code.

- **SmartBear/Cisco (Cohen, 2006).** Source primaire, chiffres verbatim : "developers should review fewer than 200-400 lines of code (LOC) at a time. Beyond that, the ability to find defects diminishes" ; "a review of 200-400 LOC over 60 to 90 minutes should yield 70-90% defect discovery" ; densité moyenne de "32 defects per 1000 lines of code" ; "61% of the reviews uncovered no defects". Chute d'efficacité au-delà de ~400–500 lignes/heure et après ~60 minutes. **Attention à un piège de conflation :** le "87 %" réel du study signifie "87 % des reviews rapides (>450 LOC/h) avaient une densité de défauts sous la moyenne" — ce n'est PAS un taux de détection.

- **McConnell, *Code Complete* (2e éd., 2004).** Taux de détection moyens compilés (d'après Capers Jones/Myers) : unit testing 25 %, function testing 35 %, integration testing 45 %, **design inspections 55 %, code inspections 60 %**. Message : l'inspection/review détecte une classe de défauts que le test ne voit pas — argument fort pour investir dans la review de specs en amont. Confiance : Élevée (source primaire, chiffres secondaires compilés).

- **Bacchelli & Bird (Microsoft, ICSE 2013).** La review moderne "less about defects than expected" ; bénéfices dominants = compréhension du code/changement, transfert de connaissance, solutions alternatives. Le principal besoin non satisfait par les outils est la **compréhension du changement**.

**Techniques de lecture pour documents (transposable aux specs).** Perspective-Based Reading (PBR ; Basili, Shull, Rus — NASA/Goddard) et Checklist-Based Reading (CBR) sont les techniques de lecture des requirements les plus étudiées. Les résultats sont **contradictoires** : l'expérience NASA d'origine montrait un gain de PBR, mais des réplications (ex. l'expérience rapportée par He & Carver 2006 ~37 % de détection PBR ; Porter et al. ~36,5 % CBR vs 32,5 % ad hoc) trouvent souvent **peu ou pas de différence significative** entre PBR, CBR et lecture ad hoc. **Signalement de non-concordance :** la supériorité de PBR n'est pas un fait établi ; ce qui est robuste, c'est qu'une lecture *guidée* (par scénario ou checklist) structure l'attention. Confiance : Moyenne.

#### Table des seuils empiriques (source, confiance, transposabilité aux specs)

| Seuil | Valeur | Source (nommée) | Confiance | Transposition aux specs |
|---|---|---|---|---|
| Taille d'unité de review | < 200–400 LOC | SmartBear/Cisco (Cohen 2006) | Élevée (primaire, code) | Analogique : viser une unité = 1 capability / vertical slice tenant en une passe |
| Rythme d'inspection | < ~400–500 LOC/h | SmartBear/Cisco | Élevée (code) | Pas de métrique équivalente établie pour les specs — lire lentement |
| Durée de session | ≤ 60 min (max 90) | SmartBear/Cisco ; corroboré par vigilance decrement | Élevée | Directement applicable : borner la session de review |
| Rendement de détection (bien dimensionné) | 70–90 % | SmartBear/Cisco | Élevée (code) | Objectif indicatif, non garanti pour specs |
| Taux d'élimination inspection formelle | 82 % (cas IBM) ; 60–90 % (historique) | Fagan (IBM 1976) | Élevée | S'applique aux docs de requirements/design |
| Détection inspection vs test | inspections 55–60 % ; tests 25–45 % | McConnell, *Code Complete* 2e éd. | Élevée (compilé) | Justifie la review de spec en amont |
| Taille CL "raisonnable / trop gros" | ~100 / ~1000 lignes | Google Eng Practices | Moyenne (pratique) | Heuristique de bon sens, jugement requis |
| Capacité mémoire de travail | ~4 (Cowan) à 7±2 (Miller) chunks | Miller 1956 ; Cowan 2001 | Élevée (psycho) | Limiter le nb de "concepts" simultanés par unité |
| Story "small" | 6–10 par sprint | Mike Cohn (via INVEST) | Faible (heuristique) | Repère de granularité, pas de reviewability |

### Angle 2 — Comment découper de manière optimale

**Axes de découpage.** Les unités et axes matures : par capability / feature, **vertical slice** (tranche end-to-end livrant de la valeur, opposée au découpage horizontal par couche), user story INVEST, bounded context (DDD), niveau de risque. Le consensus fort (Humanizing Work, Applied Frameworks) : **découper verticalement, pas par couche** — une unité horizontale ("créer la table DB", "créer l'API") n'est pas review-able comme incrément de valeur car sa correction ne peut être jugée qu'en assemblage.

**Patterns de splitting.**
- **INVEST** (Bill Wake, 2003) : Independent, Negotiable, Valuable, Estimable, Small, Testable. Wake lui-même note que les critères sont en **tension** (indépendance vs petitesse) et qu'INVEST doit guider *pendant* le travail, pas servir de videur binaire.
- **SPIDR** (Mike Cohn) : Spikes, Paths, Interfaces, Data, Rules — cinq techniques pour scinder une story compound.
- **Richard Lawrence / Peter Green (Humanizing Work)** : ~21 patterns (workflow steps, business rule variations, data variations, operations CRUD, effort simple/complexe, etc.), avec un flowchart. Règle : commencer par vérifier INVEST (hors "small"), puis scinder si trop gros, en cherchant des tranches de tailles similaires et déprioritisables.

**Taille cible, cohésion, couplage.** La cible n'est pas un nombre absolu d'items mais : (a) une unité doit tenir dans une session de review bornée ; (b) forte cohésion interne (un seul sujet — écho du "singular" d'ISO 29148 et du "addresses just one thing" de Google) ; (c) faible couplage entre unités (indépendance INVEST) pour que chaque unité soit review-able seule, sans charger la mémoire de travail avec des dépendances externes.

### Angle 3 — Frameworks existants à mobiliser

| Framework | Rôle dans le pipeline IA→humain | Confiance sur l'utilité |
|---|---|---|
| **INVEST** (Wake) | Critères de qualité d'une unité de découpage | Élevée |
| **SPIDR / patterns Lawrence** | Techniques concrètes de scission | Élevée |
| **Definition of Ready (DoR)** | Gate d'entrée : la spec/tâche est-elle prête à être implémentée ? | Moyenne (hors Scrum Guide, optionnel) |
| **Definition of Done (DoD)** | Gate de sortie : critères de complétion | Élevée (dans Scrum Guide) |
| **3-Amigos** (Dinwiddie) | Perspectives multiples (business/dev/test) sur une story avant dev ; adaptable en solo+IA (l'IA joue les 3 rôles) | Moyenne |
| **EARS** (Mavin et al., Rolls-Royce, RE'09) | Notation contrainte rendant chaque exigence vérifiable et non ambiguë | Élevée |
| **ADR / RFC** | Traçabilité des décisions d'architecture ; surface de review du design | Moyenne |
| **Fagan / inspection formelle** | Modèle de gate avec entry/exit criteria et rôles | Élevée (fondateur) |
| **ISO/IEC/IEEE 29148** | Caractéristiques de qualité des requirements (individuelles et de l'ensemble) | Élevée (standard) |

**Articulation recommandée.** DoR (entrée) → notation EARS + INVEST pour la forme et la granularité → 3-Amigos (multi-perspectives, l'IA endossant BA/architecte/QA) pour surfacer les ambiguïtés → checklist de reviewability (gate humaine bornée) → DoD (sortie). ADR pour chaque décision de design engageante.

**EARS en détail.** Créé par Alistair Mavin, Wilkinson, Harwood & Novak, "Easy Approach to Requirements Syntax (EARS)", 17th IEEE Int'l Requirements Engineering Conference (RE'09), Atlanta, pp. 317–322, doi:10.1109/RE.2009.9. Adopté par Airbus, Bosch, Dyson, Honeywell, Intel, NASA, Rolls-Royce et Siemens. Cinq patterns : ubiquitous ("The system shall…"), state-driven ("While <state>, …shall…"), event-driven ("When <trigger>, …shall…"), unwanted behavior ("If <condition>, then …shall…"), optional ("Where <feature>, …shall…"). Recommandé pour 0–3 préconditions ; au-delà, préférer table/liste. AWS Kiro et GitHub Spec Kit l'ont adopté pour rendre les requirements générées par IA parsables et testables. C'est le levier n°1 contre l'ambiguïté et la sur-verbosité IA.

### Angle 4 — Quoi regarder + comment valider

Critères de reviewability (dérivés d'ISO 29148, INVEST, Google Eng Practices) : **taille** (tient en une session bornée), **complétude** (aucun TBD/TBS/TBR ; l'ensemble ne nécessite pas d'info externe), **testabilité/vérifiabilité** (chaque exigence a un critère d'acceptation mesurable), **indépendance** (review-able seule), **non-ambiguïté** (une seule interprétation — d'où EARS), **singularité** (un seul sujet), **traçabilité** (chaque tâche → exigence → besoin), **couverture** (les tâches couvrent toute la spec, sans tâche orpheline).

**Signaux qu'un chunk est trop gros :** ne tient pas dans une session ≤60 min ; le reviewer doit tenir plus de ~4–7 concepts en tête simultanément ; critères d'acceptation > ~5–7 ; multiples "et"/"ou" dans une même exigence ; touche plusieurs bounded contexts. **Trop petit :** ne délivre pas d'incrément de valeur vérifiable (tâche horizontale masquée) ; ses implications ne sont compréhensibles qu'avec d'autres chunks (avertissement explicite de Google : "not so small that its implications are difficult to understand").

**Métriques de reviewability proposées** (à mesurer/itérer, aucune n'est un seuil empirique validé — ce sont des heuristiques d'ingénierie) : nombre d'exigences par unité ; nombre de critères d'acceptation par exigence ; % d'exigences en forme EARS ; nombre de dépendances inter-unités ; densité de défauts trouvés en review (proxy de qualité, à la Cisco) ; temps de review par unité (doit rester ≤ 60 min).

### Angle 5 — Spécificités des artefacts générés par IA

**Risques propres (2023–2026).**
- **Plausibilité trompeuse + sur-complétude :** le spec-driven development est né en réponse au "vibe coding" produisant du "plausible code that drifts from intent, hallucinates APIs" (Karpathy 2025 ; littérature SDD 2025–2026). Les specs IA sont verbeuses et paraissent complètes, ce qui endort la vigilance.
- **Biais d'automatisation :** tendance documentée (revue Microsoft Aether 2022 ; littérature HCI) à sur-faire confiance aux sorties automatisées, causant erreurs de commission (accepter du faux) et d'omission (manquer ce que l'IA a manqué).
- **Résultat marquant (Beck, Eckman, Kern & Kreuter, "Bias in the Loop: How Humans Evaluate AI-Generated Suggestions", *Harvard Data Science Review* 8.2, 2026 ; arXiv:2509.08514 ; 3 200 participants Prolific, échantillon US-représentatif) :** verbatim — *"Participants skeptical of AI detected errors more reliably and achieved higher accuracy, while those favorable toward automation exhibited dangerous overreliance on algorithmic suggestions. Financial incentives showed no consistent effect on performance."* Les reviewers **sceptiques** détectent donc mieux les erreurs, et les incitations financières ne compensent pas.
- **Hallucinations :** des benchmarks 2025 rapportent des taux de code vulnérable généré par LLM allant de 9,8 % à 42,1 % (Yan et al., 2025, cité dans la littérature SDD).

**Patterns human-in-the-loop et structuration favorisant la détection.**
- **Gates d'approbation explicites** entre phases (Kiro : requirements.md → design.md → tasks.md, chaque phase bloquée jusqu'à approbation humaine ; Spec Kit : /specify → /plan → /tasks → /implement avec checkpoint humain).
- **Notation contrainte (EARS)** pour éliminer l'ambiguïté et forcer la vérifiabilité.
- **Traçabilité requirement→task** (tasks.md de Kiro) pour détecter les tâches orphelines / la dérive.
- **Adversarialité structurée :** faire jouer à l'IA un rôle de "QA challenger" (adaptation 3-Amigos, testdouble 2025) pour surfacer les contradictions entre BDD et design *avant* le code — mais la décision reste humaine et sceptique.
- **Découper pour forcer la lecture ligne à ligne :** de petites unités contrecarrent le skimming induit par la verbosité et le faux sentiment de complétude.

### Angle 6 — Intégration dans un workflow

Workflow de référence (aligné Kiro/Spec Kit, augmenté des gates de reviewability) :

1. **Intention (humain).** Prompt/besoin en langage naturel + contraintes (dans un CLAUDE.md/steering file).
2. **Génération de spec (IA).** L'IA produit requirements.md : user stories + critères d'acceptation en **EARS**.
3. **Review IA automatisée.** L'IA relit sa propre spec avec une checklist (clarify pass à la Kiro : détecter ambiguïtés, gaps, contradictions).
4. **GATE 1 — Review humaine de la spec (bornée ≤60 min).** Appliquer la checklist de reviewability. Décision : oui / non / à ajuster. Vérifier surtout l'**intention** et les **hypothèses fausses**, pas la forme.
5. **Génération du design (IA).** design.md : architecture, contrats d'API, modèles ; décisions engageantes → ADR.
6. **GATE 2 — Review humaine du design.** Cohérence architecturale, pas la syntaxe.
7. **Décomposition en tâches (IA).** tasks.md : tâches atomiques, indépendamment review-ables/réversibles, **tracées** vers les exigences, chacune avec critères d'acceptation.
8. **GATE 3 — Review humaine du découpage.** Checklist de reviewability sur la granularité et la couverture. Rejeter les unités trop grosses/horizontales.
9. **Implémentation task-par-task (IA) + review de code** (seuils Cisco/Google applicables directement ici).
10. **Mesure & itération.** Traquer : temps par gate, densité de défauts trouvés par gate, taux de tâches renvoyées, dérive spec↔code. Ajuster la granularité si une gate dépasse régulièrement 60 min ou si des défauts échappent en aval.

**Artefacts persistants :** requirements.md (EARS), design.md, tasks.md, ADRs, et le présent document + la checklist injectés dans CLAUDE.md.

---

## FRAMEWORK OPÉRATIONNEL (étape par étape) — à injecter dans CLAUDE.md

**Principe directeur (confiance Élevée) :** dimensionner chaque unité pour qu'elle soit reviewable en **une session ≤ 60 min**, contienne **un seul sujet cohérent**, soit **indépendamment vérifiable**, et **tienne dans ~4–7 concepts** simultanés. La taille est nécessaire mais non suffisante : cohésion + indépendance + structuration priment.

| Étape | Action | Gate / critère de passage | Confiance |
|---|---|---|---|
| 1. Cadrage | Humain fixe intention + contraintes dans steering file | — | Élevée |
| 2. Spec (IA) | Générer requirements en EARS + critères d'acceptation | — | Élevée |
| 3. Auto-review IA | L'IA détecte ambiguïtés/gaps/contradictions | Rapport de clarification produit | Moyenne |
| 4. GATE 1 (humain) | Checklist reviewability, session ≤60 min | Score ≥ seuil ; intention validée | Élevée |
| 5. Design (IA) | design.md + ADR pour décisions engageantes | — | Moyenne |
| 6. GATE 2 (humain) | Cohérence architecturale, ≤60 min | Approbation explicite | Moyenne |
| 7. Tâches (IA) | tasks.md atomiques, tracées, avec AC | — | Élevée |
| 8. GATE 3 (humain) | Checklist granularité + couverture | Aucune unité trop grosse/horizontale/orpheline | Élevée |
| 9. Implémentation + code review | Task-par-task ; seuils Cisco/Google | <400 LOC, ≤60 min par review | Élevée |
| 10. Mesure/itération | Traquer temps, densité défauts, dérive | Ajuster granularité | Moyenne |

## CHECKLIST DE VALIDATION "REVIEWABILITY" (prête à l'emploi)

Pondérée : chaque critère binaire (Oui=1/Non=0). **Bloquants** = tout Non impose "à ajuster". Verdict : tous bloquants OK + score pondéré ≥ 80 % → **review-able** ; 60–80 % → **à ajuster** ; < 60 % ou un bloquant KO → **non**.

**A. Taille & charge cognitive (poids 25 %)**
- [ ] (Bloquant) L'unité est reviewable en ≤ 60 min.
- [ ] Elle contient ≤ ~7 exigences / concepts distincts.
- [ ] Chaque exigence a ≤ ~5–7 critères d'acceptation.

**B. Cohésion & indépendance (poids 25 %)**
- [ ] (Bloquant) L'unité traite un seul sujet (singular).
- [ ] (Bloquant) C'est une vertical slice délivrant de la valeur vérifiable (pas une couche horizontale).
- [ ] Elle est review-able seule, sans charger la mémoire avec des dépendances externes.

**C. Non-ambiguïté & testabilité (poids 25 %)**
- [ ] (Bloquant) Chaque exigence est en forme EARS (ou justifiée hors-EARS) → une seule interprétation.
- [ ] (Bloquant) Chaque exigence a un critère d'acceptation mesurable/testable.
- [ ] Aucun terme vague non défini ("facile", "rapide", "robuste") sans métrique.

**D. Complétude & traçabilité (poids 15 %)**
- [ ] Aucun TBD/TBS/TBR non résolu.
- [ ] Chaque tâche est tracée vers une exigence ; aucune tâche orpheline.
- [ ] L'ensemble des tâches couvre toute la spec (couverture).

**E. Robustesse anti-IA (poids 10 %)**
- [ ] Sur-complétude / verbosité contrôlée : pas de fonctionnalité spéculative non demandée (anti over-engineering, cf. Google).
- [ ] Les hypothèses implicites de l'IA sont explicitées et vérifiées.
- [ ] Le reviewer a activement cherché une erreur (posture sceptique), pas seulement confirmé.

## Recommendations

1. **Adoptez immédiatement la règle de session bornée (≤ 60 min) et le découpage vertical.** Ce sont les deux leviers au meilleur rapport preuve/effort (confiance Élevée). Seuil de déclenchement d'ajustement : toute unité dont la review dépasse 60 min ou nécessite de tenir >7 concepts en tête doit être scindée.
2. **Imposez EARS + critères d'acceptation testables comme forme par défaut** des requirements générées par IA. C'est le contre-poison direct à l'ambiguïté et à la plausibilité trompeuse (confiance Élevée). Benchmark : viser ~100 % des exigences fonctionnelles en EARS ou justifiées hors-EARS.
3. **Installez trois gates humaines explicites** (spec, design, tâches) à la Kiro/Spec Kit, chacune bornée en temps et pilotée par la checklist. Ne laissez jamais l'IA franchir une gate sans approbation (confiance Moyenne-Élevée).
4. **Cultivez une posture de reviewer sceptique** et, en solo, faites jouer à l'IA un rôle adverse de "QA challenger". Preuve (Beck et al. 2026) : les sceptiques détectent mieux les erreurs, et les incitations n'ont pas d'effet consistant (confiance Moyenne). Ne comptez pas sur la motivation pour compenser la fatigue.
5. **Mesurez pour itérer :** densité de défauts trouvés par gate, temps par gate, taux de renvoi, dérive spec↔code. Seuil de révision du découpage : si des défauts échappent régulièrement en aval malgré des gates "vertes", resserrez la granularité ou enrichissez la checklist.
6. **Ne traitez aucun seuil chiffré comme une loi.** Les nombres (200–400 LOC, 60 min, 70–90 %) viennent du code/inspection et sont transposés par analogie aux specs. Recalibrez sur vos propres données.

## Caveats

- **Aucun seuil de taille empiriquement validé n'existe pour les specs/tâches elles-mêmes.** Tous les seuils chiffrés (200–400 LOC, <500 LOC/h, 60 min, 70–90 %, 55–60 % d'inspection, 82 % Fagan) proviennent d'études sur le **code** et l'**inspection formelle** (SmartBear/Cisco, Fagan, McConnell). Leur transposition aux documents est une **analogie raisonnée**, pas une preuve. [À VÉRIFIER empiriquement sur vos artefacts.]
- **La courbe "87 % → 28 % selon la taille de PR" est à proscrire comme fait :** elle provient d'un blog vendeur (Propel Code, 2025), auto-rapportée sans méthodologie, et est faussement attribuée à SmartBear/McConnell dans plusieurs blogs. Le vrai "87 %" du study Cisco désigne autre chose (part des reviews rapides sous la densité moyenne).
- **Contradiction dans la littérature de reading techniques :** la supériorité de Perspective-Based Reading sur Checklist/ad hoc n'est **pas** un résultat stable (réfutée par plusieurs réplications). Ce qui est robuste : une lecture *guidée* aide ; le choix précis de la technique est secondaire.
- **Débat Miller vs Cowan :** la capacité exacte de la mémoire de travail (7±2 vs ~4) est débattue ; utilisez la fourchette, pas un chiffre unique.
- **La littérature spec-driven/IA (2023–2026) est majoritairement praticienne** (blogs d'éditeurs, field reports comme EPAM, guides Kiro/Spec Kit) et non des études contrôlées. Les affirmations d'efficacité (ex. "feature de 40h livrée en <8h") sont des cas rapportés par les vendeurs, à traiter comme tendances observées, pas comme faits établis.
- **Bacchelli & Bird nuancent l'objectif même :** si la review sert autant à comprendre qu'à détecter des défauts, optimiser uniquement le "taux de détection" est réducteur. La reviewability inclut la facilité à *comprendre l'intention*.