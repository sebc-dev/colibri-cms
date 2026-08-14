# Collecte — 05 · Accessibilité et budget Lighthouse en CI

**Route** : `mixte` · **Collectée le** : 2026-08-14 · **Campagne** : contrôles CI du code généré

Le versant `code` demandé par la carte — paliers gratuits et stabilité en CI — est relevé ici, au
registre et sur les dépôts. Un fait de maturité en sort, et il tombe pile sur la règle que
`docs/ci.md` s'est donnée : *un outil mort est un contrôle mort*.

---

## Versions exactes — registre npm, relevé le 2026-08-14

| Paquet | Version | Publiée le | Licence |
|---|---|---|---|
| `@lhci/cli` | **0.15.1** | **2025-06-25** | Apache-2.0 |
| `lighthouse` | **13.4.1** | 2026-07-20 | Apache-2.0 |
| `unlighthouse` | **0.18.0** | 2026-06-29 | MIT |
| `axe-core` | **4.13.0** | 2026-08-05 | MPL-2.0 |
| `@axe-core/playwright` | **4.13.0** | 2026-08-11 | MPL-2.0 |
| `pa11y-ci` | **4.1.1** | 2026-05-12 | LGPL-3.0-only |

**L'écart à relever :** `lighthouse` lui-même est publié tous les mois (13.4.1 le 2026-07-20), mais
**`@lhci/cli` — le harnais de CI — est figé depuis le 2025-06-25**, soit près de quatorze mois.

---

## Maturité des dépôts — relevé par `gh api` le 2026-08-14

| Dépôt | Archivé | Dernier `push` | Dernier commit sur la branche par défaut | Issues ouvertes | Licence |
|---|---|---|---|---|---|
| `GoogleChrome/lighthouse-ci` | non | 2026-03-27 | **2025-06-26** — *chore: bump version references to 0.15.1* | **232** | Apache-2.0 |
| `treosh/lighthouse-ci-action` | non | 2026-03-12 | — | 32 | MIT |
| `harlan-zw/unlighthouse` | non | **2026-08-14** | 2026-07-29 | 22 | MIT |
| `pa11y/pa11y-ci` | non | **2026-08-11** | — | 59 | LGPL-3.0 |
| `dequelabs/axe-core-npm` | non | **2026-08-11** | — | 109 | MPL-2.0 |

Releases relevées le 2026-08-14 :

- `GoogleChrome/lighthouse-ci` : `v0.15.1` (2025-06-26), `v0.15.0` (2025-06-09), `v0.14.0` (2024-06-20)
- `treosh/lighthouse-ci-action` : `12.6.2` (2026-03-12), `12.6.1` (2025-06-12), tag mobile `v12`
  (2024-06-21)

**Le SHA du tag `v12` de `treosh/lighthouse-ci-action` au 2026-08-14** — nécessaire si l'action est
retenue, puisque `docs/ci.md` impose l'épinglage au SHA complet et que `workflow-integrity` le
vérifie :

```
512cc908a55bfb0ad231facca52adf3d3a651df4
```

*Ce SHA est daté : un tag est mobile, et `v12` a déjà bougé au moins jusqu'à `12.6.2`. Il se
re-vérifie à l'adoption.*

`lighthouse-ci` porte donc **le double signal** que `docs/ci.md` demande de regarder : ni archivé ni
abandonné (le dépôt a reçu des pushes en mars 2026), mais **aucun commit sur la branche par défaut
depuis quatorze mois**, avec 232 issues ouvertes. Le fait est déposé sans verdict — la règle des
trois seuils de `docs/ci.md` (mainteneur disparu · licence changée · palier gratuit exigeant une
carte) n'est franchie par aucun des trois.

---

## Le palier gratuit — ce qui a été vérifié, et comment

**Lighthouse CI ne demande pas de compte pour un usage minimal.** Sa cible de dépôt par défaut dans
la doc officielle est `temporary-public-storage`, et elle est publique — c'est écrit sans détour.

*Extrait cité — `docs/getting-started.md`, dépôt `GoogleChrome/lighthouse-ci`, branche `main`,
récupéré par `raw.githubusercontent.com` le 2026-08-14 :*

