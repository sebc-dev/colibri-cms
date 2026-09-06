# Doctrine de sécurité applicative pour une stack Cloudflare Workers + D1 + Astro (îlots Svelte 5)

## TL;DR
- **Aucun des SAST « nom connu » (CodeQL, Snyk Code, Semgrep Pro) ne parse nativement `.astro` ni `.svelte`** — vérifié en source primaire : ils n'analysent que le JS/TS/JSX/TSX (et `.vue` pour CodeQL/Snyk, mais pas Svelte/Astro). Votre problème n'est donc pas « quel SAST remplace Semgrep », mais « comment forcer l'analyse à porter sur le JS/TS extrait des composants, et couvrir les angles morts Workers/D1/bundle par des contrôles dédiés ».
- **Pour un dev solo à budget zéro sans CB** : la meilleure base réaliste est **Snyk Code** (palier gratuit sans CB, 100 scans Snyk Code/mois) ou **CodeQL** (gratuit uniquement en repo public), complétés par `eslint-plugin-svelte` + `eslint-plugin-astro` (qui, eux, parsent réellement `.svelte`/`.astro`) et des règles Semgrep OSS en mode `typescript`/`generic` ciblant Workers/D1.
- **La fuite de secret via le graphe d'imports d'un îlot hydraté n'est couverte par aucun de vos contrôles actuels.** La parade la plus solide combine trois couches : (A) architecture stricte `astro:env` + modules `server`-only, (B) détection de fuite post-build via **DMNO** ou **varlock** (open-source, gratuits, sans CB), et (C) inspection du bundle client via `rollup-plugin-visualizer`/Sonda. Aucune ne suffit seule.

## Key Findings

