# Spec : Portail de qualité (CI + hooks + runner local)
Statut : Draft | Créé : 2026-07-18 | Révisé : 2026-07-19 (mutation → régime planifié, hors chemin PR) | Trace vers : docs/adr/ (ADR-0002 §3, ADR-0006 §7/§9/§Seuils, ADR-0004, ADR-0005, ADR-0003), docs/prd.md (SC-001, SC-008)

> **Note de traçabilité (écart PRD assumé).** Cette feature est de nature **gouvernance/infrastructure** : elle ne décline aucun `FR-xxx` produit du PRD (qui décrit l'édition, les médias, les formulaires). Elle matérialise la **couche déterministe** d'ADR-0002 §3 et le **portail de merge non-négociable** d'ADR-0006 §7/§9. Ses critères tracent donc vers les **ADR** (source des vérifications déterministes) et, indirectement, vers `SC-001` (0 €/mois : ne pas casser la prod) et `SC-008` (mise à jour de flotte sans dérive d'architecture). Ce n'est **pas** un trou du PRD — le PRD est technology-agnostic par construction et renvoie explicitement l'intégrité d'architecture à la stack/aux ADR (cf. PRD `SC-008`).

## Résumé

Un **portail de qualité unique** qui rejoue le **même ensemble de contrôles déterministes** à deux moments : en **local** (script lancé par le dev, rapport complet avant de pousser) et en **CI** (au merge, bloquant), complété par des **hooks Claude Code** qui préviennent en amont les éditions interdites à l'IA. Il transforme les sections `## Constraints` des ADR en vérifications mécaniques, de sorte que le mode d'échec propre au code généré par IA (« plausible mais faux ») soit attrapé par la machine, pas par la relecture. Valeur : l'architecture (ADR-0004) ne s'érode pas à chaque génération, et un diff qui viole une contrainte porteuse **ne peut pas** atteindre `main`.

