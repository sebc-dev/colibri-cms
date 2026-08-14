# Contrôles CI — ColibriCMS

| | |
|---|---|
| **Statut** | Actif |
| **Date** | 2026-08-14 |
| **Trace vers** | [Stack](./stack.md) · [Archi](./archi.md) · [ADR](./adr/) |
| **Forge** | GitHub Actions — `.github/workflows/ci.yml` · `.github/workflows/nightly.yml` |
| **Consommé par** | `CLAUDE.md` (phase `contract`), qui lit ses commandes ici plutôt que de les inventer |
| **Documents liés** | [Socle de livraison](./socle-de-livraison.md) — le garde-fou du socle `C5` que le job `build` compte · [Chantier de durcissement](./chantiers/en-attente/2026-08-14-durcissement-ci.md) |

> **Ce que ce document est.** La synthèse de ce qui est vérifié **hors de l'agent**. Le contrôle
> réel est le fichier de workflow ; ce document en donne la portée, le statut et les limites.
> `CLAUDE.md` peut conseiller — seul le check serveur sous protection de branche refuse.
>
> **Pourquoi cette phase existe.** Le niveau implémentation atteste **de lui-même** que les tests
> sont intacts : il lance `git diff` sur les fichiers de test, les restaure s'ils ont bougé, et
> retourne `testsUntouched: true`. Le producteur est son propre vérificateur — ce que le cycle
> refuse partout ailleurs. La CI est le seul endroit où cette affirmation est vérifiée par un tiers.

---

## L'état du dépôt au moment où cette phase est jouée

**Le dépôt ne porte aucun code** : ni `package.json`, ni `package-lock.json`, ni source. Il ne
porte que le socle documentaire, `.github/allowed_signers` et, désormais, ce portail.

Deux conséquences, toutes deux assumées :

1. Les commandes du tableau ci-dessous sont **normatives, pas constatées** : elles fixent les noms
   de scripts que le scaffold devra honorer. Le premier commit de code qui ne les fournit pas fera
   échouer `build` ou `test` — c'est l'effet recherché.
2. Les jobs qui en dépendent portent une **garde de scaffold** : ils testent la présence de
   `package.json` et se déclarent hors portée tant qu'il n'existe pas. **Ils passent alors au vert
   sans rien vérifier.** C'est un mensonge par construction, borné dans le temps, et il est écrit
   ici pour qu'il ne soit pris pour une garantie par personne.

**Le gestionnaire de paquets retenu est `npm`**, arbitré le 2026-08-14 : `docs/stack.md` ne le
tranche pas, et ce choix décide d'un contrôle entier — le cooldown de dépendances est une clé du
résolveur, pas un job. Trois faits mesurés sur la machine de développement le 2026-08-14 :
`npm 11.16.0` est présent et porte nativement `min-release-age` (en **jours**, `npm config ls -l` ;
documentation embarquée `docs/content/using-npm/config.md` de la distribution installée) ;
**`pnpm` n'est pas installé** ; `bun 1.3.14` est présent et son aide n'expose aucun équivalent. Le
motif qui avait retenu pnpm au socle v1 — « le cooldown est une mécanique propre à pnpm » —
n'est donc plus vrai. Si le scaffold retient un autre gestionnaire, **ce document et les workflows
sont à reprendre ensemble**.

---

## Commandes du projet

Ce tableau est la source unique. `CLAUDE.md` y renvoie, il ne le recopie pas.

| Rôle | Commande | État |
|---|---|---|
| Installation | `npm ci` | Réelle — **jamais** `npm install` |
| Build | `npm run build` | **Normative** — à honorer au scaffold |
| Typage | `npm run typecheck` (`tsc --noEmit`, cf. [ADR-0010](./adr/0010-langage-typescript-strict.md)) | **Normative** |
| Tests | `npm test` | **Normative** |
| Couverture | `npm run coverage` → `coverage/lcov.info` | **Normative** |
| Lint / format | `npm run lint` | **Normative** |
| Code mort (nocturne) | `npm run knip` | **Normative** |
| Mutation (nocturne) | `npm run mutation` | **Normative** |
| Couverture du diff | `diff-cover coverage/lcov.info --compare-branch=origin/main` | Réelle (`diff-cover` 10.4.2) |
| Invariants d'architecture | `bash .github/scripts/arch-invariants.sh` | **Réelle** — écrite par cette phase |
| SCA | `google/osv-scanner-action/osv-scanner-action@v2.5.0` sur `package-lock.json` | Réelle |
| Secrets | `trufflehog git file:///repo --results=verified --fail` (image `3.96.0`) | Réelle |
| SAST | `semgrep scan --config=p/typescript --config=p/javascript --config=p/owasp-top-ten` (image `1.172.0`) | Réelle |
| Audit des workflows | `zizmorcore/zizmor-action@v0.6.2` (zizmor 1.29.0, hors ligne) | Réelle |
| Graphe d'imports (invariants `I1`, `I3`) | `[à compléter]` — `eslint-plugin-boundaries` sur `eslint-import-resolver-typescript`, règles à poser au scaffold dans `eslint.config.*` | Non posée |

**Aucune commande de run local n'existe**, et ce n'est pas un oubli : la stack déploie un Worker
bâti par Workers Builds, et rien de ce qui a été arbitré n'a fixé la commande de développement.
Elle se pose au scaffold, dans ce tableau.

**Le lockfile est committé et l'installation verrouillée.** Sans version figée, la SCA scannerait
autre chose que ce qui sera installé : elle ne prouverait rien.

---

## La grille des cinq modes

Chaque contrôle est dérivé d'un **mode de défaillance**, jamais d'un outil disponible. Une liste
d'outils ne dit pas contre quoi on se défend : elle ne permet ni de voir qu'un candidat double un
contrôle existant, ni qu'un mode n'est couvert par rien.

| # | Mode | Ce qui se passe |
|---|---|---|
| 1 | **Oracle faux** | le test passe, mais son assertion vérifie la mauvaise chose |
| 2 | **Suppression du vérificateur** | l'agent n'écrit pas du code qui échoue au typage : il **éteint le typage** sur la ligne qui échoue |
| 3 | **Chaîne d'approvisionnement** | (a) paquet halluciné puis enregistré par un tiers · (b) paquet hostile trop récent pour une base de CVE · (c) lockfile altéré · (d) action CI compromise par déplacement de tag |
| 4 | **Building to the test** | la logique vit dans un artefact jetable et l'artefact demandé reste mort |
| 5 | **Violation d'invariant d'architecture** | le code est correct en général et viole une décision propre à ce projet |

