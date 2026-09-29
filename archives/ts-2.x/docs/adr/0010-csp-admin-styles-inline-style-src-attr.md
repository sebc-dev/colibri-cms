# ADR-0010 : CSP de l'administration — attributs de style en ligne autorisés par `style-src-attr`
Statut : Accepté | Date : 2026-09-01

## Contexte

ADR-0009 (base de composants des îlots d'administration — shadcn-svelte) pose des primitives
bits-ui dans l'administration. Certaines — positionnement de sur-couches, animations — écrivent des
attributs `style="…"` en ligne, aux valeurs **calculées à l'exécution** (transform, position), et
qui changent d'un rendu à l'autre. La CSP stricte de l'administration (ADR-0004 (en-têtes de
réponse — deux porteurs), ADR-0008 (en-têtes d'administration posés par un middleware)) les bloque :
elle interdit `unsafe-inline` sans nonce ni empreinte.

C'est le pendant, côté *style*, de ce que le candidat `ilots-svelte-5` (framework d'îlots Svelte 5)
a déjà réglé côté *script* : l'administration se monte comme une application par point d'entrée
externe, de sorte que `script-src` reste strict, sans hydratation en ligne. Restait le style en
ligne des primitives, sans lequel l'îlot d'administration ne se rend pas correctement.

Deux voies de la CSP ne couvrent pas ce cas précis :

- un **nonce** ne blanchit qu'un élément `<style>`/`<link>`, jamais un **attribut** `style="…"` — la
  CSP ne le permet pas ;
- une **empreinte** (`'sha256-…'`, avec `'unsafe-hashes'`) exige de hacher **chaque valeur**
  d'attribut ; comme les primitives les calculent dynamiquement, le jeu de hachages n'est pas borné.

La décision est nécessaire maintenant : elle contraint le premier îlot d'administration bâti sur un
composant shadcn-svelte (feature 002 — socle d'îlots d'administration), qui doit se rendre sous la
CSP réelle sans violation. Elle sert la préoccupation `SEC-1` de `docs/vision.md` (le cookie de
session d'administration vit sur l'origine commune : aucun script tiers ne doit s'y exécuter).

## Décision

Nous autoriserons, dans la CSP de l'administration, les **attributs de style en ligne** par la
directive **`style-src-attr 'unsafe-inline'`**. `script-src` reste strict, sans `unsafe-inline` ; et
`style-src` lui-même — les éléments `<style>` et `<link>` — reste contrôlé. Seuls les attributs
`style="…"` posés par les primitives sont tolérés. La directive est portée par l'unique middleware
d'en-têtes de l'administration (ADR-0008), jamais gabarit par gabarit.

## Conséquences

**Positives.**

- Les primitives bits-ui rendent leurs sur-couches et animations sous la CSP stricte, sans nonce à
  propager ni jeu de hachages à maintenir — le mécanisme est stable et sans état.
- `SEC-1` est préservé : `script-src` n'est pas rouvert. Un attribut de style ne peut pas exécuter
  de script ; le rayon d'un XSS same-origin contre le cookie de session n'est pas élargi.

**Négatives — ce à quoi le code s'engage.**

- **Un attribut de style en ligne est désormais toléré dans l'administration.** C'est un vecteur
  d'exfiltration CSS résiduel (p. ex. `background:url(…)` construit depuis une donnée injectée) :
  il n'est borné que si `img-src` et `connect-src` de l'administration restent stricts. Cette borne
  devient une contrainte tenue ailleurs, à ne pas relâcher.
- **La discipline se déplace sur `script-src`.** La garantie ne tient plus « aucun `unsafe-inline`
  nulle part » mais « aucun `unsafe-inline` en dehors de `style-src-attr` » ; toute dérive qui
  glisserait `unsafe-inline` vers `script-src` casse silencieusement `SEC-1`.

## Alternatives considérées

- **Nonce sur `style-src`** : écartée — un nonce ne blanchit pas un attribut `style="…"`, seulement
  un élément `<style>`/`<link>` ; il ne couvre donc pas le style calculé au runtime par les
  primitives.
- **Empreintes `'sha256-…'` avec `'unsafe-hashes'`** : écartée — chaque valeur d'attribut devrait
  être hachée ; les valeurs étant dynamiques, l'ensemble n'est pas borné et l'entretien est
  impraticable.
- **Renoncer aux primitives qui émettent du style en ligne** : écartée en amont par ADR-0009, qui a
  retenu shadcn-svelte précisément pour ces primitives (accessibilité clavier/focus/ARIA non
  réinventée).

## Vérifiable ?

Partiellement. La CSP de l'administration est posée par `src/platform/entetes/middleware.ts` : la
trace observable est **négative** — la directive `script-src` de l'administration ne contient jamais
`unsafe-inline`. C'est ce que `/scd-sdd:guards` peut dériver en contrôle. La présence même de
`style-src-attr 'unsafe-inline'` est constatable dans le même porteur ; l'efficacité au rendu (aucun
style bloqué) se constate à la recette, pas dans l'arborescence.
