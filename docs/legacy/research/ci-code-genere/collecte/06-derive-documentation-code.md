# Collecte — 06 · Dérive documentation / code

**Route** : `research` · **Collectée le** : 2026-08-14 · **Campagne** : contrôles CI du code généré

Cette collecte a d'abord cherché du côté des outils de *documentation drift* au sens habituel — des
docs d'API désynchronisées d'une spec OpenAPI. **Ce n'est pas la dérive de ce dépôt**, et il faut le
dire ici pour que le prompt ne parte pas sur cette piste : ColibriCMS n'a pas de doc d'API publiée.
Sa documentation est un **corpus de gouvernance** — `docs/ci.md`, `docs/archi.md`, trente ADR,
`CLAUDE.md` — dont le contenu prescrit ce que le code et la CI doivent faire. La dérive est
l'écart entre cette prescription et l'état réel.

---

## L'ampleur exacte du corpus qui peut dériver — dépôt d'ancrage, 2026-08-14

Relevé par `wc -l` sur `colibri-cms`, branche `work/reprise-socle-v2`, HEAD `d97af3c` :

| Fichier | Lignes |
|---|---|
| `docs/stack.md` | 1 475 |
| `docs/prd.md` | 838 |
| `docs/ci.md` | 729 |
| `.github/workflows/ci.yml` | 644 |
| `docs/audit-auth.md` | 433 |
| `docs/audit-stack.md` | 425 |
| `docs/socle-de-livraison.md` | 420 |
| `docs/brief.md` | 376 |
| `.github/scripts/arch-invariants.sh` | 251 |
| `docs/audit-brief-prd.md` | 251 |
| `docs/archi.md` | 205 |
| `.github/workflows/nightly.yml` | 82 |
| `docs/chantiers/en-attente/2026-08-14-durcissement-ci.md` | 58 |
| `.github/scripts/verify-signed-commits.sh` | 45 |
| **Total relevé** | **6 280** |

Plus `docs/adr/` — trente ADR au registre de `docs/ci.md`, de `ADR-0006` à `ADR-0030`.
**Le dépôt ne porte aucune ligne de code** : ni `package.json`, ni `package-lock.json`, ni source.

---

## Les points de dérive déjà nommés par le dépôt lui-même

Ils ne se cherchent pas : ils sont écrits, et ils datent la dérive à l'avance. C'est le meilleur
gisement du sujet, et il descend en extraits.

*Extrait cité — `docs/ci.md`, § « L'état du dépôt au moment où cette phase est jouée », collecté le
2026-08-14 :*

> Les commandes du tableau ci-dessous sont **normatives, pas constatées** : elles fixent les noms de
> scripts que le scaffold devra honorer. Le premier commit de code qui ne les fournit pas fera
> échouer `build` ou `test` — c'est l'effet recherché.

*Le tableau en question, même document :*

> | Build | `npm run build` | **Normative** — à honorer au scaffold |
> | Typage | `npm run typecheck` (`tsc --noEmit`) | **Normative** |
> | Tests | `npm test` | **Normative** |
> | Couverture | `npm run coverage` → `coverage/lcov.info` | **Normative** |
> | Lint / format | `npm run lint` | **Normative** |
> | Code mort (nocturne) | `npm run knip` | **Normative** |
> | Mutation (nocturne) | `npm run mutation` | **Normative** |
> | Graphe d'imports (invariants `I1`, `I3`) | `[à compléter]` — dependency-cruiser, fichier de
> règles à poser au scaffold | Non posée |

**Sept commandes normatives et un `[à compléter]`** : voilà exactement ce qui peut dériver, et la
dérive est vérifiable par une comparaison de deux listes — les scripts de `package.json` contre les
lignes de ce tableau.

*Extrait cité — `docs/ci.md`, § « Consommé par » de l'en-tête :*

> | **Consommé par** | `CLAUDE.md` (phase `contract`), qui lit ses commandes ici plutôt que de les
> inventer |

*Extrait cité — `docs/ci.md`, § « Commandes du projet » :*