**Un contrôle peut être un vérificateur plutôt qu'un détecteur.** Le typage, le lint, le SAST et le
scan de secrets ne détectent aucun mode : ils **sont** ce que le mode 2 éteint, et l'oracle de test
est ce que le mode 1 corrompt. Leur vert ne se lit donc jamais comme une couverture du mode qui les
vise.

---

## Contrôles

| # | Job | Contrôle | Portée | Statut | Mode couvert |
|---|---|---|---|---|---|
| 1 | `build` | Build + typage strict + garde-fou du socle `C5` sur la sortie | dépôt (garde de scaffold) | **Bloquant** | **vérificateur** — cible du mode 2 (contrat d'API, null-safety) |
| 2 | `test` | Suite de tests | dépôt (garde de scaffold) | **Bloquant** | **vérificateur** — l'oracle, cible du mode 1 |
| 3 | `sca` | OSV-Scanner sur lockfile | **dépôt entier** | **Bloquant** | 3 — **CVE connues seulement** |
| 4 | `dependency-review` | Cooldown npm déclaré + aucune variation de dépendance muette | dépôt + diff du lockfile **et** du manifeste | **Bloquant** | 3a, 3b, 3c |
| 5 | `secrets` | TruffleHog, credentials **vérifiés** | **dépôt entier + historique** | **Bloquant** | **vérificateur** — cible du mode 2 (secret en dur) |
| 6 | `workflow-integrity` | zizmor sur `.github/workflows/` — épinglage **vérifié** | fichiers de workflow | **Bloquant** | 3d |
| 7 | `test-integrity` | Intégrité des tests | diff des tests | **Bloquant** | 2 — dans les tests |
| 8 | `quality-config-guard` | Config qualité et fichiers d'agent figés | diff de la config | **Bloquant** | 2 — par la config |
| 9 | `verifier-guard` | Extinction du vérificateur, sous signature | diff des **sources** | **Bloquant** | 2 — typage, lint et SAST éteints ligne à ligne |
| — | `lint` | Style | dépôt (garde de scaffold) | Informatif | **vérificateur** — cible du mode 2 (lisibilité) |
| — | `coverage` | Couverture du **code nouveau**, sans seuil chiffré | diff | Informatif | **vérificateur** — mesure l'exécution, **jamais l'assertion** |
| — | `sast` | Semgrep | dépôt | Informatif | **vérificateur** — cible du mode 2 (injection, XSS, traversée) |
| — | `arch-invariants` | Invariants de `docs/archi.md` + les clauses d'ADR du registre ci-dessous | arbre courant | Informatif → bloquant après rejeu | 5 — le **gisement principal** |
| — | `dead-code` | knip (**nocturne**) | dépôt | Informatif | 4 — partiellement |
| — | `mutation` | Stryker (**nocturne**) | code nouveau | Informatif | 1 — **statistiquement**, jamais prouvé |
| — | — (résolveur) | Cooldown de dépendances, `min-release-age = 7` dans `.npmrc` | installation | **Bloquant (déclaratif)** | 3a, 3b |

**9 bloquants · 4 informatifs sur PR · 2 informatifs nocturnes.**

La dernière ligne n'est pas un job : c'est une **clé de configuration** du résolveur, elle agit à
l'installation, et son abaissement est gardé par `dependency-review` **et** par
`quality-config-guard`, qui surveille `.npmrc`.

### Pourquoi `sast`, `coverage` et `arch-invariants` ne sont pas bloquants

La règle est explicite : *aucun contrôle dont le taux de faux positifs est inconnu ne devient
bloquant*. Sur ce dépôt, aucun des trois n'a jamais tourné sur du code réel — il n'y a pas de code.
Les rendre bloquants reviendrait à parier sur un chiffre qu'on n'a pas, et **un contrôle bruyant
finit désactivé** : son efficacité théorique tombe alors à zéro, ce qui est pire que de l'assumer
informatif.

Un job informatif **n'est simplement pas dans la liste des checks requis**. Il peut virer au rouge
et annoter la PR sans la bloquer — aucun `continue-on-error` ne vient masquer son signal.

Pour `coverage`, la conséquence est directe : pendant la fenêtre de mesure, **du code non testé
peut atteindre `main` sans aucun refus**. C'est un arbitrage rendu le 2026-08-14, pas un oubli, et
il ne contredit aucun ADR : [ADR-0013](./adr/0013-tests-vitest-dans-workerd.md) décide de
**l'authenticité de l'oracle** — ce contre quoi un test s'exécute —, jamais de la part de code
qu'il traverse. Et le seuil, quand il viendra, portera sur le **code nouveau** : un seuil
de couverture **globale** est un anti-pattern qui échoue indéfiniment sur du legacy et pousse à
écrire des tests sans valeur — ce qui aggrave précisément le problème d'oracles faux.

**Les neuf bloquants échappent à cette règle.** `build` et `test` en sortent d'emblée : ce sont des
vérificateurs, pas des détecteurs — ils n'ont pas de faux positifs, ils ont des échecs. Les sept
autres y échappent par deux voies distinctes, qu'il vaut mieux ne pas confondre — sans quoi la
règle paraîtrait valoir pour les uns et pas pour les autres, sans motif.

**Ceux dont le signal n'est pas une heuristique.** `test-integrity`, `quality-config-guard`,
`verifier-guard` et `dependency-review` ne mesurent rien : c'est un `git diff`, une comparaison
d'entier, une clé lue dans un fichier ou une vérification de signature. Le taux de faux positifs
n'est pas « inconnu », il est **nul par construction** — ou alors le contrôle a un défaut, pas un
bruit.

**Ceux dont le mode de restitution élimine le faux positif à la source.** `sca`, `secrets` et
`workflow-integrity` sont bien des détecteurs, mais aucun ne rend une appréciation. `secrets` ne
parle que des credentials **vérifiés** — `--results=verified` : TruffleHog rejoue la clé contre le
service qui l'a émise et se tait si elle ne répond pas. `workflow-integrity` ne pondère aucun
risque : il constate qu'un `@v3` n'est pas un SHA, et l'épinglage **se vérifie**. `sca` compare un
lockfile à des vulnérabilités publiées — un match est un fait daté. Ce qui survit au filtrage est
vrai ; ce qu'ils **manquent**, en revanche, est réel et déclaré ailleurs — la fenêtre aveugle de la
SCA au § suivant, l'*impostor-commit* de `workflow-integrity` dans « Ce que ces contrôles ne
couvrent pas ».

> **Une réserve sur `workflow-integrity`, parce qu'il porte deux choses.** Ses règles plus larges —
> permissions trop étendues, injection de gabarit, déclencheurs dangereux — sont des heuristiques,
> elles, et leur bruit n'est pas nul. Il reste bloquant parce que la surface est petite et écrite
> ici : les workflows de ce dépôt tiennent en deux fichiers. Si ce bruit se manifestait, la sortie
> est de restreindre son jeu de règles, jamais de le rendre informatif — l'épinglage, lui, doit
> refuser.

---

## Approvisionnement — ce que la SCA ne voit pas

L'OSV-Scanner compare le lockfile à des bases de vulnérabilités **connues**. Il est aveugle à un
paquet hostile trop récent pour y figurer. Or c'est exactement la fenêtre du *slopsquatting* : un
modèle hallucine un nom de paquet — mesuré à **19,7 %** des paquets cités, sur 2,23 millions, par
Spracklen et al. (USENIX Security 2025, **académique**) — et **43 %** de ces hallucinations se
répètent d'un run à l'autre, ce qui rend le nom prévisible donc enregistrable par un tiers. *Quelle
part de ces noms est réellement libre à l'enregistrement n'a jamais été mesurée, et n'est donc pas
citée ici.*

**1. Cooldown de dépendances — 7 jours.** `.npmrc` doit déclarer `min-release-age=7`. Une version
publiée il y a moins de sept jours n'est pas installable ; les versions compromises étant
généralement retirées en quelques heures, la fenêtre d'attaque est couverte. `dependency-review`
**refuse** si la clé manque ou si la valeur est inférieure, dès que `package.json` existe.

```ini
# .npmrc — à poser au scaffold
min-release-age=7
```

> **Une faiblesse propre à npm, et le contrôle qui la referme.** La documentation embarquée de
> `npm 11.16.0` écrit que la précédence des sources est `cli > env > projet > user > global`, si
> bien qu'« une source de priorité supérieure peut toujours relâcher ou écraser une source de
> priorité inférieure ». Un `npm install --min-release-age=0` en ligne de commande annulerait donc
> le fichier sans le modifier. `dependency-review` cherche pour cette raison `--min-release-age` et
> `--before` dans `package.json`, dans les workflows et dans les scripts shell versionnés : aucune
> commande de ce dépôt n'a de raison d'en porter un.

> **Le cooldown protège la résolution, jamais l'installation en CI — et c'est ce qui désigne le
> vrai chemin exposé.** La clé n'est documentée que pour `install`, `install-test`, `outdated` et
> `update` ; la page `npm-ci.1` ne la mentionne pas, et une version déjà verrouillée ne paie aucun
> délai — mesuré le 2026-08-14 sur la documentation npm, [sujet 07 de la campagne de
> recherche](./research/ci-code-genere/07-flux-de-mise-a-jour-des-dependances-sous-cooldown.md). Ce
> n'est donc pas `npm ci` qui est à surveiller, c'est le moment où **l'agent ajoute une
> dépendance** : c'est là que la résolution s'ouvre, et c'est exactement ce que `min-release-age`
> couvre, transitives comprises. Le garde ci-dessus reste juste parce qu'il est **déclaratif** — il
> lit le dépôt et non l'exécution, et un `--min-release-age=0` versionné y serait visible quelle
> que soit la sous-commande qui le porte.

> **Ce que le cooldown coûte, et c'est réel.** Un correctif de sécurité publié aujourd'hui n'est
> installable qu'à J+7. En incident il faut relâcher la clé à la main, sous pression — et comme
> `.npmrc` est surveillé par `quality-config-guard`, le commit devra porter `chore(config):`. Ce
> détour est le prix assumé ; il est écrit ici pour ne pas être découvert le jour de l'incident.

**2. Aucune variation de dépendance en silence.** Toute modification de `package-lock.json`, ou des
blocs de dépendances de `package.json`, exige un commit portant `build(deps):`, `chore(deps):` ou
`fix(deps):`, ou le label `deps` sur la PR. Le manifeste n'est pas comparé ligne à ligne mais **jeu
de dépendances contre jeu de dépendances** : il bouge pour mille raisons légitimes, et un contrôle
bruyant finit désactivé.

**3. La chaîne d'approvisionnement de la CI elle-même.** Toutes les actions sont épinglées au **SHA
complet** et toutes les images au **digest** — un tag est mobile, il peut être repointé sous le même
nom. L'épinglage **se vérifie, il ne se déclare pas** : un `@v3` réintroduit par un copier-coller
annulerait l'épinglage sans que rien ne change de couleur. C'est `workflow-integrity` (zizmor 1.29.0,
hors ligne) qui le voit, en même temps que les permissions trop larges, l'injection de gabarit et
les déclencheurs dangereux. `online-audits: false` est délibéré : pas d'appel d'API, donc pas de
limite de débit, donc pas de rouge intermittent.

---

## Les trois gardes d'intégrité — le mode 2, réparti par chemin

Ils ne dépendent pas de l'écosystème : ce sont des `git diff` sur des chemins. Ils visent l'agent,
pas le code qu'il écrit. La répartition n'est pas cosmétique — c'est elle qui maintient le taux de
faux positifs bas de part et d'autre, en évitant qu'un garde ait à distinguer un neutralisant de
test d'un neutralisant de production.

### `test-integrity` — deux régimes qu'il ne faut pas confondre

Il ne peut **pas** reproduire la règle temporelle du niveau implémentation — « les tests existent,
rouges, et ne bougent plus pendant l'implémentation ». En mode TDD, la PR d'un lot contient
légitimement les tests **et** le code, et rien dans le diff ne distingue l'ordre d'écriture. Il
porte donc les signaux vrais quel que soit le moment.

| Régime | Mode de défaillance | Signal cherché dans le diff | Issue |
|---|---|---|---|
| **A** | Test neutralisé | `.skip(` `.only(` `.todo(` `.fixme(` `xit(` `xdescribe(` `expect(true).toBe(true)` **ajoutés** | **aucune** — refus sec |
| **B** | Test supprimé | `git diff --diff-filter=D` sur les globs de test | **signature** |
| **B** | Assertions affaiblies | plus de lignes `expect(` / `assert` retirées qu'ajoutées | **signature** |

Globs surveillés : `**/*.test.ts(x)`, `**/*.spec.ts(x)`, `tests/**`, `e2e/**`. Ils sont
**normatifs** : un test écrit ailleurs échappe au contrôle.

**Pourquoi deux régimes.** *Endormir* un test n'a jamais de justification recevable : aucune
soupape, et c'est délibéré — la sortie est de le **retirer**, et retirer est exactement ce que le
régime B autorise. *Retirer* un test ou alléger un oracle est légitime — retrait d'un module,
refonte — et strictement indiscernable d'une subversion par le seul diff. On ne l'interdit donc pas :
on exige que l'humain le **signe de sa main**. Tout commit de l'intervalle qui touche un fichier de
test doit alors être signé : c'est l'ensemble qui porte la responsabilité, pas le seul commit où le
compteur bascule.

### `quality-config-guard` — et sa soupape

Sans elle, ce contrôle bloquerait sa propre maintenance. Le changement est autorisé si **tous** les
commits qui y touchent portent un scope explicite — `chore(ci):`, `chore(config):`, `build(ci):` ou
`chore(agent):` — ou si la PR porte le label `config-change`. Jamais en silence.

Chemins surveillés : `eslint.config.*`, `.eslintrc*`, `tsconfig*.json`, `vitest.config.*`,
`playwright.config.*`, `stryker.conf.*`, `knip.*`, `prettier.config.*`, `.prettierrc*`,
`.prettierignore`, `.eslintignore`, **`.npmrc`**, `.github/workflows/**`,
`.github/scripts/**`, et — parce qu'ils contraignent l'agent lui-même — `CLAUDE.md`, `AGENTS.md`,
`.claude/**`.

`package.json` est surveillé **partiellement** : seules les lignes des scripts du portail (`test`,
`typecheck`, `lint`, `build`, `coverage`, `knip`, `mutation`) déclenchent l'exigence de scope.
Ajouter une dépendance touche `package.json` légitimement et ne doit pas faire de bruit.

> **Cette soupape-là ne résiste pas à un agent, et il faut le savoir.** Un scope de commit s'écrit ;
> un label se pose par l'API avec une portée `repo`. Elle rend le changement **visible**, elle ne le
> rend pas **impossible** — c'est suffisant pour de la configuration, et c'est exactement pourquoi
> le garde qui vise la subversion du vérificateur exige une signature à la place.

---

## `verifier-guard` — et la seule soupape qu'un agent ne peut pas écrire

**Le mode de défaillance.** L'agent ne casse pas le contrôle, il l'**éteint localement**. Un
`@ts-ignore` au-dessus de la ligne qui ne compile pas, un `as any` qui fait taire le typage, un
`eslint-disable` sur la règle qui gêne, un `catch {}` vide qui avale l'erreur. Rien n'est rouge : le
vérificateur a été débranché à l'endroit précis où il servait — et sur un socle dont
[ADR-0010](./adr/0010-langage-typescript-strict.md) fait reposer la sûreté sur *TypeScript strict*,
c'est le geste qui vide l'ADR de son contenu.

**Motifs traqués, dérivés de l'écosystème JS/TS** — ils ne s'inventent pas :

| Neutralisant de typage | Neutralisant de lint | Échappement de type | Erreur avalée | Neutralisants d'outil |
|---|---|---|---|---|
| `@ts-ignore` `@ts-nocheck` `@ts-expect-error` | `eslint-disable` (ligne, bloc, fichier) | `as any` `as unknown as` `: any` | `catch {}` vide | `nosemgrep` `trufflehog:ignore` |

**Sa portée est limitée aux extensions de source** — `*.ts` `*.tsx` `*.js` `*.jsx` `*.mjs` `*.cjs`
`*.astro` `*.svelte` —, **tests et documentation exclus**. Ce n'est pas un détail de réglage : c'est
ce qui l'empêche de se bloquer lui-même, puisque le document que vous lisez cite les motifs qu'il
traque. L'exclusion des tests n'ouvre aucun trou : `test-integrity` les couvre.

### La soupape — signature du commit

Registre de clés : `.github/allowed_signers`
État : **amorcé le 2026-08-08** (seconde clé enregistrée le 2026-08-10) · les deux entrées sont de
type `ssh-ed25519`
Vérification : **hors ligne**, dans le job `verifier-guard` · aucune action tierce, `git` suffit
Base du diff : point de divergence avec `main` · le job déclare `fetch-depth: 0`

**Pourquoi pas un scope de commit.** `quality-config-guard` s'ouvre par un `chore(config):`, et cela
suffit là-bas : le but est que le changement ne passe pas *en silence*. Ici, non — **un agent écrit
`chore(types):` aussi facilement qu'il écrit `as any`**. La soupape doit être quelque chose qu'il ne
peut pas produire.

Ordre des deux contrôles, et il n'est pas interchangeable :

| | Ce qu'il protège | Registre de référence | Sur quoi il porte |
|---|---|---|---|
| **1** | le registre | sa version **à la base** du diff | **chaque commit** du range qui touche le registre |
| **2** | le code | sa version **courante** | chaque commit qui **ajoute** un motif dans un fichier de source |

Le rejeu adverse dit pourquoi : **un agent qui s'ajoute au registre puis supprime sa propre entrée
passe le contrôle 2 et échoue au contrôle 1.** Son commit de motif est bien signé par une clé qui
figurait au registre à cet instant ; mais le commit qui l'y a ajoutée n'est signé par personne
d'autorisé, et le retrait final rend le diff **net** du registre vide. D'où deux règles qui se
perdent vite : le contrôle 1 se fait **commit par commit** sur `base..HEAD`, jamais sur le diff net,
et il **précède** le contrôle 2, dont l'échec du premier interrompt l'évaluation.

Enfin, le **message du commit signé porte le motif**, non vide : la revue est une lecture, pas une
case.

**Fermeture par défaut** — chacun de ces cas est un refus, jamais un avertissement : registre absent
de l'arbre courant alors qu'un motif est ajouté · base indéterminable · signature autre que
« bonne » · contrôle 1 en échec.

**L'amorçage est le seul trou, et il est irréductible.** Tant que `.github/allowed_signers` n'existe
pas à la base, la PR qui l'installe le fait **sans preuve** — il n'existe aucune clé de confiance
pour signer l'arrivée de la première. Le workflow émet un `::warning` explicite et laisse passer. La
seule parade est humaine : pousser ce fichier soi-même et **vérifier de ses yeux** la clé qu'il
contient. Sur ce dépôt c'est fait, le 2026-08-08 ; après cela le fichier est auto-protégé.

### Ce que la soupape ne prouve pas

Trois niveaux, et on ne vend jamais l'un pour l'autre. Ce dispositif ferme **N2** — une IA qui
évade, qui écrit tout le dépôt y compris les gardes et sa propre attestation. Il **ne ferme pas
N3** — un accès aux identifiants du poste.

- **La CI lit un *type* de clé.** Elle ne distingue pas une clé à phrase de passe jamais chargée
  dans `ssh-agent` d'une clé nue dans `~/.ssh`. La propriété réelle — « la clé n'entre jamais dans
  l'agent » — est une discipline d'**environnement**, pas un mécanisme, et **aucune évolution
  prévue ne la rendra vérifiable par la machine**. Le workflow affiche le type de chaque clé de
  confiance à chaque vérification pour que l'écart reste sous les yeux.
- **La discipline qui la rend tenable tient en une phrase** : la clé de signature ne sert qu'à
  **signer**, jamais à s'authentifier auprès de la forge. Il n'y a donc aucune occasion légitime de
  la charger dans l'agent — ce n'est pas un effort de volonté, c'est une absence de tentation.
- **Le fichier de clé reste lisible, donc exfiltrable** par tout processus de l'utilisateur. Le
  chiffrement protège l'usage, pas la copie.
- **L'outillage de signature ne doit pas être écrit par l'agent.** S'il rédige le script, l'alias ou
  le hook par lequel vous signez, il peut capturer la phrase au moment où vous la tapez. C'est le
  seul endroit du dispositif où son concours est un risque et non une aide, et **aucun job de CI ne
  le voit**.
- **En local, l'attribution n'est pas vérifiable** — une signature n'existe pas avant que le commit
  existe. Un garde local constaterait la *couverture* (« ce diff ajoute un neutralisant, il exigera
  un commit signé »), jamais l'*approbation*. Le vert local signifie **couvert**, jamais
  **approuvé**.

**La clé matérielle (FIDO2) est écartée par arbitrage, elle n'est pas différée.** Elle aurait
converti la première limite en preuve vérifiable par la CI. Ne pas rouvrir ce chemin en croyant
combler un oubli : l'écart entre la propriété visée et ce que la machine peut vérifier est
**définitif**.

**Le mode de défaillance reste sûr.** Sans signature valide, `verifier-guard` refuse. L'erreur
possible est qu'il accepte une signature que l'agent aurait pu produire — jamais qu'il laisse passer
une extinction non signée.

---

## Registre des ADR vérifiés en CI

Le mode 5 est le **gisement principal** : les défauts qui comptent dans du code généré sont des
violations de contrat propres au projet, qu'aucun outil générique ne connaît. Les deux sources ont
été lues — la table des invariants de `docs/archi.md`, et `docs/adr/` pour ce qu'elle ne couvre pas.

| ADR | Invariant | Source | Rendu par | Statut |
|---|---|---|---|---|
| [ADR-0021](./adr/0021-sens-descendant-des-dependances-entre-zones.md) | `I1` — sens descendant des dépendances entre les cinq zones | `docs/archi.md` `I1` | **`[à compléter]`** — chaîne ESLint au scaffold | **Non rendu** |
| [ADR-0022](./adr/0022-core-sans-framework-ni-plateforme.md) | `I2` — `src/core/` n'importe ni `astro`, ni `svelte`, ni `@astrojs/*`, ni `cloudflare:*` | `docs/archi.md` `I2` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0023](./adr/0023-rendu-partage-par-le-publie-et-l-apercu.md) | `I3` — `src/render/` n'est atteint que par son index ; les deux routes passent par le gabarit partagé | `docs/archi.md` `I3` | `arch-invariants` — **partiellement**, voir ci-dessous | Informatif depuis 2026-08-14 |
| [ADR-0024](./adr/0024-administration-sans-directive-client.md) | `I4` — aucune directive `client:*` sous `src/admin/` | `docs/archi.md` `I4` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0025](./adr/0025-html-brut-confine-au-rendu-markdown.md) | `I5` — `{@html}` et `set:html` confinés à `src/render/markdown/` | `docs/archi.md` `I5` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0026](./adr/0026-garde-de-session-par-import-et-surface-publique-close.md) | `I6` — garde de session importé par toute route non publique ; aucun `multipart` sur la surface publique | `docs/archi.md` `I6` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0027](./adr/0027-objet-de-frequence-nomme-par-une-constante.md) | `I7` — `idFromName` ne reçoit qu'une constante littérale | `docs/archi.md` `I7` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0028](./adr/0028-valeurs-d-instance-dans-le-fichier-d-instance.md) | `I8` — les valeurs d'instance ne vivent que dans `instance.json` | `docs/archi.md` `I8` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0029](./adr/0029-prefixes-de-publication-en-constante-unique.md) | `I9` — `PREFIXES_AUTORISES` a un seul porteur, et `.github/` n'y figure pas | `docs/archi.md` `I9` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0030](./adr/0030-configurations-lisent-le-fichier-d-instance.md) | `I10` — les deux configurations lisent `instance.json` | `docs/archi.md` `I10` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0015](./adr/0015-en-tetes-de-reponse-deux-porteurs.md) | `run_worker_first` reste une liste **bornée** | `docs/adr/` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0015](./adr/0015-en-tetes-de-reponse-deux-porteurs.md) · [ADR-0024](./adr/0024-administration-sans-directive-client.md) | La CSP se définit par ses **interdits** : ni `unsafe-inline`, ni `unsafe-eval` dans les sources | `docs/adr/` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0006](./adr/0006-auth-implementation-maison-sur-d1.md) | Le cookie de session porte `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict` | `docs/adr/` | `arch-invariants` | Informatif depuis 2026-08-14 |
| [ADR-0008](./adr/0008-texte-riche-markdown-restreint.md) | Aller-retour de sérialisation Markdown · rejet d'une URL de schéma non autorisé | `docs/adr/` | `test` — épreuves à écrire au **niveau specs** | **Bloquant** par le job qui les portera |

