# Collecte — 03 · Antidotes à l'oracle faux — property-based et métamorphique

**Route** : `research` · **Collectée le** : 2026-08-14 · **Campagne** : contrôles CI du code généré

Le versant outillé est réglé ici, et il est trivial : la chaîne existe et les versions s'emboîtent.
Ce qui reste entier est la question doctrinale que la carte pose — ces techniques valent-elles
quelque chose **quand l'agent écrit aussi les propriétés** ?

---

## Versions exactes — registre npm, relevé le 2026-08-14

| Paquet | Version | Publiée le | Licence |
|---|---|---|---|
| `fast-check` | **4.9.0** | 2026-07-08 | MIT |
| `@fast-check/vitest` | **0.4.1** | 2026-04-28 | MIT |
| `vitest` | **4.1.10** | 2026-07-06 | MIT |
| `@cloudflare/vitest-pool-workers` | **0.21.3** | 2026-08-13 | MIT |
| `miniflare` | **5.20260811.1-alpha** | 2026-08-13 | MIT |
| `@stryker-mutator/core` | 9.6.1 | **2026-04-10** | Apache-2.0 |

**La chaîne s'emboîte, et ce n'est pas une supposition** — dépendances déclarées, lues au registre :

- `@fast-check/vitest@0.4.1` → `peerDependencies: { "vitest": "^4.1.0" }`,
  `dependencies: { "fast-check": "^3.0.0 || ^4.0.0" }`
- `@cloudflare/vitest-pool-workers@0.21.3` → `peerDependencies: { "vitest": "^4.1.0",
  "@vitest/runner": "^4.1.0", "@vitest/snapshot": "^4.1.0" }`, et il embarque
  `miniflare 5.20260811.1-alpha` et `wrangler 4.123.0`

Les deux exigent **la même plage `vitest ^4.1.0`**, que `docs/stack.md` impose déjà. Brancher
`fast-check` sous le pool `workerd` n'a donc aucun obstacle de version au 2026-08-14.

`docs/stack.md` note `miniflare` en `5.20260804.0-alpha` ; le registre porte
**`5.20260811.1-alpha`** au 2026-08-13, embarquée par la version courante du pool. La cadence
hebdomadaire que la Stack décrivait se confirme, et **c'est toujours une version alpha**.

---

## URL vérifiées

Toutes contrôlées le 2026-08-14, HTTP 200.

| URL | Ce qu'elle porte | Niveau de preuve |
|---|---|---|
| `https://fast-check.dev/docs/introduction/getting-started/` | la doc officielle de fast-check | officiel |
| `https://fast-check.dev/docs/advanced/model-based-testing/` | le *model-based testing*, la forme qui approche le plus un oracle de référence | officiel |
| `https://github.com/dubzzz/fast-check` | le dépôt — actif, dernier push 2026-08-14, 5 095 étoiles | dépôt |
| `https://vitest.dev/guide/` | la doc de Vitest | officiel |
| `https://arxiv.org/abs/2601.05542` | *Understanding LLM-Driven Test Oracle Generation* — Bodicoat, Jahangirova, Terragni, 2026-01-09 | **préprint** |
| `https://arxiv.org/abs/2607.10277` | *From Business Requirements to Test Assertions: Evaluating LLM-Generated Oracles on Real Bugs* — Ma, Eisty, 2026-07-11 | **préprint** |
| `https://en.wikipedia.org/wiki/Metamorphic_testing` | définition et bibliographie d'entrée du test métamorphique | tertiaire — point de départ, jamais une citation |

---

## Les deux préprints qui portent la question du sujet

*Extrait cité — résumé de `https://arxiv.org/abs/2601.05542`, collecté le 2026-08-14 :*

> Automated unit test generation aims to improve software quality while reducing the time and effort
> required for creating tests manually. However, existing techniques primarily generate regression
> oracles that predicate on the implemented behavior of the class under test. **They do not address
> the oracle problem: the challenge of distinguishing correct from incorrect program behavior.** […]
> This paper presents an empirical study on the effectiveness of LLMs in generating test oracles that
> expose software failures. We investigate how different prompting strategies and levels of
> contextual input impact the quality of LLM-generated oracles.

C'est exactement le mode 1 de `docs/ci.md`, dit dans le vocabulaire de la littérature : un oracle
de **régression** consacre le comportement implémenté, quel qu'il soit.

*Extrait cité — résumé de `https://arxiv.org/abs/2607.10277`, collecté le 2026-08-14 :*

> The oracle problem (determining the correct expected outcome for a test) remains a major
> bottleneck in automated testing, and is increasingly relevant as non-experts rely on AI-generated
> code they cannot reliably validate. We study whether large language models (LLMs) can generate
> generalizable test oracles directly from natural-language business requirements, without access to
> source code or example input-output pairs. […] For each of 10 real bugs from Defects4J Lang […]
> LLMs achieve non-trivial generalization but with substantial bug- and model-level variance.
> **Generated oracles align more closely with REQ than with SUT** […] No detectable linear
> relationship exists between requirement technicality/ambiguity ratings and oracle accuracy in this
> dataset […] As a pilot […]

