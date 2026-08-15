# Spec : Scaffold du projet
Statut : Brouillon | Créé : 2026-08-15 | Clarifié : 2026-08-15 | Trace vers : docs/prd.md
(FR-104, FR-105, SC-008) · docs/ci.md (§ Commandes du projet) · docs/archi.md (§ Invariants I1-I10)

## Légende
- **EARS** (*Easy Approach to Requirements Syntax*) — la forme normée des critères : cinq patterns,
  un par situation. Les mots-clés (`When`, `While`, `If…then`, `Where`, `shall`) restent en anglais
  pour que chaque critère se relise et se vérifie de la même façon partout.
- **shall** — le verbe de l'exigence : une phrase = une exigence = **une vérification observable**
  (ici, le plus souvent une commande dont on observe le code de sortie ou la sortie).
- **unwanted behavior** — le pattern du cas indésirable : `If <condition>, then the system shall …`
- **_(PRD: FR-0xx)_** — la backref : le besoin produit que ce critère décline.
- **Zone** — un des cinq répertoires (`site/`, `admin/`, `render/`, `core/`, `platform/`) que
  `docs/archi.md` fixe comme frontière de structure, tenue par le placement des fichiers et le sens
  des imports.
- **Invariant** (`I1`…`I10`) — une règle de structure de `docs/archi.md` qu'un contrôle automatique
  peut prendre en défaut.
- **Garde de scaffold** — le comportement actuel des jobs CI (`docs/ci.md`) : ils se déclarent hors
  portée et passent au vert tant qu'aucun `package.json` n'existe, sans rien vérifier.
- **Hors portée** — l'état d'un contrôle d'invariant dont le chemin n'existe pas encore dans le
  dépôt : il ne signale rien, et ne prouve donc rien.

## Résumé

Le dépôt ne porte encore aucun code. Des sept commandes que `docs/ci.md` déclare **normatives**
(build, typage, test, couverture, lint, code mort, mutation), aucune n'existe, et celle du graphe
d'imports y est « non posée ». La vérification d'invariants d'architecture, elle, est **réelle** —
mais elle n'a rien à examiner : mesurée le 2026-08-15, elle rapporte douze contrôles hors portée,
aucun au vert, et sort à `0`. Les dix invariants de structure de `docs/archi.md` (`I1`-`I10`, cinq
zones) ne sont donc, en fait, gardés par rien. Cette feature pose l'**outillage** qui rend ces
commandes réelles et le **squelette de dossiers** des cinq zones dont le sens des imports devient
mécaniquement vérifiable — rien de plus.
Elle ajoute aussi une commande de développement local (case vide de `docs/ci.md`), le mécanisme de
migration de base de données (sans schéma applicatif), et une configuration de déploiement cohérente
avec `instance.json` (sans déploiement réel).

**Elle ne livre aucun code applicatif** : ni page, ni écran, ni route, ni authentification, ni
logique métier. C'est la fondation sur laquelle toute feature produit s'appuie ensuite — dans les
mots de `docs/prd.md` à propos d'une autre fondation (US1) : « sans elle, aucune autre story n'est
atteignable ». La traçabilité directe vers un `FR`/`SC` du PRD est donc indirecte : `FR-104`,
`FR-105` et `SC-008` (une nouvelle version se déploie sur une instance existante sans code
spécifique et sans perte de contenu) sont ce que cette fondation rend possible, pas ce qu'elle
livre elle-même. Chaque critère ci-dessous trace en plus, nommément, vers la ligne de `docs/ci.md`
ou l'invariant de `docs/archi.md` qu'il rend réel.

## User stories (priorisées)

### US1 — La CI cesse de mentir (Priorité : P1)
Les sept vérifications que `docs/ci.md` déclare normatives — build, typage, tests, couverture,
lint, détection de code mort, test de mutation — cessent de passer au vert par garde de scaffold :
elles s'exécutent pour de vrai sur le squelette de ce lot.
- Trace vers : PRD FR-105, SC-008 ; docs/ci.md § Commandes du projet
- Scénarios d'acceptation (EARS) :
  1. **When** `package.json` existe dans le dépôt, the system **shall** exécuter la vérification
     réelle de chaque job au lieu de sa garde de scaffold.
  2. **When** une erreur de type est introduite dans le code source, the system **shall** faire
     échouer la commande de typage avec un code de sortie non nul.