**`I1` et `I3` résistent à l'expression régulière, et il faut le dire plutôt que le masquer.** La
matrice des arêtes autorisées entre zones et le point d'entrée unique de `src/render/` se vérifient
sur le **graphe d'imports résolu** — alias `tsconfig paths`, ré-exports, barils —, ce qu'un script
maison ne fait pas sans recréer un résolveur. L'outil est la **chaîne ESLint** :
`eslint-plugin-boundaries` (7.2.0) branché sur `eslint-import-resolver-typescript`, avec les
parsers `astro-eslint-parser` et `svelte-eslint-parser` que le projet aura de toute façon. Son
fichier de règles se pose au scaffold, dans `eslint.config.*`, avec le code. `I3` est rendu **à
moitié** dès aujourd'hui — les chemins d'import littéraux vers `src/render/` et la présence du
gabarit partagé dans les deux routes —, et le reste attend l'outil.

> **dependency-cruiser était le candidat, et il est écarté sur deux constats indépendants.** [Le
> sujet 02 de la campagne de recherche du
> 2026-08-14](./research/ci-code-genere/02-graphe-d-imports-resolu-avec-astro-et-svelte.md) les a
> mesurés au registre et dans le code de l'outil. **Un** : sa table d'extensions ne liste pas
> `.astro`, et une partie des zones en est faite — la réserve était déjà écrite ici. **Deux** : sa
> table de transpilation déclare `typescript >=2.0.0 <7.0.0`, quand `typescript@7.0.2` est la
> version courante du registre depuis le 2026-07-08 ; sous TS 7, `depcruise --info` marque `.ts`
> lui-même comme non pris en charge, et le mainteneur conditionne le support à `typescript@7.1.0`
> livrant une API publique, qui n'existe pas. `ADR-0010` n'épingle aucune version de TypeScript :
> le premier mur suffirait seul, le second dépend de ce que le scaffold installera.
>
> La chaîne ESLint ne touche pas à l'API du compilateur — `typescript-eslint` parse, le resolver
> résout —, donc aucun des deux murs ne la concerne, et elle hérite du parsing `.astro`/`.svelte`
> déjà nécessaire au lint. **Réserve à porter à sa place** : elle évalue la frontière contre le
> **baril résolu** et ne remonte pas les chaînes `export … from`. C'est ce qu'on veut pour une
> frontière entre zones, mais un import profond qui contourne un `index.ts` lui échappe : il
> demande une règle de plus (`import-x/no-internal-modules`). Sheriff, seul outil à modéliser
> nativement cette encapsulation, est écarté — mono-`.ts`, testé jusqu'à TS 5.7, sans release
> depuis fin 2025.

