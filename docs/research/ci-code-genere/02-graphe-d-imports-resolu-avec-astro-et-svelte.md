# Doctrine 2026 : appliquer des frontières architecturales directionnelles en CI sur un projet TypeScript/Astro/Svelte

## TL;DR
- **Pour un graphe d'imports réellement résolu (alias tsconfig, ré-exports, barils) sur du `.ts`, `.astro` et `.svelte`, aucun outil unique ne couvre proprement les trois extensions aujourd'hui : dependency-cruiser 18.2.0 résout le mieux le graphe TypeScript mais ne prend en charge ni TypeScript 7.x ni l'extension `.astro`, tandis que la chaîne ESLint (boundaries/import-x + eslint-plugin-astro + eslint-plugin-svelte) parse les trois formats mais raisonne sur l'import résolu au fichier baril, sans suivre les chaînes de ré-export.**
- **Recommandation pour ce CMS solo : poser la règle bloquante en CI avec `eslint-plugin-boundaries` (ou `import-x/no-restricted-paths`) branché sur `eslint-import-resolver-typescript`, en réutilisant les parsers `eslint-plugin-astro` et `eslint-plugin-svelte` déjà en place — c'est la seule combinaison qui voit vos `.astro`/`.svelte` ET tourne sous TypeScript 7.0.2.**
- **Sheriff est conceptuellement le plus proche du besoin (encapsulation par baril + règles directionnelles par tags via l'API du compilateur TypeScript), mais il est limité à `.ts`/`.tsx`, testé seulement jusqu'à TypeScript 5.7, et figé à la version 0.19.6 depuis fin 2025 — ce qui en fait un choix risqué pour un projet Astro/Svelte sous TS 7.**

## Key Findings

1. **Deux doctrines s'affrontent.** L'approche « graphe dédié » (dependency-cruiser, Sheriff) construit un graphe de dépendances complet et applique des règles `from → to` dessus. L'approche « lint ESLint » (eslint-plugin-boundaries, import-x/no-restricted-paths) évalue chaque instruction d'import dans l'AST, fichier par fichier. Les deux permettent des règles *directionnelles* (sens unique de dépendance), mais leur qualité de résolution du graphe diffère.

2. **dependency-cruiser 18.2.0 est disqualifié par deux contraintes vérifiées.** Sa table de transpilers déclare `typescript >=2.0.0 <7.0.0` : avec `typescript@7.0.2` installé, `depcruise --info` marque `.ts`/`.tsx` comme non pris en charge (« x »). Et sa table d'extensions ne liste pas `.astro` (elle liste `.vue` et `.svelte`, mais pas `.astro`). Donc pour ce projet précis (TS 7.0.2 + `.astro`), il ne fonctionne pas sans downgrade de TypeScript.

3. **La chaîne ESLint résout les alias tsconfig mais pas les ré-exports.** `eslint-plugin-boundaries` délègue la résolution à `eslint-import-resolver-typescript`, qui résout `@/features/foo` vers `features/foo/index.ts` (le baril) — il ne suit PAS la chaîne `export … from` jusqu'au fichier source d'origine. La règle de frontière est donc évaluée contre le baril, pas contre l'implémentation interne.

4. **Sheriff est le seul à modéliser explicitement l'encapsulation par baril**, en utilisant l'API du compilateur TypeScript pour bâtir le graphe et empêcher les « deep imports » qui contournent l'`index.ts`. Mais il est limité à TypeScript et testé seulement jusqu'à 5.7.

5. **Maturité : eslint-plugin-boundaries domine largement Sheriff.** boundaries est activement maintenu (v7.2.0, publiée sur npm « Published 5 days ago », soit vers le 9 août 2026 ; v7.0.0 le 5 juillet 2026, v6.0.2 le 30 mars 2026), avec un site de documentation dédié (jsboundaries.dev), là où Sheriff est figé à 0.19.6 (pré-1.0) depuis fin 2025.

## Details

### 1. Cadre : « architectural conformance » et directionnalité

L'objectif — imposer un sens unique de dépendance entre zones — relève de ce que la communauté appelle l'*architectural fitness function* / *dependency-policy enforcement*. Deux familles d'outils l'implémentent.

**Famille A — outils de graphe dédiés.** dependency-cruiser scanne « JavaScript, TypeScript, JSX, Vue, Svelte, CoffeeScript » et transforme le résultat en graphe de dépendances applicable. On y déclare des règles `forbidden`, `allowed` ou `required`. La directionnalité est native : une règle a une partie `from` et une partie `to`, chacune avec `path`/`pathNot` (expressions régulières, pas des globs). L'exemple canonique de la documentation interdit toute relation entre business components frères via `from: { path: "^src/business-components/([^/]+)/" }` et `to` avec group matching `$1`. Sheriff appartient aussi à cette famille (voir §4).

**Famille B — règles ESLint.** Deux options principales :
- `eslint-plugin-boundaries` (javierbrea) : on définit des `boundaries/elements` par patterns de chemin, puis une règle `boundaries/dependencies` (anciennement `boundaries/element-types`) avec `default: "disallow"` et des `policies` `from`/`allow`/`disallow`. Directionnalité native.
- `import-x/no-restricted-paths` (ou `import/no-restricted-paths`) : on définit des `zones` `{ target, from }`. La documentation précise que `from` « n'est PAS comparé littéralement à la chaîne d'import telle qu'elle apparaît dans le code ; il est comparé au chemin du fichier importé après résolution ». Directionnalité native mais expressivité plus pauvre (pas de notion de « type d'élément »).