1. **Fait établi (doc officielle CodeQL)** : l'extracteur JavaScript/TypeScript de CodeQL couvre `.js, .jsx, .mjs, .es, .es6, .htm, .html, .xhtm, .xhtml, .vue, .hbs, .ejs, .njk, .json, .yaml, .yml, .raml, .xml` (JS) et `.ts, .tsx, .mts, .cts` (TS). **Ni `.astro` ni `.svelte` n'y figurent.** La doc précise : « JSX and Flow code, YAML, JSON, HTML, and XML files may also be analyzed with JavaScript files. » Le code source `github/codeql` (FileExtractor.java) confirme la liste HTML : `.htm, .html, .xhtm, .xhtml, .vue, .hbs, .ejs, .njk, .erb, .jsp, .dot` — Svelte et Astro absents. `.vue` est couvert, mais pas Svelte/Astro.
2. **Fait établi (doc officielle Snyk)** : Snyk Code JavaScript/TypeScript supporte `.ejs, .es, .es6, .htm, .html, .js, .jsx, .ts, .cts, .mts, .tsx, .vue, .mjs, .cjs, .erb`. **Ni `.astro` ni `.svelte`.**
3. **Fait établi (doc Semgrep)** : la liste officielle des langages supportés (30+) n'inclut ni Svelte ni Astro. Ceci vaut pour l'OSS **comme** pour Semgrep Pro/Code : ajouter un langage nécessite un parser tree-sitter dédié, absent pour ces deux formats. La bascule vers Semgrep Pro n'apporte donc **pas** le parsing `.astro`/`.svelte`.
4. **Conséquence doctrinale majeure** : sur cette stack, un SAST « générique » ne voit qu'une fraction du code. Le code interactif vit dans les balises `<script>` de `.svelte` et le frontmatter `.astro` — invisibles pour CodeQL/Snyk/Semgrep. Les seuls outils qui parsent réellement ces fichiers sont les **linters de l'écosystème** (`eslint-plugin-svelte`, `eslint-plugin-astro`, `svelte-check`), d'où l'importance de `no-at-html-tags` déjà en place.
5. **Fait établi (doc Cloudflare)** : D1 sépare code et données via `prepare(...).bind(...)` (placeholders `?`). La méthode `D1Database::exec` « executes one or more queries directly without prepared statements or parameter bindings » — c'est le principal piège d'injection.
6. **Fait établi (doc Cloudflare)** : « Do not use vars to store sensitive information in your Worker's Wrangler configuration file. Use secrets instead. » Les bindings D1/KV/R2 sont des « live objects » et rendent les Workers structurellement résistants au SSRF quand la communication passe par binding plutôt que par URL.
7. **Fait établi (doc Astro)** : le flag CSP (introduit en expérimental dans **Astro 5.9** — « Astro 5.9 introduces experimental support for CSP out of the box... this is Astro's most upvoted feature request so far » — puis stabilisé en `security.csp` dans **Astro 6.0**) protège contre le XSS en émettant des hachages `script-src`/`style-src`. **Il ne détecte pas et n'empêche pas une fuite de secret dans le bundle** — ce n'est pas sa fonction.
8. **Fait établi (doc Astro)** : `astro:env` avec `context/access` distingue `secret server` (jamais dans le bundle) de `public client` (dans le bundle client ET serveur). C'est le mécanisme central pour empêcher les fuites — mais il n'a **pas** de détection de fuite active (proposition ouverte, roadmap discussion #956).

## Details

### Partie 1 — Outils SAST supportant réellement `.astro` et `.svelte`

**Le résultat central, vérifié en source primaire, est négatif** : les trois outils « premium » cités (CodeQL, Snyk Code, Semgrep Pro) n'ont **aucun parser natif** pour `.astro` ni `.svelte`. Ils analysent le JS/TS. Cela change la stratégie : au lieu de chercher un SAST magique, il faut (a) s'assurer que le code sensible est extrait dans du JS/TS analysable, et (b) empiler des contrôles spécialisés.

| Outil | Couverture réelle `.astro` / `.svelte` (vérifiée doc off.) | Palier gratuit : CB ? limites | Recommandation (dev solo, budget zéro sans CB) |
|---|---|---|---|
| **Semgrep OSS** | ❌ Aucun des deux (langages non supportés ; `generic` possible mais sans sémantique). Confirmé par le message d'erreur CLI listant les langages. | Gratuit, pas de CB, illimité en local (CLI, LGPL-2.1). | **À conserver** en mode `typescript`/`javascript`/`generic` pour écrire des règles custom Workers/D1 (injection `exec`, `set:html`, secrets). Ne couvrira jamais le corps `.svelte`/`.astro`. |
| **Semgrep Pro / Code** | ❌ Idem OSS : la bascule payante n'ajoute pas Svelte/Astro. | Palier plateforme existe ; Team facturé au contributeur/mois (voir Caveats — sources divergentes). | Peu d'intérêt marginal ici : ne résout pas le parsing manquant. |
| **CodeQL (GitHub)** | ❌ Aucun des deux (extracteur JS/TS ; `.vue` oui, Svelte/Astro non). | **Gratuit uniquement sur repos PUBLICS.** Repos privés = GitHub Advanced Security / Code Security (payant). Pas de CB si repo public. | **Bon choix SI le repo est public.** Analysera le JS/TS généré/importé et les routes API `.ts`. Angle mort sur le corps des composants. Repo privé : inaccessible gratuitement. |
| **Snyk Code** | ❌ Aucun des deux (`.vue` oui, Svelte/Astro non). | **Gratuit sans CB** (compte via GitHub/Bitbucket/Google/Docker). Individu : **100 scans Snyk Code/mois**. Repos publics ET privés. | **Meilleur compromis pour un dev solo sans CB** : SAST sur JS/TS (routes API, code serveur, `.ts`), scan de dépendances, 100 tests/mois suffisants en solo. |
| **ESLint + `eslint-plugin-svelte` + `eslint-plugin-astro`** | ✅ **Les seuls à parser réellement `.svelte` et `.astro`.** | Gratuit, open-source, pas de CB, illimité, local. | **Socle obligatoire.** `no-at-html-tags` (déjà en place) + règles a11y/sécurité. C'est votre unique analyse sémantique du code des composants. |
| **ast-grep** | ⚠️ Pas natif : remap `.svelte`/`.astro` → HTML (perd le JS des `<script>`/frontmatter), ou parser tree-sitter custom communautaire. | Gratuit, open-source, pas de CB. | Optionnel : règles structurelles custom si vous fournissez une grammaire tree-sitter. |

**Détail du palier gratuit Snyk (source primaire).** Le blog officiel Snyk (« Snyk Code is now available for free ») indique verbatim : « As an individual, we grant you up to 100 Snyk Code scans per month for free... Signing up for Snyk does not require a credit card, all you need is GitHub, Bitbucket, or Google account, or a Docker ID. » La page `snyk.io/plans` (FAQ) détaille le reste du Free plan : « Open Source, 200 tests; Code, 100 tests; IaC, 300 tests; Container, 100 tests. » **Le point stable et vérifié : 100 scans Snyk Code/mois pour un individu, sans CB.**

**Désaccord de sources à signaler** : `docs.snyk.io` cite « Open Source, 400 tests » là où `snyk.io/plans` cite « 200 tests » — **divergence entre deux pages officielles Snyk elles-mêmes.** Les comparatifs tiers (dev.to, vendr, checkthat.ai) donnent en outre des chiffres Semgrep Team divergents (22 / 35 / 40 $/contributeur/mois). Ces comparatifs commerciaux sont à traiter avec **prudence critique (potentiellement biaisés)** ; seules les pages officielles font foi. Le fait de couverture langage (négatif pour Svelte/Astro) provient, lui, exclusivement des docs officielles CodeQL/Snyk/Semgrep.

### Partie 2 — Vulnérabilités documentées Workers & D1

**Injection SQL / D1.** La doc D1 (`query-d1`) et `d1-database` montre le pattern sûr canonique :
```js
const stmt = env.DB.prepare(`SELECT * FROM Customers WHERE CompanyName = ?`);
await stmt.bind(companyName1).run();
```
Les placeholders `?` liés via `.bind()` sont toujours traités comme données, jamais comme SQL. **Le piège principal est `D1Database::exec`**, décrit verbatim par Cloudflare comme exécutant « one or more queries directly without prepared statements or parameter bindings » : toute donnée utilisateur concaténée dans `exec()` — ou interpolée en `${...}` dans une chaîne passée à `prepare()` au lieu d'un `?` — est une injection SQL directe. Règle de doctrine : **interdire `exec()` avec toute entrée dynamique ; interdire l'interpolation de chaînes dans `prepare()` ; exiger `?` + `.bind()`.** Les éléments non paramétrables (nom de colonne, `ORDER BY`) doivent passer par une allow-list stricte. (Rappel documenté par la bibliothèque `workers-qb` : « Do not use Raw to bypass the limit for request-controlled values; Raw inserts SQL directly and must only contain trusted, application-authored expressions. »)

**Exposition de bindings et secrets.** Doctrine tirée de la doc Cloudflare : (1) `wrangler.toml`/`[vars]` ne doit **jamais** contenir de secret (« Use secrets instead ») ; les valeurs non sensibles (IDs de namespace KV, account IDs, noms de bucket) y sont acceptables. (2) Secrets en prod via `wrangler secret put` (chiffrés, invisibles ensuite) ou Secrets Store ; en local via `.dev.vars`/`.env` git-ignorés. (3) La propriété `secrets.required` (Wrangler récent) déclare les noms attendus et fait échouer `wrangler deploy`/`versions upload` si un secret manque — bon garde-fou. Les bindings D1/KV/R2 sont des **live objects** injectés dans `env`, pas des chaînes : c'est un atout de sécurité.

**SSRF depuis un Worker.** Cloudflare documente que « Bindings, when used properly, make Workers immune to Server-Side Request Forgery (SSRF) attacks » : la communication inter-services par binding évite qu'un attaquant force des requêtes internes. Le risque réapparaît dès qu'un Worker fait un `fetch()` sortant vers une **URL dérivée d'une entrée utilisateur** (proxy d'image, « fetch remote content »). Précédent concret : **CVE-2025-6087** (GitHub Advisory GHSA-rvpw-p7vw-wj3m, divulguée le **16 juin 2025** par le chercheur **Edward Coristine**, notée **CVSS 3.1 = 9.1 CRITICAL**, CWE-918) dans `@opennextjs/cloudflare` — l'endpoint `/_next/image` chargeait des URL externes arbitraires : « This issue allowed attackers to load remote resources from arbitrary hosts under the victim site's domain... For example: https://victim-site.com/_next/image?url=https://attacker.com ». Corrigée par le **PR #727**, version **`@opennextjs/cloudflare@1.3.0`** (et `create-cloudflare@2.49.3`), plus un correctif plateforme côté Cloudflare. Doctrine : valider/allow-lister toute URL de `fetch` sortant, rejeter IP privées/link-local (127.0.0.1, 169.254.x.x), préférer les bindings ou Cloudflare Tunnel/Workers VPC pour l'accès interne. Nuance signalée par la communauté : les Outbound Workers **n'interceptent pas** les fetch des Durable Objects ni des bindings mTLS.

### Partie 3 — Fuite de secret via le graphe d'imports d'un îlot hydraté

**Le risque, précisément.** En Astro, un composant `.astro` s'exécute côté serveur ; un îlot Svelte marqué `client:load`/`client:visible`, etc. est **hydraté** : son code est bundlé et envoyé au navigateur. Si un tel composant (ou un module qu'il importe transitivement) référence un secret — via `import.meta.env.SECRET`, un `import { SECRET } from '../config'`, ou un secret passé en prop à l'îlot — **la valeur est inlinée dans le chunk JS client par Vite/Rollup au build**. C'est documenté : issue withastro/astro **#3102** (« Secret Environment Variables Can Be Shared In Client ») et **#4416**. Ce n'est pas un `grep` de valeur qui l'attrape de façon fiable (la valeur peut être transformée/minifiée) : c'est un problème de **graphe d'imports** — quel module finit dans quel bundle. (Illustration du même phénomène de propagation transitive : issue #14577, où importer un SVG dans un composant client tire tout le runtime serveur d'Astro + Zod dans le chunk client.)

