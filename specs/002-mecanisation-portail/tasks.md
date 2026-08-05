# Tâches : mécanisation du portail (lot L10)
Trace vers : [`plan.md`](./plan.md) (fichiers) · [`spec.md`](./spec.md) (FR/SC/SHALL) · [`DELTA.md`](./DELTA.md) ·
`docs/adr/` (0006 amdt 2026-08-01 pts 2-5 et amdt 2026-08-02 (b), 0009 contraintes 2/4/5, 0003 amdt (d) pts 6 et 8,
0011 § 1/§ 4/§ 5, 0004 amdt (c), 0002 § 3) · candidats `_candidates/0012-draft.md` et `_candidates/0013-draft.md`

## Légende
- [ ] à faire · [x] fait · [P] parallélisable (aucune dépendance croisée — fichiers disjoints)
- `Rn` = lot de review : une vertical slice, unité de livraison recommandée (≈ une PR reviewable d'un bloc)
- `Tn` = tâche : un critère observable = un commit = une vérification au vert
- _vérif : `<mode>`_ = mode de vérification du lot — `TDD` (défaut) · `test-after` · `check` · `inhérent`
- _Requirements:_ backref vers les FR/SC couverts (style Kiro)
- Les budgets en lignes sont des **ordres de grandeur** dérivés des « Fichiers touchés » du plan, destinés à déclencher la scission — **pas des mesures** (ce niveau ne lit pas le code).

---

> **Note de découpage — mode delta.** Ce plan de tâches modifie `tooling/quality-gate/` livré par
> 001 ; il ne le réécrit pas. Aucun code de produit (`packages/`, `apps/`) n'est créé.
>
> **Note de régime d'écriture — condition d'exécution de tout le lot.** 31 des 35 fichiers touchés
> sont le **mécanisme d'application**, qu'ADR-0006 `## Constraints` interdit à l'IA d'éditer. Le plan
> tranche `H-04` par un **régime d'amorçage déclaré** (candidat ADR-0013), à barrière substitutive
> « un lot = une PR relue » et à **expiration mécanique** : il s'éteint quand `FR-036` atteint la
> branche par défaut. ADR-0013 est donc accepté **dans la PR de `R1`**, avant toute autre écriture.
>
> **Note de sérialisation.** Quatre lots enregistrent un contrôle dans `src/checks/index.ts`
> (registre à source unique) : `R6`, `R11`, `R12`, `R13`. Ce fichier partagé les rend **non-`[P]`
> entre eux**, même quand leur logique est indépendante. Seuls `R4`, `R5` et `R10` sont `[P]` : leurs
> fichiers sont disjoints de ceux de la chaîne d'approbation.
>
> **Note d'ordre — la contrainte structurante du lot** (spec § *Vérification*, `H-04` ; plan
> § *Approche*). L'extension des chemins possédés par l'humain (`FR-036`) place
> `tooling/quality-gate/`, `.claude/hooks/`, `.claude/settings.json` et `.github/workflows/` sous
> refus **absolu** du garde de session. Elle est donc **`R16`, l'avant-dernier lot et la dernière
> écriture de l'IA sur le dépôt**. Trois corollaires honorés par ce découpage :
>
> 1. le **registre d'approbateurs amorcé d'au moins une clé** (`R5`) et l'**outil qui fabrique une
>    approbation** (`R8`) existent avant que `R16` ne doive produire sa propre approbation signée ;
> 2. `R5` et `R6` sont **deux lots distincts, donc deux PR**, parce que `FR-060` lit le registre à
>    l'état du **point de divergence** : le registre doit être sur la branche par défaut avant que le
>    contrôle ne le lise. C'est la forme concrète de l'« amorçage humain » de `FR-060` ;
> 3. tous les lots `R1` → `R15` précèdent `R16`, y compris ceux qui ne touchent pas les chemins
>    protégés — après `R16`, plus aucune écriture de l'IA n'est possible sur `tooling/quality-gate/`.
>
> **Note sur les deux artefacts hors `FR`.** Deux éléments du lot ne portent aucune exigence, et le
> découpage le dit plutôt que de les enfouir :
> - **ADR-0013** (`T1`) est de la **gouvernance**, pas un contrôle : il autorise l'écriture du lot.
>   Exigé par `CLAUDE.md` § *Comment travailler ici* (un patron structurant s'écrit dans la même PR)
>   et par le plan § *Régime d'écriture*. Seule tâche du fichier sans `_Requirements:_`, délibérément.
> - **`bin/approuver.ts`** (`R8`) est de l'**ergonomie** (plan, décision 9). Ses tâches tracent vers
>   `FR-042`, dont il **impose** le geste humain — motif tapé au clavier, refus hors TTY. Sa seule
>   condition de correction — ne rien produire que le contrôle `approbation` refuserait — est
>   vérifiée par `R17`, qui s'en sert pour fabriquer ses approbations.

---

## R1 — Un contrôle ne rapporte plus jamais `passé` sur un périmètre vide
_Livre : FR-031, FR-032, FR-057, FR-014_ · _vérif : TDD_ · _~350 lignes est._ · _4 concepts_ · dépend de : —
Fichiers : `tooling/quality-gate/src/types.ts`, `src/runner.ts`, `src/checks/*.ts` (les 11), tests, `docs/adr/ADR-0013-*.md`, `docs/adr/README.md`
Capability : `runGate` consulte le périmètre **avant** d'exécuter un contrôle ; `vide` ⇒ `ignoré` sans exécution, `indeterminable` ⇒ `échoué`. `FR-032` devient structurelle — le chemin qui retournait `passé` à vide n'est plus atteint. Ferme É-01 et É-02.

- [ ] T1 — Promouvoir et faire accepter **ADR-0013 — régime d'amorçage du mécanisme d'application** dans la PR de ce lot, **avant toute autre écriture** ; critère d'acceptation : l'ADR est `accepted`, indexé dans `docs/adr/README.md`, et porte la barrière substitutive et l'expiration mécanique par `FR-036` _(gouvernance — hors `FR`, cf. note de régime d'écriture)_ ; dépend de : —
- [ ] T2 — Écrire le test : `runGate` appelle `perimetre()` avant `run()` ; sur `{ etat: "vide" }` le contrôle est rapporté `ignoré` et `run()` **n'est pas appelé** _Requirements: FR-031_ ; _SC-010_ ; bloqué par : T1
- [ ] T3 — Implémenter `EtatPerimetre` (union discriminée à trois cas, `types.ts`) et sa consultation dans `runner.ts` jusqu'à T2 vert _Requirements: FR-031_ ; bloqué par : T2
- [ ] T4 — Écrire le test : `{ etat: "indeterminable" }` ⇒ `échoué`, et une exception levée **par `perimetre()`** ⇒ `échoué` (jamais `passé` ni `ignoré`) _Requirements: FR-057_ ; bloqué par : T3
- [ ] T5 — Implémenter le mappage `indeterminable` ⇒ `échoué` et l'extension de l'enveloppe `try/catch` fail-closed à l'appel de `perimetre()`, jusqu'à T4 vert _Requirements: FR-057_ ; bloqué par : T4
- [ ] T6 [P] — Écrire le test : **un statut est rapporté pour chacun** des contrôles du régime, exécuté ou non ; aucun contrôle muet, quel que soit l'état de son périmètre _Requirements: FR-014_ ; bloqué par : T3
- [ ] T7 — Implémenter le rapport de statut pour tout contrôle **évalué** et non exécuté, jusqu'à T6 vert _Requirements: FR-014_ ; bloqué par : T6
- [ ] T8 [P] — Écrire le test : sur un dépôt sans `packages/` ni `apps/`, **aucun** des onze contrôles ne rapporte `passé` ; les cinq qui rapportaient `passé` à vide rapportent `ignoré` _Requirements: FR-032_ ; _SC-010_ ; bloqué par : T3
- [ ] T9 — Migrer les onze contrôles de `applies(ctx): boolean` à `perimetre(ctx): Promise<EtatPerimetre>` — aucune règle métier de `run()` retouchée — jusqu'à T8 vert _Requirements: FR-032_ ; bloqué par : T8