### L'écart entre ce que six ADR demandent et ce que cette phase donne

`ADR-0006`, `0008`, `0009`, `0012`, `0015` et `0024` écrivent au présent, chacun, qu'un **contrôle
bloquant** de `docs/ci.md` porte leur propriété. Huit clauses en tout. Cette phase pose les
contrôles ; elle ne peut pas les rendre bloquants aujourd'hui, parce qu'un contrôle maison neuf n'a
aucun taux de faux positifs mesuré et qu'un contrôle bruyant finit désactivé.

**L'écart est nommé et daté, pas contourné** : le rejeu sur l'historique du dépôt est porté par
`docs/chantiers/en-attente/2026-08-14-durcissement-ci.md`, et c'est lui qui les fera monter. Rien
n'est perdu entre-temps, parce qu'il n'y a pas encore de code à garder — mais le jour où il y en
aura, un `arch-invariants` rouge et ignoré vaudra exactement zéro.

Trois clauses ne sont rendues par **aucun** contrôle, et c'est déclaré plus bas : la composition
inerte de l'e-mail acheminé (`ADR-0009`), l'effacement conjoint de la clé de fenêtre et des
entrées du compteur (`ADR-0012`), et le jeton anti-CSRF doublé d'`Origin` (`ADR-0006`).