Vos contrôles actuels sont aveugles à ce risque : Semgrep OSS ne parse pas `.svelte`/`.astro` ; `eslint-plugin-svelte`/`no-at-html-tags` vise le XSS, pas le flux secret→bundle ; le garde de session protège les routes API, pas le bundling.

**Le flag CSP expérimental d'Astro est-il pertinent ici ? Non.** La doc (`security.csp`, ajouté `astro@6.0.0`) est explicite : la CSP « help[s] minimize certain types of security threats by controlling which resources a document is allowed to load [...] additional protection against cross-site scripting (XSS) ». Elle contrôle **l'exécution/le chargement de ressources**, pas **l'inclusion d'une valeur secrète** dans un chunk. Un secret inliné dans un JS servi depuis `'self'` est parfaitement conforme à la CSP tout en étant fuité. **La CSP sert le pan XSS de votre doctrine, hors-sujet pour la fuite de secret.**

**Le bon mécanisme natif : `astro:env`.** La doc Astro distingue trois classes : `public client` (dans les deux bundles), `public server` (bundle serveur), et **`secret server` : « These variables are not part of your final bundle »**. Utiliser `envField.string({ context: 'server', access: 'secret' })` et importer depuis `astro:env/server` garantit que la valeur n'entre pas dans le bundle client. À l'inverse, `import.meta.env` non préfixé et le passage de secrets en props d'îlots restent dangereux. Astro documente aussi que « Secret client variables are not supported because there is no safe way » de les livrer au client.

