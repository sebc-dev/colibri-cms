# Collecte — 02 · Graphe d'imports résolu avec Astro et Svelte

**Route** : `mixte` · **Collectée le** : 2026-08-14 · **Campagne** : contrôles CI du code généré

Le versant `code` de ce sujet est **tranché ici** : la capacité réelle de dependency-cruiser à
parser `.astro` et `.svelte` se lit dans son code source, et elle a été lue. Ce qui reste à
chercher est la doctrine des règles de frontière entre zones, et les outils que ce constat ouvre.

---

## Versions exactes — registre npm, relevé le 2026-08-14

| Paquet | Version | Publiée le | Licence |
|---|---|---|---|
| `dependency-cruiser` | **18.2.0** | 2026-08-10 | MIT |
| `eslint-plugin-boundaries` | **7.2.0** | 2026-08-09 | MIT |
| `eslint-plugin-astro` | **3.1.0** | 2026-08-02 | MIT |
| `astro-eslint-parser` | **3.1.0** | 2026-08-13 | MIT |
| `@astrojs/compiler-rs` | **0.4.0** | 2026-08-10 | MIT |
| `@astrojs/compiler` (Go) | **4.0.0** | 2026-04-27 | MIT |
| `eslint-plugin-svelte` | **3.23.0** | 2026-08-13 | MIT |
| `svelte-eslint-parser` | **1.8.0** | 2026-06-04 | MIT |
| `eslint-plugin-import-x` | **4.17.1** | 2026-06-28 | MIT |
| `@softarc/sheriff-core` | **0.19.6** | **2025-09-22** | MIT |
| `madge` | **8.0.0** | **2024-08-05** | MIT |
| `dpdm` | 4.3.0 | 2026-07-29 | MIT |
| `steiger` | 0.6.0 | 2026-07-14 | MIT |
| `knip` | 6.32.2 | 2026-08-11 | ISC |
| `eslint` | 10.8.1 | 2026-08-07 | MIT |
| `typescript` | **7.0.2** | 2026-07-08 | Apache-2.0 |
| `astro` | 7.2.2 | 2026-08-13 | MIT |
| `svelte` | 5.56.9 | 2026-08-12 | MIT |

`docs/ci.md` date son constat de dependency-cruiser du **2026-08-09**, en `18.1.0`, en notant que
`18.1.1` était publiée. Deux versions ont passé depuis : `18.1.1` le 2026-08-02 et **`18.2.0` le
2026-08-10**.

---

## Le fait central : dependency-cruiser 18.2.0 ne connaît pas `.astro`, et connaît `.svelte`

Constaté par `git clone --depth 1` du dépôt à `ec603451d07d699280234808f91c4c8d3813f6e8`
(2026-08-10, tag `v18.2.0`), puis lecture des sources. **`grep -ril astro` sur `doc/`, `src/` et
`types/` ne rend rien du tout.**

*Extrait cité — `src/extract/transpile/index.mjs`, dependency-cruiser 18.2.0, collecté le
2026-08-14 :*

```js
export const EXTENSION2WRAPPER = new Map([
  [".js", javaScriptWrap],   [".cjs", javaScriptWrap],  [".mjs", javaScriptWrap],
  [".jsx", javaScriptWrap],  [".ts", typeScriptVanillaWrap], [".tsx", typeScriptTsxWrap],
  [".d.ts", typeScriptVanillaWrap], [".cts", typeScriptVanillaWrap],
  [".d.cts", typeScriptVanillaWrap], [".mts", typeScriptESMWrap],
  [".d.mts", typeScriptESMWrap], [".vue", vueWrap], [".svelte", svelteWrap],
  [".ls", liveScriptWrap], [".coffee", coffeeVanillaWrap], [".litcoffee", litCoffeeWrap],
  [".coffee.md", litCoffeeWrap], [".csx", coffeeVanillaWrap], [".cjsx", coffeeVanillaWrap],
]);
```

*Même fichier, la sortie par défaut quand l'extension est inconnue :*

```js
export function getWrapper(pExtension, pTranspilerOptions) {
  […]
  return EXTENSION2WRAPPER.get(pExtension) || javaScriptWrap;
}
```