---

## La maturité de l'outillage — un outil mort est un contrôle mort

Le précédent est connu : une action de CI recommandée alors qu'elle était **archivée par son
propriétaire depuis le 9 avril 2024**, en lecture seule et dépréciée au profit du binaire natif.
C'est un coût invisible au moment du choix — il apparaît des mois plus tard, quand plus personne ne
relit. **Partout où c'est possible, le binaire est invoqué directement** plutôt qu'à travers une
action d'emballage : c'est une dépendance de moins, et c'est la couche qui meurt en premier.

| Outil | Version retenue | Constat de maturité |
|---|---|---|
| npm | 11.16.0 | **2026-08-14**, sur la machine de développement — livré avec Node 24, `min-release-age` présent |
| OSV-Scanner (action) | v2.5.0, SHA `8deb546f` | 2026-08-08, repris du socle v1 archivé |
| TruffleHog (image) | 3.96.0, digest `sha256:aa821cf4…` | 2026-08-08 — le tag `v3.96.0` n'existe pas au registre, seul `3.96.0` ; le digest, lui, n'est pas mobile |
| Semgrep (image) | 1.172.0, digest `sha256:65dcd440…` | 2026-08-08 — même correction de tag ; l'action d'emballage est **archivée**, on invoque le binaire |
| zizmor (action) | v0.6.2, SHA `3dc1ecc9`, moteur 1.29.0 | 2026-08-08, repris du socle v1 archivé |
| diff-cover | 10.4.2 | 2026-08-08, repris du socle v1 archivé |
| `eslint-plugin-boundaries` (+ `eslint-import-resolver-typescript`) | 7.2.0 · 4.4.5 | **2026-08-14**, registre npm par la campagne de recherche — 7.2.0 publiée vers le 9 août 2026, historique régulier (7.0.0 le 5 juil.), documentation dédiée ; le resolver en 4.4.5 du 1ᵉʳ juin 2026. Remplace dependency-cruiser 18.1.0, écarté le même jour (ni `.astro`, ni TypeScript 7) |
| knip · Stryker | au scaffold | indications reprises du socle v1 : knip 6.32.0, `@stryker-mutator/core` 9.6.1 (2026-08-08) |