### US2 — Le squelette des cinq zones est mécaniquement vérifiable (Priorité : P1)
Les cinq zones de `docs/archi.md` existent comme répertoires distincts **portant chacun au moins un
fichier source versionné**, et le sens des imports devient vérifiable. La vérification a **deux
porteurs**, comme `docs/ci.md` les répartit déjà : le sens des dépendances entre zones (`I1`) revient
à la commande de graphe d'imports posée par ce lot, l'interdiction du framework et de la plateforme
dans `core` (`I2`) revient à la vérification d'invariants d'architecture **déjà en place**.
- Trace vers : docs/archi.md I1, I2 ; docs/ci.md § Contrôles (jobs `boundaries` et
  `arch-invariants`) ; PRD SC-008 (uniformité de la flotte)
- Scénarios d'acceptation (EARS) :
  1. **When** un fichier d'une zone importe un fichier d'une autre zone dans un sens que `I1`
     interdit, the system **shall** signaler cet import comme violation, par la commande de graphe
     d'imports (`FR-010`).
  2. **When** un fichier de la zone `core` importe le framework web, le framework d'îlots, ou une
     API propre à la plateforme, the system **shall** signaler cet import comme violation (`I2`),
     par la vérification d'invariants d'architecture déjà en place (`FR-011`).
  3. **When** les deux vérifications de cette user story sont exécutées sur le squelette livré, the
     system **shall** exercer `I1` — par la commande de graphe d'imports (`FR-010`) — ainsi que
     `I2`, `I3`, `I4`, `I5`, `I8` et `I10` — par le contrôle d'invariants d'architecture déjà en
     place (`FR-011`) —, `I6`, `I7` et `I9` restant seuls déclarés hors portée faute des fichiers
     qu'ils nomment.

> **Pourquoi ce plancher, et pas un `.gitkeep`.** Le contrôle d'invariants ne regarde que les
> fichiers **versionnés** (`git ls-files`), et un répertoire vide n'existe pas pour Git. Mesuré le
> 2026-08-15 sur le dépôt en l'état : **aucun** contrôle au vert, **douze** hors portée — le script
> sort à `0` sans avoir rien vérifié. Un fichier source par zone est le minimum qui rende `SC-004`,
> `SC-005` et `SC-010` atteignables.
>
> **Ce que le plancher ouvre, et ce qu'il ne prouve pas encore.** Un contrôle sort de « hors
> portée » dès que le répertoire qu'il nomme porte un fichier versionné — **indépendamment de ce
> qu'il y trouve**. `I3` et `I4` passent donc au vert **faute de matière à condamner** : aucun
> fichier n'importe `src/render/`, aucun gabarit de page ne vit sous `src/admin/`, et le contrôle
> d'`I3` le dit de lui-même (« *ou n'existent pas encore* »). Leur vert n'atteste rien aujourd'hui ;
> il prendra sa valeur avec la première feature qui posera le baril de `render` ou un écran
> d'administration. **Le vert d'`I3` n'est pas gratuit pour autant** : son contrôle balaie tous les
> fichiers source à la recherche d'un chemin écrit en dur, et le lot en pose lui-même qui ont à
> désigner les cinq zones — c'est `FR-026` qui exige qu'aucun ne le fasse sous une forme que ce
> contrôle condamne.
> Les cinq autres ont, eux, de la matière à examiner — le sens des imports du plancher (`I1`), les
> sources qui pourraient importer le framework depuis `core` (`I2`) ou rendre du HTML brut (`I5`),
> les valeurs d'`instance.json` (`I8`), la configuration du site (`I10`) —, et deux d'entre eux
> sont en outre démontrés par un défaut injecté (`SC-004`, `SC-005`).

### US3 — Un serveur de développement local démarre, base branchée (Priorité : P1)
`docs/ci.md` déclare la commande de run local comme une case vide « à poser au scaffold ». Ce lot
la pose — **une seule commande**, et elle donne aussi l'accès à la base locale que `US4` migre : la
cohérence entre les deux est ainsi constatée au lieu d'être supposée.
- Trace vers : docs/ci.md § Commandes du projet (ligne « Run local ») ; ADR-0018 (accès aux
  données) ; PRD FR-096, FR-097 (aucun traitement serveur sur une page publique)