Un `.astro` tombe donc sur le transpileur JavaScript. Et il n'entre pas non plus dans
`scannableExtensions` : `EXTENSION2AVAILABLE` (`src/extract/transpile/meta.mjs`) porte la même liste
d'extensions, `.astro` absente.

### La version de Svelte supportée — la doc et le code se contredisent

*Extrait cité — `doc/faq.md`, dependency-cruiser 18.2.0 :*

> ### Q: Does this work with Svelte?
> **A**: Yes.
> For `.svelte` single file components it uses the `svelte` (version 4.x)

*Extrait cité — `src/meta.cjs`, généré, même version :*

```js
supportedTranspilers: {
  babel: ">=7.0.0 <8.0.0",
  […]
  svelte: ">=3.0.0 <6.0.0",
  swc: ">=1.0.0 <2.0.0",
  typescript: ">=2.0.0 <7.0.0",
  […]
}
```

*Extrait cité — `src/extract/transpile/svelte-wrap.mjs`, même version :*

```js
const MAJOR_VERSION = VERSION ? Number(VERSION.split(".")[0]) : 0;
// svelte 5 natively supports typescript directly, without the need for preprocessing.
const lPreProcessedSource = MAJOR_VERSION < 5 ? preProcess(…) : pSource;
```

**Le code gère Svelte 5 explicitement et la plage l'admet (`<6.0.0`) ; la FAQ écrit « version
4.x ».** C'est la FAQ qui est en retard. Les deux sont recopiées ici sans être départagées.

### Le point qui n'est dans aucune note de carte : `typescript: ">=2.0.0 <7.0.0"`

**TypeScript `7.0.2` est la version courante du registre depuis le 2026-07-08**, et la plage
déclarée par dependency-cruiser 18.2.0 l'exclut. Le mécanisme de vérification n'avertit pas : il
rend le transpileur indisponible **en silence**.

*Extrait cité — `src/utl/try-import.mjs`, dependency-cruiser 18.2.0 :*

```js
export default async function tryImport(pModuleName, pSemanticVersion) {
  try {
    if (pSemanticVersion) {
      const lVersion = getVersion(pModuleName);
      const lCoerced = coerce(lVersion);
      if (lVersion && lCoerced && !satisfies(lCoerced.version, pSemanticVersion)) {
        return false;
      }
    }
    […]
  } catch { return false; }
}
```

`false` remonte dans `TRANSPILER2AVAILABLE.typescript`, donc `.ts`, `.tsx`, `.d.ts`, `.cts` et
`.mts` sortent de `scannableExtensions`. `ADR-0010` fixe TypeScript strict sans épingler de version.
Le constat est déposé ici sans conclusion : c'est au scaffold de trancher la version de TypeScript,
et à ce sujet de dire si dependency-cruiser reste le bon outil.

Note d'environnement : `engines.node` de dependency-cruiser 18.2.0 vaut `"^22||^24||>=26"`.

---

## L'état réel de l'effort amont sur `.astro`

Deux fils GitHub, ouverts, relevés par `gh api` le 2026-08-14. **Les deux URL sont ouvrables** —
`github.com/*/*/issues/N` et `/pull/N` ne sont pas dans le `Disallow` du `robots.txt` de GitHub
(vérifié le 2026-08-14 ; y sont : `/*/*/commits/`, `/*/*/compare`, `/*/tree/`, `/*/raw/`).

| URL | Objet | État au 2026-08-14 |
|---|---|---|
| `https://github.com/sverweij/dependency-cruiser/issues/1007` | demande de fonctionnalité | **ouverte** depuis le 2025-08-02 |
| `https://github.com/sverweij/dependency-cruiser/pull/1009` | l'implémentation | **ouverte, en brouillon** — 7 commits, 14 fichiers, dernière activité 2026-07-28 |

*Extraits cités du fil, collectés le 2026-08-14 :*

> **sverweij, 2025-08-04** — Hi @sushichan044 - thanks for the suggestion. I'd never heard of astro,
> but it does seem to be sorta popular 😄. And yes, for sure a transpile and/ or an extraction
> option would be very welcome.

> **sushichan044, 2026-06-02** — Sorry, the behavior of the Astro Go Compiler was difficult, and I
> had stopped working on the PR. Depending on the API of the new Rust compiler, it might be possible
> to support it simply without the hacks that were necessary for the Go compiler, so I will give it
> a try.