> **Ces constats ont six jours et ne se re-vérifient pas depuis un document.** Toutes les lignes
> datées du 2026-08-08 viennent de l'archive du socle v1, qui les avait mesurées sur le registre.
> Elles sont reprises telles quelles, avec leur date, et **se re-vérifient à l'adoption** — au
> scaffold, sur le dépôt et le registre de paquets, jamais sur une page de présentation.

Trois seuils déclenchent une **re-passe** de cette phase et le retrait de l'outil concerné : le
mainteneur disparaît ou le dépôt est archivé · la licence change, y compris sur les seules **règles**
· le palier gratuit se met à exiger une carte bancaire — auquel cas le composant devient inutilisable
ici quel que soit son mérite, par le socle `I5`.

---

## Ordonnancement

Jobs indépendants, tous en parallèle, sans `needs:` — ordonnés dans le fichier par coût croissant
pour la lecture. `concurrency` avec `cancel-in-progress` évite d'empiler les runs sur une branche.

Déclencheurs : `pull_request` **et** `push` sur `main`. Un check qui ne tourne pas sur
`pull_request` n'apparaît **jamais** dans la liste des status checks sélectionnables, et bloque la
PR indéfiniment une fois exigé.

Les types d'activité sont **déclarés explicitement** — `opened`, `synchronize`, `reopened`,
`labeled`, `unlabeled`. Les deux derniers ne sont pas dans les valeurs par défaut, et sans eux les
soupapes par label (`deps`, `config-change`) seraient **inertes** : poser un label ne relancerait
rien, et un `gh run rerun` rejoue la charge utile d'origine, donc sans le label. `unlabeled` est là
pour la symétrie — retirer le label doit re-bloquer.

### Le régime nocturne — `.github/workflows/nightly.yml`

Il tourne à 3 h 17 UTC et à la demande, **jamais sur `pull_request`** : aucun de ses jobs ne peut
donc figurer dans les checks requis, ce qui est le point. `dead-code` (knip) vise le *building to
the test* ; `mutation` (Stryker) vise l'oracle faux, que la couverture ne voit pas — elle mesure
l'**exécution**, jamais l'**assertion**.