> Ce tableau est la source unique. `CLAUDE.md` y renvoie, il ne le recopie pas.

**Une source unique déclarée est une dérive potentielle nommée** : rien ne vérifie aujourd'hui que
`CLAUDE.md` renvoie et ne recopie pas.

*Extrait cité — `docs/ci.md`, § « La maturité de l'outillage » :*

> **Ces constats ont six jours et ne se re-vérifient pas depuis un document.** Toutes les lignes
> datées du 2026-08-08 viennent de l'archive du socle v1, qui les avait mesurées sur le registre.
> Elles sont reprises telles quelles, avec leur date, et **se re-vérifient à l'adoption** […]

**Cette collecte en donne la démonstration.** Deux constats de `docs/ci.md` avaient déjà dérivé au
2026-08-14 : `dependency-cruiser` y est daté du 2026-08-09 en `18.1.0` — le registre porte **18.2.0
depuis le 2026-08-10** ; `knip` y est indiqué en `6.32.0` (repris du socle v1, 2026-08-08) — le
registre porte **6.32.2 depuis le 2026-08-11**. Six jours ont suffi. C'est un fait de collecte, pas
un reproche : c'est précisément ce que le document annonçait.

*Extrait cité — `docs/ci.md`, § « Registre des ADR vérifiés en CI » :*

> `ADR-0006`, `0008`, `0009`, `0012`, `0015` et `0024` écrivent au présent, chacun, qu'un **contrôle
> bloquant** de `docs/ci.md` porte leur propriété. Huit clauses en tout. Cette phase pose les
> contrôles ; elle ne peut pas les rendre bloquants aujourd'hui […]
>
> **L'écart est nommé et daté, pas contourné** […]

*Extrait cité — `docs/ci.md`, § « Protection de branche », sur la dérive qui s'est effectivement
produite entre le document et la forge :*

> Le ruleset avait été posé pour le socle v1 ; six de ses contextes correspondaient encore aux jobs
> de ce portail, **trois portaient les anciens noms** :
> | `deps-policy` | **`dependency-review`** | · | `suppression-guard` | **`verifier-guard`** | ·
> | `workflow-audit` | **`workflow-integrity`** |
>
> **Le piège était celui que cette phase décrit.** Un check requis dont aucun job ne porte le nom
> reste `pending` **pour toujours**.

**Un cas réel, daté, mesuré et refermé.** C'est le meilleur exemple que le sujet puisse produire :
la dérive n'était pas entre deux documents, mais entre un document et **l'état d'une API de forge**,
et elle se serait manifestée par un blocage sans issue.

*Extrait cité — `docs/ci.md`, § `quality-config-guard`, chemins surveillés :*

> `eslint.config.*`, `.eslintrc*`, `tsconfig*.json`, `vitest.config.*`, `playwright.config.*`,
> `stryker.conf.*`, `knip.*`, `prettier.config.*`, `.prettierrc*`, `.prettierignore`,
> `.eslintignore`, **`.npmrc`**, `.dependency-cruiser.*`, `.github/workflows/**`,
> `.github/scripts/**`, et — parce qu'ils contraignent l'agent lui-même — `CLAUDE.md`, `AGENTS.md`,
> `.claude/**`.

`CLAUDE.md` est déjà surveillé — mais par un contrôle de **scope de commit**, qui rend le changement
visible, jamais cohérent.

*Extrait cité — `docs/ci.md`, sur la limite de cette classe de soupape :*

> **Cette soupape-là ne résiste pas à un agent, et il faut le savoir.** Un scope de commit s'écrit ;
> un label se pose par l'API avec une portée `repo`. Elle rend le changement **visible**, elle ne le
> rend pas **impossible** […]

---

## Les deux doctrines qui portent le sujet, et leurs sources

**(a) Les *fitness functions* et la conformité architecturale.** C'est le nom que la littérature
donne à ce que `arch-invariants.sh` fait déjà : un contrôle automatique qui prend une règle
d'architecture en défaut. Le vocabulaire académique est *architectural conformance checking* et
*architecture erosion*.

