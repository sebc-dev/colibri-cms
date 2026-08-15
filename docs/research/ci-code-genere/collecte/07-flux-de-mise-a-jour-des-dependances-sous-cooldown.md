# Collecte — 07 · Flux de mise à jour des dépendances sous cooldown

**Route** : `mixte` · **Collectée le** : 2026-08-14 · **Campagne** : contrôles CI du code généré

Le versant `code` est réglé : les trois mécaniques de cooldown — npm, Renovate, Dependabot — ont
été lues dans leur source de configuration, mot pour mot. **Un fait a changé le terrain depuis
l'arbitrage du 2026-08-14 porté par `docs/ci.md`**, et il est décisif : Dependabot applique désormais
un cooldown de trois jours **par défaut, sans configuration**.

---

## Fait 1 — Dependabot : cooldown de 3 jours par défaut depuis le 2026-07-14

*Extrait cité — `https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/`,
récupéré le 2026-08-14 :*

> **July 14, 2026 — Dependabot version updates introduce default package cooldown**
>
> Dependabot now waits until a new release has been available on its registry for at least three days
> before opening a version update pull request. This cooldown is now the default and requires no
> configuration.
>
> New releases are a common entry point for supply chain attacks where a compromised or broken
> version can reach your dependency updates before maintainers and the community have caught it. A
> short delay gives that signal time to surface, so you are less likely to merge a bad release the
> moment it ships.
>
> A few things to know:
> - The default applies only to version updates. Security updates still open immediately, so
>   critical fixes are never delayed.
> - You stay in control. Use the cooldown option in your `.github/dependabot.yml` to set a different
>   window or opt out entirely.
> - This default applies to Dependabot version updates across all supported ecosystems on github.com
>   and will take effect in GitHub Enterprise Server (GHES) 3.23.

*Extrait cité — `https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference`,
§ `cooldown`, récupéré le 2026-08-14 :*

> By default, Dependabot applies a cooldown period of 3 days to version updates, even when `cooldown`
> is not configured. A new version is not considered for a version update until 3 days after its
> release. This default cooldown does not apply to security updates.
>
> Configuration of `cooldown` — You can specify the duration of the cooldown using the options below.
>
> | `default-days` | Default cooldown period for dependencies **without specific rules** (optional).
> If not specified, Dependabot applies a default cooldown of 3 days. |
> | `semver-major-days` | Cooldown period for **major version updates** (optional, applies only to
> package managers supporting SemVer). |
> | `semver-minor-days` | Cooldown period for **minor version updates** (optional […]). |
> | `semver-patch-days` | Cooldown period for **patch version updates** (optional […]). |
> | `include` | List of dependencies to **apply cooldown** (up to **150 items**). Supports wildcards (`*`). |
> | `exclude` | List of dependencies **excluded from cooldown** (up to **150 items**). Supports wildcards (`*`). |
>
> The `exclude` list always take precedence over the `include` list. If a dependency is specified in
> both lists, it is **excluded from cooldown** and will be updated immediately.

`NPM and Yarn` figure dans la table des gestionnaires qui supportent `cooldown`, colonne
« Default days supported ».

**Antériorité :** l'option configurable existait depuis le 2025-07-01 —
`https://github.blog/changelog/2025-07-01-dependabot-supports-configuration-of-a-minimum-package-age/`
(vérifiée, HTTP 200). Ce qui a changé le 2026-07-14, c'est **le défaut**.

---

## Fait 2 — npm `min-release-age` : la formulation exacte, et deux conséquences non portées par l'ancrage

`docs/ci.md` documente `min-release-age=7` dans `.npmrc`, et sa précédence `cli > env > projet >
user > global`, d'après la documentation embarquée de `npm 11.16.0` sur la machine. La documentation
publiée dit la même chose et **deux choses de plus**.

*Extrait cité — `https://docs.npmjs.com/cli/v11/using-npm/config`, entrée `min-release-age`, récupéré
le 2026-08-14 :*

