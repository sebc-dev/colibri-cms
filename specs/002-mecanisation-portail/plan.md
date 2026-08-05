# Plan technique : mécanisation du portail (lot L10)

Trace vers : [`spec.md`](./spec.md) · [`DELTA.md`](./DELTA.md) · [`docs/stack.md`](../../docs/stack.md) ·
[`docs/adr/`](../../docs/adr/) (0006 amdt 2026-08-01 pts 2-5 et amdt 2026-08-02 (b), 0009
contraintes 2/4/5, 0003 amdt (d) pts 6 et 8, 0011 § 1/§ 4/§ 5, 0004 amdt (c), 0002 § 3/§ 4)

> **Mode delta.** Ce plan modifie `tooling/quality-gate/` livré par 001 ; il ne le réécrit pas.
> Les onze contrôles existants gardent leur **règle métier** — ce qui change est *où* ils la
> mesurent (§ *Racine*) et *ce qu'ils rapportent à vide* (§ *Fidélité*). Aucun code de produit
> (`packages/`, `apps/`) n'est créé.
>
> **Seconde passe corrective, 2026-08-05**, après la gate `analyze` (5 Critical · 16 Major ·
> 12 Minor) et la passe corrective de `specify` qui a porté la spec à **48 `FR`**. Elle ferme les
> trois findings que `specify` lui a nommément renvoyés — les **formes lexicales** de `FR-049` →
> `FR-052`, la **section finale périmée**, le **statut d'ADR-0013 vis-à-vis d'ADR-0006 et de
> `CLAUDE.md`** — et absorbe `É-06` (la racine du dépôt, `FR-068`/`FR-069`), dont la conséquence sur
> les onze contrôles était invisible dans la passe précédente.

## Régime d'écriture du lot — `H-04` tranché

`ADR-0006` § `Constraints` (2026-08-01) **interdit à l'IA d'éditer le mécanisme d'application** :
`.claude/hooks/`, `.claude/settings.json`, `.github/workflows/`, `tooling/quality-gate/` et la base
de référence des mutants. Or **la quasi-totalité des fichiers touchés par ce plan sont exactement
ces chemins** — seuls `approbations/`, `approbateurs.allowed_signers`, les ADR et les quatre
documents de clôture (§ *Gestes documentaires*) tombent en dehors. Le conflit est frontal et ne se
contourne pas en silence (`CLAUDE.md` § *Comment travailler ici*).

**Trois faits relevés sur le dépôt le 2026-08-05**, qui fixent le problème plutôt que de le décrire :

1. **La règle n'a aucun mécanisme.** Passés au garde de session, `tooling/quality-gate/src/runner.ts`,
   `.github/workflows/ci.yml`, `.claude/hooks/protect-paths.mjs` et `package.json` sortent tous en
   `exit 0` — autorisés. `estCheminProtege()` ne connaît que la liste de 001. C'est le trou que
   `FR-036` ferme, en dernier.
2. **Le mécanisme existant a été écrit par l'IA, tests compris** : chaque commit substantiel de
   `tooling/quality-gate/` porte un trailer `Co-Authored-By: Claude`. L'interdiction date du
   2026-08-01, le mécanisme du 2026-07-26.
3. **Le maillon hors du dépôt est déjà posé** (`D-09` clos le 2026-08-02) : PR obligatoire, aucun
   push direct, aucun force-push, `bypass_actors` vide, portail en check requis.

**Décision (arbitrage humain, 2026-08-05) — régime d'amorçage complet.** L'IA écrit le lot entier
sous une **dérogation déclarée, bornée et à expiration mécanique**, portée par le candidat
[`ADR-0013`](../../docs/adr/_candidates/0013-draft.md). Sa barrière pendant le régime est celle qui
existe déjà : **un lot = une PR relue par un humain avant fusion**, sous protection de branche. Son
expiration n'est ni une date ni une déclaration : le régime **s'éteint quand `FR-036` atteint la
branche par défaut**, le garde de session refusant dès lors absolument toute écriture de l'IA sur ces
chemins — *la dérogation ne peut pas survivre à ce qu'elle sert à construire*.

**Ce que ce régime ne prouve pas, écrit à côté du `SHALL` qu'il affaiblit** : pendant le lot, la
seule barrière réelle sur le mécanisme est la **lecture humaine d'une PR**. Une PR affaiblissante
fusionnée sans relecture effective passe. L'exposition est **identique à celle d'aujourd'hui** — le
garde n'en bloque aucun chemin — et **strictement inférieure après** l'extinction. Ce qui reste
interdit malgré le régime : réduire la couverture d'un contrôle existant, retirer une entrée d'une
liste de chemins protégés, désarmer un check requis, hors d'un `SHALL` explicite de cette feature.
*(La § *Racine* ci-dessous rencontre cet interdit de plein fouet sur `typecheck` : le lire comme une
formalité aurait coûté la seule vérification de types que le portail exécute réellement.)*

*Écartées*, avec leur motif complet dans ADR-0013 : la **lecture littérale** (l'humain écrit tous les
fichiers — écartée surtout parce qu'elle institue sans l'écrire une exigence qu'on n'a pas eue pour
001) et le **découpage par autorat** (l'humain n'écrit que les quatre fichiers qui *arment* —
écartée parce qu'elle déplace le résiduel vers la logique des contrôles au lieu de le réduire, et
qu'une frontière d'apparence nette rendrait la relecture des PR moins attentive).

**Statut du régime vis-à-vis d'ADR-0006 — le point que la gate a relevé et qui reste ouvert
autrement.** ADR-0013 **n'amende pas** ADR-0006 : son texte reste littéral, et `DELTA.md` reste
exact en écrivant qu'aucun ADR n'est amendé. Un ADR nouveau qui *conditionne* l'application d'un
autre, plutôt qu'un amendement qui l'édite, est le choix de la conception (motif dans ADR-0013
§ *Alternatives*) — mais il laisse un lecteur d'ADR-0006 seul devant une interdiction que le lot
enfreint. La réconciliation vit donc **là où la règle est lue**, pas là où elle est décidée :

- `CLAUDE.md` § *Contraintes actives · Génération IA (ADR-0006)* reçoit **une ligne** — l'interdiction
  d'éditer le mécanisme d'application vaut **hors d'un régime d'amorçage déclaré (ADR-0013)**, dont
  l'expiration est `FR-036` sur la branche par défaut ;
- `docs/adr/_candidates/0013-draft.md` reçoit une section **« Relation à ADR-0006 »** qui dit
  explicitement qu'il ne l'amende pas, pourquoi, et où le lecteur trouve le renvoi.

Les deux gestes sont dus **dans la PR qui promeut ADR-0013**, c'est-à-dire la première du lot ; sans
eux, la dérogation existerait sans qu'aucun document lu au quotidien ne la signale.

## Approche

Cinq mouvements, dans cet ordre de dépendance.

1. **Faire conclure le portail sur la racine du dépôt** (`É-06`, `FR-068`, `FR-069`). `pnpm gate`
   délègue par `pnpm --filter`, `bin/gate.ts` passe `ctx: {}`, et chaque contrôle retombe sur
   `process.cwd()` — soit `tooling/quality-gate/`. Un module `repo-root.ts` **résout** la racine ;
   `runGate` la résout **une fois** et la passe aux contrôles dans un contexte où elle est
   **obligatoire**, ce qui supprime le repli `?? process.cwd()` de onze fichiers. C'est le mouvement
   qui doit venir en premier : sans lui, tout ce qui suit mesure un périmètre vide par accident
   d'invocation (§ *Racine*).