Ils ne peuvent pas devenir bloquants : le test de mutation a un taux de mutants équivalents estimé
entre **4 % et 39 %** dans la littérature (Madeyski et al. 2013, **académique**), très au-dessus du
seuil de 10-15 %, et knip a des faux positifs connus sur les points d'entrée dynamiques.

Deux manques assumés, tous deux au chantier de durcissement : **à poser**, la base de référence de
mutants survivants, qui n'existe pas tant qu'aucun code n'a été muté une première fois ; **à
poser**, l'ablation no-op — remplacer un artefact critique par une implémentation vide et vérifier
que quelque chose casse. Aucune commande réelle ne l'exprime aujourd'hui, et l'écrire
serait l'inventer.

> **Note GitHub.** Un `schedule` est automatiquement désactivé après 60 jours sans activité sur le
> dépôt. Le réveiller est un geste manuel dans l'onglet Actions.

---

## Protection de branche

Branche : `main` · Bypass : **interdit** · Force-push et suppression : **interdits**

Checks requis, à l'identique des noms de jobs :

```
build · test · sca · dependency-review · secrets · workflow-integrity
test-integrity · quality-config-guard · verifier-guard
```

### État : **POSÉE et à jour — reprise le 2026-08-14**

Le ruleset `Main protect`, id `20239278`, est `enforcement: active`, `bypass_actors: []`,
`current_user_can_bypass: "never"`, `allowed_merge_methods: ["merge"]`, et ses **neuf** contextes
requis sont exactement ceux ci-dessus. La commande de reprise est passée le **2026-08-14**, et sa
vérification a été rejouée dans la foulée.

**Ce qu'elle a corrigé, et pourquoi ce n'était pas cosmétique.** Le ruleset avait été posé pour le
socle v1 ; six de ses contextes correspondaient encore aux jobs de ce portail, **trois portaient
les anciens noms** :

| Contexte exigé (v1) | Job de ce portail |
|---|---|
| `deps-policy` | **`dependency-review`** |
| `suppression-guard` | **`verifier-guard`** |
| `workflow-audit` | **`workflow-integrity`** |

> **Le piège était celui que cette phase décrit.** Un check requis dont aucun job ne porte le nom
> reste `pending` **pour toujours**. La première PR — y compris celle qui apporte ce portail —
> aurait été bloquée sans issue, par trois contextes fantômes que rien ne serait venu satisfaire.
> `verifier-guard` et `workflow-integrity` sont les noms que le cycle fixe, et ils ne se renomment
> plus : la reprise a aligné le ruleset sur eux, jamais l'inverse.

La commande reste écrite ci-dessous parce qu'elle est la **source** du contenu du ruleset : toute
divergence future — un job renommé, un contrôle qui monte — se referme en la rejouant.

```bash
gh api -X PUT repos/sebc-dev/colibri-cms/rulesets/20239278 \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "name": "Main protect",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "build" },
          { "context": "test" },
          { "context": "sca" },
          { "context": "dependency-review" },
          { "context": "secrets" },
          { "context": "workflow-integrity" },
          { "context": "test-integrity" },
          { "context": "quality-config-guard" },
          { "context": "verifier-guard" }
        ] } }
  ]
}
JSON
```

Vérification après coup :

```bash
gh api repos/sebc-dev/colibri-cms/rulesets/20239278 \
  --jq '[.rules[] | select(.type=="required_status_checks")
         | .parameters.required_status_checks[].context] | sort'
# attendu : ["build","dependency-review","quality-config-guard","sca","secrets",
#            "test","test-integrity","verifier-guard","workflow-integrity"]
```

**Sans ce ruleset, tout ce document serait informatif** : c'est lui, et lui seul, qui fait refuser.
Il est posé — et c'est la vérification ci-dessus qui le prouve, jamais cette phrase.

#### Pourquoi `allowed_merge_methods` reste réduit à `["merge"]`

Une signature SSH couvre **l'objet commit**. *Squash* et *rebase* en fabriquent de nouveaux, donc la
signature de l'auteur ne peut pas y survivre — et GitHub y substitue la sienne : le badge
« Verified » resterait vert **en attestant de GitHub et non de l'humain**, ce qui est pire qu'une
perte visible. Sur un dépôt dont `verifier-guard` et le régime B de `test-integrity` font reposer
l'intégrité sur « qui a signé », laisser ces deux boutons dans l'interface revient à offrir un clic
qui efface la preuve.

Un historique linéaire reste possible : rebaser sa branche **en local** sur `main` avant de livrer,
en re-signant, puis atterrir par un merge commit. `git log --first-parent` donne la vue linéaire à
la lecture.

> **Ce qui n'est délibérément pas posé : `required_signatures`.** Le ruleset sait exiger que **tous**
> les commits soient signés. Ce n'est pas ce qu'on veut : l'agent ne pourrait plus commiter du tout.
> L'exigence de signature est portée par `verifier-guard` et par le régime B de `test-integrity`, et
> ne s'applique qu'aux commits qui éteignent un vérificateur ou allègent un oracle.

---

## Blindage local (défense en profondeur — **ne remplace pas** le ruleset)

Un agent a contourné des hooks pre-commit par `--no-verify`, `git stash` et flags silencieux sur
**six commits consécutifs**, malgré des règles écrites l'interdisant. Le hook ci-dessous rend ce
geste coûteux — **il n'est pas le backstop**. Le backstop est le check serveur ; le présenter
autrement reproduirait exactement l'erreur qu'il corrige.

**Non installé.** Cette phase n'installe aucun hook et ne modifie aucun `settings.json` : les blocs
sont rendus, le geste est humain.

`.claude/settings.json` :

```json
{ "hooks": { "PreToolUse": [ { "matcher": "Bash",
  "hooks": [ { "type": "command",
               "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/block-no-verify.sh\"" } ] } ] } }
```

> **Le chemin est absolu, et ce n'est pas un détail.** Un hook invoqué par chemin relatif
> (`bash .claude/hooks/…`) cesse de refuser — **en silence** — dès que le répertoire courant de
> l'outil `Bash` quitte la racine du dépôt. C'est un mode de défaillance déjà constaté sur ce
> projet ; `$CLAUDE_PROJECT_DIR` le ferme.

`.claude/hooks/block-no-verify.sh` — `exit 2` bloque ; `exit 1` serait ignoré et ne bloquerait rien :

```bash
#!/usr/bin/env bash
set -uo pipefail
cmd="$(cat | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || true)"
[ -z "$cmd" ] && exit 0
case "$cmd" in
  *"git commit"*--no-verify*|*"git commit"*" -n"*|*"git push"*--no-verify*)
    echo "⛔ Les hooks de commit ne se sautent pas." >&2
    echo "   Un hook cassé se répare ou se signale — il ne se contourne pas." >&2
    exit 2 ;;
esac
exit 0
```