> **min-release-age** — Default: null — Type: null or Number
>
> If set, npm will build the npm tree such that only versions that were available more than the given
> number of days ago will be installed. If there are no versions available for the current set of
> dependencies, the command will error.
>
> This flag is a complement to `before`, which accepts an exact date instead of a relative number of
> days. The two may coexist […]; when both apply, `before` wins within a single source and across
> sources the standard precedence rules apply.
>
> **When this window stops `npm audit fix` from installing a patched version (because the fix was
> published too recently), npm keeps the package at its vulnerable version, warns that the fix was
> blocked, and exits with a non-zero code.** To install the fix, add the package to
> `min-release-age-exclude`, or relax `min-release-age` or `before`.
>
> Packages whose names match `min-release-age-exclude` are exempt from this filter.
>
> This value is not exported to the environment for child processes.

*Entrée voisine, même page :*

> **min-release-age-exclude** — Type: String (can be set multiple times) — […] Only the named package
> is exempt; its own dependencies still follow the release-age policy unless they also match a
> pattern. Patterns match against the package name, so `@myorg/*` matches `@myorg/shared-utils`.
> Excluding a package does not change which registry it is fetched from.

**Deux faits pour le rapport, déposés sans conclusion.**

1. **`min-release-age-exclude` est une seconde clé d'échappement**, et elle vit dans le même
   `.npmrc`. `docs/ci.md` écrit que `dependency-review` « cherche `--min-release-age` et `--before`
   dans `package.json`, dans les workflows et dans les scripts shell versionnés » — cette
   troisième clé n'y est pas nommée. Elle est néanmoins couverte par l'autre bout, puisque
   `quality-config-guard` surveille `.npmrc` : le changement serait **visible**, pas **impossible**.
2. **Le coût du cooldown est plus précis que « un correctif publié aujourd'hui n'est installable
   qu'à J+7 »** : `npm audit fix` **échoue avec un code non nul** et laisse la version vulnérable
   en place. Sur un dépôt où `sca` (OSV-Scanner) est bloquant, cette combinaison mérite d'être
   regardée en face.

---

## Fait 3 — Renovate `minimumReleaseAge` : le texte du schéma

Source : `https://raw.githubusercontent.com/renovatebot/renovate/main/docs/usage/configuration-options.md`,
5 230 lignes, récupéré le 2026-08-14. `renovate@44.30.0` publié le **2026-08-14** au registre npm,
licence **AGPL-3.0-only**.

*Extrait cité — § `minimumReleaseAge`, collecté le 2026-08-14 :*

> `minimumReleaseAge` is a feature that requires Renovate to wait for a specified amount of time
> before suggesting a dependency update.
>
> Note: Renovate will wait for the set duration to pass for each **separate** version. Renovate does
> not wait until the package has seen no releases for x time-duration(`minimumReleaseAge`).
>
> Do _not_ use `minimumReleaseAge` to slow down fast releasing project updates. Instead setup a
> custom `schedule` for that package […]
>
> When the time passed since the release is _less_ than the set `minimumReleaseAge`: Renovate adds a
> "pending" status check to that update's branch. After enough days have passed: Renovate replaces
> the "pending" status with a "passing" status check.
>
> The datasource that Renovate uses must have a release timestamp for the `minimumReleaseAge` config
> option to work. […]
>
> Configuring this option will add a `renovate/stability-days` option to the status checks.
>
> As of Renovate 42.19.5, using `minimumReleaseAge=0 days` is treated the same as
> `minimumReleaseAge=null`.

*Même section, l'exemple qui vise exactement le risque de l'ancrage :*

> #### Prevent holding broken npm packages
>
> npm packages less than 72 hours (3 days) old can be unpublished from the npm registry, which could
> result in a service impact if you have already updated to it. Set `minimumReleaseAge` to `3 days`
> for npm packages to prevent relying on a package that can be removed from the registry:
>
> ```json
> { "packageRules": [ { "matchDatasources": ["npm"], "minimumReleaseAge": "3 days" } ] }
> ```

Deux options voisines, relevées dans le même document : **`minimumReleaseAgeBehaviour`** — « When set
to `timestamp-required`, this version is not treated stable unless there is release timestamp, and
that release timestamp is past the `minimumReleaseAge` » — et un mode `flexible` dont le document dit
qu'il « can result in "flapping" of Pull Requests ».

**La différence de nature entre les trois mécaniques, telle que les sources l'écrivent** :