**(b) La documentation exécutable.** Extraire les blocs de code d'un document, les exécuter en CI,
faire échouer le build s'ils cassent. Le principe est ancien (`doctest`) ; **l'outillage JavaScript
est mort**, et c'est un fait de collecte :

| Outil | Dernier `push` | Étoiles | Archivé |
|---|---|---|---|
| `Widdershin/markdown-doctest` | **2020-10-07** | 169 | non |
| `anko/txm` | **2023-07-18** | 47 | non |

Relevé par `gh api` le 2026-08-14. Ni l'un ni l'autre ne franchit le seuil « archivé », mais aucun
des deux n'a bougé depuis des années. La règle de `docs/ci.md` — *un outil mort est un contrôle
mort* — s'applique de plein droit.

---

## URL vérifiées

Toutes contrôlées le 2026-08-14, HTTP 200.

| URL | Ce qu'elle porte | Niveau de preuve |
|---|---|---|
| `https://arxiv.org/abs/2306.08616` | *Towards Automated Identification of Violation Symptoms of Architecture Erosion* | **préprint** |
| `https://arxiv.org/abs/2401.16382` | *A MAPE-K-Based Method for Architectural Conformance Checking in Self-Adaptive Systems* | **préprint** |
| `https://docs.gitlab.com/development/documentation/testing/` | un cas réel et industriel de tests sur la documentation | éditeur, mais pratique documentée |
| `https://github.com/anko/txm` | *tests extracted from markdown*, agnostique du langage | dépôt |
| `https://github.com/Widdershin/markdown-doctest` | exécution des blocs `js` d'un markdown | dépôt |

**`arxiv.org` publie `Crawl-delay: 15`** et autorise `/abs`, `/pdf`, `/html`.

---

## Ce qui a échoué

- **La recherche « documentation drift » ne rend que de la matière d'éditeur** — Mintlify, GitBook,
  Docsie, Redocly, Fern, ReadMe. Tous vendent un produit, tous parlent de docs d'API engendrées
  d'une spec OpenAPI. **Aucune ne s'applique à ce dépôt**, et il n'y a pas d'URL à faire descendre :
  les faire descendre orienterait le rapport vers la mauvaise dérive. Le trou est nommé, il n'est
  pas comblé.