- Scénarios d'acceptation (EARS) :
  1. **When** la commande de développement local est lancée, the system **shall** démarrer un
     serveur accessible en HTTP sur la machine du développeur, sans erreur.
  2. **When** une route servie par ce serveur interroge la base de données locale, the system
     **shall** rendre le résultat de cette interrogation, sur la base même où `FR-013` a appliqué
     ses migrations.
  3. **When** la commande de build est exécutée, the system **shall** produire un artefact qui ne
     sert pas cette route — elle n'existe qu'en développement (`FR-024`).

### US4 — Le mécanisme de migration de base de données fonctionne (Priorité : P1)
La chaîne de migration (fichiers SQL numérotés → application ordonnée) fonctionne de bout en bout,
sur une migration **sans effet sur le schéma** — aucun objet propre au produit n'est créé par ce
lot, de sorte que l'exclusion « aucun schéma de données applicatif » tient au mot près et que rien
ne restera à nettoyer plus tard.
- Trace vers : PRD FR-105, FR-106, SC-008 ; ADR-0018 (accès aux données)
- Scénarios d'acceptation (EARS) :
  1. **When** la commande de migration est lancée sur une base locale neuve, the system **shall**
     appliquer les migrations en attente dans leur ordre numéroté.
  2. **When** la commande de migration est relancée sans nouveau fichier de migration, the system
     **shall** rapporter zéro migration en attente.
  3. **When** les migrations de ce lot ont été appliquées, the system **shall** laisser un schéma
     dépourvu de tout objet propre au produit — seules subsistent les tables de service du
     mécanisme de migration lui-même.

### US5 — La configuration de déploiement est cohérente, sans déploiement réel (Priorité : P1)
`instance.json` existe, porte des valeurs d'exemple documentées comme telles, et est lu par la
configuration du site (`I8`, `I10`). `npm run build` produit un artefact
déployable sans qu'aucun identifiant de compte Cloudflare ne soit présent.
- Trace vers : docs/archi.md I8, I10 ; PRD SC-001 (0 €, aucun compte sollicité), SC-013
- Scénarios d'acceptation (EARS) :
  1. **When** la configuration du site lit une valeur propre à l'instance (le domaine), the system
     **shall** la lire depuis `instance.json`, jamais depuis une valeur écrite en dur.
  2. **When** la commande de build est exécutée dans un environnement ne portant aucun identifiant
     de compte Cloudflare, the system **shall** produire l'artefact et terminer sans erreur.
  3. **When** la liaison de base de données est déclarée dans la configuration de déploiement, the
     system **shall** l'y déclarer sans identifiant de base, de sorte qu'aucune valeur fictive ne
     soit versionnée.

> **`I10` ne porte plus que la configuration du site, et ce lot y est conforme.** `ADR-0030`
> exigeait que la configuration du site **et** celle du Worker lisent `instance.json` « au moment
> où elles s'évaluent, **sans outil intermédiaire** ». La première le fait. La seconde ne le peut
> pas : mesuré le 2026-08-15, l'outil de déploiement n'accepte que du JSON ou du TOML **statique**
> — un fichier de configuration évalué (`wrangler.ts`) est refusé net, et un fichier statique ne
> lit rien. `ADR-0032`, accepté le 2026-08-15, en tire la conséquence : il **remplace `ADR-0030`**
> et sort la configuration du déploiement du périmètre de `I10`. Ce lot livre donc une
> configuration de déploiement statique, **sans valeur d'instance** — elle n'en a d'ailleurs
> aucune à porter, le rattachement de base relevant de son lieu propre (`ADR-0020`). Le contrôle
> `I10` est exercé et **passe** : il n'y a plus d'écart à porter.

## Exigences fonctionnelles (EARS, atomiques, testables)

### Outillage CI (US1)
- **FR-001** : When `npm ci` est exécuté contre le lockfile committé, the system shall terminer
  l'installation sans erreur. _(docs/ci.md — Installation)_
- **FR-027** : The system shall déclarer la période de gel de sept jours dans le fichier de
  configuration du gestionnaire de paquets, à l'endroit où le contrôle permanent de la CI la lit.
  _(CLAUDE.md — gotcha `.npmrc` `min-release-age=7` ; ADR-0031 ; docs/ci.md — job
  `dependency-review`)_
- **FR-002** : The system shall fournir une commande de build qui produit un artefact déployable
  pour le Worker. _(PRD: FR-104, FR-105 ; docs/ci.md — Build)_
- **FR-003** : When le code source contient une incohérence de type, the system shall faire échouer
  la commande de typage (code de sortie non nul). _(docs/ci.md — Typage)_