| | Où le cooldown agit | Ce qu'il empêche | Si la fenêtre n'est pas passée |
|---|---|---|---|
| npm `min-release-age` | **à l'installation** (`npm ci`, `npm install`) | que la version entre dans l'arbre | l'arbre est bâti sans elle ; `npm audit fix` sort en code non nul |
| Renovate `minimumReleaseAge` | **à la proposition** (branche / PR) | que la PR devienne verte | un check `pending` sur la branche |
| Dependabot `cooldown` | **à la proposition** (PR) | que la PR soit ouverte | rien n'est ouvert |

Seul npm agit sur ce qui est **réellement installé** ; les deux autres agissent sur le flux de
propositions. Le fait est déposé — c'est la question centrale du sujet, et elle ne se tranche pas ici.

---

## Versions exactes — registre npm, relevé le 2026-08-14

| Paquet | Version | Publiée le | Licence |
|---|---|---|---|
| `renovate` | **44.30.0** | 2026-08-14 | **AGPL-3.0-only** |

`npm 11.16.0` reste le constat de `docs/ci.md`, mesuré sur la machine de développement le
2026-08-14 ; il n'a pas été rejoué ici.

---

## URL vérifiées

Toutes contrôlées le 2026-08-14, HTTP 200. `docs.github.com` et `docs.renovatebot.com` n'ont aucun
`Disallow` gênant.

| URL | Ce qu'elle porte |
|---|---|
| `https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/` | l'annonce du défaut à 3 jours |
| `https://github.blog/changelog/2025-07-01-dependabot-supports-configuration-of-a-minimum-package-age/` | l'annonce de l'option, un an plus tôt |
| `https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference` | la référence des options `dependabot.yml` |
| `https://docs.renovatebot.com/configuration-options/#minimumreleaseage` | l'option Renovate |
| `https://docs.renovatebot.com/key-concepts/minimum-release-age/` | la page de concept dédiée, citée par la précédente |
| `https://docs.npmjs.com/cli/v11/using-npm/config` | la configuration npm, dont les deux entrées citées |

---

## Extraits de l'ancrage

*Extrait cité — `docs/ci.md`, § « Approvisionnement — ce que la SCA ne voit pas », dépôt
`colibri-cms`, branche `work/reprise-socle-v2`, collecté le 2026-08-14 :*

> **1. Cooldown de dépendances — 7 jours.** `.npmrc` doit déclarer `min-release-age=7`. Une version
> publiée il y a moins de sept jours n'est pas installable ; les versions compromises étant
> généralement retirées en quelques heures, la fenêtre d'attaque est couverte. `dependency-review`
> **refuse** si la clé manque ou si la valeur est inférieure, dès que `package.json` existe.

> **Une faiblesse propre à npm, et le contrôle qui la referme.** La documentation embarquée de
> `npm 11.16.0` écrit que la précédence des sources est `cli > env > projet > user > global`, si bien
> qu'« une source de priorité supérieure peut toujours relâcher ou écraser une source de priorité
> inférieure ». Un `npm ci --min-release-age=0` en ligne de commande annulerait donc le fichier sans
> le modifier. `dependency-review` cherche pour cette raison `--min-release-age` et `--before` dans
> `package.json`, dans les workflows et dans les scripts shell versionnés […]

> **Ce que le cooldown coûte, et c'est réel.** Un correctif de sécurité publié aujourd'hui n'est
> installable qu'à J+7. En incident il faut relâcher la clé à la main, sous pression — et comme
> `.npmrc` est surveillé par `quality-config-guard`, le commit devra porter `chore(config):`. Ce
> détour est le prix assumé ; il est écrit ici pour ne pas être découvert le jour de l'incident.

*Extrait cité — `docs/ci.md`, § « L'état du dépôt » :*

> **Le gestionnaire de paquets retenu est `npm`**, arbitré le 2026-08-14 : `docs/stack.md` ne le
> tranche pas, et ce choix décide d'un contrôle entier — le cooldown de dépendances est une clé du
> résolveur, pas un job. […] `npm 11.16.0` est présent et porte nativement `min-release-age` (en
> **jours**, `npm config ls -l`) ; **`pnpm` n'est pas installé** ; `bun 1.3.14` est présent et son
> aide n'expose aucun équivalent.

*Extrait cité — `docs/chantiers/en-attente/2026-08-14-durcissement-ci.md`, § « Écarté » :*

> - **Un job maison qui rejoue la résolution de dépendances** pour tenir le cooldown — il échoue au
>   facteur maintenance, et npm porte la clé nativement.