**Ses limites, à connaître :** il ne voit pas un `git` appelé via un script, un alias ou un wrapper ;
le motif ` -n` peut mordre sur un message de commit qui le contient ; et il ne protège que les
sessions de cet agent, pas un `git` tapé dans un autre terminal.

---

## Ce que ces contrôles ne couvrent pas

Un trou déclaré vaut mieux qu'un contrôle qui *prétend* le couvrir. Cette section se lit **par
mode**, et trois d'entre eux ne se ferment pas.

**Mode 1 — l'oracle faux sémantique.** Du code qui compile, passe le lint et passe des tests **dont
l'assertion vérifie la mauvaise chose** est indétectable : aucun outil ne connaît l'intention, et le
test écrit pour valider un bug en est le cas typique. Le test de mutation nocturne le signale
*statistiquement* et ne le prouve pas ; son bruit lui interdit de bloquer. `coverage` fait pire : il
**récompense** un test sans assertion, qui exécute la ligne sans rien vérifier.

**Mode 2 — l'extinction par un chemin non reconnu.** `verifier-guard` grep des motifs. Un agent
contraint peut affaiblir un oracle sans écrire aucun de ces motifs — écrire du code trivialement
typable plutôt que d'éteindre le typage, par exemple. Et c'est ici que vaut **la réserve qui vaut
pour tous les gardes greppables : réprimer un comportement peut le rendre plus subtil plutôt que
l'éliminer.** Aucune mesure publiée ne tranche. Ces contrôles réduisent une surface, ils ne ferment
pas le sujet.

**Mode 3 — le commit forgé côté forge.** `workflow-integrity` tourne **hors ligne** : il ne vérifie
pas qu'un SHA épinglé est bien atteignable depuis le dépôt de l'action (*impostor-commit*). Le
compromis est délibéré — un audit en ligne dépend d'une limite de débit, et un contrôle intermittent
finit désactivé.

**Mode 4 — le *building to the test* « propre ».** Si l'artefact demandé satisfait le contrôle sans
remplir l'exigence et qu'il n'est **pas mort**, ni `dead-code` ni l'ablation no-op ne le voient.
Rien ne le détecte sans oracle sémantique, qui n'existe pas de façon déterministe et gratuite. Et
l'ablation no-op elle-même n'est pas posée : aucune commande réelle ne l'exprime aujourd'hui.

**Mode 5 — l'invariant qu'un grep ne rend pas.** Quatre trous nommés :

- **`I1` et `I3`** exigent un graphe d'imports résolu — non posé, chaîne ESLint au scaffold.
  dependency-cruiser, candidat initial, est écarté depuis le 2026-08-14 : ni `.astro`, ni
  TypeScript 7. Et ce que son remplaçant ne rendra pas non plus : un import profond qui contourne
  un baril, sauf règle dédiée.
- **La composition inerte de l'e-mail acheminé** ([ADR-0009](./adr/0009-acheminement-email-routing-send-email.md))
  — texte seul, objet fixe, chaque donnée du visiteur derrière son étiquette. Le gabarit n'existe
  pas et son chemin n'est pas décidé : aucun motif ne se dérive sans l'inventer. **La cinquième
  porte reste donc ouverte à la CI.**
- **L'effacement conjoint de la clé de fenêtre et des entrées du compteur**
  ([ADR-0012](./adr/0012-anti-abus-turnstile-et-compteur-a-empreintes-de-fenetre.md)) —
  `docs/archi.md` a écarté ses deux versants **faute de trace observable**, comme comportement à
  l'exécution. `I7` en tient la moitié statique — aucun objet nommé d'après une origine — et rien
  ne tient l'autre.
- **Le jeton anti-CSRF doublé du contrôle d'`Origin`**
  ([ADR-0006](./adr/0006-auth-implementation-maison-sur-d1.md)) — l'ADR verse cette propriété aux
  contrôles bloquants au même titre que les attributs du cookie, mais les deux ne se lisent pas de
  la même façon : le cookie est une **chaîne littérale** dans une source, quand « sur **chaque**
  écriture » est une propriété de **couverture**. Aucune route n'existe, `docs/archi.md` n'en tire
  aucun invariant, et un grep qui trouverait un contrôle d'`Origin` quelque part ne dirait rien de
  la route qui l'oublie. Seule la moitié « cookie » est donc rendue, au registre ci-dessus ;
  l'autre attend l'épreuve `SC-021`, qui mesure l'ensemble au niveau specs.
- Plus, généralement : **un contrôle maison ne vaut que sa liste.** Une décision d'architecture non
  traduite en règle est invisible.

**Ce qui ne relève d'aucun mode, et qu'aucun job ne voit non plus :**

- **La CSP et les en-têtes sur la réponse elle-même.** `arch-invariants` lit les **interdits** dans
  les sources ; que l'en-tête soit effectivement posé sur **toute** réponse d'administration est du
  runtime. C'est la moitié que `docs/archi.md` n'a pas retenue en **classe 15** — la « posture de
  sécurité de l'administration », propriété composite dont `I4` ne tient que le versant structurel
  —, et la quatrième porte n'a aucun repli : si la CSP tombait, l'invariant d'échappement `I5`
  resterait seul.
- **La logique métier et l'autorisation.** Le SAST ne modélise pas l'intention : un IDOR sur la
  médiathèque ou sur les demandes de devis ne produit aucun motif suspect.
- **Les soupapes par scope et par label ne résistent pas à un agent.** Un scope s'écrit ; un label
  se pose par l'API avec une portée `repo`, que le jeton d'un agent porte couramment. Elles rendent
  le changement **visible**, jamais **impossible**. C'est assumé pour de la configuration, et c'est
  exactement pourquoi `verifier-guard` exige une signature.
- **Les invariants du produit.** `SC-011` (réversibilité), `SC-012` (révocation des accès) et
  `SC-014` (passation) sont des **procédures dont la sortie est une pièce datée**. Elles ne se
  jouent pas à chaque commit ; entre deux exécutions, une régression sur ces promesses n'est
  détectée par rien.
- **Un secret détecté se *rotate*.** Il ne se supprime pas seulement de l'historique : tant qu'il
  est actif, il reste exploitable où qu'il ait fui.
- **Tout ce que la garde de scaffold laisse passer**, tant qu'il n'y a pas de `package.json` :
  `build`, `test`, `coverage`, `lint`, `dead-code` et `mutation` sont **verts sans avoir rien
  exécuté**, et `arch-invariants` ne trouve aucune source à lire.

---

## Palier suivant

→ [`docs/chantiers/en-attente/2026-08-14-durcissement-ci.md`](./chantiers/en-attente/2026-08-14-durcissement-ci.md)