2. **Rendre le portail fidèle** (`É-01` → `É-05`). Le contrat `Check` remplace `applies(ctx): boolean`
   — que `runGate` n'a jamais appelé — par `perimetre(ctx): Promise<EtatPerimetre>`, tri-état
   (`vide` | `non-vide` | `indeterminable`) sur le modèle d'`EtatBaseline`. `runGate` le consulte
   **avant** `run` : `vide` ⇒ `ignoré` sans exécuter, `indeterminable` ⇒ `échoué`, `non-vide` ⇒
   `run`. `FR-032` devient alors **structurellement** vraie : un contrôle ne peut plus retourner
   `passé` sur un périmètre vide, parce qu'il n'est pas exécuté. C'est aussi la forme que prend
   `FR-014` **restreinte** — `runGate` *évalue* et rapporte chaque contrôle du régime sans en exécuter
   aucun à vide. Le point d'entrée émet enfin `renderHuman` / `renderMachine`, et la CI gagne un job
   distinct pour la suite de tests du portail.
3. **Savoir ce qu'un changement contient** (`FR-063`, `FR-055`). Un module `scope.ts` constitue le
   **diff soumis** depuis le point de divergence avec la branche par défaut, fail-closed, injectable
   par le contexte pour les tests. C'est la plomberie que 001 nommait sans la livrer.
4. **Barrer sur le diff, pas sur la trace d'un garde** (`B-14`, `C-17f`). Une **approbation** est un
   artefact versionné qui désigne l'**empreinte du contenu** de chaque chemin déclencheur qu'elle
   couvre, accompagnée d'une **signature SSH détachée** vérifiée hors ligne contre un registre
   d'approbateurs lui-même versionné. Lier l'approbation au contenu — non à la révision — donne
   `FR-040` et `FR-041` par construction : retoucher un chemin couvert change son empreinte, toucher
   un chemin non couvert ne change rien.
5. **Armer ce qui ne mordra que demain** (`C-17h`, cinq dormants). Le catalogue refuse toute forme
   qui n'est pas une version exacte, un contrôle relit l'installation de **tous** les workflows, et
   cinq entrées de registre reçoivent **chacune son périmètre propre** et **sa forme lexicale
   refusée, close par un ADR accepté** (§ *Cinq dormants*) — `ignoré` aujourd'hui, `échoué` au
   premier fichier candidat.

**Contrainte d'ordre, structurante et non négociable** (spec § *Vérification*, `H-04`, ADR-0013
pt 4) : l'extension de la liste des chemins possédés par l'humain (`FR-036`) place
`tooling/quality-gate/`, `.claude/hooks/`, `.claude/settings.json` et `.github/workflows/` sous refus
absolu du garde de session. Elle est le **dernier changement du lot**, et **l'acte qui éteint le
régime d'amorçage**. Deux corollaires que `tasks` doit honorer :

- l'**artefact d'approbation**, le **registre d'approbateurs amorcé d'au moins une clé** et la clé
  privée correspondante existent **avant** ; sinon la première approbation exigée par le lot
  lui-même est inaccordable ;
- le registre d'approbateurs doit être **sur la branche par défaut** avant que le contrôle
  `approbation` ne soit activé dans `checks/index.ts`, parce que `FR-060` lit le registre à
  **l'état du point de divergence**. Un lot ≈ une PR : ce sont donc **deux lots distincts**, pas
  deux tranches du même. C'est la forme concrète de l'« amorçage humain » de `FR-060`.

## Réutilisation du socle (cité, jamais re-décidé)

- **Stack / ADR-0003** : TypeScript `strict`, ESM, pnpm workspaces, `catalog:` pnpm, Vitest. Aucune
  dépendance npm nouvelle n'est introduite — voir § *Décisions* 3.
- **ADR-0009** : contrôles définis **une seule fois** dans le registre TS tagué par régime, local et
  CI appelant le même `runGate` (contrainte 2) ; **fail-closed**, `ignoré` réservé à un périmètre
  **vérifié** vide (contrainte 5) ; rapport lisible et sortie machine dérivés du **même**
  `GateResult` (contrainte 4) ; baseline possédée par l'humain (§ 5).
  *Note sur `FR-020` restreinte* : l'écart local/CI ne touche pas la contrainte 2. Le contexte
  d'exécution est une **entrée** de `runGate` (`ctx.enCI`), au même titre que le diff et la racine —
  un seul runner, un seul registre, des entrées différentes.
- **ADR-0006 amdt 2026-08-01** : pt 2 — **aucun appel réseau hors d'un seam déclaré** ; c'est ce qui
  impose la vérification de signature **hors ligne** (`FR-059`) et interdit d'interroger la forge.
  Pt 3 — surface bornée **par la forme**, déclencheur mécanique. Pt 4 — manifestes de dépendances
  possédés par l'humain. Pt 5 — trois maillons, la CI **relit le diff** au lieu d'interroger le
  garde.
- **ADR-0006 amdt 2026-08-02 (b)** : la relecture humaine est portée par le **marqueur
  d'approbation du dépôt** contrôlé par la CI, jamais par un compte d'approbations sur la forge.
- **ADR-0011 § 1/§ 4/§ 5, ADR-0004 amdt (c), ADR-0003 amdt (d) pt 8** : les cinq règles que les
  contrôles dormants appliquent sont **déjà tranchées, et leur forme refusée y est nommée
  littéralement** — ce plan ne fait que leur donner un mécanisme, il n'invente aucune règle.
- **ADR-0002 § 3** : hook `PreToolUse` ⇒ `exit 2` bloque et renvoie la raison au modèle. **§ 4** : la
  source de définition unique, dont `FR-023` fait maintenant trois consommateurs.

## La racine du dépôt — `É-06`, et ce qu'elle déplace *(`FR-068`, `FR-069`, `SC-025`)*

### Comment elle est résolue

`repo-root.ts` remonte, depuis le répertoire courant, jusqu'au premier dossier contenant
`pnpm-workspace.yaml` — le marqueur de racine d'espace de travail, versionné, présent aussi bien dans
un checkout de CI que localement. **Aucun appel à `git` n'est fait pour cela**, et c'est délibéré :
`scope.ts` a besoin de git et rapporte son propre `indeterminable` (`FR-055`), si bien qu'un dépôt
sans historique fait échouer les contrôles **qui dépendent du diff** sans entraîner ceux qui n'en
dépendent pas — la distinction exacte que la spec fait entre `FR-055` et `FR-069`.