*Extrait cité — `docs/ci.md`, § « Contrôles », lignes concernées :*

> | 4 | `dependency-review` | Cooldown npm déclaré + aucune variation de dépendance muette | dépôt +
> diff du lockfile **et** du manifeste | **Bloquant** | 3a, 3b, 3c |
> | — | — (résolveur) | Cooldown de dépendances, `min-release-age = 7` dans `.npmrc` | installation |
> **Bloquant (déclaratif)** | 3a, 3b |

*Extrait cité — même document, sur la variation muette :*

> **2. Aucune variation de dépendance en silence.** Toute modification de `package-lock.json`, ou des
> blocs de dépendances de `package.json`, exige un commit portant `build(deps):`, `chore(deps):` ou
> `fix(deps):`, ou le label `deps` sur la PR. Le manifeste n'est pas comparé ligne à ligne mais **jeu
> de dépendances contre jeu de dépendances** […]

**Le dépôt n'a aujourd'hui ni `.github/dependabot.yml`, ni `renovate.json`, ni `.npmrc`** —
constaté le 2026-08-14 : `ls -a` à la racine ne rend aucun de ces fichiers, et le dépôt ne porte
aucun `package.json`. Le sujet 07 se pose donc **avant** que quoi que ce soit soit posé, et c'est
sa meilleure fenêtre.

---

## Ce qui a échoué

- **`github/docs` n'est plus lisible par l'API** : `gh api repos/github/docs/contents/…` rend **404**
  (dépôt privé ou retiré), et `search/code` sur ce dépôt aussi. Contournement retenu et suffisant :
  `docs.github.com` en `curl` direct, d'où sortent les extraits ci-dessus.
- **Aucune source primaire trouvée sur l'effet mesuré d'un cooldown** — combien d'incidents de
  chaîne d'approvisionnement une fenêtre de 3 jours attrape, combien une fenêtre de 7 jours attrape
  en plus. `docs/ci.md` écrit que « les versions compromises étant généralement retirées en quelques
  heures, la fenêtre d'attaque est couverte » **sans citation**. C'est un trou nommé, et c'est ce
  qui départagerait 3 et 7.
- **La limite chiffrée de l'API de lecture npm n'est pas publiée** — seul le code `429` est officiel.
  Les chiffres qui circulent sur des blogs tiers sont écartés, et aucune décision de cette collecte
  ne repose dessus.
- **Le comportement de `min-release-age` sous `npm ci` avec un lockfile déjà figé** n'a pas été
  éprouvé : il n'y a ni `package.json`, ni `package-lock.json` dans le dépôt. La documentation dit
  « npm will build the npm tree » — ce que fait `npm ci`, qui installe le lockfile tel quel, n'est
  pas explicité par la source. À vérifier au scaffold, pas par une recherche.
- **Limite confirmée par l'intake** : aucune mesure ne départage 3 et 7 jours, et le seul chiffrage
  qui circule est qualifié de non scientifique par son auteur. Voir « Comblement de l'intake »
  ci-dessous.

---

## Comblement de l'intake — 2026-08-14

Le rapport `07-flux-de-mise-a-jour-des-dependances-sous-cooldown.md` laisse trois points en suspens, dont deux commandent des lignes de
`docs/ci.md`. Vérifiés sur la documentation **embarquée** de `npm 11.16.0` — celle de la machine,
pas une page qui peut avoir dérivé.

### Le bypass ponctuel **est** documenté — le rapport se trompe en le disant absent

Le rapport écrit que `npm i --min-release-age 0 <pkg>` « n'est pas documenté verbatim sur la page
officielle npm » et « n'apparaît que dans une source communautaire ». **`min-release-age` est une
option documentée de la commande `install` elle-même**, dans les pages man livrées avec npm.

*Extrait cité — `man1/npm-install.1`, npm 11.16.0, section de configuration, lu sur la machine le
2026-08-14 :*

> **min-release-age** — Default: null — Type: null or Number
>
> If set, npm will build the npm tree such that only versions that were available more than the
> given number of days ago will be installed. If there are no versions available for the current set
> of dependencies, the command will error.
>
> This flag is a complement to before […] when both apply, before wins within a single source and
> across sources the standard precedence rules apply.
>
> This value is not exported to the environment for child processes.

*Même page, juste avant l'entrée :*