### 2. Résolution du graphe : alias, ré-exports, barils

**dependency-cruiser (le plus complet, quand il fonctionne).** Il compile le TypeScript pour comprendre ce qu'il regarde ; il prend en compte `baseUrl`/`paths` du tsconfig via l'option `--ts-config`. Il utilise `enhanced-resolve` (les mêmes règles de résolution que webpack), et distingue les dépendances « pre-compilation » (types uniquement) via `tsPreCompilationDeps`. Il détecte les dépendances de type `aliased-*` (depuis la v16, « makes alias type derivation more correct and precise »). C'est le résolveur de graphe le plus riche des trois. **Mais** il exige que TypeScript soit installé et découvrable, et sa plage de versions exclut TS 7 (voir §3).

**Chaîne ESLint : alias oui, ré-exports non.** `eslint-import-resolver-typescript` « détecte automatiquement les path mappings personnalisés définis dans votre tsconfig.json », donc les alias TypeScript sont résolus avant l'application de la règle de frontière. En revanche, le résolveur mappe le *spécificateur d'import* vers un unique fichier sur disque (le baril `index.ts`) et s'arrête là : il ne parcourt pas les instructions `export … from` du baril pour reclasser la dépendance contre le fichier source ultime. **Conséquence pratique importante pour ce cas d'usage :** si zone A importe `{ X } from '@/zoneB'` et que `zoneB/index.ts` ré-exporte depuis `zoneB/internal/x.ts`, boundaries évalue la règle contre `zoneB` (le baril) — ce qui est en réalité *souhaitable* pour appliquer une frontière entre zones, mais ne détecte pas un contournement du baril (deep import) sauf règle dédiée. [Nuance de sourçage : l'affirmation « le résolveur ne suit pas les chaînes de ré-export » est une description fidèle du rôle d'un résolveur de modules, mais je n'ai pas trouvé de phrase de documentation l'affirmant verbatim ; c'est une inférence bien fondée.]

**Sheriff (encapsulation par baril, nativement).** Sheriff « construit le graphe de dépendances complet en utilisant l'API du compilateur TypeScript pour résoudre les imports », regroupe les fichiers en modules « selon l'emplacement des fichiers barils », et applique deux familles de contrôle : l'*encapsulation* (empêche les deep imports qui contournent l'`index.ts`) et les *dependency rules* (contrôle d'accès directionnel par tags). C'est le seul des trois qui traite l'`index.ts` comme une API publique de premier plan. Exemple de directionnalité par tags tiré de la documentation : `depRules: { 'type:feature': 'type:data' }` autorise `feature → data` mais interdit l'inverse.

### 3. Vérification : dependency-cruiser 18.2.0, TypeScript 7 et `.astro`

**TypeScript 7 : non pris en charge (fait établi, documentation + reproduction tierce).** La sortie de `depcruise --info` montre la table de transpilers avec `typescript >=2.0.0 <7.0.0`. Un billet technique (iimon, juillet 2026) reproduit exactement le problème décrit dans le prompt : avec `typescript@7.0.2` installé, `depcruise --info` liste `x typescript >=2.0.0 <7.0.0` et marque `.ts`, `.tsx`, `.d.ts` comme non reconnus (« x ») ; l'auteur doit rétrograder via `npm i -D "typescript@<7"` pour que la reconnaissance fonctionne à nouveau. Le mainteneur (sverweij) confirme sur la page des releases, verbatim : « TypeScript 7 support: typescript@7.1.0 is expected to ship with a public API - so that's the first version in the TypeScript 7 (formerly tsgo) version range dependency-cruiser will be able to support ». Autrement dit, la prise en charge de TS 7 est *planifiée* mais conditionnée à la sortie de `typescript@7.1.0` avec une API publique — elle n'existe pas en 18.2.0. [Interprétation du mainteneur, pas encore un fait livré.]

**Extension `.astro` : non prise en charge (fait établi).** La table d'extensions de `depcruise --info` liste `.js .cjs .mjs .jsx .ts .tsx .d.ts .cts .d.cts .mts .d.mts .vue .svelte .ls .coffee …` — `.astro` n'y figure pas. dependency-cruiser gère `.svelte` (transpiler `svelte >=3.0.0 <6.0.0`, donc Svelte 5 OK côté extension) et `.vue`, mais pas `.astro`. Pour un projet Astro, les fichiers `.astro` seraient donc traités comme non résolubles.

**Autre friction vérifiée :** TypeScript n'est pas déclaré dans les `peerDependencies` de dependency-cruiser (issue #1054, mars 2026), ce qui provoque des faux positifs sur les imports `type`-only en environnement pnpm strict tant qu'on n'ajoute pas manuellement le peer. À noter que le mainteneur a depuis ajouté un garde-fou au runtime (commit 65c432c, feat #1070) : « dependency-cruiser now also warns at runtime if it detects typescript is needed, but (a usable version of the) typescript compiler isn't present » — ce qui rend le diagnostic explicite mais ne résout pas l'incompatibilité de version TS 7.

**Conclusion §3 :** pour ce projet (TS 7.0.2 + `.astro`), dependency-cruiser 18.2.0 est inutilisable sans (a) rétrograder TypeScript sous la 7.0 et (b) renoncer à analyser les fichiers `.astro`. Les deux contraintes du prompt sont confirmées.

### 4. Maturité comparée : eslint-plugin-boundaries vs Sheriff

**eslint-plugin-boundaries (javierbrea).**
- Version 7.2.0, publiée sur npm « Public • Published 5 days ago » (soit vers le 9 août 2026) ; la v7.0.0 date du 5 juillet 2026, la v6.0.2 du 30 mars 2026 (registre npmx). Historique fourni et régulier.
- Documentation migrée vers un site dédié (jsboundaries.dev) avec Quick Start, Setup, Rules Reference, TypeScript Support.
- Compatibilité ESLint 9+ (v5+), et un correctif récent rend le helper `createConfig` compatible ESLint 10.x — verbatim des releases GitHub : « fix(#438): Fix createConfig helper types when used in Eslint v10.x. Returned type is now compatible both with eslint v9 and eslint v10 ».
- Support TypeScript : via `eslint-import-resolver-typescript` + `@typescript-eslint/parser`. Ne dépend PAS de l'API programmatique du compilateur TypeScript, donc **insensible au blocage TS 7** : le parsing est assuré par typescript-eslint et la résolution par le resolver, qui lisent le tsconfig sans exiger l'API compilateur stable de TS 7.

**Sheriff (softarc-consulting).**
- Dernière version publiée : 0.19.6 pour `@softarc/sheriff-core` et `@softarc/eslint-plugin-sheriff`, versionnées en tandem. Toujours en pré-1.0 (0.x). Environ 29 582 téléchargements/semaine (Socket), 196 stars GitHub et 20 issues ouvertes (ecosyste.ms) — une base d'utilisateurs bien plus petite que boundaries.
- Date de dernière publication : fin 2025 (npm affiche « Published 9 months ago », soit ~fin novembre 2025 ; le suivi Libraries.io/Socket la situe plutôt vers septembre 2025). Dans les deux cas, aucune nouvelle version depuis ~9 à 11 mois au moment de la rédaction — projet apparemment en pause.
- Peer dependency TypeScript : `>=4.8` (borne haute ouverte, donc TS 6/7 n'échoue pas à l'installation), mais support officiellement testé seulement de 4.8 à 5.7. Aucun support vérifié de TS 6.x/7.x.
- **Point critique TS 7 :** Sheriff repose sur l'API du compilateur TypeScript (`ts.parseJsonConfigFileContent`, résolution d'imports via l'API). Or TypeScript 7 (réécriture native « tsgo ») n'expose pas encore d'API programmatique stable — c'est précisément la surface dont Sheriff dépend. Sheriff ne devrait donc pas fonctionner correctement contre un compilateur TS 7 natif tant que lui-même et l'API TS 7 ne sont pas mis à jour. [Contexte industrie bien établi, mais pas tiré de la documentation propre de Sheriff.]
- Peer ESLint de `@softarc/eslint-plugin-sheriff` : `^8 || ^9` — ESLint 10 non listé.
- Formats : `.ts`/`.tsx` uniquement (plus `.js`/`.jsx` résolubles par TS). Aucune mention de `.astro`, `.svelte` ou `.vue` dans la documentation ou le README. Il ne verrait donc pas les composants Astro/Svelte du projet.

**Verdict maturité :** boundaries est nettement plus mature et mieux maintenu que Sheriff, et surtout compatible avec la stack du projet (TS 7 + ESLint récent). Sheriff a le meilleur modèle conceptuel (encapsulation par baril) mais est inadapté ici (mono-format `.ts`, TS ≤ 5.7 testé, développement en pause).

### 5. Retours d'expérience : combiner un plugin framework + un contrôle de frontière générique

Le point clé de compatibilité est le *parser* et le *resolver*, configurés par blocs `files` dans le flat config ESLint.

- `eslint-plugin-astro` utilise `astro-eslint-parser` pour parser les `.astro` ; sa documentation officielle montre comment déclarer `import/parsers` avec `"astro-eslint-parser": [".astro"]` et lister les modules virtuels `astro:*` dans `import/core-modules` (`astro:content`, `astro:transitions`) — ce qui signale que le combo avec les règles `import`/`boundaries` est un cas d'usage documenté et prévu. Note technique : lorsqu'il est utilisé avec `@typescript-eslint/parser` et `parserOptions.project`, le parser « crée temporairement un fichier .tsx pour parser le fichier .astro ».
- `eslint-plugin-svelte` (via `svelte-eslint-parser`) parse les `.svelte` et `.svelte.ts` (runes Svelte 5), en branchant `@typescript-eslint/parser` comme sous-parser des blocs `<script>` (`extraFileExtensions: ['.svelte']`, `parser: ts.parser`).
- `eslint-plugin-boundaries` se déclare explicitement comme *complémentaire* de eslint-plugin-import (« It is not a replacement for eslint-plugin-import, on the contrary, the combination of both plugins is recommended »).

**Compatibilité pratique :** puisque boundaries et import-x consomment l'AST produit par le parser actif du bloc `files` et délèguent la résolution au resolver partagé, ils s'appliquent à n'importe quel fichier parsé — y compris `.astro` et `.svelte` — dès lors que le bon parser est configuré pour ces extensions. C'est l'argument décisif : la chaîne ESLint hérite gratuitement du parsing framework que le projet a déjà.

**Frictions documentées à anticiper :**
- Un conflit connu entre le resolver TypeScript et la règle `boundaries/external` avec des packages npm locaux (issue #349) : désactiver le resolver TS « fait marcher » la règle, ce qui n'est pas une option — à surveiller pour des règles sur dépendances externes.
- La règle `boundaries/element-types`/`dependencies` ignore par défaut les dépendances internes à un même élément (issue #419) — pertinent si vous voulez interdire des imports *intra*-zone.
- Astro : sans configuration `import/core-modules` des modules virtuels `astro:content`, `astro:transitions`, etc., les règles import génèrent des faux positifs.

### Nature des sources et prudence

Les fiches comparatives d'outils de qualité de code (par ex. mrkeyoor.com, lobehub, blogs DEV) sont **promotionnelles ou secondaires** : elles reprennent souvent les capacités annoncées sans les vérifier. Je les ai utilisées uniquement pour des faits corroborés par ailleurs (numéro de version, date de push) et non comme autorité sur les capacités. Les affirmations de capacité proviennent de la documentation officielle (github.com/sverweij, jsboundaries.dev, sheriff.softarc.io, ota-meshi.github.io) et des sorties `--info`/changelogs.

## Tableau comparatif

| Critère | dependency-cruiser 18.2.0 | eslint-plugin-boundaries 7.2.0 (+ import-x) | Sheriff 0.19.6 |
|---|---|---|---|
| **Résolution alias tsconfig** | Oui, via `--ts-config` + enhanced-resolve (**confiance élevée**) | Oui, via eslint-import-resolver-typescript (**élevée**) | Oui, via API compilateur TS (**élevée**) |
| **Ré-exports / chaînes `export … from`** | Suit le graphe compilé (types via `tsPreCompilationDeps`) (**moyenne**) | Non suivi : règle évaluée contre le baril résolu (**moyenne** — inférence, pas de doc verbatim) | Encapsulation par baril native ; deep imports bloqués (**moyenne/élevée**) |
| **Barils / index files** | Résolus comme modules ; group matching regex (**élevée**) | Résolus au baril ; peut cibler l'`index` comme élément (**moyenne**) | Cœur du modèle : baril = API publique (**élevée**) |
| **Directionnalité des règles** | Native `from`/`to`, regex (**élevée**) | Native `from`/`allow`/`disallow` par type d'élément (**élevée**) | Native `depRules` par tags, `sameTag` (**élevée**) |
| **Support `.ts` sous TS 7.0.2** | **Non** (`typescript >=2.0.0 <7.0.0`) (**élevée**) | Oui (parsing typescript-eslint, indépendant de l'API compilateur) (**élevée**) | Non vérifié ; testé ≤ 5.7, dépend de l'API compilateur TS (**moyenne**) |
| **Support `.astro`** | **Non** (absent de la table d'extensions) (**élevée**) | Oui si `astro-eslint-parser` configuré (**élevée**) | **Non** (**élevée**) |
| **Support `.svelte` (Svelte 5)** | Oui côté extension (`svelte <6.0.0`) mais bloqué par le pb TS 7 (**moyenne**) | Oui via svelte-eslint-parser (**élevée**) | **Non** (**élevée**) |
| **Maturité / maintenance** | Très actif (~2,6 M dl/sem selon Snyk ; ~2,0 M selon Socket), v18.x régulière (**élevée**) | Actif, v7.2.0 (~9 août 2026), doc dédiée (**élevée**) | Pré-1.0, figé à 0.19.6 depuis fin 2025, ~29,6 k dl/sem (**élevée**) |
| **Faux positifs attendus (ce projet)** | Élevés/inutilisable (TS 7 + `.astro` non résolus) (**élevée**) | Faibles si parsers + resolver + `import/core-modules` bien configurés (**moyenne**) | N/A — ne voit pas `.astro`/`.svelte` (**élevée**) |

## Recommendations

**Étape 1 — Adopter la chaîne ESLint comme porte de CI bloquante (maintenant).** Configurer `eslint-plugin-boundaries` 7.2.0 avec :
- `@typescript-eslint/parser` pour `.ts`, `astro-eslint-parser` (via eslint-plugin-astro) pour `.astro`, `svelte-eslint-parser` (via eslint-plugin-svelte) pour `.svelte`/`.svelte.ts` ;
- `settings["import/resolver"] = { typescript: { alwaysTryTypes: true } }` pour résoudre les alias tsconfig ;
- `settings["import/core-modules"]` incluant `astro:content`, `astro:transitions` et tout autre module virtuel `astro:*` utilisé, pour éviter les faux positifs ;
- `boundaries/elements` décrivant vos zones (par patterns de chemin) et une règle `boundaries/dependencies` avec `default: "disallow"` encodant le sens unique voulu.
Exécuter `eslint "src/**/*.{ts,astro,svelte}"` en CI avec severity `error`. C'est la seule option qui voit les trois formats ET tourne sous TS 7.0.2.

**Variante minimaliste :** si vous ne voulez pas modéliser des « types d'éléments », `import-x/no-restricted-paths` avec des `zones {target, from}` suffit pour un sens unique simple entre deux ou trois répertoires, avec une surface de configuration plus petite (donc moins de faux positifs de configuration).

**Étape 2 — Verrouiller l'encapsulation des barils.** boundaries n'empêche pas nativement les deep imports qui contournent un `index.ts`. Si c'est un besoin, ajouter une règle dédiée (`import/no-internal-modules`, ou un plugin baril spécialisé) en complément.

**Étape 3 — Réévaluer dependency-cruiser quand `typescript@7.1.0` sortira avec une API publique.** À ce moment, tester si dependency-cruiser publie une version élargissant la plage à TS 7. dependency-cruiser resterait néanmoins inadapté aux `.astro` tant que l'extension n'est pas ajoutée à sa table de transpilation. **Seuil de bascule :** n'envisager dependency-cruiser comme outil de graphe complémentaire (visualisation, détection de cycles) que si (a) sa plage TypeScript inclut votre version et (b) votre proportion de logique métier dans des `.astro` est faible (l'essentiel du code de frontière vivant dans des `.ts`).

**Étape 4 — Ne pas retenir Sheriff pour ce projet**, malgré son excellent modèle d'encapsulation, tant qu'il reste mono-format `.ts`, testé ≤ TS 5.7, et sans release depuis fin 2025. **Seuil de reconsidération :** une release Sheriff ≥ 1.0 déclarant le support TS 7 ET un projet dont la frontière porte exclusivement sur des `.ts` (composants Astro/Svelte réduits à de la présentation).

**Benchmark de faux positifs :** après mise en place, viser zéro violation « fantôme » sur un run à blanc (baseline). Si des imports légitimes remontent, la cause la plus probable est (1) un module virtuel `astro:*` non déclaré, ou (2) un alias non résolu — corriger la configuration du resolver avant d'assouplir les règles.

## Caveats
- **Ré-exports :** l'affirmation que la chaîne ESLint évalue la frontière contre le baril et ne suit pas les chaînes `export … from` est une inférence fondée sur le rôle documenté du resolver, non une phrase verbatim de la documentation. [INCERTAIN sur le libellé exact ; comportement néanmoins cohérent avec l'architecture des resolvers.]
- **Support Svelte de dependency-cruiser :** l'extension `.svelte` est bien dans sa table, mais l'analyse resterait bloquée par l'incompatibilité TS 7 pour la partie TypeScript ; je n'ai pas pu tester la combinaison exacte.
- **Téléchargements de dependency-cruiser :** les sources divergent — Snyk annonce « 2,628,013 downloads a week », Socket ~1 997 665/sem ; le chiffre « 3,2 M » vu dans une fiche promotionnelle n'est corroboré par aucune source primaire. [INCERTAIN sur le chiffre exact.]
- **Date de dernière publication de Sheriff :** deux sources divergent — npm (« 9 months ago », soit ~novembre 2025) et Libraries.io/Socket (~septembre 2025). Les deux convergent sur « fin 2025, rien depuis ». [INCERTAIN sur la date exacte au jour près.]
- **Support TS 7 de Sheriff :** le peer `>=4.8` n'échoue pas à l'installation sous TS 7, mais le fonctionnement réel dépend de l'API compilateur TS 7, non stabilisée. Je n'ai pas de test direct confirmant l'échec ; c'est une déduction du mode de fonctionnement de Sheriff. [INCERTAIN.]
- **eslint-plugin-astro 3.1.0 / eslint-plugin-svelte 3.23.0 :** je n'ai pas retrouvé de note de version verbatim confirmant ces numéros précis ; le prompt les donne comme déjà connus et la documentation officielle confirme les capacités de parsing d'imports, sans que j'aie validé le numéro exact.
- **dependency-cruiser 18.2.0 vs 18.1.x :** les sorties `--info` citées proviennent de 18.0.0 et 18.1.0 ; la plage `typescript <7.0.0` y est identique et cohérente avec la contrainte du prompt pour 18.2.0, mais je n'ai pas capturé une sortie `--info` étiquetée exactement 18.2.0.