# Candidat ADR : les en-têtes de sécurité de l'administration sont posés par un middleware logé dans une zone
Statut : Candidat | Date : 2026-08-19 | Déposé par : `specs/002-connexion-par-code/plan.md` décision 3
Trace vers : [ADR-0015](../../1.x/adr/0015-en-tetes-de-reponse-deux-porteurs.md) (deux porteurs d'en-têtes) ·
[ADR-0024](../../1.x/adr/0024-administration-sans-directive-client.md) (`I4`, la CSP stricte définie par ses
interdits) · [docs/archi.md](../../1.x/archi.md) § Vue d'ensemble (les cinq zones, et `src/pages/` qui
n'en est pas une)

## Contexte

`ADR-0015` partage les en-têtes entre **deux porteurs** : le fichier `_headers` pour les pages
publiques servies en assets statiques, et **le code** pour tout ce que le Worker génère —
administration, aperçu, médias en brouillon. `ADR-0024` nomme ce que le second doit poser : une CSP
stricte, définie par ses interdits, sur **toute réponse d'administration**.

« Toute réponse » n'est pas une figure de style. L'administration en rend au moins trois formes que
rien ne rassemble : la page `200`, la **redirection** `302` de la garde de session vers l'écran de
connexion, et la page d'erreur. La CSP est, avec l'invariant d'échappement, l'une des **deux seules**
parades à la quatrième porte de `docs/stack.md` — du texte d'inconnu affiché dans un écran
d'administration —, et cette porte n'a **aucun repli** : un porteur qui laisserait passer une forme
de réponse ouvrirait la parade en silence.

Or `docs/archi.md` ne nomme que cinq zones — `site/`, `admin/`, `render/`, `core/`, `platform/` —
plus `src/pages/`, « pas une zone ». Aucune ne s'appelle *middleware*, et le fichier que la
convention d'Astro attend (`src/middleware.ts`) vivrait sous `src/` sans appartenir à aucune : c'est
`eslint.config.boundaries.js` qui cesserait de le classer, donc `I1` qui cesserait de juger ses
imports — sur le seul fichier du dépôt dans ce cas.

## Décision

**Les en-têtes de sécurité des réponses d'administration sont posés par un middleware écrit dans
`src/platform/entetes/`, inscrit depuis `astro.config.ts` par le hook d'intégration
`addMiddleware`.**

Le porteur est ainsi un fichier d'une zone existante — `platform/`, dont c'est le métier : un
adaptateur entre le produit et la plateforme —, et son inscription se lit dans `astro.config.ts`,
au même endroit et par le même patron que l'injection de route déjà en place.

## Conséquences

**Positives.**

- **« Toute réponse » devient vrai et mesuré.** *Mesuré le 2026-08-19* sur `astro@7.2.0` : le
  middleware voit la page `200`, la redirection `302` et le `404` sous `/admin/`.
- **Aucun sixième objet sous `src/`** : la matrice `I1` continue de juger le fichier, et le
  découpage en cinq zones reste la description complète de `src/`.
- **Le porteur est unique et nommé**, ce qui donne prise à un contrôle : la CSP ne se répète pas
  d'un gabarit à l'autre, où l'oubli ne se verrait pas.

**Négatives — ce à quoi le code s'engage.**

- **Le porteur ne se lit plus dans le fichier de route.** Qui lit `src/pages/admin/index.astro` n'y
  voit aucun en-tête ; il faut savoir remonter à `astro.config.ts`. C'est le prix de la couverture,
  et c'est le même compromis qu'`I6` a déjà accepté en confiant le garde de session à un import.
- **Une inscription oubliée ne casse aucun écran.** Si le `addMiddleware` disparaissait
  d'`astro.config.ts`, les pages continueraient de s'afficher, sans CSP. Rien dans les sources ne
  le rapporterait aujourd'hui : le contrôle `ADR-0015 (b) / ADR-0024` d'`arch-invariants` cherche
  les directives **relâchées**, jamais l'**absence** de l'en-tête. `docs/ci.md` range déjà la
  présence de l'en-tête sur chaque réponse dans « ce que ces contrôles ne couvrent pas » — cette
  décision ne referme pas ce trou, elle en resserre le porteur à un fichier et une ligne.
- **La forme de l'`entrypoint` est nominative.** *Mesuré* : `addMiddleware` accepte `string | URL`,
  et une chaîne relative est résolue comme un module nu — `Cannot find module
  'src/platform/entetes/middleware.ts'`. La forme qui fonctionne est
  `new URL('./src/platform/entetes/middleware.ts', import.meta.url)`.
- **La politique est identique en développement et en production**, et ce n'est pas gratuit :
  Astro sert les blocs `<style>` d'un fichier `.astro` **en ligne** en développement (mesuré), donc
  `style-src 'self'` les refuse. Il en découle une contrainte sur tout écran d'administration à
  venir : **pas de bloc `<style>`**, la feuille de style est un asset lié. C'est une conséquence
  assumée — relâcher la politique en développement exigerait d'écrire `unsafe-inline` dans les
  sources, ce que le contrôle `ADR-0024` rapporte et que `verifier-guard` ne laisse passer que sous
  commit signé.

## Alternatives considérées

- **Un gabarit d'administration partagé** (`src/admin/Page.astro`) qui pose les en-têtes : écartée
  car il ne voit ni la redirection de la garde de session, ni les pages d'erreur. « La CSP stricte
  sur toute réponse d'administration » deviendrait faux au premier écart, sans qu'aucun écran ne
  change de comportement — exactement le mode de défaillance contre lequel la CSP existe.
- **`src/middleware.ts`, la convention d'Astro** : écartée car elle place sous `src/` le seul
  fichier qu'aucune des cinq zones ne couvre. `eslint.config.boundaries.js` déclare ses éléments par
  motif de chemin (`src/core`, `src/render`, `src/platform`, `src/site`, `src/admin`) : un fichier à
  la racine de `src/` n'est classé par aucun, donc la matrice `I1` cesse de juger ses imports. Le
  gain — la reconnaissabilité de la convention — ne paie pas la perte d'un invariant sur le seul
  fichier qui voit passer toutes les réponses.
- **Poser les en-têtes dans chaque fichier de route** : écartée car la répétition est ce que
  l'oubli exploite, et parce qu'elle ne couvre toujours pas les pages d'erreur.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — options instruites et mesurées en phase `plan` de
  `specs/002-connexion-par-code`. **Arbitrage humain rendu le 2026-08-19.**