> In this section, we'll configure Lighthouse CI to automatically find your project's static assets,
> run Lighthouse 3 times on each HTML file, and upload the reports to _temporary public_ storage
> where they'll be accessible to anyone with the URL.
>
> NOTE: As the name implies, this is _temporary_ and _public_ storage. If you're uncomfortable with
> the idea of your Lighthouse reports being stored on a public URL for anyone to see, skip to the
> [add assertions](#add-assertions) or [Lighthouse CI server](#the-lighthouse-ci-server) steps.
> Please read the [full terms of service and privacy policy](./services-disclaimer.md#temporary-public-storage)
> before deciding to upload your reports.

*Même document, la configuration minimale :*

```js
module.exports = {
  ci: {
    upload: { target: 'temporary-public-storage' },
  },
};
```

**Trois choses en découlent, toutes trois factuelles.** (a) Aucun moyen de paiement n'entre en jeu,
donc le socle `I5` n'est pas en cause. (b) Le rapport devient **public par URL** — sur un dépôt de
client, c'est une décision, pas un défaut de réglage. (c) La voie sans dépôt distant existe et elle
est nommée dans la même doc : `assert` seul, ou le *Lighthouse CI server* auto-hébergé. Toutes les
licences relevées ci-dessus sont libres (Apache-2.0, MIT, MPL-2.0, LGPL-3.0).

---

## URL vérifiées

Toutes contrôlées le 2026-08-14, HTTP 200. `knip.dev`, `docs.astro.build`, `svelte.dev` et
`docs.github.com` n'ont aucun `Disallow` gênant.

| URL | Ce qu'elle porte |
|---|---|
| `https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md` | la mise en route, dont l'extrait ci-dessus |
| `https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md` | `assert`, les budgets, `collect` |
| `https://unlighthouse.dev/integrations/ci` | Unlighthouse en CI |
| `https://github.com/pa11y/pa11y-ci` | pa11y-ci |
| `https://developer.chrome.com/docs/lighthouse/accessibility/scoring` | comment le score d'accessibilité est calculé |

---

## Extraits de l'ancrage

*Extrait cité — `docs/prd.md`, critères de succès, dépôt `colibri-cms`, branche
`work/reprise-socle-v2`, collecté le 2026-08-14 :*

> - **SC-004** : Une modification publiée est **visible en ligne en moins de 5 minutes** après […]
> - **SC-005** : Score **Lighthouse Performance ≥ 95 en mobile**, mesuré sur le HTML réellement […]

**`SC-005` porte sur la performance, pas sur l'accessibilité.** Aucun `SC` ni `FR` du PRD ne fixe de
seuil d'accessibilité, et `docs/brief.md` n'en porte pas davantage : `grep -i 'accessib\|wcag\|rgaa'`
sur `docs/brief.md` ne rend qu'une occurrence, sans rapport (« *accessible* … pas *portable* », à
propos de la réversibilité des données). **Le sujet 05 n'a donc pas d'exigence amont sur
l'accessibilité** — c'est un fait de la campagne, pas un oubli de collecte, et il change la question :
faut-il un contrôle pour une propriété que le produit n'exige pas encore ?

*Extrait cité — `docs/archi.md`, § « Ce que cette architecture n'admet pas comme invariant » :*

> - **Classe 13 — contrats de comportement runtime** : `SC-004` (mise en ligne en moins de cinq
>   minutes), `SC-005` (Lighthouse ≥ 95), la durée du bail de publication, l'expiration des sessions
>   de `FR-118`. Ce sont des `SC` et des `FR`, pas des invariants.

*Extrait cité — `docs/socle-de-livraison.md`, § `I5`, collecté le 2026-08-14 :*

> ### I5 — Aucun prélèvement n'est possible sans un acte du client
>
> **Ce qui rend le prélèvement impossible n'est pas le plan gratuit, c'est l'absence de moyen de
> paiement enregistré.** […] **Vérification.** Aucun moyen de paiement sur le compte, aucun
> abonnement payant souscrit.

*Même document, contrainte `C9` :*

> | **C9** | **Rien n'exige un moyen de paiement.** Aucun service payant, aucun essai qui bascule
> automatiquement | I5 | Le compte reste sans moyen de paiement à la livraison |

*Extrait cité — `docs/ci.md`, § « La maturité de l'outillage » :*

> Trois seuils déclenchent une **re-passe** de cette phase et le retrait de l'outil concerné : le
> mainteneur disparaît ou le dépôt est archivé · la licence change, y compris sur les seules
> **règles** · le palier gratuit se met à exiger une carte bancaire — auquel cas le composant devient
> inutilisable ici quel que soit son mérite, par le socle `I5`.

*Extrait cité — `docs/ci.md`, § « Ce que ces contrôles ne couvrent pas » :*

> **Tout ce que la garde de scaffold laisse passer**, tant qu'il n'y a pas de `package.json` :
> `build`, `test`, `coverage`, `lint`, `dead-code` et `mutation` sont **verts sans avoir rien
> exécuté** […]

**Une contrainte de forme que le rapport devra tenir** : `docs/ci.md` écrit qu'*aucune commande de
run local n'existe*, et que la stack déploie un Worker bâti par Workers Builds. Un contrôle
Lighthouse ou axe suppose donc **une URL servie ou un serveur monté dans le job** — ce que le
portail actuel ne fait nulle part. C'est un coût de conception, pas un réglage.

---

## Ce qui a échoué

- **`https://web.dev/articles/lighthouse-accessibility`** rend **404** — la page a été déplacée ou
  retirée. Remplacée par `https://developer.chrome.com/docs/lighthouse/accessibility/scoring`,
  vérifiée.
- **`https://www.deque.com/axe/core-documentation/api-reference/`** rend **404**. Aucune URL de
  remplacement n'a été cherchée dans cette collecte : la doc d'`axe-core` se lit dans son dépôt, et
  le sujet n'en dépend pas.
- **Le coût réel en minutes de CI** d'un run Lighthouse ou axe n'a pas été mesuré : il n'y a pas de
  site à mesurer. Il ne se collecte pas, il s'observera au scaffold.
- **Le palier gratuit d'un service hébergé d'accessibilité** (Deque axe DevTools, Siteimprove,
  Semgrep AppSec) n'a pas été relevé. À faire au comblement si le rapport en propose un — la
  question à trancher est celle du socle `I5`, pas celle du mérite.
- **Complété par l'intake** : les trois lignes ouvertes à la relecture du rapport sont refermées.
  Voir « Comblement de l'intake » ci-dessous.

---

## Comblement de l'intake — 2026-08-14

### `@lhci/cli@0.15.1` : ce qu'il épingle, et ce qu'il ne déclare pas

Métadonnées du paquet, `registry.npmjs.org/@lhci/cli/0.15.1`, relevées le 2026-08-14 :

| | |
|---|---|
| `dependencies.lighthouse` | **`"12.6.1"`** — version **exacte**, pas une plage |
| `dependencies.chrome-launcher` | `^0.13.4` |
| `engines` | **absent** — le paquet ne déclare **aucune** plage de Node |
| licence | Apache-2.0 |

**Deux conséquences.** (a) L'écart avec `lighthouse` publié en **13.4.1** (2026-07-20) n'est pas une
inertie de plage : c'est une **épingle dure** sur 12.6.1, qui ne bougera qu'avec une release du
harnais — et il n'y en a pas eu depuis le 2025-06-25. (b) **Aucun `engines`** veut dire aucune
promesse de compatibilité Node : rien n'échouera à l'installation quand le runner montera de
majeure, et rien n'avertira non plus. Pour un contrôle qu'on veut **bloquant**, c'est le mauvais
sens de l'échec.

Le `[INCERTAIN]` du rapport sur la date du dernier commit de `main` est refermé, et il l'était déjà
plus haut dans cette fiche : **2025-06-26**, *chore: bump version references to 0.15.1* — reconfirmé
par `gh api repos/GoogleChrome/lighthouse-ci/commits?per_page=1` le 2026-08-14, avec 232 issues
ouvertes et un dernier `push` du dépôt au 2026-03-27.

### `pa11y-ci@4.1.1` : le runner axe est **embarqué**, il ne s'installe pas à part

`registry.npmjs.org/pa11y-ci/4.1.1`, relevé le 2026-08-14 — `engines: { node: ">=20" }`,
licence LGPL-3.0-only, et parmi ses dépendances :

```
pa11y ^9.1.1 · puppeteer ^24.37.5 · cheerio ~1.0.0 · commander ~14.0.3 · lodash ~4.18.1
```

`pa11y@9.1.1` (publiée le **2026-02-26**, `engines: { node: ">=20" }`) porte à son tour :

```
axe-core ~4.11.1 · @pa11y/html_codesniffer ^2.6.0 · puppeteer ^24.37.5
```

**Les deux moteurs sont livrés** : `runners: ["axe"]` ne demande aucune installation supplémentaire,
et `htmlcs` reste le défaut de pa11y. Le navigateur aussi est embarqué (Puppeteer), donc rien à
provisionner dans le job hors le téléchargement de Chrome.

**Le décalage à connaître** : la chaîne fige `axe-core ~4.11.1` quand le registre porte **4.13.0**
(2026-08-05). Un contrôle informatif y survit ; un seuil chiffré adossé à un jeu de règles daté,
moins bien.

### Unlighthouse fait échouer un job sur un budget — le repli existe et il est net

*Extrait cité — `docs/2.integrations/1.ci.md`, dépôt `harlan-zw/unlighthouse`, branche par défaut,
récupéré par `gh api` le 2026-08-14 :*

> The `unlighthouse-ci` binary runs Lighthouse on every page of your site and fails your CI build if
> any score drops below a budget:
> ```bash
> unlighthouse-ci --site https://staging.example.com --budget 80
> ```
> **Exit code 1 = budget failed. Exit code 0 = all pages passed. That's the entire contract.**

> | `--budget <budget>` | Budget (1-100), the minimum score which can pass. |

Budgets par catégorie disponibles en configuration (`ci: { budget: { … } }`), rapporteur `json` pour
la lecture en CI. Dépôt : **non archivé**, dernier `push` le **2026-08-14**, 4 765 étoiles, 22 issues
ouvertes, MIT ; version au registre **0.18.0** (2026-06-29).

**La différence qui décide, et le rapport ne la nomme pas** : `lhci` sert lui-même le build par
`staticDistDir` et démarre un serveur éphémère ; **`unlighthouse-ci` exige un `--site`, donc une URL
déjà servie.** Sur un portail où `docs/ci.md` écrit qu'aucune commande de run local n'existe, ce
n'est pas un réglage équivalent : c'est un serveur à monter, ou un déploiement d'aperçu à attendre.

### Le trou qui reste — non collectable ici

- **Le coût réel en minutes de CI** d'un run Lighthouse ou axe reste non mesuré : il n'y a pas de
  site à mesurer. Inchangé après le rapport, s'observera au scaffold.