**Il n'existe ni drapeau ni variable d'environnement de racine**, conformément à `FR-068` (« résolue
par le système, jamais fournie par l'appelant »). `ctx.racine` existe dans le type, mais c'est un
**seam de test** : les fixtures de `test-fixtures/` sont des arborescences isolées, sans
`pnpm-workspace.yaml`, qui doivent rester la racine de leur propre scénario. Le point d'entrée réel
passe `{}`. Même statut pour `ctx.diff` et `ctx.enCI` — trois seams, zéro surface CLI.

`runGate` résout la racine **une fois par exécution**. Indéterminable ⇒ **tout contrôle du régime est
rapporté `échoué`** avec la cause, sans que `perimetre()` ni `run()` soient appelés (`FR-069`). La
résolution étant faite en amont, le contexte remis aux contrôles porte une racine **obligatoire**
(`CheckContext.racine: string`) : le repli `?? process.cwd()` de onze fichiers disparaît, et un
contrôle ne peut plus retrouver `process.cwd()` par accident — c'est le même geste de conception que
`perimetre()` pour `FR-032`, une exigence rendue **structurelle** plutôt que confiée à la vigilance.

`pnpm gate` **n'est pas modifié** : la délégation par `--filter` reste, et la remontée vers le
marqueur la rattrape. C'est la propriété que `SC-025` mesure — deux invocations, deux racines de
départ, mêmes statuts —, et elle est vérifiée par l'invocation réelle plutôt que par une assertion
sur la valeur retournée par la résolution.

### Ce que la racine réelle change pour les onze contrôles — trois cas, dont deux pièges

| Contrôle | Périmètre à la racine réelle | Effet |
|---|---|---|
| `boundaries`, `read-sql-in-apps`, `write-handler`, `authz-coverage`, `turnstile-test`, `migration-comment` | `packages/`, `apps/`, `migrations/` — absents | `passé` (É-02) ⇒ **`ignoré`** |
| `integration`, `mutation` | `tests/integration/`, `packages/core/` — absents | `ignoré`, inchangé |
| `versions-catalog` | `pnpm-workspace.yaml` — **présent** | `passé` par vacuité ⇒ **exécution réelle** : `FR-013` de 001 lit le vrai catalogue pour la première fois, et `FR-046` s'y applique |
| `lint-format` | *piège n° 1* — périmètre déclaré « la racine existe », **jamais vide par construction** | redéclaré « au moins un fichier `.ts`/`.tsx` sous la racine ». Reste `passé` sur ce dépôt, et **ce n'est pas une violation de `SC-010`**, qui ne parle que d'un périmètre **vérifié vide** |
| `typecheck` | *piège n° 2* — voir ci-dessous | périmètre redéfini, sous peine de perdre la seule vérification de types réellement exécutée |

**Le piège de `typecheck`, à ne pas traiter comme une formalité.** Aujourd'hui `applies()` teste
`<racine>/tsconfig.json` et `run()` appelle `ts.findConfigFile()` en **remontant** : depuis
`tooling/quality-gate/`, le fichier est trouvé et le portail type-vérifie son propre code. Depuis la
racine réelle, il n'y a que `tsconfig.base.json` — le périmètre devient vide et le contrôle passerait
à `ignoré`, c'est-à-dire que **corriger `É-06` supprimerait la seule vérification de types que le
portail exécute**. ADR-0013 pt 5 l'interdit explicitement (« aucun changement ne peut réduire la
couverture d'un contrôle existant »). Le périmètre est donc redéfini : **tout `tsconfig.json` de
l'espace de travail** (parcours récursif depuis la racine, `node_modules`/`dist`/`test-fixtures`
exclus comme le fait déjà `fs-utils.ts`), `run()` type-vérifiant chacun. Couverture d'aujourd'hui
strictement préservée — un seul fichier trouvé, celui du portail — et elle croît d'elle-même au
premier `packages/*/tsconfig.json`.

**Ce qui ne bouge pas.** `lint-format.ts` garde sa **seconde** notion de racine, celle qui localise
`eslint.config.mjs` et `prettier.config.mjs` (aujourd'hui quatre niveaux au-dessus de
`src/checks/`) : les fixtures de lint n'ont pas de configuration propre et doivent emprunter celle du
dépôt. Elle est **renommée `racineConfigurationLint()`** pour que la distinction soit lisible —
racine de *périmètre* ≠ racine de *configuration* — faute de quoi la prochaine lecture les unifiera
et cassera les fixtures.

## Fichiers touchés

### Racine, fidélité et rapport *(`É-01` → `É-06` ; `FR-014`, `FR-017`, `FR-018`, `FR-031`, `FR-032`, `FR-033`, `FR-034`, `FR-057`, `FR-068`, `FR-069`, `FR-072`)*

