# 002 — Socle d'îlots d'administration shadcn-svelte

## Problème
L'administration que l'éditrice manipulera — emplacements, médias, réglages, formulaires,
récapitulatif de publication, liste des demandes — n'a aujourd'hui aucune base d'interface : le
dépôt ne porte ni Svelte, ni Tailwind, ni composants. Les deux seuls écrans existants (connexion,
accueil d'administration) sont des pages Astro nues. Sans socle commun, chaque feature
d'administration réinventerait ses champs, ses sur-couches et son accessibilité — précisément ce
qu'on écrit mal à la main, pour une utilisatrice où UX-2 (agir seule, sans notion technique, même
après des mois) ne pardonne pas.

## Solution
Poser la fondation d'interface des îlots d'administration décidée en ADR-0009 (base de composants
shadcn-svelte) : intégrer Svelte 5 à Astro pour l'administration, mettre Tailwind CSS en place,
initialiser la CLI shadcn-svelte qui copie le source des composants dans le dépôt, et prouver la
chaîne de bout en bout par un îlot d'administration réel rendu sous la CSP stricte, sans violation.
Le site public reste hors de cette base.

## Ce que ça change, concrètement
- L'administration se monte comme une application par un point d'entrée externe (candidat
  `ilots-svelte-5` — framework d'îlots Svelte 5), pas comme des îlots hydratés dans des pages :
  l'hydratation en ligne est incompatible avec la CSP stricte de l'administration.
- Svelte 5 et Tailwind CSS entrent dans la chaîne de build, cantonnés à l'administration.
- La CLI shadcn-svelte est initialisée ; les composants qu'elle copie vivent dans la zone `admin`
  du dépôt, possédés et versionnés — pas une dépendance de composants opaque.
- Un premier îlot d'administration bâti sur un composant shadcn-svelte se rend sous la CSP stricte
  de l'administration, sans violation console ni style bloqué.
- Le graphe d'imports interdit qu'un îlot du site public importe un composant de la base
  d'administration ; le poids mesuré par SC-005 sur les pages publiques n'augmente pas.

## Décisions d'implémentation
- Composants copiés dans la zone `admin`, pas dans un `src/lib` générique — c'est ce qui rend
  falsifiable, dans le graphe d'imports entre zones (I1, `eslint.config.boundaries.js`), la
  frontière « base d'administration hors des îlots publics » qu'ADR-0009 laisse observable.
  Sert UX-1/FR-117 (aucun terme de développeur), UX-2, et SEC-1 (aucun script tiers au runtime :
  du source compilé avec l'îlot, pas un script distant sur l'origine commune).
- Deux dépendances de fondation neuves — Tailwind CSS (build) et bits-ui (runtime) — plus les
  utilitaires (`tailwind-variants`, `clsx`, `tailwind-merge`, icônes lucide), sous
  `min-release-age=7` de `.npmrc`. Elles se propagent à toute la flotte (FR-105/SC-008 : aucun code
  propre à une cliente).
- Réconciliation CSP à figer : les primitives bits-ui posent des `style="…"` en ligne, interdits
  par la CSP stricte de l'administration (ADR-0004, ADR-0008) sans nonce ni empreinte. Décision
  structurante déposée en candidat (`csp-administration-styles-inline-bits-ui`) — le socle
  l'applique, il ne la tranche pas ici.

## Décisions de test
- Couture : le graphe d'imports entre zones (`eslint.config.boundaries.js`, contrôle `boundaries`,
  informatif aujourd'hui) — un îlot du site public important un composant `admin` est falsifiable
  statiquement. Réserve : le contrôle ne scanne aujourd'hui que `src/**/*.ts` ; l'étendre aux
  `.svelte` est nécessaire pour que la frontière morde réellement — à porter par un ticket.
- Observé : « un composant shadcn-svelte se rend sous la CSP stricte sans violation » et « la
  chaîne build + typage strict passe » ne sont pas des tests unitaires — preuve capturée
  (`npm run typecheck` + `npm run build`, puis rendu de l'écran d'administration sous ses en-têtes
  réels).
- Prior art : `eslint.config.boundaries.js` (déclaration des cinq zones),
  `src/platform/entetes/middleware.ts` (en-têtes et CSP de l'administration).

## Hors-périmètre
- Reconstruire les écrans existants de la feature 001 (connexion, accueil) sur shadcn-svelte — code
  déjà livré et testé ; leur adoption se décide feature par feature, pas dans le socle.
- Les îlots du site public (formulaire de devis, FR-054) — exclus par ADR-0009 et mesurés par
  SC-005 : ils gardent des îlots minimaux, sans Tailwind ni bits-ui.
- Toute feature d'administration qui consommera ce socle (emplacements, médias, réglages,
  formulaires, publication, demandes) — features distinctes de l'Epic A.
- Le mécanisme de réconciliation CSP lui-même (nonce, empreinte, ou `style-src` maîtrisé) — c'est
  l'ADR candidat, tranché par `/scd-sdd:adr`.