*Corps de la PR #1009, cases cochées par l'auteur :*

> - [x] detect static import in front matter block · [x] detect dynamic import in front matter block
> - [x] detect static import in script tag · [x] detect dynamic import in script tag
> - [ ] green ci
> **CAUTION — Still WIP. not tested yet**

**Le « nouveau compilateur Rust » que l'auteur attendait existe et est employé en production
ailleurs** : `astro-eslint-parser@3.1.0` (publié le 2026-08-13) dépend de
`@astrojs/compiler-rs@^0.4.0` (publié le 2026-08-10). Le fait est déposé, la conséquence ne l'est
pas — c'est au rapport de dire si elle en est une.

---

## La voie ESLint — ce qui parse déjà `.astro` et `.svelte`

Dépendances déclarées, lues au registre npm le 2026-08-14 :

- **`eslint-plugin-astro@3.1.0`** — `peerDependencies` : `eslint >=10.0.0`,
  `typescript-eslint >=8.61.0`, `@typescript-eslint/parser >=8.61.0`,
  `eslint-plugin-jsx-a11y >=6.10.2`. Dépend de `astro-eslint-parser ^3.0.0`.
  `engines.node` : `^22.22.3 || ^24.16.0 || >=26.3.0`.
- **`astro-eslint-parser@3.1.0`** — aucune `peerDependency`. Dépend de `@astrojs/compiler-rs ^0.4.0`,
  `@typescript-eslint/scope-manager ^8.61.0`, `espree ^11.2.0`.
- **`eslint-plugin-boundaries@7.2.0`** — `peerDependencies` : `eslint >=6.0.0` seulement.
  Dépend de `eslint-module-utils 2.12.1` et `eslint-import-resolver-node 0.3.9`.
  `engines.node` : `>=18.18`.

URL vérifiées le 2026-08-14 (HTTP 200) :

| URL | Ce qu'elle porte |
|---|---|
| `https://ota-meshi.github.io/eslint-plugin-astro/` | doc du plugin |
| `https://ota-meshi.github.io/eslint-plugin-astro/rules/` | la liste des règles |
| `https://ota-meshi.github.io/astro-eslint-parser/` | doc du parseur |
| `https://github.com/javierbrea/eslint-plugin-boundaries` | règles de frontière entre « éléments » |
| `https://sheriff.softarc.io/` | Sheriff — modules et *tags*, alternative déclarative |
| `https://knip.dev/reference/plugins/astro` | greffon Astro de knip |
| `https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md` | la grammaire des règles de dependency-cruiser |
| `https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md` | ses options, dont `doNotFollow` et les extensions |
| `https://github.com/sverweij/dependency-cruiser/blob/main/doc/faq.md` | la FAQ citée plus haut |
| `https://docs.astro.build/en/guides/typescript/` | alias et résolution côté Astro |
| `https://svelte.dev/docs/svelte/svelte-compiler` | l'API `compile` employée par dependency-cruiser |

Une règle de `eslint-plugin-svelte@3.23.0` mérite d'être nommée maintenant, parce qu'elle recoupe un
invariant de l'ancrage — *extrait cité du `README.md` du dépôt, branche `main`, collecté le
2026-08-14* :

