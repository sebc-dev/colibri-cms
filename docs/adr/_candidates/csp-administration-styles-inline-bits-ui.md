# Candidat ADR : Réconciliation CSP — styles en ligne des primitives d'administration
Statut : Candidat | Date : 2026-09-01 | Provenance : rencontrée au cadrage de la feature 002 (socle d'îlots shadcn-svelte) ; ouverte par ADR-0009 comme conséquence à instruire.

> Décision **non tranchée** — déposée pour être figée par `/scd-sdd:adr`, pas reprise du 1.x.
> Le corps ci-dessous pose le problème et les options ; il ne choisit pas.

## Contexte

ADR-0009 (base de composants des îlots d'administration — shadcn-svelte) pose des primitives
bits-ui dans l'administration. Certaines — positionnement de sur-couches, animations — émettent des
attributs `style="…"` en ligne. La CSP stricte de l'administration (ADR-0004 (en-têtes de réponse —
deux porteurs), ADR-0008 (en-têtes d'administration posés par un middleware)) interdit
`unsafe-inline` sans nonce ni empreinte. C'est le pendant, côté *style*, de ce que le candidat
`ilots-svelte-5` a réglé côté *script* d'hydratation en montant l'administration comme une
application par point d'entrée externe. Sans réconciliation, l'îlot d'administration soit ne se rend
pas correctement, soit force un affaiblissement de la CSP.

## Décision

À trancher. Options en présence :

- **Nonce sur `style-src`** — cohérent avec le porteur unique des en-têtes (middleware, ADR-0008),
  au prix de la propagation du nonce jusqu'aux styles émis à l'exécution.
- **Empreintes (`'sha256-…'`)** — sans état, mais fragile aux styles que les primitives calculent
  dynamiquement à l'exécution.
- **`style-src` maîtrisé** — p. ex. `'unsafe-inline'` restreint au seul `style-src`, `script-src`
  laissé intact ; ne touche pas à SEC-1, au prix d'un style en ligne toléré.

## Conséquences

À compléter à la décision. Invariant à préserver : SEC-1 (le cookie de session d'administration vit
sur l'origine commune) ne dépend pas de `style-src` — **aucune option ne doit rouvrir `script-src`**.

## Alternatives considérées

- Renoncer aux primitives qui émettent du style en ligne — écartée en substance par ADR-0009, qui a
  retenu shadcn-svelte précisément pour ces primitives (accessibilité non réinventée).

## Vérifiable ?

Partiellement — une fois la décision prise, « l'écran d'administration se rend sous la CSP sans
violation » est observable à la recette ; le mécanisme lui-même relève de `docs/ci.md`.