| Fichier | Ce qui change | Patron de référence |
|---|---|---|
| `tooling/quality-gate/src/repo-root.ts` **(nouveau)** | `resoudreRacine(ctx): EtatRacine` — union à deux cas `résolue`/`indeterminable`, remontée vers `pnpm-workspace.yaml`, aucun sous-processus | `src/mutation-baseline.ts` (`chargerBaseline`, union d'états explicite plutôt qu'un `undefined`) |
| `tooling/quality-gate/src/types.ts` | `EtatPerimetre` (union à trois cas) ; `Check.applies` → `Check.perimetre` ; `CheckResult.remarques?: string[]` (porte `FR-058`, `FR-042`, `FR-045`) ; `GateContext` perd `cwd` et gagne les trois seams `racine?`/`diff?`/`enCI?` ; `CheckContext extends GateContext` avec `racine: string` **obligatoire** ; schémas Zod machine étendus | lui-même ; `EtatBaseline` de `src/mutation-baseline.ts` |
| `tooling/quality-gate/src/runner.ts` | résout la racine **une fois** (`FR-068`) et rapporte tout contrôle `échoué` si elle est indéterminable (`FR-069`) ; consulte `perimetre()` avant `run()` — `vide` ⇒ `ignoré`, `indeterminable` ⇒ `échoué` ; le `try/catch` fail-closed enveloppe **aussi** `perimetre()` ; un statut est rapporté pour **chaque** contrôle du régime, exécuté ou non (`FR-014`) | lui-même (`FR-027` déjà tenu) |
| `tooling/quality-gate/src/report.ts` | `renderHuman` rend les `remarques` quel que soit le statut ; `renderMachine` les expose ; hors CI, le contrôle d'approbation est libellé **« couvert »** et jamais « approuvé » (`FR-072`) | lui-même |
| `tooling/quality-gate/bin/gate.ts` | émet `renderHuman` par défaut ; `--format=machine` émet `renderMachine` **à la place** (`FR-018`) ; la ligne de verdict actuelle disparaît au profit du rapport ; `ctx` reste `{}` — aucun drapeau de racine, de diff ni de contexte | lui-même (`parseRegime`) |
| `tooling/quality-gate/src/checks/*.ts` **(les 11)** | suppression du repli `racine(ctx) = ctx.cwd ?? process.cwd()` au profit de `ctx.racine` ; `applies(ctx): boolean` → `perimetre(ctx): Promise<EtatPerimetre>`. **Deux périmètres redéfinis** : `typecheck` (tous les `tsconfig.json` de l'espace de travail) et `lint-format` (au moins un fichier source). `versions-catalog` reçoit en outre `FR-046`. Aucune autre règle métier n'est retouchée | `src/checks/integration.ts` (déjà `ignoré` à vide) |
| `tooling/quality-gate/src/checks/*.test.ts` **(les 11)** | migration `{ cwd: fixture }` → `{ racine: fixture }`, plus un cas de périmètre vide par contrôle. **Coût réel du lot, à budgéter** : c'est la moitié du volume de la première tranche | `src/checks/mutation.test.ts` (fixtures par scénario) |
| `.github/workflows/ci.yml` | `fetch-depth: 0` au checkout (**sans quoi le point de divergence est incalculable et tout contrôle qui en dépend échoue**) ; **job distinct** `tests-portail` exécutant `pnpm --filter @colibri/quality-gate test` (`FR-033`, `FR-034`) | `.github/workflows/nightly.yml` (job à étapes multiples) |

### Diff soumis *(`FR-044`, `FR-055`, `FR-063`)*

| Fichier | Ce qui change | Patron de référence |
|---|---|---|
| `tooling/quality-gate/src/scope.ts` **(nouveau)** | `resoudreDiff(ctx): Promise<EtatDiff>` — `ctx.diff` s'il est injecté, sinon calcul mémoïsé par racine. Base = point de divergence avec la branche par défaut (`origin/HEAD`, sinon `origin/<GITHUB_BASE_REF>`, sinon `origin/main`) ; contenu = commits depuis l'ancêtre commun **plus** l'arbre de travail, pour que local et CI donnent la même réponse. Toute impossibilité (git absent, hors dépôt, ancêtre commun introuvable, historique tronqué) ⇒ `{ etat: "indeterminable", cause }` | `src/mutation-baseline.ts` (chargement tri-état) ; `src/checks/process-utils.ts` (`spawnAsync`, sous-processus jamais lancé par un shell) |

### Approbation et attribution *(`FR-038` → `FR-045`, `FR-056`, `FR-058` → `FR-062`, `FR-066`, `FR-067`, `FR-070`, `FR-071`)*

| Fichier | Ce qui change | Patron de référence |
|---|---|---|
| `approbations/<horodatage>-<sujet>.json` **(nouveau, artefact)** | `{ motif: string, chemins: { <chemin>: <empreinte sha256 du contenu \| "absent"> } }`. Un fichier par approbation ; elles se **cumulent** (`FR-062`) | `mutation-survivors.baseline.json` (artefact versionné possédé par l'humain, à la racine) |
| `approbations/<…>.json.sig` **(nouveau, artefact)** | signature SSH détachée produite par `ssh-keygen -Y sign -n colibri-approbation` | — |
| `approbateurs.allowed_signers` **(nouveau, artefact)** | registre d'approbateurs au format OpenSSH `allowed_signers` (`<principal> <type> <clé>`) | idem baseline |
| `tooling/quality-gate/src/approval.ts` **(nouveau)** | schéma Zod **structurel** de l'artefact ; `chargerApprobations(racine)` tri-état (`absentes` / `illisible` / `présentes`) ; `couverture(entrees, diff, exigeSignature)` → chemins couverts, chemins découverts, approbations **inertes** (`FR-058`) et **écartées** (`FR-042`, `FR-045`) | `src/mutation-baseline.ts` (schéma Zod + chargement tri-état + comparaison pure) |
| `tooling/quality-gate/src/approval-signature.ts` **(nouveau)** | `verifierSignature(fichier, sig, registre)` via `ssh-keygen -Y verify`, **hors ligne** ; le registre est lu à l'état du **point de divergence** (`git show <base>:approbateurs.allowed_signers`), ce qui ferme `FR-060` ; outil absent ou registre absent ⇒ `échoué` | `src/checks/integration.ts` (CLI résolu par chemin, jamais de shell) ; `src/checks/process-utils.ts` |
| `tooling/quality-gate/src/checks/approval.ts` **(nouveau)** | contrôle `approbation` : périmètre = chemins déclencheurs modifiés dans le diff (aucun ⇒ `vide` ⇒ `ignoré`) ; exige la signature en CI (`FR-066`) et sur contexte indéterminé (`FR-067`), la couverture seule en local (`FR-061`) ; inertes et écartées partent en `remarques` | `src/checks/mutation.ts` (contrôle qui consomme un chargeur tri-état et mappe ses états sur des statuts) |
| `tooling/quality-gate/bin/approuver.ts` **(nouveau, outil)** | affiche le `git diff` réel des chemins déclencheurs, liste ce qu'il va couvrir, **demande le motif au clavier** (`FR-071`), écrit le JSON, puis lance `ssh-keygen -Y sign`. **Refuse de produire quoi que ce soit hors terminal interactif** (`FR-070`). Consomme `scope.ts` et `estCheminDeclencheurDeRevue()` — aucune liste ni empreinte dupliquée | `bin/gate.ts` (`main(argv, options)` testable, `process.exit` réservé au point d'entrée réel) |
| `tooling/quality-gate/package.json` · `package.json` (racine) | entrée de script `approuver` | scripts `gate` existants |

**`FR-070` sans porte dérobée — la forme du seam, à ne pas confondre avec un drapeau.** `SC-024`
exige que l'outil invoqué **sans terminal interactif** ne produise *aucun* artefact, et que le
scénario bout-en-bout s'en serve pourtant pour fabriquer ses approbations. Les deux tiennent parce
que `main(argv, io)` reçoit son `io` — `estInteractif`, lecture du motif, chemin de la clé — et que
**le point d'entrée réel le dérive de `process.stdin.isTTY`**, sans jamais l'exposer. Le harnais de
test injecte un `io` interactif et une clé de test sans passphrase ; la ligne de commande, elle,
n'offre **ni `--motif`, ni `--non-interactif`, ni équivalent**. Un drapeau rouvrirait exactement le
vecteur que `FR-070` ferme ; un seam de test ne l'ouvre pas, puisqu'il n'est pas atteignable depuis
la commande.

### Chemins protégés *(`FR-021`, `FR-023`, `FR-035` → `FR-037`, `FR-065`)*

| Fichier | Ce qui change | Patron de référence |
|---|---|---|
| `tooling/quality-gate/src/protected-paths.ts` | **source unique, trois consommateurs.** `estCheminPossedeParHumain()` = liste de 001 **+** `.claude/hooks/`, `.claude/settings.json`, `.claude/settings.local.json`, `.github/workflows/`, `tooling/quality-gate/`, `mutation-survivors.baseline.json`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` *(extension = `FR-036`, posée en dernier)*. `estCheminDeclencheurDeRevue()` = tout ce qui précède **+** `approbateurs.allowed_signers`, **moins** `approbations/**` (`FR-043`), **plus ce fichier lui-même de façon inconditionnelle** (`FR-065`). `estCheminProtege` reste exporté comme alias de la première, pour ne pas casser le hook en cours de route | lui-même (fonction pure, aucun accès disque) |
| `.claude/hooks/protect-paths.mjs` | importe `estCheminPossedeParHumain` ; message de refus mis à jour | lui-même |

**`FR-037` réduite — ce qui n'entre pas, et pourquoi le plan ne l'invente pas.** Les trois autres
catégories d'ADR-0006 amdt 2026-08-01 pt 3 — **seam déclaré**, **endpoint d'écriture nouveau**,
**allowlist réseau** — **ne sont pas inscrites**. Aucune n'a de forme de chemin écrite (ni
`packages/`, ni `apps/`, ni fichier d'allowlist n'existent) et « nouveau » qualifie un diff, pas un
chemin. Les inscrire produirait trois prédicats que rien ne peut vérifier. Elles entrent avec le code
qu'elles gardent, à la main (spec § *NON inclus*, `H-04`).

**`FR-036` et `.claude/settings.local.json` — la limite est vérifiée, pas supposée.** Le fichier est
exclu par le `core.excludesFile` **global de la machine** (`**/.claude/settings.local.json`), pas par
le `.gitignore` du dépôt : il n'apparaît donc dans aucun diff, la re-vérification de `FR-044` ne le
rattrape pas, et la protection de branche non plus. Le garde de session est son **unique** maillon —
c'est la limite que la spec écrit sous `FR-036`, et le seul chemin de la liste dans ce cas.

### Catalogue et installation *(`FR-046`, `FR-047`)*

| Fichier | Ce qui change | Patron de référence |
|---|---|---|
| `tooling/quality-gate/src/checks/versions-catalog.ts` | ajoute `FR-046` : chaque entrée du `catalog:` doit être une **version exacte** (`MAJEURE.MINEURE.CORRECTIF`, pré-release et métadonnées de build facultatives) ; **toute autre forme**, plage (`^`, `~`, `>=`, `*`, `x`, `\|\|`) ou non reconnue ⇒ `échoué`. Le `parserCatalogue` existant est réutilisé tel quel | lui-même |
| `tooling/quality-gate/src/checks/ci-lockfile.ts` **(nouveau)** | `FR-047` : dans **chaque** fichier de `.github/workflows/`, **chaque** étape installant les dépendances porte `--frozen-lockfile` ; périmètre = les workflows présents (`vide` si le dossier est absent) | `src/checks/versions-catalog.ts` (analyse textuelle légère d'un fichier de configuration, sans dépendance YAML) |

### Cinq contrôles dormants — chacun sa forme lexicale, chacun son périmètre *(`FR-048` → `FR-052`, `FR-064`)*

Le § *NON inclus* de la spec distingue ces cinq des dix reportés par un critère précis : leur **règle**
est une **forme lexicale close, déjà nommée littéralement par un ADR accepté**. Le tableau ci-dessous
tient ce critère au mot — chaque forme refusée est citée de son ADR, aucune n'est inventée ici.
Seul le **périmètre** est heuristique, et c'est la limite du *faux dormant* que la spec accepte en
connaissance de cause.

| Contrôle *(nouveau)* | `FR` | Périmètre propre | Forme refusée, et l'ADR qui la nomme |
|---|---|---|---|
| `src/checks/raw-markup.ts` | `FR-048` | fichiers `.astro` sous `apps/`/`packages/`, et modules de rendu sous `packages/core/` | la directive **`set:html`** ; et une déclaration de **`toBlocks`** dont le type de retour annoté est `string` / `Promise<string>`. *(ADR-0004 `## Constraints` : « INTERDIT qu'une sortie du renderer porte une chaîne de balisage, et INTERDIT au contrat de gabarit d'exiger `set:html` » ; ADR-0011 § 4 ; ADR-0008 amdt (b) — même forme refusée par la règle de lint livrée au client.)* **Ne juge pas le contexte déclaré par le descripteur** — c'est `C-17a`, reporté |
| `src/checks/upload-types.ts` | `FR-049` | fichiers sous `apps/`/`packages/` portant un attribut `accept` ou une liste de types MIME | le littéral **`image/svg+xml`**. *(ADR-0011 § 5 `## Constraints` : « INTERDIT d'accepter `image/svg+xml` sans un nouvel ADR ».)* |
| `src/checks/link-target.ts` | `FR-050` | fichiers sous `apps/`/`packages/` mentionnant `LinkTarget` ou un `href` de schéma d'entrée | l'appel **`z.string().url()`**. *(ADR-0004 amdt (c) : « INTERDIT de s'en remettre à `z.string().url()`, qui accepte `javascript:` » ; l'énumération fermée `http`/`https` est la forme attendue.)* |
| `src/checks/sql-interpolation.ts` | `FR-051` | fichiers sous `apps/`/`packages/` portant un littéral contenant `SELECT`/`INSERT`/`UPDATE`/`DELETE` | une **substitution `${…}`** à l'intérieur de ce même littéral. *(ADR-0004 amdt (c) : « INTERDIT de construire une clause SQL par interpolation, **y compris** pour un nom de colonne ou une clause `IN` de longueur variable ».)* |
| `src/checks/video-embed.ts` | `FR-052` | fichiers sous `apps/`/`packages/` construisant une URL d'embed vidéo | un hôte **`youtube.com/embed`** (au lieu de `youtube-nocookie.com`) et une URL **`player.vimeo.com`** sans **`dnt=1`**. *(ADR-0003 amdt (d) pt 8 : « l'URL d'embed vidéo construite par le cœur utilise le mode à confidentialité renforcée du fournisseur (`youtube-nocookie.com`, `dnt=1` chez Vimeo) ».)* |

| Fichier | Ce qui change | Patron de référence |
|---|---|---|
| les cinq contrôles ci-dessus | analyse lexicale d'une arborescence absente aujourd'hui ⇒ `perimetre()` retourne `vide` ⇒ `ignoré` | `src/checks/read-sql-in-apps.ts` (parcours `fs-utils` + motif lexical + cause nommant le fichier) |
| `tooling/quality-gate/src/checks/index.ts` | enregistre `approbation`, `ci-lockfile` et les cinq dormants, tagués `par-changement` | lui-même |

**`FR-064` — un périmètre par contrôle, et sa limite.** Chaque dormant déclare **son propre**
`perimetre()` ; l'un devient `non-vide` sans que les quatre autres bougent. La limite du **faux
dormant** est celle que la spec accepte : un motif qui manque un fichier laisse la ligne à `ignoré`,
et un `ignoré` faux est indistinguable d'un `ignoré` vrai. Rattrapage hors portail : la re-passe
d'audit **L11**, qui se déclenche précisément quand ces cinq périmètres cessent d'être vides.

### Protection de la branche par défaut *(`FR-053`, `FR-054`)*

Configuration **hors du dépôt**, donc aucun fichier. `FR-053` est **déjà tenue** : ADR-0006 amdt
2026-08-02 (b) consigne un *ruleset* actif — PR obligatoire, push direct, force-push et suppression
refusés, `bypass_actors` vide, portail en check requis. Reste dû par ce lot : ajouter le job
`tests-portail` (`FR-033`) **en second check requis** (`FR-054`). Vérification = **relevé d'état
consigné**, jamais un test : le portail ne peut pas lire la forge sans appel réseau, c'est-à-dire
sans un seam — soit l'inverse d'ADR-0006 pt 2.

### Gestes documentaires de clôture — portés par aucune `FR`, et dus quand même

La gate `analyze` a relevé qu'aucun geste du lot ne refermait ce que le lot rend faux. Ces quatre
fichiers ne sont couverts par aucun `SHALL` — comme `docs/JOURNAL.md` ne l'est jamais — mais ils sont
dus, et ils appartiennent au **dernier lot**, sauf les promotions d'ADR qui vivent dans la PR du lot
qu'elles autorisent.

| Fichier | Ce qui change |
|---|---|
| `docs/adr/_candidates/0012-draft.md` → `docs/adr/ADR-0012-…md` | promotion humaine par `/scd-sdd:adr`, dans la PR du lot d'amorçage du registre |
| `docs/adr/_candidates/0013-draft.md` → `docs/adr/ADR-0013-…md` | promotion humaine, dans la PR du **premier** lot qu'il autorise |
| `docs/adr/README.md` | deux lignes d'index, deux nœuds au graphe de dépendance, et la note « le prochain ADR est `0012` » → **`0014`** |
| `CLAUDE.md` | § *Génération IA (ADR-0006)* : la ligne de renvoi à ADR-0013 (§ *Régime d'écriture*) et la mention de l'approbation signée d'ADR-0012 · § *Audit de sécurité* : L10 fait, résiduels restants renumérotés · § *Pièges d'outillage* : le portail résout désormais la racine du dépôt · la note « prochain numéro libre `0012` » → `0014` |
| `docs/audit-securite-2026-08-01.md` | § *Tableau de suivi* : **seules** les lignes dont le résiduel entier est le check que ce lot livre passent `Traité` — `C-17e`, `C-17f`, `C-17h`, `B-14` (versant mécanique), `D-09`. Les cinq dormants (`A-03`, `B-05`, `C-07`, `C-17b`, `D-07`) gardent d'autres résiduels — règle de lint livrée au client, signature d'octets, mention RGPD — et voient leur colonne `Preuve` **rétrécie**, pas leur état changé. § *Jalons* et § *Journal des remédiations* mis à jour en conséquence |

**Pourquoi ce découpage plutôt qu'un basculement en bloc.** La règle de mise à jour de l'audit exige
que *le* mécanisme existe, et un dormant à `ignoré` **est** un mécanisme (`H-03` : une entrée du
registre est appliquée par un check requis, un test ne l'est pas). Mais un constat ne passe `Traité`
que si **tout** son résiduel est fermé, et trois des cinq dormants portent un versant que ce lot ne
touche pas. Faire verdir les cinq lignes serait exactement l'exception inventée au moment où elle
arrange le bilan, que le lot L9 s'est refusée.

## Contrats d'interface

```ts
// repo-root.ts — FR-068 / FR-069
export type EtatRacine =
  | { etat: "résolue"; racine: string }
  | { etat: "indeterminable"; cause: string };     // → tout contrôle : échoué (FR-069)
export function resoudreRacine(ctx: GateContext): EtatRacine;
```

```ts
// types.ts — les contrats qui rendent FR-031/FR-032 et FR-068 structurels
export type EtatPerimetre =
  | { etat: "vide" }                                   // → ignoré  (FR-031)
  | { etat: "non-vide"; fichiers?: string[] }          // → run     (FR-032)
  | { etat: "indeterminable"; cause: string };         // → échoué  (FR-057)

/** Trois seams de test, aucune surface CLI : le point d'entrée réel passe `{}`. */
export interface GateContext {
  racine?: string;          // fixtures ; sinon résolu par repo-root.ts (FR-068)
  diff?: EtatDiff;          // tests ; sinon résolu par scope.ts
  enCI?: boolean;           // tests ; sinon dérivé de l'environnement (FR-061, FR-066, FR-067)
}

/** Ce que reçoit un contrôle : la racine y est résolue, donc obligatoire. */
export interface CheckContext extends GateContext {
  racine: string;
}

export interface Check {
  id: string;
  regimes: Regime[];
  perimetre(ctx: CheckContext): Promise<EtatPerimetre>; // remplace applies(), et est APPELÉ
  run(ctx: CheckContext): Promise<CheckResult>;
}

export interface CheckResult {
  id: string; statut: Statut; cause?: string;
  remarques?: string[];               // rendues quel que soit le statut (FR-058, FR-042, FR-045)
}
```

```ts
// scope.ts
export type EtatDiff =
  | { etat: "résolu"; base: string; fichiers: string[]; empreinte(chemin: string): string }
  | { etat: "indeterminable"; cause: string };         // → tout contrôle qui en dépend : échoué (FR-055)
export function resoudreDiff(ctx: CheckContext): Promise<EtatDiff>;
```

```ts
// approval.ts — l'artefact, lié au CONTENU et non à la révision
export const approbationSchema = z.object({
  motif: z.string(),                          // STRUCTURE seulement — cf. la frontière ci-dessous
  chemins: z.record(z.string(), z.string()),  // chemin → sha256 du contenu, ou "absent"
});

export type EtatApprobations =
  | { etat: "absentes" }
  | { etat: "illisible"; cause: string }                          // FR-056 → contrôle échoué
  | { etat: "présentes"; entrees: Approbation[] };

export function couverture(
  entrees: Approbation[], diff: EtatDiff, exigeSignature: boolean,
): {
  couverts: string[];                                             // FR-062 — cumul
  decouverts: string[];                                           // FR-039 → échoué si non vide
  inertes: string[];                                              // FR-058 → remarques
  ecartees: { fichier: string; motif: "motif vide" | "signature non vérifiable" }[];
};                                                                // FR-042, FR-045 → remarques
```

```ts
// bin/approuver.ts — le seam est dans la signature, pas dans la ligne de commande
export interface IoApprobation {
  estInteractif: boolean;                     // dérivé de process.stdin.isTTY au point d'entrée réel
  demanderMotif(): Promise<string>;           // FR-071 — jamais pré-rempli, jamais dérivé du diff
}
export function main(argv: string[], io: IoApprobation): Promise<number>; // FR-070 si !estInteractif
```

**La frontière `illisible` / `écartée`, et pourquoi le schéma ne porte pas `motif.min(1)`.** Un
artefact **illisible** — JSON invalide, forme non conforme au schéma structurel — fait `échouer` le
contrôle : on ignore ce qu'il contenait, donc on ne peut pas conclure (`FR-056`, fail-closed). Une
entrée **bien formée mais invalide** — motif vide (`FR-042`) ou signature non vérifiable (`FR-045`) —
est **lue puis écartée** : elle ne couvre aucun chemin, elle est **nommée dans le rapport lisible**,
et elle **ne retire leur effet à aucune autre approbation** (`SC-022`). Mettre `.min(1)` sur `motif`
dans le schéma ferait basculer un motif vide du côté « illisible » et rendrait, par `FR-056`, une
approbation bavarde fatale à des approbations valides cumulées. La non-vacuité est donc une règle de
**validité**, appliquée après le parsing, jamais une règle de **lisibilité**.

**Statuts et invariants** (inchangés de la spec) : tout périmètre est mesuré **depuis la racine du
dépôt** (`FR-068`) ; `ignoré` ⇒ périmètre **vérifié** vide ; `passé` ⇒ périmètre non vide **et**
vérifié ; toute impossibilité de conclure ⇒ `échoué`. Code de sortie `0` si `TOUT VERT`, non-zéro
sinon.

**Contexte d'exécution** (`FR-061`, `FR-066`, `FR-067`, `FR-072`) : `ctx.enCI` s'il est injecté ;
sinon `CI` absente ou `"false"` ⇒ local, `"true"`/`"1"` ⇒ intégration continue, **toute autre valeur
⇒ indéterminé ⇒ signature exigée**. Le rapport lisible écrit, en local, « couvert » et jamais
« approuvé ».

**Geste humain d'approbation** (documenté dans le candidat ADR-0012) : `pnpm approuver` calcule les
empreintes, demande le motif au clavier, écrit le JSON, puis
`ssh-keygen -Y sign -f <clé> -n colibri-approbation <fichier>.json`. La clé est à passphrase et
**n'est jamais chargée dans l'agent SSH** — c'est une discipline d'exploitation, pas un mécanisme, et
la spec l'écrit comme telle.

## Décisions & alternatives écartées

1. **La racine est résolue en remontant vers `pnpm-workspace.yaml`, sans invoquer `git`.** Ce qui
   sépare `FR-069` de `FR-055` : un dépôt sans historique doit faire échouer les contrôles qui
   dépendent du **diff**, pas celui du catalogue, qui n'en dépend pas. *Écarté* :
   `git rev-parse --show-toplevel` — il fait dépendre onze contrôles d'un sous-processus et de la
   présence de git, et il échouerait sur les fixtures, qui ne sont pas des dépôts. *Écarté* : une
   entrée obligatoire de racine (drapeau ou variable) — `FR-068` l'exclut nommément, « une entrée
   obligatoire déplacerait la faute de l'oubli vers la mauvaise valeur, que rien dans le dépôt ne
   relit ».
2. **La racine est résolue une fois par `runGate` et remise aux contrôles dans un type où elle est
   obligatoire.** C'est ce qui supprime réellement `?? process.cwd()` : un contrôle ne peut plus
   retrouver le répertoire courant par accident. *Écarté* : laisser chaque contrôle appeler
   `resoudreRacine()` — onze occasions de refaire `É-06`, et onze résolutions par exécution.
3. **`typecheck` voit son périmètre élargi à tous les `tsconfig.json` de l'espace de travail.**
   Non par ambition, mais parce que la correction d'`É-06` supprimerait sinon la seule vérification
   de types réellement exécutée — ce qu'ADR-0013 pt 5 interdit. *Écarté* : déclarer
   `tsconfig.base.json` comme périmètre — il n'a pas de `include` et ne type-vérifie rien.
   *Écarté* : laisser `typecheck` sur `tooling/quality-gate/` — ce serait figer dans le code
   l'accident d'invocation qu'`É-06` corrige.
4. **`applies()` devient `perimetre()` tri-état, plutôt qu'un garde ajouté dans chaque `run()`.**
   Car cela rend `FR-032` **impossible à violer** : le chemin qui retournait `passé` à vide n'est
   plus atteint. *Écarté* : consulter `applies()` tel quel dans `runGate` — le booléen ne distingue
   pas « vide » d'« indéterminable », donc ne peut pas produire `FR-057`.
5. **L'approbation désigne l'empreinte du contenu, pas une révision.** `FR-040` et `FR-041` en
   découlent sans code de comparaison de commits, et rien ne dépend du découpage en commits
   (`SC-018`). *Écarté* : approuver un SHA de commit — un commit de suivi anodin périmerait
   l'approbation (`FR-041` violée) et un rebase la casserait.
6. **Signature SSH détachée (`ssh-keygen -Y`), registre au format `allowed_signers`.** Vérification
   **hors ligne** conforme à `FR-059`, gestion native de la passphrase, **aucune dépendance npm
   nouvelle** — donc aucun manifeste touché pour ce motif, ce qui compte vu `FR-036`. C'est aussi la
   nature de clé que la spec présuppose (§ *Ce que l'approbation ne prouve pas* raisonne sur l'agent
   de clés). *Écarté* : Ed25519 en PEM vérifié par `node:crypto` — il faudrait écrire soi-même la
   gestion de passphrase côté signature. *Écarté* : signatures de commit vérifiées par la forge —
   c'est un appel réseau, donc un seam, donc l'inverse d'ADR-0006 pt 2 (et cela replacerait la
   preuve hors du dépôt, là où aucun check requis ne la relit).
7. **Le registre d'approbateurs est lu à l'état du point de divergence**, jamais dans l'arbre de
   travail. C'est **la** ligne qui ferme `FR-060` : ajouter sa propre clé et s'en servir dans le
   même diff ne peut pas fonctionner. *Écarté* : lire le registre courant — `SC-016` échouerait.
8. **Les deux prédicats de chemins sont évalués sur le module de l'arbre de travail — et c'est
   `FR-065` qui ferme le trou, pas une lecture à la révision de base.** Le registre d'approbateurs
   est une **donnée** : la lire à la base coûte un `git show` (décision 7). Les deux listes de
   chemins sont du **code** : les lire à la base signifierait charger et **exécuter** un module TS
   d'une autre révision à l'intérieur du portail — une surface d'exécution nouvelle, dans le module
   dont toute la valeur est d'être digne de confiance. La fermeture est obtenue autrement, pour
   moins cher : `protected-paths.ts` est **déclencheur de revue inconditionnel, quel que soit son
   contenu** (`FR-065`). Un diff qui retire `.github/workflows/` de la liste **et** modifie
   `ci.yml` touche donc `protected-paths.ts`, exige une approbation signée, et met le retrait sous
   les yeux de l'humain qui signe — ce que `SC-020` mesure. *Écarté* : `git show <base>:…` puis
   `import()` dynamique — surface d'exécution nouvelle pour un gain nul.
9. **`estCheminProtege` reste exporté comme alias.** Le renommage seul casserait
   `protect-paths.mjs` et `protected-paths-consistency.test.ts` au milieu du lot, alors même que
   `.claude/hooks/` est sur le point de devenir intouchable.
10. **Le contrôle dormant de `FR-048` s'appelle `raw-markup.ts`, pas `render-context.ts`.** La spec
    réduit `FR-048` au versant `A-03` — l'insertion de **balisage brut** —, le contexte de rendu
    déclaré par le descripteur (`C-17a`) restant reporté faute d'un descripteur à lire. Un fichier
    nommé `render-context.ts` promettrait la règle reportée : le nom suivrait la promesse, et la
    ligne verte du rapport se lirait comme une couverture qu'on n'a pas. *Écarté* : garder le nom et
    n'implémenter que la moitié.
11. **Chaque dormant refuse une forme citée d'un ADR accepté, jamais une forme rédigée ici.** Le
    tableau du § *Cinq dormants* porte la citation en regard de chaque motif — c'est ce qui rend leur
    règle décidable avant l'écriture de la fixture, et c'est la différence exacte avec les dix
    résiduels reportés. *Écarté* : élargir un motif « par prudence » (par exemple refuser toute
    interpolation dans toute chaîne) — un dormant trop large produit un `échoué` que personne ne sait
    lever et sera désarmé au premier faux positif.
12. **`ci-lockfile` lit tous les workflows, y compris ceux ajoutés plus tard.** Le périmètre est
    « les fichiers présents dans `.github/workflows/` », jamais une liste nommée (`FR-047`, tranché
    en `clarify`). *Écarté* : énumérer `ci.yml` et `nightly.yml` — le prochain workflow échapperait
    au contrôle en silence.
13. **L'outil `approuver` automatise tout ce qui précède la signature, et rien au-delà.** La ligne de
    partage est mécanique, pas affaire de jugement : résoudre le diff, en extraire les chemins
    déclencheurs, calculer les empreintes et écrire le JSON sont des gestes sans discernement — les
    automatiser supprime la faute de frappe qui produit une approbation **inerte** (`FR-058`)
    silencieusement. Ce que l'outil ne peut pas produire, c'est la **signature** : un agent qui écrit
    le dépôt peut fabriquer un artefact parfaitement formé pour son propre diff et reste bloqué à la
    passphrase. **Deux gestes restent humains, et l'outil les impose** : la passphrase, qui porte
    toute la propriété, et le **motif** tapé au clavier (`FR-071`) — un motif pré-rédigé par l'agent
    qui a écrit le diff est une case à cocher déguisée (ADR-0006 amdt pt 3, « la revue est une
    lecture, pas une case »). *Écarté* : un drapeau `--motif` — il rouvre exactement ce que `FR-070`
    ferme. *Écarté* : faire résumer le diff par un agent pour approuver le résumé — cela referme le
    cercle qu'ADR-0006 pt 1 ouvre. Une relecture **adverse et indépendante** reste utile, mais elle
    ne bloque rien, ne relève d'aucune `FR`, et vit **hors de cette feature**.
14. **→ Candidat ADR : [`docs/adr/_candidates/0012-draft.md`](../../docs/adr/_candidates/0012-draft.md)
    — « Preuve d'attribution de l'approbation ».** Structurant **et** nouveau : aucun ADR accepté ne
    dit *qui* approuve ni *comment on le prouve*. Il porte le schéma de signature, le registre
    versionné, l'auto-référence fermée dans les deux sens (`FR-043` / `FR-060`), l'amorçage humain,
    l'écart local/CI délibéré, les deux propriétés de l'outil de fabrication (`FR-070`, `FR-071`) et
    les trois résiduels de la clé logicielle.
15. **→ Candidat ADR : [`docs/adr/_candidates/0013-draft.md`](../../docs/adr/_candidates/0013-draft.md)
    — « Régime d'amorçage du mécanisme d'application ».** Structurant **et** nouveau : ADR-0006
    interdit à l'IA d'éditer le mécanisme, sans prévoir le lot qui le construit. Il porte la
    déclaration du régime, la barrière substitutive, **l'expiration mécanique** par `FR-036`, ce qui
    reste interdit malgré la dérogation, et **sa relation explicite à ADR-0006** (§ *Régime
    d'écriture*).

**Les deux candidats restent des brouillons** jusqu'à promotion humaine par `/scd-sdd:adr`, et
doivent être **acceptés dans la même PR** que le code qu'ils incarnent (`CLAUDE.md` § *Comment
travailler ici*) : ADR-0013 dans la PR du **premier** lot qu'il autorise, ADR-0012 dans celle du lot
d'amorçage du registre.

## Couverture des `FR` de la spec

| Portion du plan | `FR` couvertes |
|---|---|
| `repo-root.ts` + résolution unique dans `runner.ts` | `FR-068`, `FR-069` |
| `perimetre()` + `runner.ts` | `FR-014`, `FR-031`, `FR-032`, `FR-057`, `FR-064` |
| `bin/gate.ts` + `report.ts` | `FR-017`, `FR-018`, `FR-058`, `FR-072` |
| `ci.yml` | `FR-033`, `FR-034` |
| `scope.ts` | `FR-044`, `FR-055`, `FR-063` |
| `protected-paths.ts` + hook | `FR-021`, `FR-023`, `FR-035`, `FR-036`, `FR-037`, `FR-065` |
| `approval*.ts` + `checks/approval.ts` + artefacts | `FR-038` → `FR-045`, `FR-056`, `FR-059`, `FR-060`, `FR-062`, `FR-066`, `FR-067` |
| `bin/approuver.ts` | `FR-070`, `FR-071` |
| `ctx.enCI` comme **entrée** de `runGate` | `FR-020`, `FR-061` |
| `versions-catalog.ts` | `FR-046` |
| `ci-lockfile.ts` | `FR-047` |
| cinq dormants | `FR-048` → `FR-052` |
| relevé de forge | `FR-053`, `FR-054` |

**Les 48 `FR` de la spec sont couvertes** — 6 `[MODIFIED]` et 42 `[ADDED]` (`FR-031` → `FR-072`).
`FR-013` **n'y figure pas** : la spec l'a sortie de `[MODIFIED]` (son `SHALL` est inchangé) et elle
est désormais une **non-régression à constater**, que `É-06` rend pour la première fois vérifiable —
le catalogue réel est lu, donc la provenance depuis le catalogue centralisé est enfin mesurée.

Deux `FR` sont couvertes hors code et doivent être déclarées telles en `tasks` : `FR-053` (déjà
tenue, à re-constater) et `FR-054` (geste de configuration), toutes deux vérifiées par **relevé
d'état consigné**, cf. spec § *Vérification*.

## Étape de vérification bout-en-bout

Une commande, exécutée **sur la branche du lot une fois `FR-036` posée**, dans un shell interactif
(cf. `CLAUDE.md` § *Pièges d'outillage* : `pnpm gate` exige un TTY) :

```
pnpm --filter @colibri/quality-gate test && pnpm gate
```

Elle prouve la feature entière parce qu'elle se referme sur elle-même :

- la **suite de tests** porte le scénario bout-en-bout de L10 sur un dépôt git temporaire, dont les
  approbations sont fabriquées **par `bin/approuver.ts` lui-même** (via son seam `IoApprobation`, avec
  une clé de test sans passphrase) — ce qui verrouille du même coup que l'outil ne produit rien que
  le contrôle refuserait (`SC-024`, dont l'autre moitié — aucun artefact hors TTY — est asserée sur
  le même `main`) : chemin déclencheur touché **par une commande shell** ⇒ `BLOQUÉ` (`SC-008`),
  approbation signée ⇒ `TOUT VERT` (`SC-007`), chemin non déclencheur retouché ⇒ toujours
  `TOUT VERT`, chemin déclencheur retouché ⇒ `BLOQUÉ` (`SC-009`), clé absente du registre ⇒ `BLOQUÉ`
  en CI et couverture seule, libellée « couvert », en local (`SC-015`), auto-approbation d'un ajout
  de clé ⇒ `BLOQUÉ` (`SC-016`), deux approbations cumulées ⇒ `TOUT VERT` (`SC-017`), approbation non
  résoluble ⇒ nommée au rapport (`SC-019`), **retrait d'une entrée de la liste + modification d'un
  chemin qu'elle couvrait ⇒ `BLOQUÉ`** (`SC-020`), **approbation invalide en présence
  d'approbations valides ⇒ `TOUT VERT`, et l'invalide nommée au rapport** (`SC-022`) ; elle porte en
  outre la **double exécution depuis deux racines** et la **double exécution local/CI**, comparées
  contrôle par contrôle (`SC-025`, `SC-023`) ;
- `pnpm gate` sur **le dépôt réel** émet le rapport lisible depuis le point d'entrée (`SC-011`),
  conclut sur la racine du dépôt — donc lit le **vrai** `pnpm-workspace.yaml` et les **vrais**
  workflows —, affiche les cinq dormants à `ignoré` et **aucun** contrôle `passé` à périmètre vérifié
  vide (`SC-010`, `SC-013`), montre que les trois consommateurs tirent leurs listes de la même source
  (`SC-021`), et ne rend `TOUT VERT` que parce que la branche porte **sa propre approbation signée**
  couvrant son propre diff — la barrière se prouve en s'appliquant à elle-même.

Reste hors de cette commande, par nature : `SC-014` (refus d'un push direct par la forge) et le
second check requis, relevés à la main.

## Ce que cette passe impose au découpage

`tasks.md` a été re-produit après la passe précédente et n'est plus périmé sur ses cinq points d'alors.
Cette passe-ci ajoute quatre exigences de découpage, qui s'ajoutent aux huit findings de découpage que
la gate a renvoyés à `tasks` :

- **`repo-root.ts` et la migration des onze contrôles sont la *première* tranche**, avant
  `perimetre()`. L'ordre inverse ferait basculer à `ignoré` des contrôles dont le périmètre est vide
  par accident d'invocation, c'est-à-dire graverait `É-06` dans le comportement au lieu de le
  corriger. Le volume réel de cette tranche — onze contrôles **et** leurs onze fichiers de test —
  est ce que la gate a nommé « `R1` sous-budgété ».
- **`typecheck` et `lint-format` sont deux tâches nommées, pas deux lignes d'une migration en
  masse** : leur périmètre est *redéfini*, pas déplacé, et chacun porte une vérification propre
  (`typecheck` type-vérifie encore le portail après le changement de racine ; `lint-format` reste
  `passé` sans contredire `SC-010`).
- **Une assertion de `SC-010` ne peut pas s'écrire « aucun des onze contrôles ne rapporte `passé` ».**
  `SC-010` parle d'un périmètre **vérifié vide** ; `lint-format` et `versions-catalog` ont un
  périmètre non vide sur ce dépôt et doivent rester `passé`.
- **Les gestes documentaires de clôture** (§ du même nom) et les **deux promotions d'ADR** sont des
  tâches, dans le dernier lot pour les premiers et dans la PR du lot autorisé pour les secondes.