> | [svelte/no-at-html-tags](https://sveltejs.github.io/eslint-plugin-svelte/rules/no-at-html-tags/)
> | disallow use of `{@html}` to prevent XSS attack | :star: |

`docs/archi.md` `I5` interdit `{@html}` et `set:html` hors de `src/render/markdown/`. La règle
ci-dessus interdit `{@html}` **partout** dans les `.svelte` — donc ni la même portée, ni la même
polarité. Le fait est déposé, l'arbitrage ne l'est pas.

---

## Extraits de l'ancrage

*Extrait cité — `docs/archi.md`, table des invariants, dépôt `colibri-cms`, collecté le 2026-08-14 :*

> **I1** — Le sens des dépendances entre zones est unique et descendant : `src/pages/` → toutes ;
> `src/site/` → `src/render/`, `src/core/` ; `src/admin/` → `src/render/`, `src/core/`,
> `src/platform/` ; `src/render/` → `src/core/` ; `src/platform/` → `src/core/` ; `src/core/` →
> aucune. Toute autre arête est interdite.
>
> **I2** — Aucun fichier de `src/core/` n'importe `astro`, `svelte`, `@astrojs/*` ni `cloudflare:*`.
>
> **I3** — `src/render/index.ts` est le seul chemin de `src/render/` importé depuis l'extérieur de la
> zone, et le gabarit de page publiée `src/site/page.astro` en est l'unique importateur ; ce gabarit
> est lui-même importé par la route publiée `src/pages/[...slug].astro` **comme** par la route
> d'aperçu `src/pages/admin/apercu/[...slug].astro`.

*Extrait cité — `docs/archi.md`, table des zones :*

> | `site/` | `src/site/` | les gabarits et composants propres au site publié |
> | `admin/` | `src/admin/` | l'application d'administration |
> | `render/` | `src/render/` | le rendu des emplacements éditables, partagé par le publié et l'aperçu |
> | `core/` | `src/core/` | la logique métier, sans framework ni plateforme |
> | `platform/` | `src/platform/` | les adaptateurs : D1, envoi d'e-mail, GitHub, session |
> | — | `src/pages/` | **pas une zone** : la surface de routage imposée par Astro […] |

*Extrait cité — `docs/ci.md`, § « Registre des ADR vérifiés en CI » :*

> **`I1` et `I3` résistent à l'expression régulière, et il faut le dire plutôt que le masquer.** La
> matrice des arêtes autorisées entre zones et le point d'entrée unique de `src/render/` se vérifient
> sur le **graphe d'imports résolu** — alias `tsconfig paths`, ré-exports, barils —, ce qu'un script
> maison ne fait pas sans recréer un résolveur.

*Extrait cité — `docs/archi.md`, contraintes imposées par la stack :*

> | Ce qu'un composant hydraté importe part dans le navigateur | Astro + Svelte 5 | le graphe
> d'imports **est** la frontière de confidentialité |

**La forme des zones décide de la faisabilité, et elle est connue** : `src/site/` et `src/admin/`
sont faits de `.astro` et de `.svelte` ; `src/pages/` est fait de `.astro` ; `src/core/` et
`src/platform/` sont du TypeScript nu. Les arêtes de `I1` qui partent d'un `.astro` sont donc
exactement celles que dependency-cruiser ne voit pas aujourd'hui.

---

## Ce qui a échoué

- **`https://eslint-plugin-astro.ota-meshi.dev/`** ne résout pas (échec de connexion, pas un 404).
  L'adresse réelle est `https://ota-meshi.github.io/eslint-plugin-astro/`, vérifiée.
- **`https://svelte.dev/docs/svelte/compiler-and-api`** rend 404. La bonne est
  `https://svelte.dev/docs/svelte/svelte-compiler`.
- **`https://www.npmjs.com/package/...`** rend **403** au `curl` : les pages npm ne descendent pas
  comme URL. Les versions ci-dessus viennent toutes de `registry.npmjs.org`, pas du site.
- **Le taux de faux positifs d'une règle de frontière sur ce dépôt** n'est pas collectable : il n'y a
  pas de code. Comme pour `arch-invariants`, il se mesurera au rejeu.
- **Limite confirmée par l'intake** : le taux de faux positifs d'une règle de frontière sur ce
  dépôt reste non collectable, faute de code. Voir « Comblement de l'intake » ci-dessous.

---

## Comblement de l'intake — 2026-08-14

### `I3` est exprimable — le rapport dit le contraire

Le rapport conclut que « boundaries n'empêche pas nativement les deep imports qui contournent un
`index.ts` » et renvoie à une règle tierce à trouver. **Elle n'est pas à trouver : elle est dans le
plugin.** `docs/rules/` de `javierbrea/eslint-plugin-boundaries`, lu par `gh api` le 2026-08-14,
porte sept règles :

```
element-types.md  entry-point.md  external.md  no-ignored-dependencies.md
no-private.md     no-unknown-dependencies.md   no-unknown-files.md
```

*Extrait cité — `https://www.jsboundaries.dev/docs/rules/entry-point/`, version affichée 7.1.0,
collecté le 2026-08-14 :*

> This rule validates dependencies to ensure that each element is imported only through its defined
> entry point. Files that are not declared as entry points cannot be imported from other elements.

> **Deprecated** — `boundaries/entry-point` is kept for backward compatibility but is deprecated and
> will be removed in a future major version. Use `boundaries/dependencies` instead. […] Rule
> "boundaries/entry-point" is deprecated and will be removed in future versions. Please migrate to
> the "boundaries/dependencies" rule with appropriate selectors.

**C'est exactement `I3`** — `src/render/index.ts` seul point d'entrée de la zone. Le fait déposé
sans conclusion : la règle qui le porte nommément est **dépréciée en v7**, et le chemin non déprécié
est `boundaries/dependencies` avec des sélecteurs d'entité. La note du site affiche **7.1.0** quand
le registre porte **7.2.0** — la doc est en retard d'une mineure sur le paquet.

Et le complément générique existe aussi ailleurs : `un-ts/eslint-plugin-import-x`, répertoire
`src/rules/`, lu le 2026-08-14, porte `no-internal-modules.ts`, `no-restricted-paths.ts` et
`no-cycle.ts`.

### Les ré-exports — l'inférence du rapport est corroborée, elle n'est pas démontrée

`eslint-import-resolver-typescript` est en **4.4.5**, publiée le **2026-06-01** (registre npm).

*Extrait cité — `README.md` du dépôt `import-js/eslint-import-resolver-typescript`, branche
`master`, collecté le 2026-08-14 :*

> This is a resolver for `eslint-plugin-import(-x)` plugin, not an ESLint plugin itself, it adds
> `TypeScript` support to `eslint-plugin-import`. This means you can:
> - `import`/`require` files with extension `.cts`/`.mts`/`.ts`/`.tsx`/`.d.cts`/`.d.mts`/`.d.ts`
> - Use `paths` defined in `tsconfig.json`
> - Prefer resolving `@types/*` definitions over plain `.js`/`.jsx`
> - Multiple tsconfigs support […]
> - `imports/exports` fields support in `package.json`

> If you're facing some problems with rules `import/default` or `import/named` […] do not post any
> issue here, because they are working exactly as expected on our side.

**Ce que ça règle et ce que ça ne règle pas.** La liste des capacités documentées ne mentionne
**aucune** traversée de chaîne `export … from` : le résolveur mappe un spécificateur vers **un**
fichier. Le renvoi de `import/default`/`import/named` vers le plugin confirme la répartition — le
suivi des exports nommés est le travail du plugin (`ExportMap`), pas du résolveur. **L'inférence du
rapport est donc cohérente avec le périmètre déclaré, et elle reste une inférence** : aucune phrase
ne dit « les chaînes de ré-export ne sont pas suivies ». La réserve se resserre, elle ne tombe pas.

### `.astro` dans dependency-cruiser — rien n'a bougé, et le brouillon est en conflit

Relevé par `gh api` le 2026-08-14 :

| Objet | État |
|---|---|
| issue **#1007** *Feature request: Support processing Astro files* | **ouverte**, créée le 2025-08-02, **dernière mise à jour 2025-08-23**, 3 commentaires — aucun depuis un an |
| PR **#1009** *feat: support tracking Astro files* | **ouverte, brouillon**, créée le 2025-08-05, mise à jour le **2026-07-28**, 7 commits, 14 fichiers, **`mergeable_state: dirty`** |

`mergeable_state: dirty` veut dire **conflits avec la base**. Le compilateur Rust que l'auteur
attendait existe bien (`@astrojs/compiler-rs 0.4.0`, employé par `astro-eslint-parser 3.1.0`,
relevés plus haut), mais **il n'a produit aucune reprise du brouillon** : la seule activité de 2026
est du 28 juillet, et la branche ne se fusionne pas en l'état.

**Ce que ça change pour le sujet** : l'attente de dependency-cruiser ne repose sur rien de daté. Le
rapport conditionnait sa réévaluation à la sortie de `typescript@7.1.0` avec une API publique ;
**la borne `.astro` est indépendante de celle-là et n'a pas de calendrier du tout.**

### Le trou qui reste — non collectable ici

- **Le taux de faux positifs d'une règle de frontière sur ce dépôt** ne se collecte pas : il n'y a
  pas de code. Il se mesurera au rejeu, comme celui d'`arch-invariants`. Déjà nommé plus haut, et
  inchangé après le rapport.