Le portail tourne selon **deux régimes**, issus d'**un même registre de contrôles**. Le **régime par-changement** (local pré-push + CI par PR) est le **gate de merge** : rapide, il rassemble tous les contrôles *sauf* la mutation. Le **régime planifié** (récurrent sur `main`, aussi lançable en local à la demande) porte le contrôle **lourd** de mutation testing — sorti du chemin d'itération des PR pour ne pas l'alourdir, mais toujours **exécuté mécaniquement** (non laissé à la discipline du dev), conformément à la clause de repli pré-enregistrée d'ADR-0006 §Seuils (« coût > budget CI → nightly/pré-merge ciblé plutôt qu'à chaque PR »).

## User stories (priorisées)

### US1 — Vérifier tout en local avant de pousser (Priorité : P1)
Le dev lance un unique script à la racine ; celui-ci exécute l'ensemble des contrôles du **régime par-changement** (rapide ; la mutation, plus lourde, relève du régime planifié — lançable en local à la demande, non exécutée à chaque pré-push), ne s'arrête pas au premier échec, et affiche un rapport lisible listant chaque contrôle avec son statut et la cause de tout échec. Le dev corrige avant de pousser.
- Trace vers : ADR-0006 §7 (portail), ADR-0002 §3 (couche déterministe) ; PRD SC-001
- Scénarios d'acceptation (EARS) :
  1. **When** le dev lance le script du portail, the system **shall** exécuter chacun des contrôles définis puis produire un rapport listant, pour chaque contrôle, un statut parmi `passé`/`échoué`/`ignoré`.
  2. **If** au moins un contrôle échoue, then the system **shall** sortir avec un code non-zéro et un verdict agrégé `BLOQUÉ` indiquant le nombre de contrôles échoués.
  3. **While** un contrôle vient d'échouer, **when** les contrôles suivants s'exécutent, the system **shall** continuer à les exécuter et à les rapporter (pas d'arrêt au premier échec).

### US2 — Bloquer un merge non conforme (Priorité : P1)
Au merge, la CI rejoue le même portail dans son **régime par-changement**. Un diff qui viole une contrainte déterministe fait échouer le build et n'atteint jamais `main`.
- Trace vers : ADR-0006 §7 (portail de merge non-négociable), ADR-0002 §3 ; PRD SC-008
- Scénarios d'acceptation (EARS) :
  1. **When** la CI s'exécute sur un diff, the system **shall** exécuter le même ensemble de contrôles que le script local **pour le régime par-changement** et refléter le même verdict agrégé pour un même commit.
  2. **If** le verdict agrégé est `BLOQUÉ`, then the system **shall** faire échouer le build de CI (empêcher le merge).
  3. **When** la CI termine, the system **shall** produire, en plus du rapport lisible, une sortie structurée lisible par machine décrivant le statut de chaque contrôle.

### US3 — Empêcher en amont une édition interdite à l'IA (Priorité : P1)
Pendant la génération, un hook local refuse toute tentative d'écriture de l'IA dans un chemin possédé par l'humain, avant que l'écriture n'ait lieu.
- Trace vers : ADR-0006 §9 (hook de protection), ADR-0002 §3 (PreToolUse)
- Scénarios d'acceptation (EARS) :
  1. **If** l'IA tente d'éditer un fichier sous un chemin protégé (`tests/`, `migrations/`, `**/schema/`, la config des frontières, le seam d'auth), then the system **shall** refuser l'écriture avant qu'elle n'ait lieu et renvoyer la raison du refus.
  2. **If** l'IA tente de lancer une mise à jour de golden (`--update`/`-u`), then the system **shall** refuser l'opération et renvoyer la raison du refus.

### US4 — Détecter une régression de robustesse hors du chemin PR (Priorité : P1)
Le contrôle de mutation (méta-test qui vérifie que la suite attrape *réellement* les bugs) est **lourd** ; l'exécuter à chaque PR alourdirait l'itération. Il est donc sorti du régime par-changement et exécuté dans un **régime planifié** récurrent sur `main`. Une régression de robustesse — un mutant survivant absent de la base de référence — y est détectée de façon **mécanique** (jamais par la seule discipline du dev) et bloque la poursuite du travail jusqu'à correction.
- Trace vers : ADR-0006 §3 (mutation), §7 (portail), §Seuils (repli nightly/pré-merge ciblé) ; ADR-0002 §3 (enforcement mécanique) ; PRD SC-008
- Scénarios d'acceptation (EARS) :
  1. **When** le régime planifié s'exécute sur `main`, the system **shall** exécuter le contrôle de mutation du `core` et rapporter son statut selon la base de référence des survivants.
  2. **If** le régime planifié détecte un mutant survivant absent de la base de référence, then the system **shall** produire un verdict `BLOQUÉ`, sortir avec un code non-zéro et faire échouer le build planifié en signalant la régression.
  3. **While** aucun `core` n'existe encore, **when** le régime planifié s'exécute, the system **shall** rapporter le contrôle de mutation comme `ignoré` (jamais `échoué`).

## Exigences fonctionnelles (EARS, atomiques, testables)

> **Deux régimes d'exécution.** Le portail tourne selon **un même registre de contrôles à source unique**, exécuté sous deux régimes : le **régime par-changement** (local pré-push + CI par PR) est le **gate de merge** — rapide, il rassemble tous les contrôles *sauf* la mutation (FR-002/FR-003) ; le **régime planifié** (récurrent sur `main`, aussi lançable en local à la demande) porte le contrôle **lourd** de mutation et la gouvernance de sa base de référence. Un contrôle déclare le(s) régime(s) auxquels il appartient ; la parité (FR-019/FR-020) s'entend **pour un régime donné**. *Mutation hors du chemin PR : clause de repli pré-enregistrée d'ADR-0006 §Seuils.*

### Contrôles du portail (le régime est indiqué par contrôle)

- **FR-001** : The system shall exécuter une suite d'intégration s'appuyant sur de vraies ressources de données locales et rapporter `échoué` si un test de cette suite échoue. _(ADR: 0005 ; ADR-0006 §7 ; régime par-changement)_
- **FR-002** : The system shall, **dans le régime planifié**, mesurer les mutants survivants du `core` et rapporter `échoué` si au moins un mutant survivant n'est pas présent dans la base de référence des survivants acceptés. _(ADR: 0006 §3, §7, §Seuils — mutation hors chemin PR)_
- **FR-003** : While aucun `core` n'existe encore (périmètre vide), when le régime planifié s'exécute, the system shall rapporter le contrôle de mutation comme `ignoré` (et non `échoué`). _(ADR: 0006 §3, §Seuils — bootstrap greenfield)_
- **FR-004** : The system shall vérifier les frontières d'imports déclarées et rapporter `échoué` si un import interdit existe (import de `cloudflare*` hors types dans `@colibri/core` ; import d'`apps/*` dans `@colibri/db` ou `@colibri/core`). _(ADR: 0004 ; ADR-0006 §4)_
- **FR-005** : The system shall rapporter `échoué` si du SQL de lecture est présent dans `apps/*` (toute lecture partagée devant vivre dans `@colibri/db`). _(ADR: 0004)_
- **FR-006** : The system shall rapporter `échoué` si un endpoint d'écriture ne passe pas par `writeHandler`. _(ADR: 0004)_
- **FR-007** : The system shall rapporter `échoué` si un endpoint d'écriture n'est pas couvert par un test d'autorisation. _(ADR: 0006 §7 — 100 % des endpoints d'écriture testés pour l'autorisation)_
- **FR-008** : Where au moins une route publique existe, the system shall rapporter `échoué` si une route publique n'est pas couverte par un test vérifiant le rejet en l'absence de jeton anti-robot valide. _(ADR: 0005 ; ADR-0007)_
- **FR-009** : While aucune route publique n'existe, when le portail s'exécute, the system shall rapporter le contrôle Turnstile comme `ignoré`. _(ADR: 0007 — formulaires P2, contrôle dormant)_
- **FR-010** : The system shall rapporter `échoué` si la vérification de types statiques en mode strict produit une erreur. _(ADR: 0004 ; CLAUDE.md § Style)_
- **FR-011** : The system shall rapporter `échoué` si le lint ou le contrôle de format signale une violation. _(ADR: 0002 §3 — PostToolUse lint/format)_
- **FR-012** : The system shall rapporter `échoué` si une migration de base de données se termine par un commentaire. _(ADR: 0005 — contournement du bug outillage #7739)_
- **FR-013** : The system shall rapporter `échoué` si une version de dépendance structurante ne provient pas du catalogue de versions centralisé, ou si des versions majeures incompatibles du framework de site public et de son adaptateur d'exécution sont mélangées. _(ADR: 0003)_

### Agrégation, verdict et sortie

- **FR-014** : The system shall exécuter tous les contrôles définis sans s'arrêter au premier échec. _(ADR: 0006 §7 — rapport complet)_
- **FR-015** : When tous les contrôles sont terminés, the system shall produire un verdict agrégé `TOUT VERT` si et seulement si aucun contrôle n'est `échoué`, sinon `BLOQUÉ`. _(ADR: 0006 §7)_
- **FR-016** : If le verdict agrégé est `BLOQUÉ`, then the system shall sortir avec un code non-zéro. _(ADR: 0002 §3 — exit non-zéro bloque le merge)_
- **FR-017** : When le portail termine, the system shall produire un rapport lisible par un humain listant chaque contrôle avec son statut et, pour tout contrôle `échoué`, un résumé de la cause en langage clair. _(ADR: 0006 §7)_
- **FR-018** : When le portail termine, the system shall produire une représentation structurée lisible par machine du statut de chaque contrôle et du verdict agrégé, dérivée du même résultat que le rapport lisible. _(US2 — annotation CI)_
- **FR-019** : The system shall exécuter en local et en CI, **pour un régime donné**, le même ensemble de contrôles issu d'une source de définition unique. _(ADR: 0006 §7 — parité local/CI par régime)_
- **FR-020** : Given un même commit **et un même régime**, when le portail s'exécute en local puis en CI, the system shall produire le même verdict agrégé. _(ADR: 0006 §7 — parité par régime)_

### Hooks de prévention (locaux)

- **FR-021** : If l'IA tente d'éditer un fichier sous un chemin protégé (`tests/`, `migrations/`, `**/schema/`, la config des frontières, le seam d'auth), then the system shall refuser l'écriture avant qu'elle n'ait lieu et renvoyer au modèle la raison du refus. _(ADR: 0006 §9 ; ADR-0002 §3 — PreToolUse exit 2)_
- **FR-022** : If l'IA tente une mise à jour de golden (`--update`/`-u`), then the system shall refuser l'opération et renvoyer la raison du refus. _(ADR: 0006 §9 — golden lock)_
- **FR-023** : The system shall dériver les chemins protégés par les hooks de la même définition que celle utilisée par les contrôles de frontières du portail. _(ADR: 0002 §4 — les `## Constraints` sont la source unique)_

### Base de référence des survivants (mutation, gouvernée)

- **FR-024** : The system shall dériver l'ensemble des mutants survivants tolérés depuis une base de référence versionnée explicite, jamais depuis une valeur implicite ni un seuil codé en dur. _(ADR: 0006 §"Seuils")_
- **FR-025** : The system shall considérer la base de référence comme l'ensemble exhaustif des mutants survivants tolérés à un instant donné ; tout mutant survivant absent de cet ensemble fait échouer le contrôle de mutation. _(ADR: 0006 §"Seuils" — pas de pourcentage arbitraire ; le portail vise le risque, pas un score)_
- **FR-026** : The system shall appliquer une règle de cliquet à la base de référence : un mutant tué doit être retiré de la base, et la base ne doit jamais être élargie (aucun survivant ajouté) pour faire passer le portail. _(ADR: 0006 §"Seuils" — renforcer avant d'accepter de nouvelles tranches)_

### Régime planifié : blocage mécanique sur régression de robustesse

- **FR-030** : When le régime planifié détecte un mutant survivant absent de la base de référence, the system shall produire un verdict `BLOQUÉ`, sortir avec un code non-zéro et faire échouer le build planifié — signalant une régression de robustesse à corriger avant de poursuivre. _(ADR: 0006 §7/§Seuils ; ADR-0002 §3 ; US4 — enforcement mécanique, jamais discipline)_

## Cas limites & comportements indésirables (unwanted behavior)

- **FR-027** : If un contrôle ne peut pas s'exécuter (outil absent, mal configuré, ou terminaison anormale), then the system shall rapporter ce contrôle comme `échoué` (jamais `passé` ni silencieusement `ignoré`) et contribuer au verdict `BLOQUÉ`. _(garde-fou : un gate qui verdit sans avoir vérifié est pire qu'absent)_
- **FR-028** : If la représentation structurée (machine) et le rapport lisible portent des statuts divergents pour un même contrôle, then the system shall être considéré en défaut — les deux sont dérivés d'un résultat unique (FR-018). _(cohérence des deux vues)_
- **FR-029** : If la base de référence des survivants est absente ou illisible, then the system shall rapporter le contrôle de mutation comme `échoué` plutôt que de tolérer un survivant par défaut. Une base **explicitement vide** (fichier présent, zéro survivant toléré) est valide et signifie « aucun survivant accepté ». _(pas de défaut silencieux sur un paramètre de sûreté ; absence ≠ ensemble vide)_
- Que se passe-t-il si le diff ne touche ni endpoint d'écriture, ni route publique, ni migration ? → dans le régime par-changement, les contrôles sans objet sont `ignoré` (ex. Turnstile FR-009), les contrôles universels (frontières, typecheck, lint, versions) restent exécutés ; la mutation n'appartient pas à ce régime. Dans le régime planifié, tant qu'aucun `core` n'existe, la mutation est `ignoré` (FR-003).
- Que se passe-t-il si un contrôle `ignoré` masque une régression ? → `ignoré` n'est jamais compté comme `passé` ; il est visible dans le rapport et n'influe pas sur `TOUT VERT` uniquement en l'absence d'objet réel (périmètre vide vérifié, non supposé).

## Contrats d'entrée/sortie (schémas machine-lisibles)

- **Entrée** : le diff / arbre de travail courant ; une `base de référence des mutants survivants acceptés` versionnée (le *format concret* du fichier relève du plan).
- **Sortie — code de process** : `0` ⇔ verdict `TOUT VERT` ; non-zéro ⇔ `BLOQUÉ`.
- **Sortie — rapport lisible** (terminal) : verdict agrégé + une entrée par contrôle `{ identité, statut ∈ {passé, échoué, ignoré}, cause? }`.
- **Sortie — représentation machine** : liste `{ contrôle, statut, cause? }` + `{ verdict, nb_échecs }`, dérivée du même résultat que le rapport lisible. Le **format concret** (fichier, schéma) relève du plan (`plan.md`), pas de la spec.
- **Hooks** : signal de refus porteur d'une raison lisible renvoyée à l'agent (le *mécanisme* d'exit relève du plan).

## NON inclus (frontière de périmètre)

- **Le choix des outils** (moteur de test, outil de mutation, vérificateur de frontières, plateforme de CI, mécanisme de hook) : c'est du *comment* → `plan.md` / `stack.md` / ADR.
- **La correction automatique** du code par le portail : il **constate et bloque**, il ne réécrit pas (pas d'auto-fix, pas de boucle « jusqu'au vert » — ADR-0006 : l'IA re-génère, le gate ne patche pas).
- **Un objectif de couverture-ligne** : explicitement rejeté (ADR-0006 §8) — le portail vise le risque, pas un pourcentage global.
- **Les contrôles de performance** (Lighthouse ≥ 95, `SC-005`) : mesurés ailleurs, hors de ce portail v1.
- **Les règles d'architecture non exprimables sans faux positif** (présence des deux schémas de validation `Row`/`Input`, verrou optimiste via `createRepository`) : restent *advisory* (`CLAUDE.md` + revue humaine), hors gate v1.
- **L'analyse de sécurité applicative (SAST/scan de dépendances)** : hors périmètre v1.
- **L'application des migrations D1** : le portail vérifie une règle de forme (FR-012), il n'applique aucune migration (ADR-0008 : migrations appliquées par étape outillée après sauvegarde, jamais en automatique).
- **L'exécution de la mutation à chaque PR** : sortie du chemin d'itération et confiée au **régime planifié** récurrent sur `main`, non rejouée à chaque push — clause de repli d'ADR-0006 §Seuils (« coût > budget CI → nightly/pré-merge ciblé »). Le régime par-changement reste le gate de merge pour tous les autres contrôles. (À distinguer d'un abandon : la mutation reste un contrôle **mécanique bloquant**, seulement décalé du chemin PR — cf. FR-030, SC-006.)
- **L'exécution de la mutation en « local only » sans filet CI** : explicitement **écartée** — elle déplacerait la mutation vers la discipline du dev, contre ADR-0002 §3 (« ce qui ne doit pas arriver → couche déterministe, jamais le seul CLAUDE.md/la discipline »).

## Critères de succès mesurables

- **SC-001** : Un diff introduisant une violation déterministe couverte (import interdit, endpoint d'écriture sans autz, SQL de lecture dans `apps/*`, migration finissant par un commentaire, version hors catalogue centralisé) produit un verdict `BLOQUÉ` et n'atteint pas `main`. _(ADR-0006 §7 ; PRD SC-008)_
- **SC-002** : Pour un même commit **et un même régime**, le verdict agrégé produit en local et en CI est identique (parité par régime). _(ADR-0006 §7)_
- **SC-003** : Un contrôle dont l'outil est indisponible produit `BLOQUÉ`, jamais `TOUT VERT`. _(FR-027)_
- **SC-004** : Le rapport lisible expose un statut pour 100 % des contrôles définis à chaque exécution (aucun contrôle muet). _(FR-017)_
- **SC-005** : 100 % des endpoints d'écriture existants sont couverts par un test d'autorisation constaté par le portail. _(ADR-0006 §7 ; FR-007)_
- **SC-006** : Une régression de robustesse introduite sur `main` (mutant survivant hors base de référence) est détectée par le régime planifié à sa prochaine exécution récurrente et produit `BLOQUÉ`, sans jamais dépendre de la discipline d'un dev. _(FR-030 ; ADR-0006 §Seuils ; ADR-0002 §3 — enforcement mécanique)_