- **FR-004** : The system shall fournir une commande qui exécute les tests automatisés du projet.
  **While** le dépôt ne porte encore aucun fichier de test, cette commande shall terminer avec un
  code de sortie nul. _(docs/ci.md — Tests)_
- **FR-005** : The system shall fournir une commande de lint qui rapporte des diagnostics de style
  et de correction sans modifier les fichiers source. _(docs/ci.md — Lint/format)_
- **FR-006** : The system shall fournir une commande de couverture qui produit un rapport
  machine-lisible (`coverage/lcov.info`). **While** aucun test n'existe, ce rapport shall être
  produit **et vide**. _(docs/ci.md — Couverture)_
- **FR-007** : The system shall fournir une commande de détection de code mort, exécutable
  indépendamment de la commande de test de mutation. _(docs/ci.md — Code mort)_
- **FR-023** : The system shall fournir une commande de test de mutation, exécutable indépendamment
  de la commande de détection de code mort. **While** le dépôt ne porte aucun test, cette commande
  shall rapporter son refus d'exécuter, plutôt qu'un succès. _(docs/ci.md — Mutation)_
- **FR-008** : When `package.json` est présent dans le dépôt, the system shall exécuter la
  vérification réelle de chaque job CI concerné au lieu de sa garde de scaffold. _(docs/ci.md — §
  L'état du dépôt)_

### Squelette des zones (US2)
- **FR-009** : The system shall organiser les fichiers source en cinq zones distinctes — `site`,
  `admin`, `render`, `core`, `platform` — correspondant chacune à un répertoire de premier niveau
  sous `src/`, **chacun portant au moins un fichier source versionné**. _(docs/archi.md — Vue
  d'ensemble)_
- **FR-010** : The system shall fournir une commande, **distincte de la vérification d'invariants
  d'architecture existante**, qui rapporte tout import dont la zone source et la zone cible violent
  le sens des dépendances fixé par `I1`, sur le graphe d'imports **résolu**. _(docs/archi.md I1 ;
  docs/ci.md — job `boundaries`)_
- **FR-011** : If un fichier de la zone `core` importe le framework web, le framework d'îlots, ou
  une API propre à la plateforme, then the system shall signaler cet import comme violation, **par
  la vérification d'invariants d'architecture déjà en place** — ce lot n'en écrit pas une seconde.
  _(docs/archi.md I2 ; docs/ci.md — job `arch-invariants`)_
- **FR-025** : The system shall livrer un `docs/ci.md` dont la ligne du job `boundaries` distingue
  la part que ce lot referme — la matrice d'`I1` (`FR-010`) — de celle qui reste `[à compléter]` —
  le reliquat d'`I3` qu'un contrôle littéral ne voit pas. _(docs/ci.md — Graphe d'imports,
  invariants `I1` et `I3` ; frontière « le reliquat d'`I3` n'est pas posé » ci-dessous)_
- **FR-026** : The system shall livrer un arbre de sources dont **aucun fichier versionné hors de
  `src/render/`** ne porte la chaîne littérale `src/render/` suivie d'un caractère, de sorte que le
  contrôle littéral d'`I3` rapporte cet invariant **passant** et non en violation. La règle vaut
  pour **tout** fichier du lot, y compris ceux qui ont à désigner les cinq zones : c'est le
  plancher de `FR-009` qui réveille ce contrôle, et le lot s'y plie plutôt que de l'affaiblir.
  _(docs/archi.md I3 ; docs/ci.md — job `arch-invariants`)_

### Run local (US3)
- **FR-012** : The system shall fournir une commande unique qui démarre un serveur de développement
  local accessible en HTTP, **dont les routes atteignent la base de données locale sur laquelle
  `FR-013` applique ses migrations**. _(docs/ci.md — Run local)_
- **FR-024** : The system shall livrer la route de développement qu'exige `FR-012` **hors de
  l'artefact bâti** : la commande de build ne la produit pas, et l'artefact déployable ne la sert
  pas. _(PRD: FR-096, FR-097 ; frontière « aucune route servie par l'artefact bâti » ci-dessous)_

### Migration de base de données (US4)
- **FR-013** : The system shall fournir une commande qui applique, dans leur ordre numéroté, les
  migrations en attente d'un ensemble de fichiers de migration versionnés vers une instance de base
  de données locale. _(PRD: FR-105, FR-106, SC-008 ; ADR-0018)_
- **FR-014** : When la commande de migration est exécutée deux fois de suite sans nouveau fichier de
  migration, the system shall rapporter zéro migration en attente la seconde fois.
  _(dérivé de `FR-013` ; PRD: FR-106 — une montée de version ne perd rien)_
- **FR-021** : The system shall livrer des migrations qui n'ajoutent **aucun objet de schéma propre
  au produit** — après application, seules subsistent les tables de service du mécanisme de
  migration lui-même. _(frontière : « aucun schéma de données applicatif » ci-dessous)_

### Configuration de déploiement (US5)
- **FR-015** : The system shall fournir un fichier de configuration d'instance à la racine du dépôt,
  portant au minimum le domaine de l'instance, **lu par la configuration du site au moment où elle
  s'évalue**. _(docs/archi.md I8, I10)_
- **FR-016** : The system shall déclarer la liaison de base de données nécessaire à l'artefact
  déployable dans la configuration de déploiement, **sans identifiant de base** et sans que le build
  n'exige de connexion réelle à une base. _(docs/archi.md C1 — reconstructibilité)_
- **FR-017** : When la commande de build est exécutée dans un environnement ne portant aucun
  identifiant de compte Cloudflare, the system shall produire l'artefact et terminer avec un code de
  sortie nul. _(PRD: SC-001, SC-013)_
- **FR-022** : The system shall livrer une configuration de déploiement **ne portant aucune valeur
  propre à l'instance**, celle-ci étant hors du périmètre de `I10`.
  _(docs/archi.md I10 ; ADR-0032, qui remplace ADR-0030)_

## Cas limites & comportements indésirables (unwanted behavior)

- **FR-018** : If le lockfile committé ne correspond pas à `package.json`, then `npm ci` shall
  échouer plutôt que de resynchroniser silencieusement le lockfile. _(docs/ci.md — le lockfile est
  committé et l'installation verrouillée)_
- **FR-019** : If une dépendance à installer a une version publiée il y a moins de sept jours, then
  la commande d'installation shall retenir une version antérieure éligible plutôt que celle-ci.
  _(CLAUDE.md — gotcha `.npmrc` `min-release-age=7` ; ADR-0031 ; la déclaration de cette période
  est portée par `FR-027`)_
- **FR-020** : If un import viole `I1` ou `I2`, then la vérification concernée — celle de `FR-010`
  ou celle de `FR-011` — shall le rapporter, que la commande de build ou de lint échoue par ailleurs
  ou non : la détection ne dépend d'aucune autre commande. _(docs/archi.md I1, I2 ; docs/ci.md —
  jobs `boundaries` et `arch-invariants`)_
- Que se passe-t-il si aucune migration n'a encore jamais été appliquée sur une base neuve ? La
  commande de migration (FR-013) les applique toutes, dans l'ordre, en un seul appel.
- Que se passe-t-il quand la commande de test ne trouve aucun fichier de test ? Elle retourne zéro
  (`FR-004`). **C'est une concession, et elle est datée.** Sans elle, le job `test` — bloquant —
  tomberait dès le premier commit de code : mesuré le 2026-08-15, le lanceur de tests sort avec un
  code non nul quand il ne trouve aucun fichier de test. En contrepartie, un job bloquant passe au
  vert sans rien vérifier — la garde de scaffold que ce lot retire, réinstallée ailleurs —
  et **aucun garde du dépôt ne l'attrape** : les gardes d'intégrité traquent `@ts-ignore`,
  `eslint-disable`, `as any` et les tests neutralisés, jamais une option du lanceur. Elle doit être
  retirée par la première feature qui apporte des tests.
- Que se passe-t-il pour la commande de mutation, tant qu'aucun test n'existe ? Elle refuse
  d'exécuter (`FR-023`) : mesuré, elle exige que des tests aient réellement tourné, et l'option de
  `FR-004` ne l'y aide pas. Le travail nocturne part donc en rouge dès le premier soir. Ce rouge ne
  bloque aucune intégration — la commande de mutation ne figure pas parmi les contrôles exigés — et
  il s'éteint avec la même feature que la concession précédente.

## Contrats d'entrée/sortie (schémas machine-lisibles)

**`instance.json`** (racine du dépôt) — porte, au minimum pour ce lot, les champs que
`docs/archi.md` (`I8`) affecte à ce fichier et que ce lot peut déjà renseigner avec des valeurs
d'exemple documentées comme telles (pas de valeur réelle de cliente) :

```json
{
  "domain": "exemple.colibri.test",
  "turnstilePublicKey": "1x00000000000000000000AA"
}
```

`domain` est lu par la configuration du site (URL canoniques) — et par elle seule, la configuration
de déploiement n'en lisant aucune valeur (`FR-022`, et l'encadré d'`US5`). La clé
publique Turnstile est portée par ce fichier par anticipation de `I8`, sans qu'aucun code de ce lot
ne l'utilise encore — aucun formulaire n'existe.

**Codes de sortie des commandes que ce lot pose** — les huit sont les sept normatives de
`docs/ci.md` et le graphe d'imports, qui y est « non posée ». **Sept** d'entre elles (build,
typage, tests, lint, couverture, détection de code mort, graphe d'imports) retournent `0` sur le
scaffold livré, et un code non nul en présence du défaut qu'elles sont faites pour détecter. La
**huitième**, la mutation, est
posée et s'exécute, mais son code de sortie n'entre dans aucun critère de ce lot tant qu'aucun test
n'existe (`FR-023`).

Ce lot ne fixe **aucun seuil** (ex. taux de couverture minimal) : `docs/ci.md` documente ces
contrôles comme informatifs aujourd'hui, statut que ce lot ne change pas.

**La configuration de déploiement**, elle, déclare la liaison de base de données par son nom de
liaison, son nom de base et son répertoire de migrations — et **pas d'identifiant de base**
(`FR-016`) : le mode local n'en exige aucun, si bien qu'aucune valeur fictive n'a besoin d'être
versionnée, et que le fichier livré est incomplet **de façon visible** pour la livraison réelle.

## NON inclus (frontière de périmètre)

- **Aucun code applicatif, et aucune route servie par l'artefact bâti** : ni page, ni écran, ni
  composant produit. Les cinq zones existent comme structure de dossiers portant chacune un fichier
  trivial (`FR-009`), pas comme application. **Une seule route est posée** — la sonde de
  développement qu'exigent `FR-012` et `SC-006` pour prouver que le serveur local atteint bien la
  base migrée. Elle vit hors de l'artefact, et c'est `FR-024` qui l'exige : c'est cette absence, et
  non le silence sur la sonde, qui tient `FR-096` et `FR-097` du PRD — « l'envoi d'une demande DOIT
  être le seul geste d'un visiteur déclenchant un traitement serveur ».
- **Aucun des fichiers que les invariants nomment.** `src/render/index.ts`, `src/site/page.astro`,
  les deux routes qui l'importent, `src/platform/session/index.ts`, `src/platform/frequence/` et
  `src/core/publication/prefixes.ts` ne sont **pas** posés par ce lot. Conséquence assumée et
  mesurée : `I6`, `I7` et `I9` se déclarent « hors portée » et ne vérifient rien tant qu'une feature
  produit ne les fait pas naître. `I3` et `I4`, eux, **sortent** de cet état — le plancher fait
  naître `src/render/` et `src/admin/` (`FR-009`) — mais passent sans matière à examiner : c'est
  l'encadré d'`US2` qui le dit, et `SC-010` qui compte l'état rapporté, jamais la valeur du constat.
- **Le reliquat d'`I3` dans le job `boundaries` n'est pas posé.** `docs/ci.md` affecte à ce job la
  matrice d'`I1` **et** ce qu'un contrôle littéral ne voit pas d'`I3` — ré-exports, barils, alias.
  Ce lot ne livre que la matrice d'`I1` (`FR-010`) : la case du tableau reste `[à compléter]` **pour
  moitié**, et `FR-025` exige que le document le dise de lui-même plutôt que de laisser croire la
  case close. La moitié d'`I3` que `arch-invariants` rend déjà — les chemins d'import littéraux et
  la présence du gabarit partagé dans les deux routes — n'est pas entamée par cette frontière.
- **Aucune unité de logique métier, donc aucun test.** Le lot ne pose ni fonction de `core/` ni test
  qui la couvre ; la commande de test est fournie et verte à vide (`FR-004`), et les deux
  conséquences en sont écrites au chapitre des cas limites. **Le rapport par test — un résultat
  passant ou échouant pour chacun — n'est donc ni exigé ni vérifié ici** : il ne s'observe qu'avec
  des tests, et se prouvera avec la première feature qui en apporte — celle-là même qui retire la
  concession du code de sortie nul à vide.
- **Aucune lecture du fichier d'instance par la configuration de déploiement** (`FR-022`) : la
  plateforme ne le permet pas, et `ADR-0032` l'a sortie du périmètre de `I10` — ce n'est plus un
  écart, c'est une frontière.
- **Aucune authentification ni session réelle** : rien de ce lot ne sert de connexion, de code, ou
  de cookie de session — ces mécanismes appartiennent à une feature dédiée (PRD `FR-001` à
  `FR-014`).
- **Aucun schéma de données applicatif** : ni table de pages, de réglages, de formulaires ou de
  demandes. Seul le mécanisme de migration est prouvé, sur une migration triviale.
- **Aucun déploiement réel** : aucun compte Cloudflare n'est ouvert ni sollicité, aucun secret réel
  n'est créé ou manipulé. La configuration produite est cohérente, jamais exécutée en production.
- **Aucun changement du statut bloquant/informatif d'un contrôle CI existant.** `lint`, `coverage`,
  `sast`, `arch-invariants`, `boundaries` restent informatifs, tels que `docs/ci.md` les fixe
  aujourd'hui — la décision de les durcir appartient au chantier
  `docs/chantiers/en-attente/2026-08-14-durcissement-ci.md`, pas à ce lot.
- **Aucun en-tête de sécurité applicatif** (CSP de l'administration, ADR-0015) : sans route
  d'administration, il n'y a rien à protéger dans ce lot.

## Critères de succès mesurables

- **SC-001** : Sur un environnement neuf (ex. un runner CI), `npm ci` réussit contre le lockfile
  committé. _(PRD: SC-008)_
- **SC-002** : Sept des huit commandes que ce lot pose — les sept normatives de `docs/ci.md` et le
  graphe d'imports — s'exécutent et retournent **0** sur le scaffold livré, sans passer par la garde
  de scaffold : build, typage, tests, lint, couverture, détection de code mort, vérification du
  graphe d'imports. La huitième — la mutation — s'exécute réellement, et son code de sortie n'entre
  pas dans ce critère tant qu'aucun test n'existe.
- **SC-003** : Une erreur de type introduite délibérément fait échouer la commande de typage.
- **SC-004** : Un import qui viole `I1` (sens des zones) est signalé par la commande de graphe
  d'imports posée par ce lot (`FR-010`).
- **SC-005** : Un import du framework ou de la plateforme depuis la zone `core` est signalé par la
  vérification d'invariants d'architecture **déjà en place** (`FR-011`, `I2`) — un porteur distinct
  de celui de `SC-004`.
- **SC-006** : Le serveur de développement local démarre, répond sur `localhost` sans erreur, et une
  de ses routes lit la base locale sur laquelle les migrations ont été appliquées.
- **SC-007** : Une migration appliquée deux fois de suite ne réapplique rien la seconde fois (zéro
  migration en attente rapportée), et le schéma obtenu ne porte aucun objet propre au produit.
- **SC-008** : `npm run build` produit un artefact déployable et termine sans erreur dans un
  environnement ne portant **aucun identifiant de compte Cloudflare**. _(PRD: SC-001, SC-013)_
- **SC-009** : Le gel de sept jours est **démontré une fois** : une installation retient une version
  antérieure alors qu'une plus récente existe et a moins de sept jours. La sortie est conservée
  comme pièce, datée. Le contrôle permanent, lui, se borne à lire la clé déclarée (`FR-027`).
- **SC-010** : Sur le squelette livré, **sept** des dix invariants sont exercés et **trois
  seulement** — `I6`, `I7`, `I9` — se déclarent « hors portée » : `I2`, `I3`, `I4`, `I5`, `I8` et
  `I10` par la vérification d'invariants d'architecture déjà en place (`FR-011`), et `I1` par la
  commande de graphe d'imports que ce lot pose (`FR-010`), cette vérification-là déclarant
  explicitement ne pas rendre `I1`. **Deux porteurs**, comme `SC-004` et `SC-005` les distinguent
  déjà. Ce critère porte sur **l'état que chaque contrôle rapporte**, jamais sur la valeur de ce
  qu'il a trouvé : deux des sept — `I3` et `I4` — passent faute de matière à examiner, et l'encadré
  d'`US2` dit à quelle condition leur vert cessera d'être vide.
