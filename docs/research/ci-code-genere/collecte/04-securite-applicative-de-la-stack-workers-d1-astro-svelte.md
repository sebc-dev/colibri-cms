# Collecte — 04 · Sécurité applicative de la stack Workers · D1 · Astro · Svelte

**Route** : `mixte` · **Collectée le** : 2026-08-14 · **Campagne** : contrôles CI du code généré

Le versant `code` du sujet est tranché ici, et il l'est **par la négative** : le registre Semgrep
est rendu en JavaScript, donc invisible à Research — il a été lu autrement, et il ne porte rien
pour cette stack. Trois faits durs en sortent, et ils changent la question posée au rapport.

---

## Fait 1 — Semgrep ne connaît ni `.astro` ni `.svelte`, comme langages

Source canonique : `semgrep/semgrep-interfaces`, fichier `lang.json` — le registre des langages du
moteur, celui d'où sortent les extensions reconnues. Récupéré par
`https://raw.githubusercontent.com/semgrep/semgrep-interfaces/main/lang.json` le 2026-08-14 :
**50 entrées**.

*Extrait cité — `lang.json`, entrées pertinentes, collecté le 2026-08-14 :*

```
('html',   'HTML',       ['.htm', '.html'])
('js',     'JavaScript', ['.cjs', '.js', '.jsx', '.mjs'])
('ts',     'TypeScript', ['.ts', '.tsx'])
('vue',    'Vue',        ['.vue'])
('generic','Generic',    [''])
('regex',  'regex',      [''])
```

**`.astro` et `.svelte` n'apparaissent nulle part dans les 50 entrées.** `.vue` y est ; les deux
extensions de cette stack, non. Un fichier `.astro` ou `.svelte` n'est donc pas analysé par le job
`sast` — il n'est pas mal analysé, il n'est **pas** analysé.

Le même constat par l'autre bout, sur la page publique : `https://semgrep.dev/docs/supported-languages`
récupérée en brut le 2026-08-14 ne contient **aucune** occurrence de « Astro », « Svelte » ni
« Vue » — mais son tableau est rendu côté client, donc cette absence-là **ne prouve rien** et n'est
citée que pour mémoire. C'est `lang.json` qui fait foi.

---

## Fait 2 — le registre communautaire ne porte aucune règle Cloudflare, Workers, D1, Astro ou Svelte

Source : `git clone --depth 1` de `https://github.com/semgrep/semgrep-rules` à
`40b8c63f75dc7c22c8a77482d73bfb864b146f7e` (2026-07-29), 4 294 fichiers, lu le 2026-08-14.

| Terme cherché (`grep -ril`, `*.yaml`) | Fichiers |
|---|---|
| `svelte` | **0** |
| `miniflare` | **0** |
| `wrangler` | **0** |
| `durable` | **0** |
| `workers` | 1 — sans rapport avec Cloudflare |
| `cloudflare` | 3 — **uniquement des motifs de secrets** : `generic/secrets/gitleaks/cloudflare-global-api-key.yaml`, `…/cloudflare-origin-ca-key.yaml`, `…/cloudflare-api-key.yaml` |
| `astro` | 3 — **faux positifs de sous-chaîne** (`check-regex-dos.yaml`, `detect-redos.yaml`, `express-expat-xxe.yaml`) |
| `d1` | 17 — faux positifs de sous-chaîne |

Les 32 répertoires de premier niveau du dépôt (`ai`, `apex`, `bash`, `c`, …, `terraform`,
`typescript`, `yaml`) ne comptent **ni `astro`, ni `svelte`, ni `cloudflare`**.

---

## Fait 3 — `p/typescript` et `p/javascript` sont le même jeu de règles

`docs/ci.md` invoque `semgrep scan --config=p/typescript --config=p/javascript
--config=p/owasp-top-ten`. Les paquets ont été téléchargés par `https://semgrep.dev/c/p/<nom>` le
2026-08-14 :

| Paquet | Octets | Règles (`- id:`) | Langages déclarés |
|---|---|---|---|
| `p/typescript` | 214 313 | **74** | `javascript` 67, `typescript` 69, `ts` 4, `js` 1 |
| `p/javascript` | 214 313 | **74** | `javascript` 67, `typescript` 69, `ts` 4, `js` 1 |
| `p/owasp-top-ten` | 1 448 110 | 559 | 25 langages, dont `javascript` 65 et `typescript` 67 |

**Les deux jeux d'identifiants sont identiques** — comparaison ensembliste faite en session :
74 = 74, différence symétrique vide. Seul l'ordre des octets diffère (empreintes SHA-256 distinctes,
taille identique). **Aucune** des trois listes ne déclare `astro` ni `svelte` comme langage.

---

## Ce qui existe malgré tout, pour cette stack

