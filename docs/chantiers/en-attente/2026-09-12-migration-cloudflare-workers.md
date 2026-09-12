# Migrer `SELF`/`env` de `cloudflare:test` vers `cloudflare:workers`

Portée : hors-cycle
Ouvert le 2026-09-12 · Actualisé le 2026-09-12 · branche `main` · HEAD `27c01c9`

## Objectif
J'allais migrer les tests d'intégration vers l'API que l'amont recommande, pour pouvoir retirer
`no-deprecated` et `sonarjs/deprecation` du bloc `tests/**` du calibrage d'analyse — les deux seules
extinctions qui ne tiennent qu'à une dépréciation amont, non à une propriété de nos tests.

## Contexte à charger
à lire      `src/platform/d1/cloudflare-workers.d.ts` — la déclaration à étendre ; son commentaire
            dit pourquoi elle est minimale et pourquoi un second `declare module` ailleurs
            échouerait (43 l.)
à lire      `eslint.config.analyse.js` — le bloc `tests/**` d'où retirer les deux règles, au bout (88 l.)
à extraire  `docs/ci.md` › « La boucle locale d'analyse » — la synthèse du calibrage, à corriger le
            jour où les règles reviennent (197 l.)
à situer    `docs/chantiers/archive/2026-09-11-boucle-analyse-locale.md` — la fiche du montage,
            conclusions déjà distillées ici, ne pas la relire
à situer    les fichiers de `tests/integration/` qui importent `cloudflare:test` — périmètre
            d'édition, mécanique ; rien à comprendre avant d'y être

## Acquis
- **Ce n'est pas l'amont qui bloque**, contre ce que j'avais d'abord conclu du seul `TS2305` :
  `@cloudflare/workers-types` publié déclare bien `export const exports: Cloudflare.Exports` dans
  `cloudflare:workers`.
- Le blocage est **local et délibéré** : le projet n'installe pas ces types, il porte sa propre
  déclaration ambiante minimale, qui type `env` sur les seules liaisons dont le produit se sert.
- **Six lignes y suffisent.** Éprouvé puis restauré à l'identique : `exports` ajouté à cette
  déclaration → typage vert, `exports.default.fetch()` atteint le worker, les deux règles se taisent
  sur le fichier migré.
- **Le `globalThis` reste partagé** entre worker et tests avec la nouvelle API — le pont Stryker et
  `ignorer-rejet-wasm-lexer` y survivent. C'était le risque à écarter avant tout le reste.
- `env` de `cloudflare:workers` porte la liaison D1 : cette moitié-là est triviale, `src/` la fait déjà.
- `exports.default.fetch` accepte une URL nue **à l'exécution** mais pas au typage : chaque appel
  s'enveloppe en `new Request(url, init)`. Pas de `sed` global — la plupart portent un `init`
  multi-lignes.
- Les décomptes se refont par `npx eslint --config eslint.config.analyse.js --rule '{"@typescript-eslint/no-deprecated":"error","sonarjs/deprecation":"error"}' tests/`.
- **Aucun ADR ne fige** l'exclusion de `@cloudflare/workers-types` — c'est une décision de spec de
  ticket, rouvrable.

## Prochaine étape
J'allais étendre la déclaration ambiante locale avec `exports`, puis migrer les tests fichier par
fichier — `env` d'abord (trivial), `SELF` ensuite —, chaque fichier reprouvé avant le suivant. La
passe verte, retirer les deux règles du bloc `tests/**` et corriger la synthèse de `docs/ci.md`.

## Écarté
- **Adopter `@cloudflare/workers-types` en dépendance** — la spec du ticket 01 l'a exclu à dessein ;
  aucun ADR ne le fige, donc l'arbitrage se rouvre, mais il n'est pas tranché et coûte plus qu'il ne
  rapporte ici.
- **Ne migrer que la moitié `env`** — ne rallume aucune règle : la moitié `SELF` continue de les
  faire parler, et 12 fichiers auraient bougé pour rien.
- **Poser un `@ts-expect-error` par appel** — escape-hatch que le filet CI annote, et le commit
  tomberait dans les catégories qui exigent la signature de l'humain.
- **Conclure au blocage sur la seule erreur de typage** — c'est ce que j'ai fait d'abord, et c'était
  faux : il fallait chercher d'où venait la déclaration, pas quelle version manquait.