> If before and min-release-age are both set in the same source, before wins (an explicit absolute
> date overrides a relative window). Across sources, the standard precedence applies
> (**cli > env > project > user > global**), so **a higher-priority source can always relax or
> override a lower-priority one**.

**Le mécanisme du bypass est donc officiel**, énoncé par npm lui-même : la ligne de commande relâche
toujours le `.npmrc`. Ce que la page ne fait pas, c'est en donner l'exemple `--min-release-age=0` —
le gist n'invente rien, il illustre.

**Ce que ça change pour `dependency-review`.** Le contrôle cherche `--min-release-age` et `--before`
dans `package.json`, les workflows et les scripts shell versionnés. C'est le bon jeu de motifs pour
le relâchement **en ligne de commande**. Il reste la troisième clé, `min-release-age-exclude`, qui
vit dans `.npmrc` et n'est couverte que par `quality-config-guard` — visible, jamais impossible.
Constat déjà posé plus haut dans cette fiche, et le comblement ne le déplace pas.

### `npm ci` **n'est pas** concerné par le cooldown — et c'est le cas nominal du portail

Recherche exhaustive sur les pages man de npm 11.16.0, `grep -l 'min-release-age' man1/*.1` :

```
npm-install-test.1   npm-install.1   npm-outdated.1   npm-update.1
```

**Quatre commandes, et `npm ci` n'en fait pas partie** : `man1/npm-ci.1` ne contient **aucune**
occurrence de `release-age`. Le mécanisme le dit d'ailleurs par sa formulation — « npm will **build
the npm tree** » —, or `npm ci` n'en bâtit pas : il installe le verrou tel quel.

**Ce que ça règle.** Le point que la fiche laissait ouvert (« le comportement de `min-release-age`
sous `npm ci` avec un lockfile déjà figé n'a pas été éprouvé ») a une réponse **documentaire**, sans
attendre le scaffold : la clé s'applique à la **résolution** — donc au poste du développeur et à
celui de l'agent —, jamais à l'installation en CI. Ce n'est pas un défaut : une version déjà
verrouillée a par construction passé le cooldown au moment où elle est entrée. Mais cela déplace le
propos du rapport, qui présente `min-release-age` comme « le filet de sécurité côté install » : le
filet est côté **résolution**, et en CI c'est `dependency-review` — un contrôle **déclaratif** — qui
porte seul la garantie.

### L'objection de fond — la référence, et elle est plus mesurée que le rapport ne le dit

Source : **Sonatype**, *Software Dependency Cooldowns Are a Symptom, Not a Strategy* —
`https://www.sonatype.com/blog/software-dependency-cooldowns-are-a-symptom-not-a-strategy`
(reprise : `https://securityboulevard.com/2026/06/software-dependency-cooldowns-are-a-symptom-not-a-strategy/`).

Sa position, telle qu'elle se lit : les délais minimaux courts **sont** des filets raisonnables,
surtout là où les installations automatisées propagent vite ; ce qu'elle refuse, c'est d'en faire le
socle d'un programme. Deux formulations qui portent l'argument :

> These controls should be treated as fallback layers, not the foundation of a supply chain security
> program. They do not identify malicious behavior and do not distinguish between a trusted
> maintainer publishing an urgent fix and an attacker publishing a compromised release.

> A dependency cooldown is ultimately a bet — if you wait 24 hours, you are betting that someone else
> will discover the malicious package in 24 hours.

**Le rapport range Sonatype avec le « security theater ». C'est plus dur que la source.** Sonatype
ne conteste pas l'utilité du délai ; elle conteste qu'il tienne lieu de stratégie et rappelle qu'il
ne distingue pas un correctif urgent d'une compromission — ce qui est exactement le coût que
`docs/ci.md` a déjà écrit pour lui-même (« un correctif de sécurité publié aujourd'hui n'est
installable qu'à J+7 »). **Le désaccord se transmet sous cette forme-là, pas sous celle du rapport.**

### Ce qui reste ouvert

- **Aucune mesure ne départage 3 et 7 jours**, et le comblement ne l'a pas démentie. Le seul
  chiffrage qui circule — « 8/10 attaques sous une semaine », « 80-90 % de réduction d'exposition »
  (yossarian.net) — est qualifié de *very small sample set* et *not very scientific* **par son propre
  auteur**. Le choix reste un arbitrage de tolérance au risque, et il doit s'écrire comme tel.