| Paquet | Version | Publiée le | Licence | Ce qu'il apporte ici |
|---|---|---|---|---|
| `eslint-plugin-svelte` | **3.23.0** | 2026-08-13 | MIT | une rubrique « Security Vulnerability », dont `svelte/no-at-html-tags` |
| `eslint-plugin-astro` | **3.1.0** | 2026-08-02 | MIT | parse `.astro` via `astro-eslint-parser` |
| `eslint-plugin-no-unsanitized` | **4.1.5** | 2026-02-19 | MPL-2.0 | Mozilla — injection DOM |
| `eslint-plugin-security` | **4.0.1** | 2026-06-12 | Apache-2.0 | heuristiques Node, bruit connu |
| `@eslint-community/eslint-plugin-eslint-comments` | **4.7.2** | 2026-05-26 | MIT | interdit ou encadre `eslint-disable` — recoupe le mode 2 |
| `astro-eslint-parser` | 3.1.0 | 2026-08-13 | MIT | s'appuie sur `@astrojs/compiler-rs 0.4.0` |

*Extrait cité — `README.md` de `sveltejs/eslint-plugin-svelte`, branche `main`, § « Security
Vulnerability », collecté le 2026-08-14 :*

> These rules relate to security vulnerabilities in Svelte code:
> | [svelte/no-at-html-tags](https://sveltejs.github.io/eslint-plugin-svelte/rules/no-at-html-tags/)
> | disallow use of `{@html}` to prevent XSS attack | :star: |

---

## URL vérifiées

Toutes contrôlées le 2026-08-14, HTTP 200.

| URL | Ce qu'elle porte |
|---|---|
| `https://semgrep.dev/docs/supported-languages` | la liste officielle — **tableau rendu en JS**, à lire avec cette réserve |
| `https://semgrep.dev/r` | le registre — **rendu en JS**, non indexable |
| `https://semgrep.dev/p/typescript` | la fiche du paquet |
| `https://developers.cloudflare.com/workers/` | la documentation Workers |
| `https://developers.cloudflare.com/d1/best-practices/query-d1/` | requêtes D1 — `prepare` / `bind` |
| `https://ota-meshi.github.io/eslint-plugin-astro/rules/` | les règles disponibles sur `.astro` |
| `https://sveltejs.github.io/eslint-plugin-svelte/rules/no-at-html-tags/` | la règle citée |
| `https://docs.astro.build/en/reference/experimental-flags/csp/` | la CSP posée par Astro, en `<meta>` |
| `https://astro.build/blog/astro-590/` | le billet qui explique le refus du nonce |

*(Les deux dernières sont déjà citées et datées dans `docs/archi.md` ; elles descendent comme URL
parce qu'elles sont ouvrables et que le rapport en aura besoin.)*

---

## Extraits de l'ancrage — l'angle propre au dépôt, à ne pas perdre

*Extrait cité — `docs/archi.md`, contraintes imposées par la stack, dépôt `colibri-cms`, branche
`work/reprise-socle-v2`, collecté le 2026-08-14 :*

> | Ce qu'un composant hydraté importe part dans le navigateur | Astro + Svelte 5 | le graphe
> d'imports **est** la frontière de confidentialité |

C'est l'angle que la carte demande de ne pas perdre : **aucun contrôle du portail ne voit cette
fuite.** Un secret importé dans un module que touche un îlot hydraté part dans le paquet client,
sans qu'aucun des neuf bloquants ne change de couleur. `secrets` cherche des credentials **vérifiés**
dans le dépôt, pas une valeur légitime qui franchit une frontière.

*Extrait cité — `docs/archi.md`, invariants `I4`, `I5`, `I6` :*

> **I4** — Aucun fichier `.astro` sous `src/admin/` ne porte de directive `client:*`
>
> **I5** — `{@html}` et `set:html` n'apparaissent que sous `src/render/markdown/` ; aucune occurrence
> ailleurs dans les sources
>
> **I6** — Tout fichier de route sous `src/pages/api/` ou `src/pages/admin/`, hors du sous-arbre
> `src/pages/api/public/`, importe le garde de session `src/platform/session/index.ts` ; aucun
> fichier de `src/pages/api/public/` ne lit un corps `multipart`

*Extrait cité — `docs/ci.md`, § « Contrôles », ligne `sast` :*

> | — | `sast` | Semgrep | dépôt | Informatif | **vérificateur** — cible du mode 2 (injection, XSS,
> traversée) |

*Extrait cité — `docs/ci.md`, § `verifier-guard`, portée :*

> **Sa portée est limitée aux extensions de source** — `*.ts` `*.tsx` `*.js` `*.jsx` `*.mjs` `*.cjs`
> `*.astro` `*.svelte` —, **tests et documentation exclus**.

**À rapprocher du fait 1, et c'est la contradiction utile du sujet** : `verifier-guard` traque
`nosemgrep` dans les `.astro` et les `.svelte` — c'est-à-dire dans des fichiers que Semgrep
n'analyse pas. Le garde est plus large que le vérificateur qu'il protège.

*Extrait cité — `docs/ci.md`, § « Ce que ces contrôles ne couvrent pas » :*

> **La logique métier et l'autorisation.** Le SAST ne modélise pas l'intention : un IDOR sur la
> médiathèque ou sur les demandes de devis ne produit aucun motif suspect.

> **La CSP et les en-têtes sur la réponse elle-même.** `arch-invariants` lit les **interdits** dans
> les sources ; que l'en-tête soit effectivement posé sur **toute** réponse d'administration est du
> runtime. […] la quatrième porte n'a aucun repli : si la CSP tombait, l'invariant d'échappement
> `I5` resterait seul.

*Extrait cité — `docs/ci.md`, § « La maturité de l'outillage » :*

> | Semgrep (image) | 1.172.0, digest `sha256:65dcd440…` | 2026-08-08 — même correction de tag ;
> l'action d'emballage est **archivée**, on invoque le binaire |

---

## Ce qui a échoué

- **Le registre Semgrep ne se parcourt pas** : `https://semgrep.dev/r` est rendu côté client, et le
  `robots.txt` de `semgrep.dev` ne l'interdit pas — il est simplement vide de contenu au `curl`.
  Contournement retenu, et il est meilleur que la page : le dépôt de règles cloné et `lang.json`.
- **Aucune règle Semgrep propriétaire (Semgrep Pro) n'a pu être inspectée** : elle exige un compte.
  L'existence d'un jeu Pro pour Workers ou D1 **n'est ni confirmée ni infirmée ici**, et c'est une
  question à poser au rapport — avec le rappel du socle `I5` : un palier gratuit qui exige une carte
  bancaire rend le composant inutilisable, quel que soit son mérite.
- **Aucun jeu de règles Semgrep officiel pour Cloudflare Workers ou D1** n'a été trouvé dans le
  registre communautaire. Absence constatée sur un instantané daté du 2026-07-29 ; ce n'est pas une
  preuve d'inexistence hors de ce dépôt.
- **Les paliers gratuits de Semgrep AppSec Platform** n'ont pas été relevés : la page tarifaire n'a
  pas été ouverte dans cette collecte. À faire au comblement si le rapport propose un composant
  hébergé.
- **Limite déclarée irréductible par l'intake** : qu'un palier gratuit exige ou non un moyen de
  paiement ne se collecte pas — `I5` se vérifie **sur le compte**, à l'inscription. Voir
  « Comblement de l'intake » ci-dessous.

---

## Comblement de l'intake — 2026-08-14

Le rapport `04-securite-applicative-de-la-stack-workers-d1-astro-svelte.md` fait de **DMNO ou varlock** le gate bloquant qui referme la fuite de
secret, sans citer une seule version. Les trois seuils de re-passe de `docs/ci.md` ne peuvent pas
s'appliquer à un composant qu'on ne sait pas dater. Ils ont donc été datés.

### DMNO est en **mode maintenance**, déclaré par son propre éditeur

*Extrait cité — `README.md` du dépôt `dmno-dev/dmno`, branche par défaut, récupéré par `gh api` le
2026-08-14 :*

> # DMNO
> **Maintenance mode:** DMNO receives critical bug and security fixes only. For a suitable
> replacement, see [Varlock](https://varlock.dev).

Le commit qui a posé cette phrase est le **dernier de la branche par défaut** : *« add maintenance
mode message (#245) »*, du **2026-06-10**.

| | `dmno` | `varlock` |
|---|---|---|
| version au registre | **0.0.41** | **1.16.1** |
| publiée le | **2025-12-01** | **2026-08-08** |
| quatre dernières | 0.0.38 (2025-03-03) · 0.0.39 (2025-03-18) · 0.0.40 (2025-11-21) · 0.0.41 | 1.14.1 (2026-07-29) · 1.15.0 (2026-07-31) · 1.16.0 (2026-07-31) · 1.16.1 |
| licence | MIT | MIT |
| `engines` | `node >=16` | `node >=22.3.0`, `bun >=1.3.3` |
| dernier `push` du dépôt | **2026-06-10** | **2026-08-14** |
| dernier commit branche par défaut | 2026-06-10 — *add maintenance mode message* | 2026-08-14 — *fix(flatten): drop the workspace-root concept (#1007)* |
| étoiles · issues ouvertes | 306 · 14 | **4 159** · 53 |

**Ce que ça change.** Le rapport présente les deux comme interchangeables (« DMNO **ou** varlock »,
« même éditeur, petite équipe, risque de gouvernance »). Ce n'est pas la situation : **le même
éditeur a déprécié le premier au profit du second**, et le nomme dans son propre README. DMNO reste
en `0.x` avec une seule version en huit mois et une dépendance à `typescript ^5.7.2` — sur un dépôt
qui vise TypeScript 7. Il franchit le premier des trois seuils de `docs/ci.md`.
**S'il ne reste qu'un candidat, c'est `varlock`, et le choix n'en est plus un.**

### Le dépôt d'ancrage est **public** — CodeQL redevient une option

*Relevé par `gh api repos/sebc-dev/colibri-cms` le 2026-08-14 :*

```json
{"name":"colibri-cms","private":false,"visibility":"public","fork":false,
 "archived":false,"created_at":"2026-07-17T21:10:39Z"}
```

Le rapport écarte CodeQL sur la condition « gratuit uniquement en dépôt public ». **La condition est
remplie.** Le fait est déposé sans conclusion : CodeQL ne verrait toujours ni `.astro` ni `.svelte`,
et le sujet reste celui du fait 1 de cette fiche.

### Le palier gratuit Snyk sans carte bancaire — la seule source a **cinq ans**

- `https://snyk.io/plans/`, collecté le 2026-08-14, confirme les quotas côté page tarifaire :
  *« If you sign up with our 'Free' plan, the limits are: Open Source, 200 tests; Code, 100 tests;
  IaC, 300 tests; Container, 100 tests. »* — c'est le versant du désaccord que le rapport signale, et
  c'est celui-ci qui est vérifié ; le « 400 » de `docs.snyk.io` n'a pas été retrouvé.
- **La page tarifaire ne dit rien du moyen de paiement.**
- **Le corpus complet de la documentation** — `https://docs.snyk.io/llms-full.txt`, 558 047 octets,
  récupéré en entier le 2026-08-14 — ne contient **aucune occurrence de « credit card »**, ni de
  formulation équivalente sur le plan Free.
- La seule source qui l'affirme est le billet `https://snyk.io/blog/snyk-code-now-available-free-sast/`
  — *Snyk Code is now available for free* —, **daté de mai 2021**, dont vient la phrase que le
  rapport cite (« Signing up for Snyk does not require a credit card… »).

**Ce que ça change pour le socle `I5`.** Un fait de moyen de paiement de 2026 ne s'établit pas sur un
billet de 2021, et aucune page qui engage l'éditeur aujourd'hui ne le reprend. `I5` se vérifie
d'ailleurs par son propre libellé — *aucun moyen de paiement sur le compte* —, c'est-à-dire **à
l'inscription, par un acte**, pas par une collecte. Snyk Code ne peut donc pas être adopté sur la
foi du rapport seul.

### `astro:env` et `security.csp` sous Astro 7 — les deux tiennent

*Extrait cité — `src/content/docs/en/guides/environment-variables.mdx`, dépôt `withastro/docs`,
branche par défaut, récupéré par `gh api` le 2026-08-14 :*

> Define the kind of environment variable by providing a `context` (`"client"` or `"server"`) and
> `access` (`"secret"` or `"public"`) for each variable […]
> ```js
> API_SECRET: envField.string({ context: "server", access: "secret" }),
> ```
> - **Secret server variables**: These variables are **not part of your final bundle** and can be
>   accessed on the server through the `astro:env/server` module
>
> By default, all secrets are validated whenever anything is imported from the `astro:env/server`
> module. This means, secrets may be validated even when they are not imported. You may need to pass
> dummy environment variables to satisfy this validation during the build.

> **Secret client variables** are not supported because there is no safe way to send this data to the
> client. Therefore, it is not possible to configure both `context: "client"` and `access: "secret"`
> in your schema.

La dernière phrase est un fait de conception que le rapport n'a pas : la combinaison dangereuse
**n'est pas exprimable dans le schéma**. Et la validation systématique des secrets à l'import est un
coût de build que le portail devra absorber (variables factices).

*Extrait cité — `src/content/docs/en/reference/configuration-reference.mdx`, même dépôt, même date :*

> #### security.csp
> **Type:** `boolean | object` · **Default:** `false` · **Since v6.0.0**
>
> ##### security.csp.algorithm — **Since v6.0.0** · ##### security.csp.directives — **Since v6.0.0**

**`security.csp` est stable depuis Astro 6.0**, et il vit dans la **référence de configuration**, pas
dans les *experimental flags*. La page que cette fiche portait plus haut
(`docs.astro.build/en/reference/experimental-flags/csp/`) est l'état antérieur ; `docs/archi.md`
s'appuie sur elle et gagnerait à pointer la référence. Le fait est déposé, l'arbitrage ne l'est pas.