#### Comparaison des hypothèses de parade

**Hypothèse A — Convention de nommage + lint custom.** Interdire `import.meta.env.X` (hors `PUBLIC_`) dans les fichiers `.svelte`/frontmatter d'îlots, via règle ESLint custom (les plugins Svelte/Astro parsent ces fichiers) + `astro:env` pour typer secret/public.
- *Forces* : gratuit, local, rapide, s'exécute là où les autres SAST échouent (ESLint parse `.svelte`/`.astro`).
- *Faiblesses* : ne suit pas le **graphe d'imports transitif** (un secret importé via un module tiers `utils.ts` puis référencé dans l'îlot échappe à une règle purement syntaxique). Détecte l'usage direct, pas la propagation.

**Hypothèse B — Analyse de bundle post-build.** Après `astro build`, inspecter les chunks `dist/client/` pour repérer soit la présence d'un secret, soit l'inclusion d'un module `server`-only. Outils : `rollup-plugin-visualizer` (recommandé par la doc Astro, génère des `stats.html` séparés client/serveur), ou **Sonda** (analyseur multi-framework avec support Astro). Pour la détection de valeur/leak : **DMNO** (`preventClientLeaks` : « We detect leaked secrets in built JS code and server-rendered responses, just in case you leaked a secret into ANYTHING getting sent over the wire ») et **varlock** (`varlock scan` + git hooks, MIT, « Detect leaks in bundled client code and outgoing server responses »).
- *Forces* : opère sur l'**artefact réel** envoyé au client — vérité terrain, indépendante du graphe d'imports source. DMNO/varlock sont open-source et gratuits sans CB, intégrables en git hook/CI.
- *Faiblesses* : détection **après** le build (tard dans la boucle) ; la détection par valeur peut rater un secret transformé ; `rollup-plugin-visualizer` seul montre les modules, pas les secrets (il faut coupler à un grep de noms de modules server-only ou à l'œil humain). La doc Astro avertit d'ailleurs que le bundle de build « isn't necessarily representative » de ce que reçoit le client, par page.

**Hypothèse C — Architecture stricte séparant modules server-only.** Isoler tout code sensible dans des modules jamais importables par un îlot : `astro:env/server` pour les secrets, endpoints/actions/`.server.ts` pour la logique, et ne faire passer au client que des données déjà filtrées (props sérialisées non sensibles). Convention de dossiers (`src/server/**` interdit d'import depuis les composants client) applicable via ESLint `no-restricted-imports`.
- *Forces* : élimine la classe de bug **à la racine** (le secret n'est jamais dans un module atteignable par le graphe client) ; aligné avec le design d'`astro:env` ; sans coût.
- *Faiblesses* : discipline humaine (un agent de code IA peut violer la convention) ; ne fournit pas de **détection** — d'où le besoin de la coupler à B pour vérifier.

**Verdict comparé.** Ces hypothèses ne sont pas concurrentes mais **complémentaires en défense en profondeur**, dans l'ordre C → B → A :
- **C est la fondation** (empêche le bug par conception) mais n'alerte pas ;
- **B est le filet vérifiable** (contrôle l'artefact réel) et doit être le **gate bloquant** en pré-déploiement — la seule couche qui voit la propagation transitive dans le bundle final ;
- **A est le détecteur précoce** (feedback en édition) mais insuffisant seul car aveugle au transitif.

Pour un dev solo dont une partie du code est écrite par un agent IA (risque accru de violation de convention), **B (post-build, DMNO ou varlock) est le contrôle le plus fiable à rendre obligatoire**, car il ne dépend pas de la discipline et inspecte ce qui part réellement sur le fil.

## Recommendations

**Étape 1 — Socle immédiat (gratuit, sans CB, aujourd'hui) :**
1. Garder `eslint-plugin-svelte` (`no-at-html-tags`) et **ajouter `eslint-plugin-astro`** : vos seuls analyseurs qui parsent réellement `.svelte`/`.astro`.
2. Adopter **Snyk Code** (compte gratuit sans CB, 100 scans/mois) pour le SAST du JS/TS (routes API, code serveur, `.ts`) — ou **CodeQL si le repo est public**.
3. Migrer toute config secrète vers `astro:env` (`context:'server', access:'secret'`) et vers Workers Secrets ; purger `wrangler.toml`/`[vars]` de tout secret ; déclarer `secrets.required`.

**Étape 2 — Fermer l'angle mort Workers/D1 :**
4. Écrire des règles **Semgrep OSS** (mode `typescript`/`generic`) : interdire `.exec(` avec argument non littéral, interdire l'interpolation `${` dans `prepare(`, flaguer `set:html`/`{@html}`, flaguer `fetch(` sur URL dérivée d'input.
5. Allow-lister les URLs de `fetch` sortant ; bloquer IP privées/link-local ; privilégier les bindings.

**Étape 3 — Fermer la fuite de secret via bundle (le cœur du besoin) :**
6. **Architecture (C)** : dossier `src/server/**` interdit d'import client via ESLint `no-restricted-imports` ; ne jamais passer de secret en prop d'îlot.
7. **Gate post-build (B)** : intégrer **DMNO `preventClientLeaks`** OU **varlock `scan`** en git hook/CI comme **étape bloquante** avant déploiement ; conserver `rollup-plugin-visualizer`/Sonda pour l'inspection manuelle périodique des chunks `dist/client/`.
8. Activer `security.csp` d'Astro — pour le durcissement **XSS** (pas pour la fuite de secret).

**Seuils qui changeraient la reco :**
- Si le repo devient **public** → CodeQL devient le SAST par défaut (dataflow plus profond que Snyk, gratuit).
- Si vous dépassez **100 scans Snyk Code/mois** → basculer sur Semgrep OSS local en CI (illimité, gratuit).
- Si Astro publie la **détection de fuite native `astro:env`** (roadmap #956) → elle pourrait remplacer DMNO/varlock à l'étape 7.

## Caveats
- **[INCERTAIN]** Les limites exactes du palier gratuit Snyk varient **entre deux pages officielles Snyk** : `snyk.io/plans` cite « Open Source 200, Code 100, IaC 300, Container 100 » tandis que `docs.snyk.io` cite « Open Source 400 ». Le point stable et vérifié : 100 scans Snyk Code/mois, sans CB. Vérifier au moment de l'inscription.
- **[INCERTAIN]** Les prix Semgrep Team et CodeQL/GHAS fluctuent selon les sources tierces (22–40 $ et ~19–49 $/committer). Seules les pages officielles font foi.
- Les comparatifs de vendeurs (dev.to, vendr, appsecsanta, checkthat.ai) sont **potentiellement biaisés** et n'ont servi que d'indices ; les faits de couverture langage proviennent des docs officielles CodeQL/Snyk/Semgrep (source primaire).
- DMNO et varlock (même éditeur, dmno-dev) reposent sur une petite équipe — **[INCERTAIN]** risque de gouvernance/maintenance à moyen terme ; varlock est MIT (pas de lock-in), ce qui atténue ce risque.
- La CVE-2025-6087 concerne `@opennextjs/cloudflare` (adaptateur Next.js), **pas** Astro ; elle illustre le pattern SSRF `/image?url=` transposable à tout Worker faisant du fetch d'URL utilisateur.
- Ce rapport se fonde uniquement sur les sources consultées pendant cette recherche (docs officielles Cloudflare, Astro, CodeQL, Snyk, Semgrep, DMNO, varlock ; issues GitHub ; avis GHSA/CVE) ; il ne présume pas d'un état de l'art au-delà d'août 2026.