## R2 — Le point d'entrée émet réellement ses deux rapports
_Livre : FR-017, FR-018_ · _vérif : TDD_ · _~150 lignes est._ · _3 concepts_ · dépend de : R1 _(partage `types.ts`)_
Fichiers : `tooling/quality-gate/bin/gate.ts`, `src/report.ts`, `src/types.ts` (schéma Zod machine, `remarques`), tests
Capability : `pnpm gate` écrit le rapport lisible sur la sortie standard depuis son point d'entrée ; `--format=machine` émet la représentation machine **à la place**, dérivée du même `GateResult`. Ferme É-03.
_Le champ `CheckResult.remarques` est posé ici comme **véhicule** du rapport lisible ; ses trois producteurs (`FR-058` en `R7`, `FR-042` en `R8`, `FR-045` en `R9`) arrivent plus tard._

- [ ] T10 — Écrire le test : le point d'entrée écrit le rapport lisible sur la sortie standard, listant **chaque** contrôle avec son statut, la cause de chaque `échoué` **nommant le contrôle et la règle enfreinte**, et les `remarques` quel que soit le statut _Requirements: FR-017_ ; _SC-011_ ; dépend de : —
- [ ] T11 — Implémenter l'émission de `renderHuman` depuis `bin/gate.ts` (la ligne de verdict actuelle disparaît) et le rendu des `remarques` dans `report.ts`, jusqu'à T10 vert _Requirements: FR-017_ ; bloqué par : T10
- [ ] T12 — Écrire le test : `--format=machine` émet `renderMachine` **à la place** du rapport lisible (jamais les deux sur le même flux), et les statuts des deux vues sont identiques pour un même `GateResult` _Requirements: FR-018_ ; _SC-011_ ; bloqué par : T11
- [ ] T13 — Implémenter le drapeau de format dans `bin/gate.ts` et l'exposition des `remarques` dans le schéma Zod machine, jusqu'à T12 vert _Requirements: FR-018_ ; bloqué par : T12

