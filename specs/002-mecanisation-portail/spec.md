# Delta : mécanisation du portail (lot L10) sur le portail de qualité

Statut : Proposé | Cible : `specs/001-ci-quality-gate/spec.md` · Créé : 2026-08-03

> **Mode delta** (marqueur posé par `kickoff-feature`, motivé dans [`DELTA.md`](./DELTA.md)).
> L10 **modifie** le comportement livré par 001 autant qu'il l'**étend** ; écrire une spec
> complète rejouerait 001 et risquerait d'halluciner des exigences sur l'existant.

> **Traçabilité amont — écart PRD assumé, comme 001.** Cette feature est de nature
> gouvernance/outillage : elle ne décline aucun `FR-xxx` produit du PRD. Elle trace vers les
> **ADR** (source des vérifications déterministes) et, indirectement, vers `SC-008` du PRD
> (mise à jour de flotte sans dérive d'architecture). Ce n'est pas un trou du PRD.
>
> - Lot **L10** du chantier de remédiation de l'[audit du 2026-08-01](../../docs/audit-securite-2026-08-01.md).
> - Constats visés : `C-17e`, `C-17f`, `C-17h`, versant mécanique de `B-14`, et cinq résiduels
>   dormants — `A-03`, `B-05`, `C-07`, `C-17b`, `D-07` (versant mécanique).
> - ADR **appliqués, aucun amendé** : ADR-0006 (amdt 2026-08-01 pts 2-5, amdt 2026-08-02 (b)),
>   ADR-0009 (contraintes 4 et 6), ADR-0003 (amdt (d) pt 6), ADR-0011 (§ 1, § 4, § 5),
>   ADR-0004 (amdt (c)).

## Intention

Rendre **mécanique** ce que les neuf lots d'amendement documentaire n'ont fait qu'écrire : le
portail refuse un diff qui touche ce que l'humain possède tant qu'une approbation explicite ne
le couvre pas, la CI conclut depuis le **diff** et non depuis la trace d'un garde, le catalogue
de versions n'accepte plus de plage, et cinq règles de contenu hostile déjà closes en ADR
deviennent des entrées de registre — dormantes tant que le produit n'existe pas, armées au
premier fichier qu'elles gardent.

Trois faits fixent l'échéance : `packages/` et `apps/` n'existent pas, l'exposition est donc
**nulle aujourd'hui** ; elle devient réelle au **premier commit de `packages/core`** ; et
ADR-0006 note qu'un check requis qui verdit sur un diff qu'il ne sait pas refuser est *plus*
piégeur que pas de check du tout.

---

## Comportement actuel

### Invariants à préserver (constatés dans le code livré, pas dans la spec de 001)

- **I-01** — Un registre unique définit les contrôles ; le régime en sélectionne le
  sous-ensemble. Local et intégration continue consomment le même registre.
- **I-02** — Aucun arrêt au premier échec : tous les contrôles du régime s'exécutent.
- **I-03** — Fail-closed : toute terminaison anormale d'un contrôle est rapportée `échoué`,
  jamais `passé` ni silencieusement omise.
- **I-04** — Verdict agrégé `TOUT VERT` si et seulement si aucun contrôle n'est `échoué` ;
  sinon `BLOQUÉ`, avec code de sortie non-zéro.
- **I-05** — Le régime par-changement est le gate de merge et exclut la mutation ; le régime
  planifié porte la mutation, mécaniquement et non par discipline.
- **I-06** — La base de référence des mutants est à cliquet ; absente ou illisible ⇒ `échoué`.
  Explicitement vide ⇒ valide, et signifie « aucun survivant accepté ».
- **I-07** — Un garde en session refuse, **avant** l'écriture, toute édition par l'IA d'un
  chemin possédé par l'humain, et renvoie au modèle la raison du refus.
- **I-08** — Un garde en session refuse toute commande de mise à jour de golden.
- **I-09** — Les chemins protégés proviennent d'une **source de définition unique**, jamais
  dupliquée entre le garde en session et le portail.

### Ce que 001 spécifie et que le code livré **ne tient pas** — repris par ce delta

Constaté par lecture du code à l'ouverture du lot. Ces cinq écarts sont dans le périmètre.

- **É-01** — Le prédicat d'applicabilité de chaque contrôle **n'est jamais consulté** par
  l'exécution du portail ; il n'est lu que par des tests unitaires.
- **É-02** — Cinq contrôles retournent **`passé`** sur un périmètre vide (frontières d'imports,
  SQL de lecture dans les applications, passage par le gestionnaire d'écriture, couverture
  d'autorisation, commentaire terminal de migration). Seuls trois retournent `ignoré`.
  Contredit ADR-0009 contrainte 4 : `passé` sans avoir rien vérifié.
- **É-03** — Le point d'entrée du portail **n'émet ni le rapport lisible ni la représentation
  machine** : il imprime une ligne de verdict. `FR-017` et `FR-018` de 001 ne sont tenues qu'en
  bibliothèque, consommées par des tests seulement.
- **É-04** — **Aucune plomberie de diff n'existe.** Le portail ne sait pas ce qu'un changement
  contient.
- **É-05** — La **suite de tests du portail ne s'exécute pas** en intégration continue. Le code
  qui refuse les diffs n'est gardé par aucun check requis.

### Constats de conception hérités, portés dans ce delta

- **H-01 — Deux listes, pas une.** ADR-0006 en décrit deux, d'effets opposés : les chemins
  **possédés par l'humain** (refus absolu en session, § 9 + pt 5) et les chemins **déclencheurs
  de revue** (approbation exigée au portail, pt 3). Preuve interne que la distinction est
  voulue : l'ADR écrit que la revue « tombe sur les fichiers les plus touchés au début : les
  seams » — si les seams étaient bloqués en session, ce ne serait pas une friction mais une
  impossibilité. Les seams sont donc **écrits par l'IA** et **déclenchent l'approbation**.
- **H-02 — Le garde en session ne couvre pas les écritures par commande shell.** Il n'est
  branché que sur les outils d'édition. Une redirection, une substitution en place ou une copie
  atteint n'importe quel chemin protégé sans refus. La protection livrée par 001 est partielle
  **par construction**, pas par accident. C'est précisément ce que la re-vérification depuis le
  diff est faite pour rattraper.
- **H-03 — Un contrôle résiduel est une entrée du registre, jamais un test.** Un test du
  portail n'est appliqué par aucun check requis (cf. É-05) ; une entrée du registre l'est.
- **H-04 — Conséquence assumée de l'extension.** Placer le portail lui-même dans les chemins
  possédés par l'humain le rend **non-implémentable par l'IA** : le garde en session est absolu,
  sans notion d'approbation. Après ce delta, le portail est du code humain au même titre que les
  tests. Les dix contrôles reportés (§ *NON inclus*) s'écriront à la main.
  **Contrainte d'ordre qui en découle : l'extension de la liste est le dernier changement du
  lot**, sous peine que le lot se bloque lui-même en cours de route.

---

## User stories (priorisées)

### US1 — Refuser un diff qui touche ce que l'humain possède (Priorité : P1)

Un diff modifie un chemin possédé par l'humain ou un déclencheur de revue. Le portail refuse
tant qu'une approbation explicite ne désigne pas l'état exact de ces chemins. La conclusion est
tirée du contenu du changement, jamais d'une trace d'exécution d'un garde.

- Trace vers : ADR-0006 amdt 2026-08-01 pts 3 et 5, amdt 2026-08-02 (b) ; `B-14`, `C-17e`, `C-17f`
- Scénarios d'acceptation (EARS) :
  1. **When** le diff soumis modifie un chemin protégé, the system **shall** exiger une
     approbation désignant l'état de ces chemins.
  2. **If** aucune approbation ne désigne l'état courant, **then** the system **shall** produire
     `BLOQUÉ` et sortir avec un code non-zéro.
  3. **While** une approbation désigne l'état courant, **when** le portail s'exécute, the system
     **shall** rapporter le contrôle d'approbation `passé`.

### US2 — Ne pas ré-approuver pour du bruit (Priorité : P1)

L'approbation est liée au **contenu approuvé**, pas à la révision. Un commit de suivi qui ne
touche aucun chemin protégé la laisse valide ; un commit qui en retouche un la périme. La
friction est proportionnelle au risque, et bornée par la même liste que le déclencheur.

- Trace vers : ADR-0006 amdt 2026-08-01 pt 3 (« la surface est bornée par la forme »)
- Scénarios d'acceptation (EARS) :
  1. **When** un chemin protégé est modifié après l'enregistrement d'une approbation, the system
     **shall** cesser de considérer cette approbation comme désignant l'état courant.
  2. **When** un chemin non protégé est modifié après l'enregistrement d'une approbation, the
     system **shall** continuer à considérer cette approbation comme désignant l'état courant.

### US3 — Rendre le portail fidèle à ce qu'il prétend (Priorité : P1)

Le portail cesse de dire `passé` sans avoir vérifié, émet réellement ses deux rapports, sait
lire un diff, et sa propre suite de tests s'exécute en intégration continue.

- Trace vers : ADR-0009 contraintes 4 et 6 ; `FR-017`/`FR-018`/`FR-027` de 001 ; É-01 → É-05
- Scénarios d'acceptation (EARS) :
  1. **While** le périmètre d'un contrôle est vérifié vide, **when** le portail s'exécute, the
     system **shall** rapporter ce contrôle `ignoré`.
  2. **When** le portail termine, the system **shall** émettre le rapport lisible sur la sortie
     standard depuis son point d'entrée.
  3. **If** la suite de tests du portail échoue en intégration continue, **then** the system
     **shall** faire échouer le build.

### US4 — Armer aujourd'hui cinq règles qui ne mordront que demain (Priorité : P2)

Cinq règles de contenu hostile déjà closes en ADR deviennent des entrées de registre. Elles
retournent `ignoré` tant que le périmètre du produit est vide, et refusent dès le premier fichier
qu'elles gardent — sans qu'aucune décision reste à prendre à ce moment-là.

- Trace vers : ADR-0011 § 1/§ 4/§ 5, ADR-0004 amdt (c), ADR-0003 amdt (d) pt 8 ; `A-03`, `B-05`,
  `C-07`, `C-17b`, `D-07`
- Scénarios d'acceptation (EARS) :
  1. **While** le périmètre du produit est vide, **when** le portail s'exécute, the system
     **shall** rapporter ces cinq contrôles `ignoré`.
  2. **When** le périmètre du produit contient un fichier candidat, the system **shall**
     appliquer la règle et rapporter `passé` ou `échoué`.

### US5 — Poser le maillon que l'édition d'un fichier ne peut pas défaire (Priorité : P1)

La branche par défaut est protégée sur la forge. C'est le seul maillon qu'aucune écriture dans
le dépôt ne désactive — et le lot L7 a constaté le 2026-08-02 qu'il n'était **pas posé**.

- Trace vers : ADR-0006 amdt 2026-08-01 pt 5 (3ᵉ maillon), amdt 2026-08-02 (b) ; `D-09`
- Scénario d'acceptation (EARS) :
  1. The **dépôt** **shall** interdire, sur sa branche par défaut, tout push direct, tout
     force-push et tout contournement par un acteur.

---

## Changements (deltas)

### [MODIFIED]

- **FR-013** *(001)* : ~~vérifie la provenance depuis le catalogue centralisé et le non-mélange
  des majeures~~ → **inchangé, et complété par `FR-045`** (refus d'une plage). Raison : le
  catalogue est exact-pinné aujourd'hui, mais rien ne l'applique ; ADR-0003 amdt (d) pt 6 exige
  des versions **exactes**, le `catalog:` faisant foi. _(ADR: 0003 amdt (d) pt 6 ; `C-17h`)_

- **FR-017** *(001)* : ~~When le portail termine, the system shall produire un rapport
  lisible…~~ → When le portail termine, the system shall **émettre depuis son point d'entrée**,
  sur la **sortie standard**, un rapport lisible listant chaque contrôle avec son statut et, pour
  tout contrôle `échoué`, un résumé de la cause en langage clair. Raison : É-03 — l'exigence
  était écrite, le point d'entrée ne l'émet pas. _(ADR: 0006 §7 ; ADR-0009 contrainte 6)_

- **FR-018** *(001)* : ~~When le portail termine, the system shall produire une représentation
  structurée…~~ → When le portail termine **et que la représentation machine est explicitement
  demandée**, the system shall l'émettre **à la place** du rapport lisible, dérivée du même
  résultat agrégé. Raison : É-03, et séparation des deux sorties — mélanger les deux sur un même
  flux les rend inexploitables l'une et l'autre. _(US2 de 001 — annotation CI)_

- **FR-021** *(001)* : ~~…un chemin protégé (`tests/`, `migrations/`, `**/schema/`, la config
  des frontières, le seam d'auth)~~ → …un chemin protégé **au sens de `FR-035`**, dont la liste
  comprend désormais le **mécanisme d'application** et les **manifestes de dépendances**.
  Raison : `C-17f` — la liste de 001 omettait le mécanisme qui l'applique ; `C-17e` — elle
  omettait le geste par lequel du code que personne n'a écrit entre dans le produit.
  **Limite de couverture désormais écrite** : ce refus ne couvre que les outils d'édition (H-02).
  _(ADR: 0006 amdt 2026-08-01 pts 4 et 5)_

- **FR-023** *(001)* : ~~The system shall dériver les chemins protégés par les hooks de la même
  définition que celle utilisée par les contrôles de frontières du portail.~~ → The system shall
  dériver **les deux listes de `FR-035`** — celle du garde en session et celle du portail — d'une
  **source de définition unique**. Raison : la re-vérification depuis le diff (`FR-043`) est un
  troisième consommateur ; la duplication réintroduirait la divergence qu'`FR-023` ferme.
  _(ADR: 0002 §4 — les `## Constraints` sont la source unique)_

### [ADDED]

#### Sémantique de périmètre et fidélité du portail *(É-01, É-02, É-03, É-05)*

- **FR-031** : While le périmètre d'un contrôle est **vérifié vide**, when le portail s'exécute,
  the system shall rapporter ce contrôle `ignoré`. _(ADR: 0009 contrainte 4)_
- **FR-032** : The system shall ne rapporter `passé` un contrôle qu'après avoir vérifié un
  périmètre **non vide** ; un périmètre vide ne produit jamais `passé`. _(ADR: 0009 contrainte 4 ;
  É-02)_
- **FR-033** : When l'intégration continue s'exécute sur un diff, the system shall exécuter la
  **suite de tests du portail** dans une étape distincte de l'exécution du portail.
  _(É-05 ; ADR-0009 contrainte 1)_
- **FR-034** : If la suite de tests du portail échoue, then the system shall faire échouer le
  build. _(É-05)_

#### Chemins protégés *(`C-17e`, `C-17f`)*

- **FR-035** : The system shall distinguer **deux listes** de chemins, dérivées d'une source de
  définition unique : les chemins **possédés par l'humain** — refus absolu en session — et les
  chemins **déclencheurs de revue** — approbation exigée au portail. _(ADR: 0006 §9 + amdt
  2026-08-01 pts 3 et 5 ; H-01)_
- **FR-036** : The system shall inclure dans les chemins possédés par l'humain, outre ceux de
  001, le **mécanisme d'application** — gardes de session, leur configuration, définition des
  workflows d'intégration continue, portail lui-même, base de référence des mutants — et les
  **manifestes de dépendances**. _(ADR: 0006 amdt 2026-08-01 pts 4 et 5 ; ADR-0009 § 5)_
- **FR-037** : The system shall inclure dans les chemins déclencheurs de revue **tous** les
  chemins possédés par l'humain, ainsi que tout **seam déclaré**, tout **endpoint d'écriture
  nouveau** et l'**allowlist réseau**. _(ADR: 0006 amdt 2026-08-01 pt 3 ; H-01)_

#### Approbation *(`B-14` versant mécanique)*

- **FR-038** : When le diff soumis au portail modifie un chemin déclencheur de revue, the system
  shall exiger une **approbation désignant l'état de ces chemins** dans ce diff.
  _(ADR: 0006 amdt 2026-08-01 pt 3)_
- **FR-039** : If aucune approbation ne désigne l'état courant des chemins déclencheurs modifiés
  par le diff, then the system shall rapporter le contrôle d'approbation `échoué`, produire
  `BLOQUÉ` et sortir avec un code non-zéro. _(ADR: 0006 amdt 2026-08-01 pt 3 ; ADR-0002 §3)_
- **FR-040** : When un chemin déclencheur de revue est modifié **après** l'enregistrement d'une
  approbation, the system shall cesser de considérer cette approbation comme désignant l'état
  courant. _(US2 — ferme « approuver tôt, pousser après »)_
- **FR-041** : When un chemin **non** déclencheur est modifié après l'enregistrement d'une
  approbation, the system shall continuer à considérer cette approbation comme désignant l'état
  courant. _(US2 — friction proportionnelle au risque)_
- **FR-042** : If une approbation ne porte pas de **motif non vide**, then the system shall la
  considérer comme invalide. _(ADR: 0006 amdt 2026-08-01 pt 3 — la revue est une lecture, pas une
  case)_
- **FR-043** : The system shall n'exiger **aucune** approbation pour la modification de
  l'**artefact d'approbation lui-même**. _(condition d'existence : sans cette exemption, aucune
  approbation ne serait jamais accordable — même auto-référence qu'ADR-0006 amdt 2026-08-01 pt 5)_
- **FR-044** : The system shall conclure à la présence ou à l'absence d'approbation **à partir du
  diff soumis**, jamais à partir d'une trace d'exécution d'un garde en session.
  _(ADR: 0006 amdt 2026-08-01 pt 5 — « elle relit le diff » ; ferme H-02)_
- **FR-045** : While le périmètre du produit ne contient aucun **seam déclaré**, when le portail
  s'exécute, the system shall rapporter le contrôle d'**attribution de l'approbation** `ignoré` ;
  Where un seam déclaré existe, the system shall le rapporter `échoué` tant qu'aucune preuve
  d'attribution n'est portée. _(fil-piège — voir § *Ce que l'approbation ne prouve pas*)_

#### Catalogue de versions et installation *(`C-17h`)*

- **FR-046** : If une entrée du catalogue centralisé de versions désigne une **plage** plutôt
  qu'une version exacte, then the system shall rapporter `échoué`. _(ADR: 0003 amdt (d) pt 6)_
- **FR-047** : If l'étape d'installation des dépendances de l'intégration continue **n'impose pas
  la conformité du fichier de verrouillage**, then the system shall rapporter `échoué`.
  _(ADR: 0003 amdt (d) pt 6 ; H-03 — l'exigence existait en test, jamais en contrôle)_

#### Cinq contrôles dormants *(règle close en ADR, périmètre vide aujourd'hui)*

Chacun hérite de `FR-031` : `ignoré` tant que son périmètre est vérifié vide.

- **FR-048** : The system shall rapporter `échoué` si une valeur de contenu est rendue **hors du
  contexte déclaré** par le descripteur de gabarit — en particulier par une insertion de balisage
  brut. _(ADR: 0011 § 4 ; ADR-0004 amdt (c) ; `A-03`)_
- **FR-049** : The system shall rapporter `échoué` si le type d'image **vectorielle scriptable**
  apparaît dans une liste de types de téléversement acceptés. _(ADR: 0011 § 5 ; `C-07`)_
- **FR-050** : The system shall rapporter `échoué` si une cible de lien externe est validée
  autrement que par une **énumération fermée des schémas d'adresse** `http` et `https`.
  _(ADR: 0004 amdt (c) ; ADR-0011 § 4 ; `C-17b`)_
- **FR-051** : The system shall rapporter `échoué` si un littéral de requête de base de données
  contient une **substitution de chaîne**. _(ADR: 0004 amdt (c) — requête paramétrée, jamais
  d'interpolation ; `B-05`)_
- **FR-052** : The system shall rapporter `échoué` si une URL d'embed vidéo n'est pas construite
  en **mode à confidentialité renforcée**. _(ADR: 0003 amdt (d) pt 8 ; `D-07` versant mécanique)_

#### Protection de la branche par défaut *(`D-09`, 3ᵉ maillon)*

- **FR-053** : The **dépôt** shall interdire, sur sa branche par défaut, tout **push direct**,
  tout **force-push** et tout **contournement par un acteur**. _(ADR: 0006 amdt 2026-08-02 (b))_
- **FR-054** : The **dépôt** shall exiger, pour atteindre sa branche par défaut, une **pull
  request** dont le **portail** et la **suite de tests du portail** sont des checks requis.
  _(ADR: 0006 amdt 2026-08-02 (b) ; `FR-033`)_

### [REMOVED]

Aucun comportement de 001 n'est retiré. Les cinq écarts É-01 → É-05 sont des exigences de 001
**non tenues par le code**, non des exigences abandonnées : ce delta les honore.

---

## Cas limites & comportements indésirables

- **FR-055** : If le diff soumis au portail **ne peut pas être déterminé**, then the system shall
  rapporter `échoué` tout contrôle qui en dépend — jamais `passé` ni `ignoré`. _(ADR: 0009
  contrainte 4 ; symétrique de `FR-029` de 001 : absence ≠ ensemble vide)_
- **FR-056** : If l'artefact d'approbation est **présent mais illisible**, then the system shall
  rapporter le contrôle d'approbation `échoué`. _(fail-closed ; symétrique de `FR-029` de 001)_
- **FR-057** : If un contrôle **ne peut pas déterminer** si son périmètre est vide, then the
  system shall le rapporter `échoué`. _(ADR: 0009 contrainte 4 — `ignoré` réservé à un périmètre
  **vérifié** vide)_
- **FR-058** : If une approbation désigne un état de chemins protégés qui **n'apparaît pas** dans
  le diff soumis, then the system shall l'ignorer sans erreur — une approbation obsolète ne vaut
  ni refus ni acceptation. _(hygiène : sans cette règle, une approbation résiduelle ferait échouer
  des diffs sans rapport)_

Questions frontières non tranchées ici, listées pour `clarify` :

- Que se passe-t-il si **plusieurs** approbations désignent l'état courant ? *(hypothèse de
  travail : la première suffit ; aucune n'invalide les autres)*
- Que devient une approbation dont l'état approuvé n'existe plus dans l'historique ? *(hypothèse
  de travail : elle est inerte, cf. `FR-058`)*

---

## Contrats d'entrée/sortie

**Entrées du portail** — inchangées de 001, plus :

| Entrée | Nature | Absente ⇒ |
|---|---|---|
| Régime | `par-changement` (défaut) ou `planifie` | défaut |
| **Diff soumis** | ensemble des chemins modifiés et de leur contenu résultant | `échoué` (`FR-055`) |
| **Approbations** | désignation d'un état de chemins protégés + motif | `échoué` si un chemin déclencheur est modifié (`FR-039`) |

**Sorties du portail** — deux vues dérivées d'un **résultat agrégé unique**, jamais mélangées :

| Vue | Destination | Contenu |
|---|---|---|
| Rapport lisible *(défaut)* | sortie standard | statut de chaque contrôle ; cause en langage clair pour chaque `échoué` |
| Représentation machine *(sur demande explicite)* | sortie standard, **à la place** du rapport lisible | statut de chaque contrôle, verdict agrégé, nombre d'échecs |
| Code de sortie | — | `0` si `TOUT VERT`, non-zéro si `BLOQUÉ` |

**Statuts** — `passé` | `échoué` | `ignoré`. Invariants : `ignoré` ⇒ périmètre **vérifié** vide
(`FR-031`) ; `passé` ⇒ périmètre non vide **et** vérifié (`FR-032`) ; toute impossibilité de
conclure ⇒ `échoué` (`FR-055`, `FR-056`, `FR-057`).

**Étapes d'intégration continue** — installation à verrouillage imposé, puis **suite de tests du
portail** (`FR-033`), puis **portail en régime par-changement**. Les deux dernières sont des
checks requis (`FR-054`).

---

## Ce que l'approbation ne prouve pas

*Écrit dans le corps, à côté des `SHALL` qu'il affaiblit, plutôt qu'en note de bas de page —
même geste que le lot L8 pour la règle de lint livrée au projet client.*

L'approbation atteste qu'un **état a été approuvé**, jamais **par qui**. Le geste qui la produit
est reproductible par l'IA : un agent sous influence adverse peut enregistrer l'approbation de son
propre diff, dans le même changement.

La chaîne des trois maillons d'ADR-0006 amdt 2026-08-01 pt 5 **ne ferme pas ce cas**. Elle ferme
« le garde a été désactivé » — la présence du chemin dans le diff *est* le verdict, il n'y a rien
à interpréter. Elle ne ferme pas « le garde a été satisfait par un titre forgé » : là, la présence
dans le diff n'est plus le verdict mais une **question**, et l'approbation en est la **réponse** —
indistinguable du geste légitime, puisque le geste légitime *est* d'écrire l'approbation.

En conséquence : **la barrière vaut contre une IA qui se trompe, pas contre une IA qui évade.**
Elle vaut aussi contre une dépendance piégée dans la mesure où l'ajout du manifeste est lu. Le
contrôle d'attribution (`FR-045`) la rouvre **mécaniquement** au premier seam déclaré — c'est-à-dire
au moment exact où le modèle de menace adverse devient dominant.

Résiduel hérité, rappelé : l'approbateur est aujourd'hui la personne qui lance l'agent, donc un
adversaire faible ; la revue ne vaut pas contre une intention humaine.

---

## NON inclus (frontière de périmètre)

Les exclusions de 001 restent valides. S'y ajoutent, chacune avec son motif :

- **Dix des dix-huit lignes de résiduels du tableau de suivi** — `A-02` (schémas de valeur de
  zone), `B-01` (motif de route unique), `B-08` (bornes d'entrée), `B-09` (compteur de débit),
  `B-14` versant *appel réseau hors seam* et allowlist, `C-03` (garde-fou de réconciliation),
  `C-08` (zone vidéo), `C-11` (`failure_reason` borné), `C-15` (forme de la route publique),
  `C-17a` (contexte de rendu déclaré). **Motif** : la forme du contrôle dépend d'une convention
  de code non écrite ; l'inventer maintenant est exactement l'hallucination que le mode delta
  existe pour fermer. Ils s'écriront avec le code qu'ils gardent — **à la main**, cf. H-04.
- **Le portage du contexte de rendu dans le descripteur du contrat de gabarit** (`C-17a`).
  **Motif** : ADR-0004 a consommé son amendement daté au lot L3 ; ce portage ouvrirait un
  amendement (d). Décision d'architecture, pas de mécanisation.
- **La rédaction de la mention d'information** (`D-07` versant produit, `FR-105` → `FR-109` du
  PRD). **Motif** : c'est un écrit juridique validé par la cliente, et la question ouverte RGPD du
  PRD. Seul le versant mécanique de `D-07` entre ici (`FR-052`).
- **La preuve d'attribution de l'approbation.** **Motif** : elle ouvre un ADR (nouveau patron
  structurant), qui ne se rédige pas en phase `specify`. Voir `[NEEDS CLARIFICATION]` ci-dessous
  et le fil-piège `FR-045`.
- **La fermeture du contournement par commande shell** dans le garde de session (H-02).
  **Motif** : déterminer ce qu'une commande shell écrit est **indécidable** (redirections,
  substitutions, scripts intermédiaires, outils tiers). Une garde partielle qui se croit complète
  produit le « vert qui ressemble à une garantie ». Le garde de session reste une **commodité**
  qui attrape le geste évident tôt ; la **barrière** est la re-vérification depuis le diff
  (`FR-044`).
- **La réactivation des mises à jour automatiques de dépendances.** **Motif** : ce delta lève la
  condition qui les bloquait (le portail sait désormais refuser un diff de manifeste), mais
  réactiver suppose de trancher **qui approuve un diff ouvert par un robot** — l'approbateur n'a
  pas lancé l'agent, et la lecture attendue de lui n'est pas la même. Décision distincte.
- **Les onze contrôles existants de 001**, hors la sémantique de périmètre vide (`FR-031`,
  `FR-032`) et le catalogue (`FR-046`). Leur logique n'est pas revisitée.
- **Le régime planifié et la mutation.** Inchangés, hors le fait que la base de référence rejoint
  les chemins protégés (`FR-036`).
- **`packages/` et `apps/` eux-mêmes.** Ce delta ne crée aucun code de produit.

---

## `[NEEDS CLARIFICATION]`

- **`[NEEDS CLARIFICATION : attribution de l'approbation]`** — ADR-0006 amdt 2026-08-01 pt 3
  renvoie l'auto-référence de l'approbation à la chaîne du point 5 ; or cette chaîne ferme « le
  garde a été désactivé » et non « le garde a été satisfait par un titre forgé » (cf. § *Ce que
  l'approbation ne prouve pas*). **Question fermée à trancher** : ce delta livre-t-il l'approbation
  **sans** preuve d'attribution — résiduel écrit, réouverture mécanique par `FR-045` au premier
  seam — ou une preuve d'attribution est-elle exigée **dès maintenant**, auquel cas un ADR est
  requis dans la même PR ? *(Hypothèse de travail portée par cette spec : sans preuve
  d'attribution, cf. `FR-045`.)*

- **`[NEEDS CLARIFICATION : configuration locale des gardes]`** — un fichier de configuration
  **locale** des gardes de session existe dans le dépôt et n'est nommé dans **aucune** des deux
  listes d'ADR-0006, qui n'énumère que la configuration principale. Il relève pourtant de la même
  surface. **Question fermée à trancher** : entre-t-il dans les chemins possédés par l'humain
  (`FR-036`) ? L'y ajouter étend une liste qu'un ADR **accepté** a énumérée — d'où le marqueur
  plutôt qu'un ajout silencieux.

- **`[NEEDS CLARIFICATION : approbations multiples et obsolètes]`** — cf. les deux questions
  frontières du § *Cas limites*. Hypothèses de travail posées, non tranchées.

---

## Critères de succès mesurables

Les `SC-001` → `SC-006` de 001 restent valides. S'y ajoutent :

- **SC-007** : Un diff modifiant un chemin déclencheur de revue **sans approbation couvrant son
  état** produit `BLOQUÉ` et n'atteint pas la branche par défaut. _(FR-038, FR-039 ; `B-14`)_
- **SC-008** : Un diff modifiant un chemin déclencheur **par une commande shell** — sans passer
  par un outil d'édition, donc sans refus en session — produit `BLOQUÉ` au portail. _(FR-044 ;
  H-02 — c'est la mesure qui prouve que la barrière est le diff et non le garde)_
- **SC-009** : Une approbation enregistrée puis suivie d'une modification d'un chemin déclencheur
  produit `BLOQUÉ` ; suivie d'une modification d'un chemin non déclencheur, elle produit
  `TOUT VERT`. _(FR-040, FR-041 — les deux moitiés dans la même mesure)_
- **SC-010** : 100 % des contrôles définis rapportent `ignoré` — et **aucun** `passé` — lorsque
  leur périmètre est vérifié vide. _(FR-031, FR-032 ; É-02 ; ADR-0009 contrainte 4)_
- **SC-011** : Le rapport lisible et la représentation machine sont **tous deux émis par le point
  d'entrée** et portent des statuts identiques pour un même contrôle. _(FR-017, FR-018 modifiées ;
  `FR-028` de 001 ; É-03)_
- **SC-012** : Une entrée du catalogue exprimée en plage, et une étape d'installation
  d'intégration continue sans verrouillage imposé, produisent chacune `BLOQUÉ`. _(FR-046, FR-047 ;
  `C-17h`)_
- **SC-013** : Chacun des cinq contrôles dormants rapporte `ignoré` sur le dépôt en l'état, et
  `échoué` sur un fichier candidat portant la violation. _(FR-048 → FR-052)_
- **SC-014** : Un push direct sur la branche par défaut est refusé par la forge, et une pull
  request dont le portail échoue ne peut pas être fusionnée. _(FR-053, FR-054 ; `D-09`)_

---

## Vérification

**Non-régression sur les invariants** — I-01 → I-09 restent vrais après le delta. Le point de
vigilance est I-09 : trois consommateurs de la source unique des chemins au lieu de deux
(garde de session, contrôle du portail, re-vérification depuis le diff).

**Nouveaux `SHALL`** — chacun de `FR-031` → `FR-058` appelle une vérification observable nommée.
La forme de chaque vérification (test, contrôle, preuve inhérente) se décide en phase `tasks` ;
deux cas sont déjà contraints :

- `FR-053` et `FR-054` portent sur une configuration **hors du dépôt** : leur vérification est un
  **relevé d'état consigné**, pas un test — le portail ne peut pas lire la forge, et l'y faire lire
  exigerait un appel réseau, donc un seam, c'est-à-dire l'inverse de ce qu'ADR-0006 pt 2 vient de
  fermer.
- H-03 impose que tout contrôle résiduel soit une **entrée du registre**, jamais un test : un test
  du portail n'est appliqué par aucun check requis. `FR-047` en particulier remplace une
  vérification qui n'existe aujourd'hui qu'en test.

**Contrainte d'ordre, à honorer en `tasks`** — l'extension des chemins protégés (`FR-036`) est le
**dernier** changement du lot. Elle rend le portail possédé par l'humain (H-04) et, l'appliquant
à lui-même, bloquerait tout geste ultérieur de l'IA sur le lot en cours. L'artefact d'approbation
et son exemption (`FR-043`) doivent exister **avant ou dans la même tranche**.