Périmètre à ne pas élargir : **10 bogues**, un seul projet Defects4J (Lang), **Java**, cinq modèles
qui ne sont pas ceux qui écriraient ce dépôt, et les auteurs qualifient eux-mêmes l'étude de
*pilot*. Le résultat qui intéresse ce sujet est celui-ci et pas un autre : un oracle dérivé d'une
**exigence en langue naturelle** colle mieux à l'exigence qu'au code — ce qui est précisément la
propriété que le mode 1 demande.

**Le pont avec le cycle est direct et il n'est pas à inventer** : au niveau specs, chaque `SHALL`
EARS *est* une exigence en langue naturelle, écrite avant le code, et le mode TDD la traduit en test
avant l'implémentation. La question du sujet 03 devient alors mesurable : entre une propriété
`fast-check` écrite par l'agent et une assertion `expect` écrite par l'agent, laquelle résiste le
mieux à un oracle faux — et le `SHALL` amont change-t-il quelque chose ?

---

## Extraits de l'ancrage

*Extrait cité — `docs/ci.md` § « Ce que ces contrôles ne couvrent pas », dépôt `colibri-cms`,
branche `work/reprise-socle-v2`, collecté le 2026-08-14 :*

> **Mode 1 — l'oracle faux sémantique.** Du code qui compile, passe le lint et passe des tests
> **dont l'assertion vérifie la mauvaise chose** est indétectable : aucun outil ne connaît
> l'intention, et le test écrit pour valider un bug en est le cas typique. Le test de mutation
> nocturne le signale *statistiquement* et ne le prouve pas ; son bruit lui interdit de bloquer.
> `coverage` fait pire : il **récompense** un test sans assertion, qui exécute la ligne sans rien
> vérifier.

*Extrait cité — `docs/ci.md` § « Le régime nocturne » :*

> Ils ne peuvent pas devenir bloquants : le test de mutation a un taux de mutants équivalents estimé
> entre **4 % et 39 %** dans la littérature (Madeyski et al. 2013, **académique**), très au-dessus du
> seuil de 10-15 %

*Extrait cité — `docs/ci.md`, ligne du registre des ADR :*

> | [ADR-0008] | Aller-retour de sérialisation Markdown · rejet d'une URL de schéma non autorisé |
> `docs/adr/` | `test` — épreuves à écrire au **niveau specs** | **Bloquant** par le job qui les
> portera |

**Ceci est déjà une propriété au sens de `fast-check`**, et c'est la seule du dépôt qui le soit :
un aller-retour de sérialisation est l'invariant *round-trip* canonique. Le fait est déposé ; ce
qu'on en fait ne l'est pas.

*Extrait cité — `docs/ci.md` § « Contrôles », lignes concernées :*

> | — | `coverage` | Couverture du **code nouveau**, sans seuil chiffré | diff | Informatif |
> **vérificateur** — mesure l'exécution, **jamais l'assertion** |
> | — | `mutation` | Stryker (**nocturne**) | code nouveau | Informatif | 1 — **statistiquement**,
> jamais prouvé |

*Extrait cité — `docs/chantiers/en-attente/2026-08-14-durcissement-ci.md`, § « Ce qui restait à
écrire » :*

> - `[à compléter]` **l'ablation no-op** — remplacer un artefact critique par une implémentation vide
>   et vérifier que quelque chose casse. Aucune commande réelle ne l'exprime aujourd'hui.
> - `[à compléter]` **la base de référence des mutants survivants** — sans elle, le premier vrai run
>   de mutation remonte l'intégralité du corpus comme nouveau.

*Extrait cité — `docs/archi.md`, caractéristique `C5` :*

> | **C5** | Testabilité sans plateforme | la logique métier s'instancie sans base, sans HTTP et sans
> Worker | SC-016, SC-019 |

`C5` est la condition qui rend le property-based praticable ici : `src/core/` est du TypeScript nu,
sans liaison, donc une propriété s'y exécute sans `workerd`. La zone où les propriétés ont le plus
de sens est aussi la seule qui ne coûte rien à instrumenter.

---

## Ce qui a échoué

- **Aucune source primaire trouvée sur la question exacte du sujet** — l'oracle faux se reporte-t-il
  d'un cran quand l'agent écrit les propriétés ? Les deux préprints ci-dessus traitent des
  **assertions** engendrées par un LLM, pas des **propriétés** ni des **relations métamorphiques**
  engendrées par un LLM. Le trou est nommé : c'est le cœur du sujet, et il faudra que Research
  cherche du côté du *property-based test generation by LLM* et du *metamorphic relation inference*,
  pas du côté de l'*oracle generation*.
- **Aucune mesure de faux positifs de Stryker sur ce dépôt** : il n'y a pas de code, et le chantier
  de durcissement porte déjà la base de référence manquante.