## R3 — La suite de tests du portail garde le portail en intégration continue
_Livre : FR-033, FR-034_ · _vérif : **inhérent** (configuration d'intégration continue : la preuve est le run réel, pas un test unitaire)_ · _~40 lignes est._ · _1 concept_ · dépend de : —
Fichiers : `.github/workflows/ci.yml`
Capability : le code qui refuse les diffs cesse d'être gardé par rien. Ferme É-05, et livre le second check requis exigé par `FR-054`.

- [ ] T14 — Ajouter à `.github/workflows/ci.yml` un job `tests-portail` **distinct** de l'exécution du portail, exécutant `pnpm --filter @colibri/quality-gate test` après une installation à verrouillage imposé ; critère d'acceptation : sur la PR du lot, le job apparaît comme exécution distincte et passe au vert _Requirements: FR-033_ ; dépend de : —
- [ ] T15 — Critère d'acceptation : sur une exécution portant un test délibérément rouge, le job `tests-portail` échoue et la conclusion du build est en échec ; relevé consigné dans la description de la PR _Requirements: FR-034_ ; bloqué par : T14

## R4 [P] — Deux listes de chemins dérivées d'une source de définition unique
_Livre : FR-035, FR-037, FR-043, FR-065, FR-021, FR-023_ · _vérif : TDD_ · _~220 lignes est._ · _4 concepts_ · dépend de : —
Fichiers : `tooling/quality-gate/src/protected-paths.ts`, `.claude/hooks/protect-paths.mjs`, tests
Capability : un seul module définit les deux listes d'ADR-0006 — chemins **possédés par l'humain** (refus absolu en session) et chemins **déclencheurs de revue** (approbation exigée au portail) — consommées par le garde de session, le portail et la re-vérification depuis le diff, jamais dupliquées. Ferme H-01, préserve I-09.
_Le **contenu** de la liste possédée par l'humain reste celui de 001 : son extension est `FR-036`, en `R16`._
_`FR-037` est **réduite** : ni seam déclaré, ni allowlist réseau, ni endpoint d'écriture nouveau n'entrent — aucun n'a de forme de chemin écrite (spec § NON inclus, limite sous `FR-037`)._

- [ ] T16 — Écrire le test : `estCheminPossedeParHumain` et `estCheminDeclencheurDeRevue` sont **deux** prédicats distincts du même module ; tout chemin possédé est déclencheur ; la réciproque est fausse pour au moins le **registre d'approbateurs** ; `approbations/**` n'est déclencheur pour **aucune** des deux listes _Requirements: FR-035, FR-037, FR-043_ ; _SC-021_ ; dépend de : —
- [ ] T17 — Implémenter les deux prédicats dans `src/protected-paths.ts` — le second = le premier **plus** `approbateurs.allowed_signers`, **moins** `approbations/**` — `estCheminProtege` conservé comme alias du premier, jusqu'à T16 vert _Requirements: FR-035, FR-037, FR-043_ ; bloqué par : T16
- [ ] T18 — Écrire le test : le fichier portant la **source de définition unique** est déclencheur de revue **quel que soit son contenu**, y compris lorsqu'on en retire une autre entrée _Requirements: FR-065_ ; _SC-020_ ; bloqué par : T17
- [ ] T19 — Implémenter la clause inconditionnelle jusqu'à T18 vert _Requirements: FR-065_ ; bloqué par : T18
- [ ] T20 — Écrire le test : le garde de session refuse l'édition d'un chemin possédé par l'humain et renvoie la raison au modèle, en dérivant sa liste du **même** module (aucune liste dupliquée dans le hook) _Requirements: FR-021, FR-023_ ; _SC-021_ ; bloqué par : T17
- [ ] T21 — Brancher `.claude/hooks/protect-paths.mjs` sur `estCheminPossedeParHumain` et mettre à jour le message de refus, jusqu'à T20 vert _Requirements: FR-021, FR-023_ ; bloqué par : T20

## R5 [P] — Une signature d'approbation se vérifie hors ligne contre un registre versionné
_Livre : FR-059_ · _vérif : TDD_ · _~260 lignes est._ · _3 concepts_ · dépend de : —
Fichiers : `approbateurs.allowed_signers` **(nouveau, artefact)**, `tooling/quality-gate/src/approval-signature.ts` **(nouveau)**, `docs/adr/ADR-0012-*.md`, `docs/adr/README.md`, tests
Capability : le registre d'approbateurs existe, amorcé d'au moins une clé posée par l'humain, et une signature détachée se vérifie contre lui **sans aucun appel réseau** — ce qui maintient l'attribution dans le registre du portail, appliqué par le check requis (H-03), au lieu d'un réglage de forge.
_**Forme du lot, explicitée plutôt qu'enfouie** : il livre un module et un artefact dont le consommateur n'arrive qu'en `R6`. Ce n'est pas une couche déguisée mais la conséquence directe de `FR-060` — le registre doit être **sur la branche par défaut** avant que le contrôle ne le lise au point de divergence, donc dans une PR antérieure et distincte. Sa valeur se vérifie seule et sans le lot suivant : une signature se vérifie, ou non, contre ce registre, hors ligne._

- [ ] T22 — Générer la paire de clés d'approbation (à passphrase, clé privée hors dépôt) et amorcer `approbateurs.allowed_signers` d'au moins une clé au format OpenSSH ; critère d'acceptation : `ssh-keygen -Y verify` accepte une signature produite par cette clé et refuse celle d'une clé absente, **sans accès réseau** _Requirements: FR-059_ ; dépend de : —
- [ ] T23 — Écrire le test : `verifierSignature` accepte une signature d'une clé du registre, refuse une signature d'une clé absente, refuse une signature altérée, et rapporte `échoué` si `ssh-keygen` est introuvable ou le registre absent _Requirements: FR-059_ ; bloqué par : T22
- [ ] T24 — Implémenter `src/approval-signature.ts` (`ssh-keygen -Y verify` par sous-processus, CLI résolu par chemin, jamais de shell) jusqu'à T23 vert _Requirements: FR-059_ ; bloqué par : T23
- [ ] T25 — Promouvoir et faire accepter **ADR-0012 — preuve d'attribution de l'approbation** (schéma de signature, registre versionné, amorçage humain, écart local/CI, résiduels de la clé logicielle) **dans la PR de ce lot** ; critère d'acceptation : l'ADR est `accepted` et indexé dans `docs/adr/README.md` _Requirements: FR-059_ ; bloqué par : T24

## R6 — Le portail refuse un diff qui touche un chemin déclencheur
_Livre : FR-063, FR-055, FR-038, FR-039, FR-044_ · _vérif : TDD_ · _~370 lignes est._ · _5 concepts_ · dépend de : R1, R3 _(partage `ci.yml`)_, R4 _(les prédicats)_
Fichiers : `tooling/quality-gate/src/scope.ts` **(nouveau)**, `src/types.ts` (`GateContext.diff`), `src/checks/approval.ts` **(nouveau)**, `src/checks/index.ts`, `.github/workflows/ci.yml` (`fetch-depth: 0`), tests
Capability : le portail sait ce qu'un changement contient — diff constitué depuis le point de divergence, arbre de travail inclus — et en tire un verdict : un chemin déclencheur modifié, aucune approbation, `BLOQUÉ`. La conclusion vient du **diff**, jamais d'une trace d'exécution d'un garde (ce qui rattrape H-02, le contournement par commande shell). Ferme É-04.
_Le contrôle conclut ici **sans lire aucun artefact** — il n'en existe pas encore. La lecture des approbations, et donc la levée du blocage, arrivent en `R7`._

- [ ] T26 — Écrire le test : `resoudreDiff` constitue le diff depuis l'ancêtre commun avec la branche par défaut, **commits accumulés plus arbre de travail** ; un chemin touché dans un commit antérieur et non retouché depuis reste présent dans le diff _Requirements: FR-063_ ; _SC-018_ ; dépend de : —
- [ ] T27 — Implémenter `src/scope.ts` — `EtatDiff`, résolution de la base (`origin/HEAD`, sinon `origin/<GITHUB_BASE_REF>`, sinon `origin/main`), empreinte de contenu par chemin, mémoïsation par racine, injection par `ctx.diff` — jusqu'à T26 vert _Requirements: FR-063_ ; bloqué par : T26
- [ ] T28 — Écrire le test : git absent, exécution hors dépôt, ancêtre commun introuvable ou historique tronqué ⇒ `{ etat: "indeterminable", cause }`, et tout contrôle qui en dépend est rapporté `échoué` — jamais `passé` ni `ignoré` _Requirements: FR-055_ ; bloqué par : T27
- [ ] T29 — Implémenter les cas indéterminables et leur mappage fail-closed jusqu'à T28 vert _Requirements: FR-055_ ; bloqué par : T28
- [ ] T30 — Ajouter `fetch-depth: 0` au checkout de `.github/workflows/ci.yml` ; critère d'acceptation : le point de divergence est calculable en intégration continue (sans quoi tout contrôle qui en dépend échoue) _Requirements: FR-063_ ; bloqué par : T27
- [ ] T31 — Écrire le test : le périmètre du contrôle `approbation` est l'ensemble des chemins déclencheurs modifiés dans le diff ; aucun ⇒ `vide` ⇒ `ignoré` _Requirements: FR-038_ ; bloqué par : T29
- [ ] T32 — Implémenter `src/checks/approval.ts` (périmètre depuis `EtatDiff` et `estCheminDeclencheurDeRevue`) et son enregistrement dans `src/checks/index.ts`, tagué `par-changement`, jusqu'à T31 vert _Requirements: FR-038_ ; bloqué par : T31
- [ ] T33 — Écrire le test : un chemin déclencheur modifié sans approbation désignant son état ⇒ contrôle `échoué`, verdict `BLOQUÉ`, code de sortie non-zéro _Requirements: FR-039_ ; _SC-007_ ; bloqué par : T32
- [ ] T34 — Implémenter le mappage « chemin découvert ⇒ `échoué` » jusqu'à T33 vert _Requirements: FR-039_ ; bloqué par : T33
- [ ] T35 — Écrire le test : un chemin déclencheur modifié **par une commande shell** — sans passer par un outil d'édition, donc sans refus en session — produit `BLOQUÉ` ; la seule entrée du contrôle est `EtatDiff`, aucune trace de garde n'est consultée _Requirements: FR-044_ ; _SC-008_ ; bloqué par : T34
- [ ] T36 — Garantir que le contrôle ne lit aucune trace d'exécution du garde de session jusqu'à T35 vert _Requirements: FR-044_ ; bloqué par : T35

## R7 — Une approbation lève le blocage, se périme sur le contenu qu'elle couvre, et se cumule
_Livre : FR-056, FR-040, FR-041, FR-062, FR-058_ · _vérif : TDD_ · _~365 lignes est._ · _5 concepts_ · dépend de : R6
Fichiers : `tooling/quality-gate/src/approval.ts` **(nouveau)**, `src/checks/approval.ts`, `approbations/` **(nouveau, artefacts)**, tests
Capability : l'artefact d'approbation devient lisible et la friction devient proportionnelle au risque. Retoucher un chemin couvert périme l'approbation ; pousser un commit sans rapport ne la dilue pas ; plusieurs approbations se cumulent ; une approbation qui ne désigne rien du diff est **inerte et nommée au rapport**, plutôt que de faire échouer des diffs sans rapport ou de disparaître silencieusement.

- [ ] T37 — Écrire le test : `chargerApprobations` distingue `absentes` / `illisible` / `présentes` et ne confond **jamais** l'absence avec l'ensemble vide ; un artefact **présent mais illisible** ⇒ contrôle `échoué` _Requirements: FR-056_ ; dépend de : —
- [ ] T38 — Implémenter `src/approval.ts` — schéma Zod **structurel** (`motif: z.string()` **sans `.min(1)`**, cf. frontière `illisible` / `écartée` du plan), empreinte sha256 du contenu par chemin (`"absent"` pour un chemin supprimé), chargement tri-état — et le mappage `illisible` ⇒ `échoué`, jusqu'à T37 vert _Requirements: FR-056_ ; bloqué par : T37
- [ ] T39 — Écrire le test : une approbation désignant l'empreinte courante d'un chemin déclencheur le rend couvert ⇒ `TOUT VERT` ; ce chemin retouché après l'enregistrement ⇒ `BLOQUÉ` ; un chemin **non** déclencheur retouché après ⇒ `TOUT VERT` _Requirements: FR-040, FR-041_ ; _SC-009_ ; bloqué par : T38
- [ ] T40 — Implémenter `couverture(entrees, diff)` par comparaison d'**empreintes de contenu** (jamais de révision) jusqu'à T39 vert _Requirements: FR-040, FR-041_ ; bloqué par : T39
- [ ] T41 [P] — Écrire le test : deux approbations couvrant chacune un chemin déclencheur distinct du même diff ⇒ `TOUT VERT` ; aucune n'invalide l'autre _Requirements: FR-062_ ; _SC-017_ ; bloqué par : T40
- [ ] T42 — Implémenter le cumul des approbations jusqu'à T41 vert _Requirements: FR-062_ ; bloqué par : T41
- [ ] T43 [P] — Écrire le test : une approbation désignant un état de chemins qui **n'apparaît pas** dans le diff est traitée comme inerte — aucun refus, aucune acceptation — et **apparaît nommément** dans le rapport lisible _Requirements: FR-058_ ; _SC-019_ ; bloqué par : T40
- [ ] T44 — Implémenter la détection des approbations inertes et leur remontée en `remarques` jusqu'à T43 vert _Requirements: FR-058_ ; bloqué par : T43

## R8 — Le motif, seul geste que l'outil ne peut pas produire à la place de l'humain
_Livre : FR-042_ · _vérif : TDD_ · _~300 lignes est._ · _3 concepts_ · dépend de : R5 _(`ssh-keygen -Y sign`)_, R7
Fichiers : `tooling/quality-gate/src/approval.ts` (`ecartees`), `src/checks/approval.ts`, `tooling/quality-gate/bin/approuver.ts` **(nouveau)**, `tooling/quality-gate/package.json`, `package.json` (racine), tests
Capability : une approbation sans motif humain n'a **aucun effet** — elle est lue, écartée, nommée au rapport, et ne retire leur effet à aucune autre — et l'outil de fabrication **impose** ce motif au clavier plutôt que de le proposer, en refusant hors TTY. ADR-0006 amdt 2026-08-01 pt 3 : « la revue est une lecture, pas une case ».
_`bin/approuver.ts` ne porte aucune `FR` (plan, décision 9) ; ses tâches tracent vers `FR-042`, dont il impose le geste. Sa correction est vérifiée en `R17`._

- [ ] T45 — Écrire le test : une approbation à **motif vide ou absent** est **lue puis écartée** — elle ne couvre aucun chemin —, apparaît **nommément** dans le rapport lisible, et ne retire leur effet à aucune autre ; sa seule présence ne rend **pas** le contrôle `échoué` (frontière avec `FR-056`) _Requirements: FR-042_ ; _SC-022_ ; dépend de : —
- [ ] T46 — Implémenter les `ecartees` dans `couverture()` et leur remontée en `remarques` — non-vacuité appliquée **après** le parsing, jamais par le schéma — jusqu'à T45 vert _Requirements: FR-042_ ; bloqué par : T45
- [ ] T47 — Écrire le test : `bin/approuver.ts` **refuse hors TTY**, exige un motif saisi non vide, et produit un artefact que le contrôle `approbation` accepte, dont les empreintes correspondent au contenu des chemins déclencheurs du diff résolu — sans dupliquer ni la liste de chemins ni le calcul d'empreinte _Requirements: FR-042_ ; bloqué par : T46
- [ ] T48 — Implémenter `bin/approuver.ts` (affichage du `git diff` réel des chemins couverts, saisie du motif, écriture du JSON, appel à `ssh-keygen -Y sign`) et l'entrée de script `approuver`, jusqu'à T47 vert _Requirements: FR-042_ ; bloqué par : T47

## R9 — La signature est exigée en intégration continue, contre le registre d'avant le diff
_Livre : FR-060, FR-045, FR-061, FR-066, FR-067, FR-020_ · _vérif : TDD_ · _~330 lignes est._ · _6 concepts_ · dépend de : R2 _(partage `report.ts`)_, R8
Fichiers : `tooling/quality-gate/src/checks/approval.ts`, `src/approval-signature.ts`, `src/types.ts` (`GateContext.enCI`), `src/report.ts` (libellé local), tests
Capability : l'auto-référence est fermée dans les deux sens — ajouter sa propre clé au registre et s'en servir dans le même diff ne peut pas fonctionner — et l'écart local/CI est délibéré et **borné au seul contrôle d'approbation** : en local le portail dit « couvert », jamais « approuvé ».

- [ ] T49 — Écrire le test : un diff qui ajoute une clé au registre **et** s'approuve avec cette clé ⇒ `BLOQUÉ` ; le même ajout approuvé par une clé **déjà présente avant le diff** ⇒ `TOUT VERT` _Requirements: FR-060_ ; _SC-016_ ; dépend de : —
- [ ] T50 — Implémenter la lecture du registre à l'état du **point de divergence** (`git show <base>:approbateurs.allowed_signers`), jamais dans l'arbre de travail, jusqu'à T49 vert _Requirements: FR-060_ ; bloqué par : T49
- [ ] T51 — Écrire le test : en intégration continue, une approbation dont la signature n'est **pas vérifiable** par une clé du registre est **écartée** et nommée au rapport, sans retirer leur effet aux autres ; tous les chemins couverts par ailleurs ⇒ `TOUT VERT` _Requirements: FR-045_ ; _SC-022_ ; bloqué par : T50
- [ ] T52 — Implémenter l'écartement pour signature non vérifiable jusqu'à T51 vert _Requirements: FR-045_ ; bloqué par : T51
- [ ] T53 — Écrire le test : une approbation **non signée** ⇒ `BLOQUÉ` en intégration continue ; le **même diff** en local ne rapporte que la couverture des chemins, **qualifiée « couvert » et non « approuvé »** dans le rapport lisible _Requirements: FR-061, FR-066_ ; _SC-015_ ; bloqué par : T52
- [ ] T54 — Implémenter `ctx.enCI` (injectable, sinon dérivé de l'environnement) et le libellé « couvert » du rapport local, jusqu'à T53 vert _Requirements: FR-061, FR-066_ ; bloqué par : T53
- [ ] T55 [P] — Écrire le test : contexte d'exécution **indéterminé** ⇒ signature **exigée** _Requirements: FR-067_ ; bloqué par : T54
- [ ] T56 — Implémenter la dérivation fail-closed (absent ou `"false"` ⇒ local, `"true"`/`"1"` ⇒ intégration continue, **toute autre valeur ⇒ indéterminé ⇒ signature exigée**) jusqu'à T55 vert _Requirements: FR-067_ ; bloqué par : T55
- [ ] T57 [P] — Écrire le test : pour un même commit et un même régime, le portail exécuté en local puis en intégration continue produit le **même verdict agrégé pour tout contrôle autre que l'approbation** _Requirements: FR-020_ ; bloqué par : T54
- [ ] T58 — Garantir que `ctx.enCI` n'est consommé que par le contrôle d'approbation — un seul `runGate`, un seul registre, une entrée de plus — jusqu'à T57 vert _Requirements: FR-020_ ; bloqué par : T57

## R10 [P] — Le catalogue de versions n'accepte plus qu'une version exacte
_Livre : FR-046_ · _vérif : TDD_ · _~150 lignes est._ · _2 concepts_ · dépend de : R1 _(ne touche pas `checks/index.ts` : `versions-catalog` y est déjà enregistré)_
Fichiers : `tooling/quality-gate/src/checks/versions-catalog.ts`, tests
Capability : ce qu'ADR-0003 amdt (d) pt 6 écrit — versions exactes, le `catalog:` faisant foi — cesse d'être une discipline. Liste fermée : une forme que le contrôle ne sait pas juger n'est jamais acceptée par défaut.

- [ ] T59 — Écrire le test : une entrée du `catalog:` exprimée en **plage**, ou sous une **forme non reconnue**, ⇒ `échoué` ; une version exacte (`MAJEURE.MINEURE.CORRECTIF`, pré-release et build facultatifs) ⇒ acceptée _Requirements: FR-046_ ; _SC-012_ ; dépend de : —
- [ ] T60 — Implémenter la validation de forme dans `versions-catalog.ts` (fail-closed sur toute forme non énumérée) jusqu'à T59 vert _Requirements: FR-046_ ; bloqué par : T59
- [ ] T61 — Écrire le test de non-régression du contrôle modifié : la provenance depuis le catalogue centralisé et le non-mélange des majeures restent vérifiés ; catalogue absent ⇒ `ignoré`, jamais `passé` _Requirements: FR-046_ ; bloqué par : T60
- [ ] T62 — Ajuster `versions-catalog.ts` jusqu'à T61 vert _Requirements: FR-046_ ; bloqué par : T61

## R11 — Toute installation de dépendances impose le verrouillage, dans tous les workflows
_Livre : FR-047_ · _vérif : TDD_ · _~180 lignes est._ · _1 concept_ · dépend de : R3 _(son job doit déjà porter le verrouillage)_, R6 _(partage `checks/index.ts`)_
Fichiers : `tooling/quality-gate/src/checks/ci-lockfile.ts` **(nouveau)**, `src/checks/index.ts`, tests
Capability : une exigence qui n'existait qu'en test devient une **entrée du registre**, donc appliquée par le check requis (H-03). Le workflow planifié porte la mutation et la veille CVE : une installation non verrouillée l'y ferait tourner sur un arbre de dépendances différent de celui du merge.

- [ ] T63 — Écrire le test : dans **n'importe lequel** des workflows de `.github/workflows/`, **une** étape d'installation sans verrouillage imposé ⇒ `échoué` ; toutes verrouillées ⇒ `passé` ; aucun workflow présent ⇒ `ignoré` _Requirements: FR-047_ ; _SC-012_ ; dépend de : —
- [ ] T64 — Implémenter `src/checks/ci-lockfile.ts` (périmètre = les fichiers présents dans `.github/workflows/`, jamais une liste nommée) et son enregistrement dans `src/checks/index.ts`, tagué `par-changement`, jusqu'à T63 vert _Requirements: FR-047_ ; bloqué par : T63

## R12 — Trois règles de contenu hostile deviennent des contrôles dormants
_Livre : FR-048, FR-049, FR-050_ · _vérif : TDD_ · _~320 lignes est._ · _3 concepts_ · dépend de : R11 _(partage `checks/index.ts`)_
Fichiers : `tooling/quality-gate/src/checks/raw-markup.ts`, `src/checks/upload-types.ts`, `src/checks/link-target.ts` **(nouveaux)**, `src/checks/index.ts`, tests + fixtures
Capability : trois règles déjà closes en ADR (insertion de balisage brut, type d'image vectorielle scriptable, cible de lien externe) reçoivent leur mécanisme — `ignoré` aujourd'hui, `échoué` au premier fichier candidat, sans qu'aucune décision reste à prendre à ce moment-là.
_Le contrôle de `FR-048` s'appelle **`raw-markup.ts`** et ne juge **que** l'insertion de balisage brut : le contexte de rendu déclaré par le descripteur (`C-17a`) reste reporté, et un fichier nommé `render-context.ts` promettrait une couverture qu'on n'a pas (plan, décision 7)._

- [ ] T65 — Écrire le test : périmètre propre vide ⇒ `ignoré` ; une fixture insérant une valeur de contenu sous forme de **balisage brut**, hors du rendu nœud par nœud d'un arbre de blocs typés ⇒ `échoué` _Requirements: FR-048_ ; dépend de : —
- [ ] T66 — Implémenter `src/checks/raw-markup.ts` + enregistrement jusqu'à T65 vert _Requirements: FR-048_ ; bloqué par : T65
- [ ] T67 [P] — Écrire le test : périmètre propre vide ⇒ `ignoré` ; une fixture listant le type d'image **vectorielle scriptable** parmi les types de téléversement acceptés ⇒ `échoué` _Requirements: FR-049_ ; dépend de : —
- [ ] T68 — Implémenter `src/checks/upload-types.ts` + enregistrement jusqu'à T67 vert _Requirements: FR-049_ ; bloqué par : T67
- [ ] T69 [P] — Écrire le test : périmètre propre vide ⇒ `ignoré` ; une fixture validant une cible de lien externe autrement que par l'**énumération fermée** `http`/`https` ⇒ `échoué` _Requirements: FR-050_ ; dépend de : —
- [ ] T70 — Implémenter `src/checks/link-target.ts` + enregistrement jusqu'à T69 vert _Requirements: FR-050_ ; bloqué par : T69

## R13 — Deux dormants de plus : la requête interpolée et l'embed vidéo
_Livre : FR-051, FR-052_ · _vérif : TDD_ · _~200 lignes est._ · _2 concepts_ · dépend de : R12 _(partage `checks/index.ts`)_
Fichiers : `tooling/quality-gate/src/checks/sql-interpolation.ts`, `src/checks/video-embed.ts` **(nouveaux)**, `src/checks/index.ts`, tests + fixtures
Capability : les deux dernières règles closes en ADR — requête paramétrée jamais interpolée, embed vidéo en mode à confidentialité renforcée — rejoignent le registre sur le même patron que les trois précédentes.

- [ ] T71 — Écrire le test : périmètre propre vide ⇒ `ignoré` ; une fixture portant un littéral de requête avec **substitution de chaîne** ⇒ `échoué` _Requirements: FR-051_ ; dépend de : —
- [ ] T72 — Implémenter `src/checks/sql-interpolation.ts` + enregistrement jusqu'à T71 vert _Requirements: FR-051_ ; bloqué par : T71
- [ ] T73 [P] — Écrire le test : périmètre propre vide ⇒ `ignoré` ; une fixture construisant une URL d'embed vidéo **hors mode à confidentialité renforcée** ⇒ `échoué` _Requirements: FR-052_ ; dépend de : —
- [ ] T74 — Implémenter `src/checks/video-embed.ts` + enregistrement jusqu'à T73 vert _Requirements: FR-052_ ; bloqué par : T73

## R14 — L'activation d'un dormant n'en verdit aucun autre
_Livre : FR-064_ · _vérif : TDD_ · _~90 lignes est._ · _1 concept_ · dépend de : R12, R13
Fichiers : `tooling/quality-gate/src/checks/raw-markup.ts`, `upload-types.ts`, `link-target.ts`, `sql-interpolation.ts`, `video-embed.ts` (déclarations de périmètre seules), tests
Capability : chacun des cinq dormants porte **son propre** périmètre — un `passé` signifie « règle appliquée à du code pertinent », jamais « rien trouvé dans des fichiers hors sujet ». La limite du **faux dormant** est écrite et acceptée : un motif qui manque un fichier laisse la ligne à `ignoré`, et son rattrapage est la re-passe d'audit L11, pas le portail.
_**Dimensionnement, explicité** : lot volontairement court. Il ne livre pas un sixième contrôle mais la garantie transverse qui donne son sens aux cinq, et sa vérification (`SC-013`) ne peut exister qu'une fois les cinq présents. La placer dans `R12` ou `R13` y ajouterait un second sujet — c'est exactement ce que la gate `analyze` du 2026-08-05 a reproché au découpage précédent._

- [ ] T75 — Écrire le test : chacun des cinq dormants déclare **son propre** `perimetre()` ; l'introduction d'un fichier candidat pour l'un le fait passer à `passé`/`échoué` **sans changer le statut d'aucun des quatre autres**, qui restent `ignoré` _Requirements: FR-064_ ; _SC-013_ ; dépend de : —
- [ ] T76 — Ajuster les cinq périmètres jusqu'à T75 vert (aucun périmètre produit commun) _Requirements: FR-064_ ; bloqué par : T75

## R15 — La branche par défaut est protégée par le maillon qu'aucune écriture ne défait
_Livre : FR-053, FR-054_ · _vérif : **check** (configuration **hors du dépôt** : la vérification est un relevé d'état consigné, pas un test — le portail ne peut pas lire la forge sans un appel réseau, donc sans un seam, soit l'inverse d'ADR-0006 pt 2)_ · _aucun fichier_ · _2 concepts_ · dépend de : R3
Fichiers : aucun (réglage de forge)
Capability : le troisième maillon d'ADR-0006 amdt 2026-08-01 pt 5 — celui qu'un agent qui écrit le dépôt n'atteint pas. `FR-053` est **déjà tenue depuis le 2026-08-02** : son relevé est une non-régression ; le seul geste dû est `FR-054`.

- [ ] T77 — Relever et consigner l'état du *ruleset* de la branche par défaut : pull request obligatoire, push direct refusé, force-push refusé, **suppression refusée**, **aucun acteur en contournement** ; critère d'acceptation : le relevé est joint à la PR du lot et montre chacun de ces cinq points _Requirements: FR-053_ ; _SC-014_ ; dépend de : —
- [ ] T78 — Ajouter le job `tests-portail` en **second check requis**, à côté du portail ; critère d'acceptation : relevé consigné montrant les deux checks requis, et constat qu'une pull request dont le portail échoue ne peut pas être fusionnée _Requirements: FR-054_ ; _SC-014_ ; bloqué par : T77

## R16 — Le mécanisme d'application et les manifestes rejoignent les chemins possédés par l'humain
_Livre : FR-036_ · _vérif : TDD_ · _~130 lignes est._ · _2 concepts_ · dépend de : R1 → R15 _(dernier lot écrit par l'IA)_
Fichiers : `tooling/quality-gate/src/protected-paths.ts`, `.claude/hooks/protect-paths.mjs`, tests
Capability : **le dernier changement du lot, et la dernière écriture de l'IA sur le dépôt.** Après lui, le portail, les gardes, les workflows, la baseline de mutants et les manifestes de dépendances sont du code humain (H-04) : les dix contrôles reportés s'écriront à la main. C'est aussi l'acte qui **éteint le régime d'amorçage** d'ADR-0013 — la dérogation ne survit pas à ce qu'elle sert à construire. La barrière se prouve en s'appliquant à elle-même : la PR de ce lot exige sa propre approbation signée, `protected-paths.ts` étant déclencheur inconditionnel depuis `R4`.
_Ordre interne impératif : la mise à jour du hook précède l'édition de `protected-paths.ts`, `.claude/hooks/` devenant intouchable dès que l'extension est appliquée._

- [ ] T79 — Écrire le test : `estCheminPossedeParHumain` couvre, outre la liste de 001, `.claude/hooks/`, `.claude/settings.json`, `.claude/settings.local.json`, `.github/workflows/`, `tooling/quality-gate/`, `mutation-survivors.baseline.json`, `package.json`, `pnpm-workspace.yaml` et `pnpm-lock.yaml` ; et que la liste des déclencheurs de revue s'étend d'autant _Requirements: FR-036_ ; _SC-021_ ; dépend de : —
- [ ] T80 — Mettre à jour le message de refus de `.claude/hooks/protect-paths.mjs` (mécanisme d'application et manifestes nommés) _Requirements: FR-036_ ; bloqué par : T79
- [ ] T81 — Étendre la liste dans `src/protected-paths.ts` jusqu'à T79 vert — **dernière écriture de l'IA sur le dépôt pour ce lot** _Requirements: FR-036_ ; bloqué par : T80
- [ ] T82 — Produire l'approbation signée couvrant le diff du lot (`pnpm approuver`, puis signature humaine) ; critère d'acceptation : `pnpm gate` rapporte le contrôle `approbation` `passé` sur la branche _Requirements: FR-036_ ; bloqué par : T81

## R17 — Vérification bout-en-bout
_Livre : SC-007 → SC-022_ · _vérif : **check** (l'étape unique du plan : une commande exécutée dans un shell interactif, plus un relevé hors dépôt — aucun code n'est écrit, le portail étant possédé par l'humain depuis `R16`)_ · _aucun fichier_ · dépend de : R1 → R16
Fichiers : aucun

- [ ] T83 — Exécuter `pnpm --filter @colibri/quality-gate test && pnpm gate` dans un shell interactif, **sur la branche portant `FR-036`** ; critère d'acceptation : suite verte et `TOUT VERT`, le rapport lisible émis par le point d'entrée montrant les cinq dormants à `ignoré`, **aucun** contrôle `passé` à périmètre vide, les trois consommateurs tirant leurs listes de la **même** source, et le contrôle `approbation` `passé` par l'approbation signée de la branche elle-même — approbations du harnais **fabriquées par `bin/approuver.ts`**, ce qui verrouille qu'il ne produit rien que le contrôle refuserait _Requirements: SC-007, SC-008, SC-009, SC-010, SC-011, SC-012, SC-013, SC-015, SC-016, SC-017, SC-018, SC-019, SC-020, SC-021, SC-022_ ; dépend de : —
- [ ] T84 — Consigner le relevé de ce que la commande ne peut pas atteindre : un push direct sur la branche par défaut est refusé par la forge, et une pull request dont le portail échoue ne peut pas être fusionnée _Requirements: SC-014_ ; bloqué par : T83

---

## Couverture (relecture)

| `FR` | Lot | | `FR` | Lot | | `FR` | Lot |
|---|---|---|---|---|---|---|---|
| FR-014 | R1 | | FR-040 | R7 | | FR-055 | R6 |
| FR-017 | R2 | | FR-041 | R7 | | FR-056 | R7 |
| FR-018 | R2 | | FR-042 | R8 | | FR-057 | R1 |
| FR-020 | R9 | | FR-043 | R4 | | FR-058 | R7 |
| FR-021 | R4 | | FR-044 | R6 | | FR-059 | R5 |
| FR-023 | R4 | | FR-045 | R9 | | FR-060 | R9 |
| FR-031 | R1 | | FR-046 | R10 | | FR-061 | R9 |
| FR-032 | R1 | | FR-047 | R11 | | FR-062 | R7 |
| FR-033 | R3 | | FR-048 | R12 | | FR-063 | R6 |
| FR-034 | R3 | | FR-049 | R12 | | FR-064 | R14 |
| FR-035 | R4 | | FR-050 | R12 | | FR-065 | R4 |
| FR-036 | **R16** | | FR-051 | R13 | | FR-066 | R9 |
| FR-037 | R4 | | FR-052 | R13 | | FR-067 | R9 |
| FR-038 | R6 | | FR-053 | R15 | | | |
| FR-039 | R6 | | FR-054 | R15 | | | |

Les **43 `FR`** du delta — 6 `[MODIFIED]` de 001 et 37 `[ADDED]` (`FR-031` → `FR-067`) — sont
rattachées, **chacune à un seul lot**, à au moins une tâche d'implémentation et à au moins une
vérification observable. `SC-007` → `SC-022` sont vérifiés dans le lot qui porte la `FR`
correspondante, puis **re-constatés d'un bloc** en `R17`.

*`FR-013` de 001 n'apparaît pas : la passe corrective de `specify` l'a **sortie de `[MODIFIED]`** —
son `SHALL` est inchangé, `FR-046` la complète sans la réécrire. Sa non-régression est vérifiée
dans `R10`, le lot qui modifie le contrôle qui la porte.*
