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
> - Constats visés : `C-17e`, `C-17f`, `C-17h`, `D-09`, versant mécanique de `B-14`, et cinq
>   résiduels dormants — `A-03`, `B-05`, `C-07`, `C-17b`, `D-07` (versant mécanique).
> - ADR **appliqués, aucun amendé** : ADR-0006 (amdt 2026-08-01 pts 2-5, amdt 2026-08-02 (b)),
>   ADR-0009 (contraintes 2, 4 et 5), ADR-0003 (amdt (d) pts 6 et 8), ADR-0011 (§ 1, § 4, § 5),
>   ADR-0004 (amdt (c)).
>   **Une exigence de 001 est en revanche restreinte** — `FR-020`, la parité de verdict
>   local/CI — et elle figure en `[MODIFIED]`. Aucun ADR n'énonce cette parité : ADR-0009
>   contrainte 2 impose le **même `runGate`**, ce que le delta préserve, et ADR-0006 § 7 ne
>   traite que du portail de merge.
> - ADR **à créer** : **ADR-0012 — preuve d'attribution de l'approbation** (patron structurant
>   nouveau : signature, registre d'approbateurs, amorçage). Candidat rédigé en phase `plan`,
>   accepté **dans la même PR** que le code qui l'incarne (`CLAUDE.md` § *Comment travailler ici*).
>   Tranché en `clarify` : l'attribution est exigée **dès ce lot**, pas reportée.
> - ADR **à créer, second** : **ADR-0013 — régime d'amorçage du mécanisme d'application**, né en
>   `plan` de la réponse à `H-04` ci-dessous. Il ne change aucun `SHALL` de ce delta : c'est un
>   régime d'**écriture** du lot, pas un comportement du portail.

> **Deux jeux de `FR-xxx` cohabitent, et un troisième ici.** Les `FR` de ce fichier sont **locaux
> à la feature 002** : ils prolongent la numérotation de `specs/001-ci-quality-gate/`
> (`FR-001`→`FR-030`) et n'ont **aucun rapport** avec les `FR-xxx` du PRD, qui vont jusqu'à
> `FR-113`. Le recouvrement est réel et silencieux — le PRD définit aussi `FR-046`, `FR-048`,
> `FR-053`, `FR-059`, `FR-064`, `FR-065` avec un sens tout autre. Toujours qualifier le jeu ; les
> seules références au PRD de ce document sont explicitement marquées « du PRD ». Même piège sur
> `SC-008`, défini des deux côtés. _(`CLAUDE.md` § *Pièges d'outillage constatés*)_

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

Constaté par lecture du code à l'ouverture du lot, et **re-constaté ligne à ligne** à la passe
corrective du 2026-08-05 — `É-02` était faux et `É-06` manquait. Ces six écarts sont dans le
périmètre.

- **É-01** — Le prédicat d'applicabilité de chaque contrôle **n'est jamais consulté** par
  l'exécution du portail ; il n'est lu que par des tests unitaires.
- **É-02** — **Sept** contrôles retournent **`passé`** sur un périmètre absent, non cinq. Aux cinq
  relevés à l'ouverture (frontières d'imports, SQL de lecture dans les applications, passage par le
  gestionnaire d'écriture, couverture d'autorisation, commentaire terminal de migration) s'ajoutent
  la **vérification de types** — aucun fichier de configuration trouvé ⇒ `passé` — et le **contrôle
  du catalogue de versions** — fichier de manifeste d'espace de travail absent ⇒ catalogue vide ⇒
  aucune cause ⇒ `passé`. Trois retournent `ignoré` (suite d'intégration, test Turnstile, mutation),
  et le onzième — mise en forme et lint — a un périmètre **jamais vide par construction** : il est
  déclaré comme « la racine existe ». Sept + trois + un = onze. Contredit ADR-0009 contrainte 5 :
  `passé` sans avoir rien vérifié.
  _(Compte corrigé sur constat de code le 2026-08-05 ; `R10` bâtit `FR-046` par-dessus le `run()`
  du catalogue, et l'ignorait.)_
- **É-03** — Le point d'entrée du portail **n'émet ni le rapport lisible ni la représentation
  machine** : il imprime une ligne de verdict. `FR-017` et `FR-018` de 001 ne sont tenues qu'en
  bibliothèque, consommées par des tests seulement.
- **É-04** — **Aucune plomberie de diff n'existe.** Le portail ne sait pas ce qu'un changement
  contient.
- **É-05** — La **suite de tests du portail ne s'exécute pas** en intégration continue. Le code
  qui refuse les diffs n'est gardé par aucun check requis.
- **É-06** — **Le portail conclut sur une racine qui n'est pas celle du dépôt.** Le script de
  lancement délègue au paquet d'outillage, si bien que la racine effective est le **répertoire de
  ce paquet** ; aucune racine n'est transmise, et chaque contrôle retombe sur le répertoire
  courant. Les objets que plusieurs contrôles visent — dossier des workflows, manifeste d'espace de
  travail, artefacts d'approbation, point de divergence — sont **hors de cette racine**, donc leur
  périmètre est vide **par accident d'invocation** et non par vérification. Conséquence vivante,
  et non hypothétique : le contrôle du catalogue lit un manifeste absent, obtient un catalogue
  vide, ne trouve aucune cause et rapporte `passé` — **`FR-013` de 001 n'a jamais lu le vrai
  catalogue**, ni en local ni en intégration continue. Sans cet écart fermé, `FR-046`, `FR-047`,
  `FR-063` et le contrôle d'approbation seraient `ignoré` à perpétuité, et l'étape de vérification
  bout-en-bout certifierait ce vide comme conforme.
  _(relevé le 2026-08-05 ; ferme par `FR-068` et `FR-069`)_

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
  **Question ouverte, à trancher en `plan` et non ici** — relevée par la gate `analyze` du
  2026-08-05 : `H-04` raisonne sur le **mécanisme**, qui ne connaît `tooling/quality-gate/` qu'à
  partir de `FR-036`. Mais la **règle**, elle, existe déjà — ADR-0006 `## Constraints` interdit à
  l'IA d'éditer le mécanisme d'application **et** les manifestes de dépendances, sans attendre que
  la liste le sache. Tout le lot édite ces chemins. Qui les écrit — l'humain, ou l'IA sous une
  dérogation datée — est une décision d'exécution, donc de `plan` ; elle ne change aucun `SHALL`
  de ce delta, et c'est pourquoi elle n'est pas posée ici comme marqueur de clarification. Elle ne doit
  pas pour autant se perdre : sans elle écrite, la chaîne d'implémentation la rejouera sans le
  savoir.
  **Tranchée en `plan` le 2026-08-05, comme prévu** : l'IA écrit le lot sous un **régime
  d'amorçage déclaré** à expiration **mécanique** — il s'éteint quand `FR-036` atteint la branche
  par défaut —, porté par le candidat ADR-0013. Rappelé ici pour que `H-04` ne se relise pas comme
  une question encore ouverte ; le régime est une décision d'**exécution** et ne change, comme
  annoncé, aucun `SHALL` de ce delta.

---

## User stories (priorisées)

### US1 — Refuser un diff qui touche ce que l'humain possède (Priorité : P1)

Un diff modifie un chemin possédé par l'humain ou un déclencheur de revue. Le portail refuse
tant qu'une approbation explicite, **signée par un approbateur enregistré**, ne désigne pas
l'état exact de ces chemins. La conclusion est tirée du contenu du changement, jamais d'une
trace d'exécution d'un garde.

- Trace vers : ADR-0006 amdt 2026-08-01 pts 3 et 5, amdt 2026-08-02 (b) ; `B-14`, `C-17e`, `C-17f`
- Scénarios d'acceptation (EARS) :
  1. **When** le diff soumis modifie un chemin protégé, the system **shall** exiger une
     approbation désignant l'état de ces chemins.
  2. **If** aucune approbation ne désigne l'état courant, **then** the system **shall** produire
     `BLOQUÉ` et sortir avec un code non-zéro.
  3. **While** une approbation désigne l'état courant, **when** le portail s'exécute, the system
     **shall** rapporter le contrôle d'approbation `passé`.
  4. **If** une approbation ne porte pas de signature vérifiable par une clé du registre
     d'approbateurs, **then** the system **shall**, en intégration continue, la traiter comme ne
     couvrant aucun chemin, sans retirer leur effet aux autres approbations.
  5. **When** le diff soumis retire une entrée de la liste des chemins déclencheurs **et**
     modifie un chemin que cette entrée couvrait, the system **shall** exiger une approbation
     malgré tout.
  6. **If** l'outil de fabrication d'une approbation s'exécute sans terminal interactif, **then**
     the system **shall** refuser de produire une approbation.

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

Le portail cesse de dire `passé` sans avoir vérifié, conclut sur la **racine du dépôt** et non sur
celle d'où on l'a lancé, émet réellement ses deux rapports, sait lire un diff, et sa propre suite
de tests s'exécute en intégration continue.

- Trace vers : ADR-0009 contraintes 4 et 5 ; `FR-017`/`FR-018`/`FR-027` de 001 ; É-01 → É-06
- Scénarios d'acceptation (EARS) :
  1. **While** le périmètre d'un contrôle est vérifié vide, **when** le portail s'exécute, the
     system **shall** rapporter ce contrôle `ignoré`.
  2. **When** le portail termine, the system **shall** émettre le rapport lisible sur la sortie
     standard depuis son point d'entrée.
  3. **If** la suite de tests du portail échoue en intégration continue, **then** the system
     **shall** faire échouer le build.
  4. **When** le portail est lancé depuis un sous-répertoire du dépôt, the system **shall**
     rapporter le même statut pour chaque contrôle que lorsqu'il est lancé depuis la racine.

### US4 — Armer aujourd'hui cinq règles qui ne mordront que demain (Priorité : P2)

Cinq règles de contenu hostile déjà closes en ADR deviennent des entrées de registre. **Chacune
porte son propre périmètre** : elle retourne `ignoré` tant qu'aucun fichier candidat n'existe, et
refuse dès le premier fichier qu'elle garde — sans qu'aucune décision reste à prendre à ce
moment-là. Un `passé` signifie alors « règle appliquée à du code pertinent », jamais « rien
trouvé dans des fichiers hors sujet ».

- Trace vers : ADR-0011 § 1/§ 4/§ 5, ADR-0004 amdt (c), ADR-0003 amdt (d) pt 8 ; `A-03`, `B-05`,
  `C-07`, `C-17b`, `D-07`
- Scénarios d'acceptation (EARS) :
  1. **While** le périmètre **propre** à l'un de ces contrôles est vérifié vide, **when** le
     portail s'exécute, the system **shall** rapporter ce contrôle `ignoré`, indépendamment des
     quatre autres.
  2. **When** le périmètre propre à un de ces contrôles contient un fichier candidat, the system
     **shall** appliquer la règle et rapporter `passé` ou `échoué`.

### US5 — Poser le maillon que l'édition d'un fichier ne peut pas défaire (Priorité : P1)

La branche par défaut est protégée sur la forge. C'est le seul maillon qu'aucune écriture dans
le dépôt ne désactive. **Il est posé depuis le 2026-08-02** — *ruleset* actif, `bypass_actors`
vide, portail en check requis, `D-09` clos —, si bien que ce lot n'en pose que la **moitié
manquante** : le second check requis, qui n'existe pas tant que la suite de tests du portail ne
tourne pas en intégration continue (`FR-033`). Le reste est un **invariant à ne pas régresser**,
re-constaté et non institué.

- Trace vers : ADR-0006 amdt 2026-08-01 pt 5 (3ᵉ maillon), amdt 2026-08-02 (b) ; `D-09`
- Scénarios d'acceptation (EARS) :
  1. The **dépôt** **shall** interdire, sur sa branche par défaut, tout push direct, tout
     force-push, toute suppression et tout contournement par un acteur.
  2. The **dépôt** **shall** exiger, pour atteindre sa branche par défaut, que la suite de tests
     du portail soit un check requis au même titre que le portail.

---

## Changements (deltas)

### [MODIFIED]

> **Mention de contexte, non modifiée — `FR-013`** *(001)*. Son SHALL est **inchangé** : elle
> vérifie toujours la provenance depuis le catalogue centralisé et le non-mélange des majeures.
> Elle est seulement **complétée** par `FR-046` (refus d'une plage), qui est une exigence
> nouvelle et non une réécriture. Rappelée ici pour que la lecture de `FR-046` ait son amont
> sous les yeux. _(ADR: 0003 amdt (d) pt 6 ; `C-17h`)_

- **FR-014** *(001)* : ~~The system shall **exécuter** tous les contrôles définis sans s'arrêter
  au premier échec.~~ → The system shall **évaluer** tous les contrôles définis sans s'arrêter
  au premier échec, et **rapporter un statut pour chacun**. Raison : `FR-031` fait qu'un contrôle
  à périmètre vérifié vide est rapporté `ignoré` **sans que son `run` soit exécuté** — ce qui
  serait une violation de la lettre de `FR-014` et n'en est pas une de l'intention. Ce que
  `FR-014` protège est l'**absence de contrôle muet** (`SC-004` de 001), non l'exécution
  inconditionnelle. _(ADR: 0006 §7 — rapport complet)_

- **FR-020** *(001)* : ~~Given un même commit et un même régime, when le portail s'exécute en
  local puis en CI, the system shall produire le même verdict agrégé.~~ → Given un même commit
  et un même régime, when le portail s'exécute en local puis en CI, the system shall produire le
  même verdict agrégé **pour tout contrôle autre que le contrôle d'approbation**. Raison :
  `FR-061` → `FR-067` — l'écart local/CI est délibéré, tranché en `clarify` le 2026-08-04, et
  **borné à ce seul contrôle**. Aucun ADR n'est amendé : ADR-0009 contrainte 2 impose que local
  et CI appellent le **même `runGate`**, ce que le delta préserve — le contexte d'exécution est
  une **entrée** de ce runner, au même titre que le diff. _(ADR: 0009 contrainte 2 ; `FR-061`)_

- **FR-017** *(001)* : ~~When le portail termine, the system shall produire un rapport
  lisible…~~ → When le portail termine, the system shall **émettre depuis son point d'entrée**,
  sur la **sortie standard**, un rapport lisible listant chaque contrôle avec son statut et, pour
  tout contrôle `échoué`, un résumé de la cause **nommant le contrôle et la règle enfreinte**.
  Raison : É-03 — l'exigence était écrite, le point d'entrée ne l'émet pas ; et « en langage
  clair » n'était pas vérifiable. _(ADR: 0006 §7 ; ADR-0009 contrainte 4)_

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
  **source de définition unique**. Raison : la re-vérification depuis le diff (`FR-044`) est un
  troisième consommateur ; la duplication réintroduirait la divergence qu'`FR-023` ferme.
  _(ADR: 0002 §4 — les `## Constraints` sont la source unique)_

### [ADDED]

#### Sémantique de périmètre et fidélité du portail *(É-01, É-02, É-03, É-05, É-06)*

- **FR-031** : While le périmètre d'un contrôle est **vérifié vide**, when le portail s'exécute,
  the system shall rapporter ce contrôle `ignoré`. _(ADR: 0009 contrainte 5)_
- **FR-032** : The system shall ne rapporter `passé` un contrôle qu'après avoir vérifié un
  périmètre **non vide** ; un périmètre vide ne produit jamais `passé`. _(ADR: 0009 contrainte 5 ;
  É-02)_
- **FR-033** : When l'intégration continue s'exécute sur un diff, the system shall exécuter la
  **suite de tests du portail** dans une étape distincte de l'exécution du portail.
  _(É-05 — écart de 001 non tenu par le code, sans dérivation ADR propre)_
- **FR-034** : If la suite de tests du portail échoue, then the system shall faire échouer le
  build. _(É-05)_
- **FR-068** : The system shall appliquer le périmètre de chaque contrôle à la **racine du
  dépôt**, quelle que soit la racine depuis laquelle le portail est invoqué. _(É-06 ; sans elle,
  un périmètre est vide par accident d'invocation et non par vérification, et `FR-031` transforme
  cet accident en `ignoré` d'apparence légitime. Tranché à la passe corrective du 2026-08-05 : la
  racine est **résolue par le système**, jamais fournie par l'appelant — une entrée obligatoire
  déplacerait la faute de l'oubli vers la mauvaise valeur, que rien dans le dépôt ne relit.)_
- **FR-069** : If la racine du dépôt ne peut pas être déterminée, then the system shall rapporter
  `échoué` tout contrôle qui en dépend — jamais `passé` ni `ignoré`. _(ADR: 0009 contrainte 5 ;
  symétrique de `FR-055` et de `FR-057`)_

#### Chemins protégés *(`C-17e`, `C-17f`)*

- **FR-035** : The system shall distinguer **deux listes** de chemins, dérivées d'une source de
  définition unique : les chemins **possédés par l'humain** — refus absolu en session — et les
  chemins **déclencheurs de revue** — approbation exigée au portail. _(ADR: 0006 §9 + amdt
  2026-08-01 pts 3 et 5 ; H-01)_
- **FR-036** : The system shall inclure dans les chemins possédés par l'humain, outre ceux de
  001, le **mécanisme d'application** — gardes de session, leur configuration **principale et
  locale**, définition des workflows d'intégration continue, portail lui-même, base de référence
  des mutants — et les **manifestes de dépendances**. _(ADR: 0006 amdt 2026-08-01 pts 4 et 5 ;
  ADR-0009 § 5 ; tranché en `clarify` pour la configuration locale, qu'aucun ADR n'énumérait)_
  **Limite écrite, propre à la configuration locale** : ce fichier n'est pas versionné (il est
  couvert par une règle d'exclusion globale), donc il n'apparaît dans **aucun** diff. Seul le
  garde de session le protège ; la re-vérification de `FR-044` ne le rattrape pas, et la
  protection de branche non plus. C'est le seul chemin de la liste couvert par un unique maillon,
  et le plus faible des trois.
- **FR-037** : The system shall inclure dans les chemins déclencheurs de revue **tous** les
  chemins possédés par l'humain, ainsi que le **registre d'approbateurs** — et rien d'autre.
  _(ADR: 0006 amdt 2026-08-01 pt 3 ; H-01)_
- **FR-065** : The system shall traiter le fichier portant la **source de définition unique** des
  deux listes de `FR-035` comme un chemin **déclencheur de revue, quel que soit son contenu** — y
  compris lorsque le diff soumis en retire une entrée. _(condition d'existence, symétrique de
  `FR-060` et fermée dans le même sens : sans elle, un diff qui retire une entrée **et** modifie
  un chemin que cette entrée couvrait se **désarme lui-même**, puisque le prédicat est évalué sur
  la liste d'après le diff. Tranché en `specify` le 2026-08-05.)_

**Limite écrite de `FR-037` — trois catégories d'ADR-0006 qui n'entrent pas.** ADR-0006 amdt
2026-08-01 pt 3 nomme aussi, comme déclencheurs, tout **seam déclaré**, tout **endpoint
d'écriture nouveau** et l'**allowlist réseau**. Aucun des trois n'entre ici, et le motif est le
même que celui des dix résiduels reportés : aucun n'a de **forme de chemin écrite** — il n'existe
ni `packages/`, ni `apps/`, ni fichier d'allowlist —, et « endpoint d'écriture **nouveau** » n'est
de surcroît pas une propriété de chemin mais du diff, qu'aucune rédaction du prédicat ne rendrait
décidable. Les inscrire produirait trois entrées que rien ne vérifie, c'est-à-dire l'apparence
d'une couverture. Elles entrent avec le code qu'elles gardent (§ *NON inclus*). **Ce que cela
coûte** : entre aujourd'hui et ce lot-là, un diff qui ajoute un appel réseau dans un fichier neuf
ne déclenche aucune approbation — il n'en déclenchait aucune non plus avant ce delta, et la
couverture des chemins possédés par l'humain, elle, est acquise.

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
  traiter comme **ne couvrant aucun chemin** et la **mentionner dans le rapport lisible**, sans
  retirer leur effet aux autres approbations. _(ADR: 0006 amdt 2026-08-01 pt 3 — la revue est une
  lecture, pas une case. Conséquence tranchée en `specify` le 2026-08-05 : « invalide » ne
  nommait aucun statut, ce qui laissait `FR-056` la rendre par ricochet fatale à tout le
  contrôle — donc à des approbations valides cumulées par `FR-062`.)_
- **FR-043** : The system shall n'exiger **aucune** approbation pour la modification de
  l'**artefact d'approbation lui-même**. _(condition d'existence : sans cette exemption, aucune
  approbation ne serait jamais accordable — même auto-référence qu'ADR-0006 amdt 2026-08-01 pt 5)_
- **FR-044** : The system shall conclure à la présence ou à l'absence d'approbation **à partir du
  diff soumis**, jamais à partir d'une trace d'exécution d'un garde en session.
  _(ADR: 0006 amdt 2026-08-01 pt 5 — « elle relit le diff » ; ferme H-02)_
- **FR-045** : If une approbation ne porte pas une **signature vérifiable par une clé publique du
  registre d'approbateurs**, then the system shall la traiter comme **ne couvrant aucun chemin**
  et la **mentionner dans le rapport lisible**, sans retirer leur effet aux autres approbations.
  _(tranché en `clarify` : la preuve d'attribution est exigée dès ce lot ; ADR-0012 à créer.
  Conséquence tranchée en `specify` le 2026-08-05, symétrique de `FR-042`.)_

**Le geste qui produit une approbation, et non seulement celui qui la juge.** `FR-042` dit ce que
vaut une approbation sans motif ; les deux exigences ci-dessous disent ce que l'outil de
fabrication a le droit de produire. Elles sont entrées au périmètre à la passe corrective du
2026-08-05 : ces deux propriétés étaient décrites comme la fermeture d'un vecteur sans qu'aucun
`SHALL` ne les porte, alors même que l'artefact qu'elles gouvernent est sur le chemin de la
vérification bout-en-bout.

- **FR-070** : If l'outil de fabrication d'une approbation s'exécute **sans terminal interactif**,
  then the system shall refuser de produire une approbation. _(sans ce refus, un agent lance la
  commande, une demande de phrase secrète surgit hors contexte, et la personne la remplit par
  réflexe ; avec, l'agent se bloque **visiblement** sur une saisie qu'il ne peut pas satisfaire)_
- **FR-071** : The system shall exiger que le **motif** d'une approbation soit **saisi par la
  personne qui approuve**, et ne jamais le pré-remplir ni le dériver du diff. _(ADR: 0006 amdt
  2026-08-01 pt 3 — « la revue est une lecture, pas une case » ; un motif rédigé par l'agent qui a
  écrit le diff est une case à cocher déguisée)_

**Frontière avec `FR-056`, à ne pas confondre.** Une approbation **invalide** est une approbation
qu'on a **lue** et qu'on écarte : le blocage vient alors des chemins restés découverts (`FR-039`),
jamais de sa présence. Un artefact **illisible** (`FR-056`) est un artefact dont on **ignore ce
qu'il contient** : là, le contrôle échoue, parce qu'on ne peut pas conclure. C'est la même
distinction qu'entre un périmètre **vérifié vide** (`FR-031`) et un périmètre **indéterminable**
(`FR-057`).

#### Attribution de l'approbation *(tranché en `clarify` — ADR-0012)*

- **FR-059** : The system shall vérifier la signature d'une approbation **hors ligne**, à partir
  du registre d'approbateurs **versionné dans le dépôt**, sans aucun appel réseau. _(ADR: 0006
  amdt 2026-08-01 pt 2 — aucun appel réseau hors d'un seam déclaré ; l'attribution reste ainsi une
  entrée du registre du portail, appliquée par le check requis lui-même, cf. H-03)_
- **FR-060** : When une modification du **registre d'approbateurs** apparaît dans le diff soumis,
  the system shall exiger une approbation signée par une clé **présente dans le registre avant ce
  diff**. _(condition d'existence : sans cette auto-référence, ajouter sa propre clé suffirait à
  signer n'importe quoi — symétrique de l'exemption `FR-043`, fermée dans l'autre sens. Amorçage :
  la première clé est posée par l'humain avant l'activation du contrôle. Le fait que le registre
  soit un chemin déclencheur relève de `FR-037` et n'est plus répété ici.)_
- **FR-061** : While le portail s'exécute **hors intégration continue**, the system shall vérifier
  que les chemins déclencheurs modifiés sont couverts par une approbation **sans exiger sa
  signature**. _(tranché en `clarify` : écart local/CI **délibéré et écrit**, pour ne pas imposer la
  saisie de la phrase secrète à chaque itération locale.)_
- **FR-072** : While le portail s'exécute **hors intégration continue**, the system shall qualifier
  le résultat du contrôle d'approbation de **« couvert »**, et **jamais d'« approuvé »**, dans le
  rapport lisible. _(scindé de `FR-061` à la passe corrective du 2026-08-05 — atomicité, même motif
  que `FR-066`/`FR-067`. Sans ce libellé, un vert local se lit comme la garantie que seule
  l'intégration continue apporte.)_
- **FR-066** : While le portail s'exécute **en intégration continue**, the system shall exiger la
  signature de toute approbation. _(scindé de `FR-061` en `specify` — atomicité)_
- **FR-067** : If le **contexte d'exécution** ne peut pas être déterminé, then the system shall
  exiger la signature. _(scindé de `FR-061` en `specify` — atomicité. Lecture fail-closed d'`I-03` :
  on ne relâche jamais sur une indétermination.)_
- **FR-062** : The system shall considérer un chemin déclencheur modifié comme couvert dès qu'**au
  moins une** approbation valide le désigne ; plusieurs approbations se **cumulent**, et la
  présence de l'une n'invalide aucune autre. _(tranché en `clarify` : permet d'approuver un diff
  par tranches successives)_

#### Détermination du diff soumis *(tranché en `clarify`)*

- **FR-063** : The system shall constituer le **diff soumis** à partir du **point de divergence
  entre la révision examinée et la branche par défaut** — l'ensemble des changements accumulés
  depuis leur ancêtre commun. _(donne la même réponse en local et en intégration continue, et rend
  la barrière insensible au découpage en commits : un chemin déclencheur touché tôt dans la branche
  reste vu, et pousser un commit de plus ne dilue aucune approbation. Condition de mesurabilité de
  `SC-008` et `FR-040`.)_

#### Catalogue de versions et installation *(`C-17h`)*

- **FR-046** : If une entrée du catalogue centralisé de versions n'est pas une **version exacte** —
  forme énumérée, pré-release comprise —, qu'il s'agisse d'une plage ou d'une forme non reconnue,
  then the system shall rapporter `échoué`. _(ADR: 0003 amdt (d) pt 6 ; liste fermée tranchée en
  `clarify` — fail-closed, cohérent avec ADR-0009 contrainte 5 : une forme que le contrôle ne sait
  pas juger n'est jamais acceptée par défaut. **Reformulée en un seul `SHALL`** à la passe
  corrective du 2026-08-05 : la rédaction précédente énonçait la règle deux fois, en ubiquitous puis
  en `If … then`.)_
- **FR-047** : If **une** étape d'installation de dépendances, dans **n'importe quel** workflow
  d'intégration continue du dépôt, n'impose pas la conformité du fichier de verrouillage, then the
  system shall rapporter `échoué`. _(ADR: 0003 amdt (d) pt 6 ; H-03 — l'exigence existait en test,
  jamais en contrôle. Portée à tous les workflows tranchée en `clarify` : le workflow planifié
  porte la mutation et la veille CVE, une installation non verrouillée l'y ferait tourner sur un
  arbre de dépendances différent de celui du merge ; et un workflow ajouté plus tard est couvert
  sans qu'on ait à l'inscrire.)_

#### Cinq contrôles dormants *(règle close en ADR, périmètre vide aujourd'hui)*

Chacun hérite de `FR-031` : `ignoré` tant que son périmètre est vérifié vide.

- **FR-064** : The system shall doter **chacun** de ces contrôles d'un périmètre **qui lui est
  propre**, déclaré par son entrée de registre, et évaluer son vide indépendamment des autres.
  _(tranché en `clarify` : un périmètre produit commun rendrait `passé` quatre contrôles sur cinq
  au premier commit de produit sans qu'aucun ait appliqué sa règle — le défaut d'`É-02` reproduit
  un cran plus bas. Voir la limite écrite ci-dessous.)_

**Limite écrite du périmètre propre — le faux dormant.** Un périmètre propre est défini par un
motif, et un motif peut manquer un fichier qu'il devait reconnaître : du code d'embed vidéo écrit
hors du motif de `FR-052` laisse la ligne à `ignoré`, c'est-à-dire que **le portail affirme qu'il
n'y a rien à garder alors qu'il y a**. Un `ignoré` faux est indistinguable d'un `ignoré` vrai. La
contrepartie est acceptée en connaissance de cause : elle achète des lignes de rapport qui veulent
dire quelque chose, là où le périmètre commun achetait l'absence d'angle mort au prix de quatre
verts vides. Le mécanisme de rattrapage n'est pas le portail mais la **re-passe d'audit (L11)**,
qui se déclenche sur « du code de production existe » — soit exactement le moment où ces cinq
périmètres cessent d'être vides.

- **FR-048** : If un fichier de rendu emploie la **directive d'insertion de balisage brut** du
  moteur — celle qui court-circuite l'échappement natif —, ou si une sortie du renderer porte une
  **chaîne de balisage** au lieu d'un arbre de blocs typés, then the system shall rapporter
  `échoué`. _(ADR: 0004 `## Constraints` — « INTERDIT qu'une sortie du renderer porte une chaîne de
  balisage, et INTERDIT au contrat de gabarit d'exiger [la directive] » ; ADR-0011 § 4 ; ADR-0008
  (règle de lint livrée au client, même forme refusée) ; `A-03`. **Réduit en `specify` le
  2026-08-05** : la rédaction d'origine refusait « le rendu hors du **contexte déclaré par le
  descripteur** », c'est-à-dire qu'elle exigeait `C-17a`, que le § *NON inclus* reporte nommément.
  **Forme refusée nommée** à la passe corrective du 2026-08-05 : sans elle, la règle n'était pas
  décidable avant l'écriture de sa fixture — seul des cinq dormants dans ce cas. Le nom exact de la
  directive appartient au plan, comme pour les quatre autres.)_
- **FR-049** : If le type d'image **vectorielle scriptable** apparaît dans une liste de types de
  téléversement acceptés, then the system shall rapporter `échoué`. _(ADR: 0011 § 5 ; `C-07`)_
- **FR-050** : If une cible de lien externe est validée autrement que par une **énumération fermée
  des schémas d'adresse** `http` et `https`, then the system shall rapporter `échoué`.
  _(ADR: 0004 amdt (c) ; ADR-0011 § 4 ; `C-17b`)_
- **FR-051** : If un littéral de requête de base de données contient une **substitution de
  chaîne**, then the system shall rapporter `échoué`. _(ADR: 0004 amdt (c) — requête paramétrée,
  jamais d'interpolation ; `B-05`)_
- **FR-052** : If une URL d'embed vidéo n'est pas construite en **mode à confidentialité
  renforcée**, then the system shall rapporter `échoué`. _(ADR: 0003 amdt (d) pt 8 ; `D-07`
  versant mécanique)_

#### Protection de la branche par défaut *(`D-09`, 3ᵉ maillon)*

- **FR-053** : The **dépôt** shall interdire, sur sa branche par défaut, tout **push direct**,
  tout **force-push**, toute **suppression** et tout **contournement par un acteur**.
  _(ADR: 0006 amdt 2026-08-02 (b). **Déjà tenue depuis le 2026-08-02** — *ruleset* « Main
  protect » actif, `bypass_actors` vide, `D-09` clos ; c'est donc un **invariant de
  non-régression à re-constater**, non une exigence à instituer. « Toute suppression » est
  ajoutée en `specify` : ADR-0006 amdt (b) l'exige et la rédaction précédente l'omettait.)_
- **FR-054** : The **dépôt** shall exiger, pour atteindre sa branche par défaut, une **pull
  request** dont le **portail** et la **suite de tests du portail** sont des checks requis.
  _(ADR: 0006 amdt 2026-08-02 (b) ; `FR-033`)_

### [REMOVED]

Aucun comportement de 001 n'est retiré. Les six écarts É-01 → É-06 sont des exigences de 001
**non tenues par le code**, non des exigences abandonnées : ce delta les honore — `É-06` est même
celui qui rend `FR-013` de 001 réellement vérifiée pour la première fois. `FR-014` et `FR-020` sont
**restreintes**, non retirées : elles figurent en `[MODIFIED]` avec la portée exacte de leur
restriction, et leur intention reste vérifiée — l'absence de contrôle muet par `SC-004` de 001 pour
`FR-014`, la parité de verdict sur tout autre contrôle que l'approbation par **`SC-023`** de ce
delta pour `FR-020`. _(Renvoi corrigé à la passe corrective du 2026-08-05 : la rédaction précédente
citait « `SC-015` », qui mesure au contraire l'**écart** local/CI, et « `SC-004` de 001 » sans dire
laquelle des deux restrictions il couvrait. `FR-020` restreinte n'avait alors **aucun** critère de
succès.)_

---

## Cas limites & comportements indésirables

- **FR-055** : If le diff soumis au portail **ne peut pas être déterminé**, then the system shall
  rapporter `échoué` tout contrôle qui en dépend — jamais `passé` ni `ignoré`. _(ADR: 0009
  contrainte 5 ; symétrique de `FR-029` de 001 : absence ≠ ensemble vide)_
- **FR-056** : If l'artefact d'approbation est **présent mais illisible**, then the system shall
  rapporter le contrôle d'approbation `échoué`. _(fail-closed ; symétrique de `FR-029` de 001)_
- **FR-057** : If un contrôle **ne peut pas déterminer** si son périmètre est vide, then the
  system shall le rapporter `échoué`. _(ADR: 0009 contrainte 5 — `ignoré` réservé à un périmètre
  **vérifié** vide)_
- **FR-058** : If une approbation désigne un état de chemins protégés qui **n'apparaît pas** dans
  le diff soumis, then the system shall la traiter comme **inerte** — sans erreur, sans refus,
  sans acceptation — **et la mentionner dans le rapport lisible** comme approbation non résoluble.
  _(hygiène : sans l'inertie, une approbation résiduelle ferait échouer des diffs sans rapport ;
  sans la mention, le nettoyage resterait invisible. Tranché en `clarify`.)_

Les deux questions frontières que cette section listait pour `clarify` sont tranchées : plusieurs
approbations **se cumulent**, une par chemin suffit (`FR-062`) ; une approbation dont l'état
approuvé n'est pas résoluble est **inerte et signalée** (`FR-058`).

---

## Contrats d'entrée/sortie

**Entrées du portail** — inchangées de 001, plus :

| Entrée | Nature | Absente ⇒ |
|---|---|---|
| **Racine du dépôt** | **résolue par le système**, jamais fournie par l'appelant (`FR-068`) — c'est le sol sur lequel tous les périmètres ci-dessous se mesurent | **indéterminable** ⇒ `échoué` pour tout contrôle qui en dépend (`FR-069`) |
| Régime | `par-changement` (défaut) ou `planifie` | défaut |
| **Diff soumis** | chemins modifiés et contenu résultant, **depuis le point de divergence avec la branche par défaut** (`FR-063`) | `échoué` (`FR-055`) |
| **Approbations** | désignation d'un état de chemins protégés + motif non vide + **signature** | `échoué` si un chemin déclencheur est modifié (`FR-039`) |
| **Registre d'approbateurs** | clés publiques versionnées dans le dépôt (`FR-059`, `FR-060`) | `échoué` (absence ≠ registre vide, symétrique de `FR-029` de 001) |
| **Contexte d'exécution** | local ou intégration continue — décide si la signature est exigée (`FR-061`, `FR-066`) | signature **exigée** (lecture fail-closed d'`I-03` : on ne relâche jamais sur une indétermination) |

**Sorties du portail** — deux vues dérivées d'un **résultat agrégé unique**, jamais mélangées :

| Vue | Destination | Contenu |
|---|---|---|
| Rapport lisible *(défaut)* | sortie standard | statut de chaque contrôle ; cause nommant le contrôle et la règle enfreinte pour chaque `échoué` ; approbations inertes et écartées nommément (`FR-058`, `FR-042`, `FR-045`) ; hors intégration continue, le contrôle d'approbation qualifié **« couvert »** et jamais « approuvé » (`FR-072`) |
| Représentation machine *(sur demande explicite)* | sortie standard, **à la place** du rapport lisible | statut de chaque contrôle, verdict agrégé, nombre d'échecs |
| Code de sortie | — | `0` si `TOUT VERT`, non-zéro si `BLOQUÉ` |

**Statuts** — `passé` | `échoué` | `ignoré`. Invariants : tout périmètre est mesuré **depuis la
racine du dépôt** (`FR-068`) ; `ignoré` ⇒ périmètre **vérifié** vide (`FR-031`) ; `passé` ⇒
périmètre non vide **et** vérifié (`FR-032`) ; toute impossibilité de conclure ⇒ `échoué`
(`FR-055`, `FR-056`, `FR-057`, `FR-069`).

**Étapes d'intégration continue** — installation à verrouillage imposé, puis **suite de tests du
portail** (`FR-033`), puis **portail en régime par-changement**. Les deux dernières sont des
checks requis (`FR-054`).

---

## Ce que l'approbation ne prouve pas

*Écrit dans le corps, à côté des `SHALL` qu'il affaiblit, plutôt qu'en note de bas de page —
même geste que le lot L8 pour la règle de lint livrée au projet client.*

**Ce qu'elle prouve, depuis `clarify`.** L'approbation n'atteste plus seulement qu'un état a été
approuvé : `FR-045` exige une signature vérifiable par une clé du registre. La propriété visée est
précise — *le seul accès en écriture au dépôt ne suffit pas à produire une approbation valide*. Un
agent qui écrit le dépôt peut rédiger l'entrée d'approbation ; il ne peut pas la signer, parce que
la phrase secrète de la clé ne vit pas dans le dépôt. `FR-060` ferme la sortie évidente : ajouter sa
propre clé au registre exige déjà une approbation signée par une clé préexistante.

**Ce qu'elle ne prouve toujours pas.** La clé est **logicielle** — aucun jeton matériel à présence
physique n'est disponible — et son fichier, protégé par une **phrase secrète**, vit sur le poste
de la personne qui lance l'agent. Trois résiduels en découlent, et aucun n'est détectable depuis
le dépôt :

- **Une clé déverrouillée dans un agent de clés du système annule la barrière, silencieusement.**
  Un tel agent est joignable par tout processus de l'utilisateur, l'agent d'IA compris : une clé
  déverrouillée par commodité devient signable sans phrase secrète, et rien dans le dépôt ne le
  voit. L'état à préserver — **aucune clé d'approbation déverrouillée** — est une **discipline
  d'exploitation**, pas un mécanisme.
- **Le fichier de clé reste lisible** par tout processus de l'utilisateur, donc exfiltrable pour
  une attaque hors ligne sur sa phrase secrète. C'est une escalade au-delà de « l'agent écrit le
  dépôt », pas au-delà de « l'agent exécute des commandes sous cette identité ».
- **En local, la signature n'est pas exigée** (`FR-061` / `FR-066`, écart délibéré). La barrière
  est en intégration continue ; le vert local dit « couvert », jamais « approuvé ».

**En conséquence, la frontière s'est déplacée sans disparaître.** Avant `clarify`, la barrière ne
valait pas contre une IA qui évade, faute d'attribution. Après, elle vaut contre une IA qui écrit
le dépôt, et **cesse de valoir contre une IA qui atteint les identifiants du poste** — ce qui est
le même adversaire que celui qui atteint le jeton de la forge. C'est le meilleur point atteignable
avec des clés logicielles ; un jeton matériel à présence physique le déplacerait d'un cran de plus,
et cette option reste ouverte sans changer un seul `SHALL` (seule la nature de la clé du registre
changerait).

Résiduel hérité, rappelé : l'approbateur est aujourd'hui la personne qui lance l'agent, donc un
adversaire faible ; la revue ne vaut pas contre une intention humaine.

---

## NON inclus (frontière de périmètre)

Les exclusions de 001 restent valides. S'y ajoutent, chacune avec son motif :

- **Dix des dix-huit lignes de résiduels du tableau de suivi** — `A-02` (schémas de valeur de
  zone), `B-01` (motif de route unique), `B-08` (bornes d'entrée), `B-09` (compteur de débit),
  `B-14` versant *appel réseau hors seam* et allowlist, `C-03` (garde-fou de réconciliation),
  `C-08` (zone vidéo), `C-11` (`failure_reason` borné), `C-15` (forme de la route publique),
  `C-17a` (contexte de rendu déclaré). **Motif** : chacun exige de **définir d'abord l'objet que
  la règle garde** — qu'est-ce qu'un endpoint d'écriture, un schéma de valeur de zone, une boucle
  de réconciliation, une zone vidéo — et c'est cette définition-là que le mode delta interdit
  d'inventer sur du code qui n'existe pas. Ils s'écriront avec le code qu'ils gardent — **à la
  main**, cf. H-04.

  **Ce qui distingue ces dix des cinq dormants retenus** (`FR-048` → `FR-052`), et pourquoi le
  même motif ne les emporte pas : les cinq refusent une **forme lexicale close, déjà énoncée par
  un ADR accepté** — un type d'image nommé, une énumération de schémas d'adresse, une substitution
  dans un littéral de requête, un hôte d'embed, une insertion de balisage brut. Aucune convention
  de nommage n'est à inventer pour écrire la **règle** ; seul leur **périmètre** est heuristique,
  et c'est très exactement la limite du *faux dormant* écrite plus haut. Les dix, eux, ont le
  défaut à l'étage au-dessus : leur règle elle-même est indécidable tant que l'objet n'est pas
  défini. _(distinction tranchée en `specify` le 2026-08-05 — le motif d'origine se lisait comme
  s'appliquant aux deux groupes.)_

- **Trois des quatre catégories de déclencheurs d'ADR-0006 amdt 2026-08-01 pt 3** — tout **seam
  déclaré**, tout **endpoint d'écriture nouveau**, l'**allowlist réseau**. **Motif** : aucun n'a
  de forme de chemin écrite (ni `packages/`, ni `apps/`, ni fichier d'allowlist n'existent), et
  « nouveau » qualifie un diff, pas un chemin. Les inscrire dans `FR-037` produirait trois entrées
  qu'aucune vérification ne peut couvrir. Voir la limite écrite sous `FR-037`.
- **Le portage du contexte de rendu dans le descripteur du contrat de gabarit** (`C-17a`).
  **Motif** : ADR-0004 a consommé son amendement daté au lot L3 ; ce portage ouvrirait un
  amendement (d). Décision d'architecture, pas de mécanisation.
- **La rédaction de la mention d'information** (`D-07` versant produit, `FR-105` → `FR-109` du
  PRD). **Motif** : c'est un écrit juridique validé par la cliente, et la question ouverte RGPD du
  PRD. Seul le versant mécanique de `D-07` entre ici (`FR-052`).
- ~~**La preuve d'attribution de l'approbation.**~~ → **entrée dans le périmètre en `clarify`.**
  Elle ouvre bien un ADR (ADR-0012), rédigé en phase `plan` et accepté dans la même PR. Voir
  `FR-045`, `FR-059` → `FR-062` et le § *Ce que l'approbation ne prouve pas*.
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

## Clarifications tranchées (2026-08-04)

Onze points — trois marqueurs explicites et huit zones sous-spécifiées relevées à la gate. Aucun
marqueur ne subsiste.

| Point | Décision | Répercuté dans |
|---|---|---|
| Attribution de l'approbation | Preuve **exigée dès ce lot** ; signature par **clé logicielle à phrase secrète, jamais laissée déverrouillée dans un agent de clés** ; vérification **hors ligne** depuis un registre versionné | `FR-045`, `FR-059`, § *Ce que l'approbation ne prouve pas*, ADR-0012 |
| Registre d'approbateurs | Dans le dépôt, chemin déclencheur, **auto-référence fermée** : une modification exige une approbation signée par une clé préexistante ; amorçage humain | `FR-060` |
| Configuration locale des gardes | **Oui**, chemin possédé par l'humain — avec sa limite écrite : jamais dans un diff, donc un seul maillon | `FR-036` |
| Approbations multiples | **Cumul** : une approbation valide par chemin suffit, aucune n'invalide les autres | `FR-062` |
| Approbation non résoluble | **Inerte et signalée** au rapport | `FR-058` |
| Base du diff soumis | **Point de divergence avec la branche par défaut** | `FR-063`, contrats d'E/S |
| Périmètre des cinq dormants | **Propre à chaque contrôle**, avec la limite du faux dormant écrite | `FR-064`, US4 |
| Approbation en local | Couverture vérifiée en local, **signature exigée en intégration continue seulement** — écart délibéré | `FR-061` |
| Contexte d'exécution indéterminable | Signature **exigée** (lecture fail-closed d'`I-03`) | contrats d'E/S |
| Forme refusée dans le catalogue | **Liste fermée** : seule une version exacte passe, toute autre forme échoue | `FR-046` |
| Portée du verrouillage en CI | **Toute** étape d'installation de **tout** workflow | `FR-047` |

Deux renvois erronés ont été corrigés au passage, sans changer aucun ID : `FR-013` renvoyait à
`FR-045` pour le refus d'une plage (c'est `FR-046`), et `FR-023` renvoyait à `FR-043` pour la
re-vérification depuis le diff (c'est `FR-044`).

---

## Arbitrages de la passe corrective (2026-08-05)

Cinq points tranchés en `specify` après la gate `analyze` du 2026-08-05, qui a rendu
**CORRIGER D'ABORD**. Ils ne rouvrent aucune décision de `clarify` : ils ferment des trous que la
gate a nommés.

| Point | Décision | Répercuté dans |
|---|---|---|
| Parité de verdict local/CI (`FR-020` de 001) | **Restreinte et déclarée `[MODIFIED]`** : elle vaut pour tout contrôle **sauf** l'approbation. Aucun ADR amendé — ADR-0009 contrainte 2 porte sur le **même `runGate`**, pas sur le verdict | `[MODIFIED]` `FR-020`, entête de traçabilité |
| Auto-désarmement de la liste des chemins | Le fichier portant la **source de définition unique** est déclencheur **inconditionnel**, quel que soit son contenu — un retrait d'entrée exige donc lui-même une approbation | `FR-065`, `SC-020`, US1 scénario 5 |
| `FR-048` contre le report de `C-17a` | **`FR-048` réduite au versant `A-03`** — insertion de balisage brut, décidable sans descripteur. `C-17a` reste reporté, motif intact | `FR-048`, § *NON inclus* |
| Trois catégories de déclencheurs d'ADR-0006 pt 3 | **Hors périmètre**, avec la limite écrite à côté du `SHALL` qu'elle affaiblit : aucune forme de chemin écrite, et « endpoint **nouveau** » n'est pas une propriété de chemin | `FR-037` + sa limite, § *NON inclus* |
| Conséquence d'une approbation **invalide** | **Écartée** — elle ne couvre aucun chemin et est nommée au rapport —, **sans retirer leur effet aux autres**. Distincte d'un artefact **illisible** (`FR-056`), qui fait échouer le contrôle | `FR-042`, `FR-045` + frontière écrite, `SC-022` |

Corrections de forme appliquées au passage, sans arbitrage : `FR-013` sortie de `[MODIFIED]` (son
SHALL est inchangé) · `FR-014` de 001 ajoutée à `[MODIFIED]` (« exécuter » → « évaluer », que
`FR-031` impose) · `FR-017` perd « en langage clair », adjectif non vérifiable, au profit de
« nommant le contrôle et la règle enfreinte » · `FR-060` et `FR-061` scindées pour l'atomicité
(`FR-066`, `FR-067`) · `FR-048` → `FR-052` réécrites en forme EARS `If … then …` · `FR-053`
complétée de « toute suppression », qu'ADR-0006 amdt (b) exige · douze renvois à ADR-0009 corrigés
(le fail-closed et `ignoré` sont la **contrainte 5**, les deux vues dérivées du même `GateResult`
la **contrainte 4**) · le § *Ce que l'approbation ne prouve pas* reformulé sans nommer de
technologie de clé, qui appartient au plan et à ADR-0012 · un critère de succès propre à
l'extension des chemins protégés (`SC-021`), qui n'en avait aucun.

---

## Arbitrages de la seconde passe corrective (2026-08-05)

Trois points tranchés en `specify` après la gate `analyze` du 2026-08-05 (verdict **CORRIGER
D'ABORD** — 5 Critical · 16 Major · 12 Minor), qui portait sur le contrat *et* sur le découpage.
Seuls les findings relevant de cette phase sont traités ici ; le découpage relève de `tasks`, et
les formes lexicales des quatre autres dormants, du plan.

| Point | Décision | Répercuté dans |
|---|---|---|
| Racine d'exécution du portail — absente du contrat, alors que le lancement délègue au paquet d'outillage | **Résolue par le système**, jamais fournie par l'appelant ; indéterminable ⇒ `échoué` | `É-06`, `FR-068`, `FR-069`, `SC-025`, contrats d'E/S, US3 scénario 4 |
| `FR-048` — seul dormant dont la règle n'était pas décidable avant sa fixture | **Forme refusée nommée** : directive d'insertion de balisage brut du moteur, et sortie du renderer portant une chaîne de balisage. Le nom exact reste au plan, comme pour les quatre autres | `FR-048` |
| Outil de fabrication d'approbation — deux propriétés de sécurité sans `SHALL`, sur le chemin de la vérification | **Deux `FR`** : refus hors terminal interactif, motif saisi par la personne qui approuve | `FR-070`, `FR-071`, `SC-024`, US1 scénario 6 |

Corrections appliquées au passage, sans arbitrage : `É-02` **recompté sur constat de code** — sept
contrôles rendent `passé` à périmètre absent (dont la vérification de types et le catalogue de
versions), trois rendent `ignoré`, et le onzième a un périmètre jamais vide par construction ·
`FR-061` scindée (`FR-072` porte le libellé « couvert ») et `FR-046` reformulée en un seul `SHALL`,
pour l'atomicité · renvoi cassé du § `[REMOVED]` corrigé, et `SC-023` créé pour mesurer la parité
restreinte de `FR-020`, qui n'avait aucun critère de succès · fuite de solution retirée de `SC-021`
· avertissement sur la cohabitation des trois jeux de `FR-xxx` ajouté en tête · `H-04` rappelée
comme tranchée en `plan` · `DELTA.md` remis à jour (allowlist réseau retirée de ce que la feature
ajoute, ADR-0013 inscrit, compte d'`É-02` corrigé).

**Ce que cette passe ne traite pas, et où cela vit.** Les huit findings de découpage — `R5`
horizontal, graphe de dépendances d'ADR-0013, frontière `R6`/`R7`, doubles sujets de `R7`/`R8`/`R9`,
`R14`/`R17` sans incrément, `R16` sans chemin de retour, budget de `R1` — relèvent de `tasks`. Les
formes lexicales refusées par `FR-049` → `FR-052`, la section finale périmée du plan et le statut
d'ADR-0013 vis-à-vis d'ADR-0006 et de `CLAUDE.md` relèvent de `plan`. Aucun n'est fermé ici.

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
  leur périmètre est vérifié vide. _(FR-031, FR-032 ; É-02 ; ADR-0009 contrainte 5)_
- **SC-011** : Le rapport lisible et la représentation machine sont **tous deux émis par le point
  d'entrée** et portent des statuts identiques pour un même contrôle. _(FR-017, FR-018 modifiées ;
  `FR-028` de 001 ; É-03)_
- **SC-012** : Une entrée du catalogue exprimée en plage **ou sous une forme que le contrôle ne
  reconnaît pas**, et une étape d'installation sans verrouillage imposé **dans n'importe lequel
  des workflows**, produisent chacune `BLOQUÉ`. _(FR-046, FR-047 ; `C-17h`)_
- **SC-013** : Chacun des cinq contrôles dormants rapporte `ignoré` sur le dépôt en l'état, et
  `échoué` sur un fichier candidat portant la violation — **chacun sur son propre périmètre** :
  l'activation de l'un ne change le statut d'aucun autre. _(FR-048 → FR-052, FR-064)_
- **SC-014** : Un push direct sur la branche par défaut est refusé par la forge, et une pull
  request dont le portail échoue ne peut pas être fusionnée. _(FR-053, FR-054 ; `D-09`)_
- **SC-015** : Une approbation **non signée**, ou signée par une clé absente du registre, produit
  `BLOQUÉ` en intégration continue ; le **même diff** exécuté localement rapporte le contrôle
  d'approbation sur la seule couverture des chemins, **qualifiée « couvert » et non « approuvé »**.
  _(FR-045, FR-061, FR-066 — les deux moitiés de l'écart délibéré dans la même mesure)_
- **SC-016** : Un diff qui ajoute une clé au registre d'approbateurs **et** s'approuve avec cette
  clé produit `BLOQUÉ` ; le même ajout approuvé par une clé **déjà présente avant le diff** produit
  `TOUT VERT`. _(FR-060 — la mesure qui prouve que l'auto-référence est fermée)_
- **SC-017** : Deux approbations couvrant chacune un chemin déclencheur distinct du même diff
  produisent `TOUT VERT` ; aucune des deux n'invalide l'autre. _(FR-062)_
- **SC-018** : Un chemin déclencheur modifié dans un commit **antérieur** de la branche, non
  retouché depuis, exige toujours une approbation — pousser un commit sans rapport ne le fait pas
  sortir du diff. _(FR-063 ; ferme le contournement par découpage de commits)_
- **SC-019** : Une approbation dont l'état approuvé n'apparaît pas dans le diff n'empêche aucun
  verdict et **apparaît nommément** dans le rapport lisible. _(FR-058)_
- **SC-020** : Un diff qui **retire une entrée** de la liste des chemins déclencheurs **et**
  modifie un chemin que cette entrée couvrait produit `BLOQUÉ` en l'absence d'approbation.
  _(FR-065 — la mesure qui prouve que la barrière ne se désarme pas par le fichier qui la définit ;
  symétrique de `SC-016` pour le registre d'approbateurs)_
- **SC-021** : Tout chemin possédé par l'humain est déclencheur de revue, la réciproque est fausse
  pour au moins le registre d'approbateurs, et **l'artefact d'approbation lui-même** n'est
  déclencheur pour aucune des deux listes (`FR-043`) — les trois constats étant tirés de la **même**
  source de définition, consommée par
  le garde de session, le contrôle du portail et la re-vérification depuis le diff. _(FR-035,
  FR-036, FR-037, FR-023 ; I-09 — l'extension des chemins protégés n'avait aucun critère de succès
  propre)_
- **SC-022** : Un diff dont **tous** les chemins déclencheurs sont couverts par des approbations
  valides produit `TOUT VERT` **même en présence d'une approbation invalide** (motif vide ou
  signature non vérifiable) ; l'invalide **apparaît nommément** dans le rapport lisible.
  _(FR-042, FR-045, FR-062 — la mesure qui prouve qu'une approbation écartée n'annule pas les
  autres, et qu'« invalide » n'est pas « illisible » au sens de `FR-056`)_
- **SC-023** : Pour un même commit et un même régime, le portail exécuté en local puis en
  intégration continue produit le **même verdict agrégé pour tout contrôle autre que celui
  d'approbation**. _(FR-020 restreinte — la mesure qui manquait : la restriction était écrite,
  l'intention préservée n'était mesurée par aucun `SC`)_
- **SC-024** : L'outil de fabrication d'une approbation invoqué **sans terminal interactif** ne
  produit **aucun** artefact ; invoqué avec, il refuse un motif vide et produit un artefact que le
  contrôle d'approbation accepte. _(FR-070, FR-071 — les deux moitiés du geste humain dans la même
  mesure ; verrouille aussi que l'outil ne produit rien que le contrôle refuserait)_
- **SC-025** : Le portail invoqué **depuis un sous-répertoire** du dépôt et depuis sa **racine**
  rapporte le même statut pour chaque contrôle ; en particulier, le contrôle du catalogue de
  versions lit le catalogue **réel** du dépôt dans les deux cas. _(FR-068, FR-069 ; É-06 — la mesure
  qui prouve que le vide d'un périmètre est vérifié et non subi. La seconde moitié est un
  constat de non-régression sur `FR-013` de 001, jamais tenue jusqu'ici.)_

---

## Vérification

**Non-régression sur les invariants** — I-01 → I-09 restent vrais après le delta. Le point de
vigilance est I-09 : trois consommateurs de la source unique des chemins au lieu de deux
(garde de session, contrôle du portail, re-vérification depuis le diff).

**Nouveaux `SHALL`** — chacun de `FR-031` → `FR-072` appelle une vérification observable nommée.
La forme de chaque vérification (test, contrôle, preuve inhérente) se décide en phase `tasks` ;
cinq cas sont déjà contraints :

- `FR-053` et `FR-054` portent sur une configuration **hors du dépôt** : leur vérification est un
  **relevé d'état consigné**, pas un test — le portail ne peut pas lire la forge, et l'y faire lire
  exigerait un appel réseau, donc un seam, c'est-à-dire l'inverse de ce qu'ADR-0006 pt 2 vient de
  fermer. `FR-053` est en outre **déjà tenue** : son relevé est une **non-régression**, et le seul
  geste dû par ce lot est `FR-054`.
- H-03 impose que tout contrôle résiduel soit une **entrée du registre**, jamais un test : un test
  du portail n'est appliqué par aucun check requis. `FR-047` en particulier remplace une
  vérification qui n'existe aujourd'hui qu'en test.
- L'attribution (`FR-045`, `FR-059`) se vérifie **hors ligne**, sans appel réseau : elle est donc
  une **entrée du registre appliquée par le check requis** — contrairement à `FR-053`/`FR-054`.
  C'est ce qui la distingue d'un réglage de forge, qu'aucun check ne relit.
- `FR-068` et `FR-069` ne se vérifient pas par une assertion unitaire sur une fonction : `SC-025`
  exige **deux exécutions du portail depuis deux racines différentes**, comparées. Une assertion
  sur la valeur retournée par une résolution de racine prouverait la résolution, jamais que les
  onze contrôles la consomment — or c'est précisément ce que `É-06` a laissé passer.
- `FR-070` et `FR-071` portent sur l'**outil de fabrication**, pas sur un contrôle du portail : leur
  vérification observe ce que l'outil produit ou refuse de produire, et non un statut de contrôle.
  Elle est néanmoins due au même titre — c'est un artefact du chemin de vérification bout-en-bout.

**Contrainte d'ordre, à honorer en `tasks`** — l'extension des chemins protégés (`FR-036`) est le
**dernier** changement du lot. Elle rend le portail possédé par l'humain (H-04) et, l'appliquant
à lui-même, bloquerait tout geste ultérieur de l'IA sur le lot en cours. Doivent donc exister
**avant ou dans la même tranche** : l'artefact d'approbation et son exemption (`FR-043`), **le
registre d'approbateurs amorcé d'au moins une clé** (`FR-060`) et **la clé de signature
correspondante**. Sans eux, la première approbation exigée par le lot lui-même serait
inaccordable — l'auto-référence d'ADR-0006 amdt 2026-08-01 pt 5, rencontrée deux fois : sur la
liste, et sur ce qui la débloque.