- **Aucune source primaire trouvée** sur la dérive entre un corpus de gouvernance (ADR, invariants,
  contrat d'agent) et le code, mesurée. La littérature d'*architecture erosion* traite de la dérive
  code ↔ architecture ; la dérive **document ↔ document** — `docs/ci.md` contre `CLAUDE.md`, un ADR
  contre son invariant — n'a pas de source ici.
- **`ArchUnit` et `NetArchTest` sont cités partout, et n'existent pas pour TypeScript.** Ce sont des
  outils Java/Kotlin et .NET. Aucun équivalent TypeScript n'a été vérifié dans cette collecte :
  c'est le sujet 02 qui porte cette question, et elle n'y est pas dupliquée.
- **Le taux de dérive de ce dépôt** ne se mesure pas aujourd'hui : deux constats sur outillage
  avaient dérivé en six jours (relevés plus haut), mais le corpus principal n'a pas d'aval — il n'y
  a pas de code contre quoi le confronter.
- **Complété par l'intake** : les trois versions annoncées par le rapport étaient périmées ou
  fausses ; ArchUnitTS est aveugle à `.astro` et `.svelte`. Voir « Comblement de l'intake » ci-dessous.

---

## Comblement de l'intake — 2026-08-14

Le rapport `06-derive-documentation-code.md` propose quatre outils déployables. Trois portaient une version ou une
contrainte non vérifiée ; toutes trois étaient fausses ou périmées. Relevé au registre npm et par
`gh api` le 2026-08-14.

### `typescript-docs-verifier` — la version du rapport est en retard d'un an

| | |
|---|---|
| version au dist-tag `latest` | **3.0.2**, publiée le **2026-03-02** |
| ce que le rapport annonce | « 3.0.1, last published 2 months ago, ~juin 2026 » |
| réalité de 3.0.1 | publiée le **2025-07-18** — treize mois, pas deux |
| licence · `engines` · pair | Apache-2.0 · `node >=20` · `typescript >=4.7.2` |
| dépôt `bbc/typescript-docs-verifier` | non archivé, dernier `push` **2026-03-02**, 22 étoiles, 3 issues ouvertes |

**Le conflit de cache que le rapport signale existait donc bien, mais il se résolvait dans l'autre
sens** : la version vive est 3.0.2, et 3.0.1 datait de l'année précédente. Le point utile pour ce
dépôt : la borne haute du pair `typescript` est **ouverte** (`>=4.7.2`), donc TypeScript 7.0.2
n'échoue pas à l'installation — contrairement à dependency-cruiser. Que la **compilation** passe
sous TS 7 n'est pas dit par le paquet, et ne se collecte pas : c'est un essai de scaffold.

### `@eslint/markdown` — la contrainte ESLint du rapport n'existe pas

| | |
|---|---|
| version au dist-tag `latest` | **8.0.3**, publiée le **2026-07-01** |
| ce que le rapport annonce | « 7.5.1, ~avril 2026, requiert ESLint ≥ 9.15 » |
| `peerDependencies` de 8.0.3 | **aucune** — le champ est absent |
| `devDependencies.eslint` de 8.0.3 | **`^10.0.3`** |
| `engines` · licence | `node ^20.19.0 \|\| ^22.13.0 \|\| >=24` · MIT |

**Le paquet est développé contre ESLint 10** et ne déclare aucune contrainte de pair. La question
« compatible avec l'ESLint 10.8.1 du dépôt ? » n'a donc pas de réponse négative à opposer : il n'y a
pas de borne. Le « ≥ 9.15 » du rapport décrivait la majeure 7.

### `ArchUnitTS` — actif, et **aveugle à `.astro` comme à `.svelte`**

Le paquet s'appelle **`archunit`** au registre (le rapport ne le nomme pas).

| | |
|---|---|
| version | **2.4.0**, publiée le **2026-07-26** |
| licence · `engines` | MIT · `node >=14.0.0` |
| dépendance | **`typescript ^5.9.3`** — embarquée, pas en pair |
| dépôt `LukasNiessen/ArchUnitTS` | non archivé, `push` 2026-08-05, dernier commit branche par défaut 2026-07-26, 457 étoiles, 27 issues |

**Recherche de code sur le dépôt entier, `gh api search/code`, le 2026-08-14 :**

| Terme | Résultats |
|---|---|
| `astro` | **0** |
| `svelte` | **0** |

Le `README.md` ne raisonne que sur des `.ts` (`withName('*.ts')`, `inPath('src/api/**/*.ts')`).

**Ce que ça règle pour la vague 2 du rapport.** Il pose ArchUnitTS et dependency-cruiser à parité
comme cibles futures pour traduire les invariants d'architecture. **Les deux butent sur le même mur
que le sujet 02 a établi** : ni l'un ni l'autre ne voit les `.astro` et les `.svelte` où vivent
`src/site/`, `src/admin/` et `src/pages/`. Et ArchUnitTS embarque `typescript ^5.9.3`, sur un dépôt
qui vise 7.0.2. La vague 2 ne peut donc pas être écrite comme un choix ouvert : c'est la chaîne
ESLint du sujet 02, ou rien.

### Ce qui reste ouvert — non collectable, et déjà nommé

- **Le taux de dérive du corpus principal** ne se mesure pas : il n'y a pas de code contre quoi le
  confronter. Inchangé après le rapport.
- **La dérive document ↔ document n'a aucune source primaire**, et le comblement ne l'a pas
  démentie. C'est le **résultat** du sujet, pas son échec : les trois hypothèses H1/H2/H3 du rapport
  sont des constructions, et H1 — l'intégrité des liens croisés — est la seule déterministe, donc la
  seule éligible à un contrôle bloquant sur ce portail.