- **`@fast-check/vitest` sous `@cloudflare/vitest-pool-workers`** : les plages de versions
  s'emboîtent, mais **aucune source ne dit que la combinaison fonctionne**. C'est un essai de
  scaffold, pas une recherche — noté ici pour qu'il ne soit pas demandé à Research.
- **Limite déclarée irréductible par l'intake** : aucune mesure du report de l'oracle faux en
  TypeScript / Vitest / fast-check n'existe — tout est en Python ou en Java. Voir « Comblement de
  l'intake » ci-dessous.

---

## Comblement de l'intake — 2026-08-14

Le rapport `03-antidotes-a-l-oracle-faux-property-based-et-metamorphique.md` prescrit trois gestes outillés. Les trois s'appuient sur des API dont il
ne vérifie ni l'existence ni le nom dans cette stack. Vérification faite, au tag exact.

### `fc.pre()` — l'équivalent fast-check de l'`assume()` de Hypothesis, et il annule la passe

*Extrait cité — `packages/fast-check/src/check/precondition/Pre.ts`, dépôt `dubzzz/fast-check`, au
tag **`v4.9.0`**, récupéré par `gh api` le 2026-08-14 :*

```ts
import { PreconditionFailure } from './PreconditionFailure.js';

/**
 * Add pre-condition checks inside a property execution
 * @param expectTruthy - cancel the run whenever this value is falsy
 * @remarks Since 1.3.0
 * @public
 */
export function pre(expectTruthy: boolean): asserts expectTruthy {
  if (!expectTruthy) {
    throw new PreconditionFailure();
  }
}
```

`pre`, `statistics` et `PreconditionFailure` sont exportés depuis
`packages/fast-check/src/fast-check-default.ts`, lignes 348, 351 et 352 **au même tag** — donc
`fc.pre()` et `fc.statistics()` existent bien en 4.9.0, sous ces noms.

**Le mot qui compte est `cancel`.** Une précondition fausse **annule la passe**, elle ne la fait pas
échouer : la propriété reste verte sur un espace d'entrées silencieusement amputé. C'est mot pour
mot le mécanisme que PBT-Bench nomme *Assume Misuse* (31 % des échecs en mode PBT), et la traduction
dans cette stack n'est donc pas une analogie : c'est le même geste, sous un autre nom. Le fait est
déposé ; ce qu'un contrôle en fait ne l'est pas.

### Stryker sait cibler un sous-ensemble — la recommandation du rapport est mécaniquement possible

*Extrait cité — `docs/configuration.md`, dépôt `stryker-mutator/stryker-js`, branche par défaut,
récupéré le 2026-08-14 :*

> ### `mutate` [`string[]`]
>
> Default: `['{src,lib}/**/!(*.+(s|S)pec|*.+(t|T)est).+(cjs|mjs|js|ts|mts|cts|jsx|tsx|html|vue|svelte)', …]`
>
> - Config file: `"mutate": ["src/**/*.js", "a.js"]` […]
> - Command line: `--mutate src/app/home/home.component.ts`, for one specific file ·
>   `--mutate "src/app/home/*.ts","!src/app/home/*.spec.ts"`, if you want to mutate just one specific directory
>
> With `mutate` you configure the subset of files or just one specific file to be mutated. […]
> It is possible to specify exactly which code blocks to mutate by means of a *mutation range*. This
> can be done postfixing your file with `:startLine[:startColumn]-endLine[:endColumn]`.

> ### `incremental` [`boolean`]
> Default: `false` · Command line: `--incremental`
> Enable 'incremental mode'. Stryker will store results in a file and use that file to speed up the
> next `--incremental` run.

**Deux faits pour l'ancrage.** (a) Muter le seul sous-arbre des fichiers property-based à chaque PR
qui les touche est faisable, en configuration comme en ligne de commande — c'est ce que la
recommandation « rendre le mutation testing bloquant pour les fichiers PBT » suppose, et `docs/ci.md`
ne connaît la mutation qu'en **nocturne informatif**. (b) La liste d'extensions par défaut porte
`vue` et `svelte`, **pas `astro`** — la même absence que dans dependency-cruiser, sur un autre outil.
`@stryker-mutator/core` est en **9.6.1**, publiée le **2026-04-10** : quatre mois sans version.

### Le trou que rien ne comble — **irréductible**

- **Aucune mesure du report de l'oracle faux en TypeScript / Vitest / fast-check n'existe.** Le
  rapport le déclare, et le comblement ne l'a pas démenti : PBT-Bench et Vikram et al. sont en
  Python/Hypothesis, les travaux sur les relations métamorphiques sont en Java, Python ou sur des
  systèmes ADS. Le transfert des modes d'échec est **conceptuel et non mesuré**. Ce que ce dépôt
  peut en faire n'est pas de citer un taux, c'est de tenir le geste : ne pas laisser l'agent écrire
  la propriété et le code dans le même contexte, et vérifier qu'une propriété tue au moins un
  mutant. La limite s'écrit à côté du contrôle, sinon elle sera comblée par une invention au premier
  usage.
