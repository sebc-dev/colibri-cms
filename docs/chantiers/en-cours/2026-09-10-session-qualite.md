# Session qualité — ce que la quality gate ne mesure pas

Portée : socle
Ouvert le 2026-09-10 · Actualisé le 2026-09-10 · branche `chore/session-qualite-2026-09-10` · HEAD `87ec93c`

## Objectif
J'allais établir où sont les trous de la quality gate en la jouant en local, puis décider lesquels
valent une correction. Aucun code de production n'était visé.

## Contexte à charger
à lire      `.claude/quality.json` — la gate possédée par le projet, à amender (30 l.)
à lire      `stryker.conf.json` — la configuration à réparer ou à retirer (9 l.)
à extraire  `docs/ci.md` › « Commandes du projet » — le registre à raccorder aux constats
à extraire  `docs/test.md` › « Pyramide » — n'y figure pas `tests/unit/**`
à situer    `vitest.config.ts` — la couverture s'y règle, mais la piste est morte (voir Écarté)

## Acquis
- **La couverture par source est structurellement hors d'atteinte** pour tout ce que les tests
  atteignent via `SELF.fetch` : le worker sous test est le worker **bâti**, donc la mesure ne peut
  tomber que sur des chunks. Les dix fichiers `src/` mesurés le sont uniquement parce que des tests
  unitaires ou statiques les **importent** — chiffres identiques dans toutes les configurations
  essayées.
- `npm run mutation` produit un score **flatteur et faux** : `commandRunner: npm test` rejoue le build
  à chaque mutant, `coverageAnalysis: "off"` interdit toute sélection, et les mutants **expirent** au
  lieu d'être tués — un timeout comptant comme tué.
- Trou de test réel dans le rapport incrémental sur disque (à re-prouver par un run ciblé) :
  `src/core/pages/declaration.ts` ne tue aucun mutant — ni l'inversion du tri par rang, ni la
  projection vidée de `{slug, titre}`.
- Export mort confirmé à la lecture : la variante D1 de `pagePorteUnBrouillon`
  (`src/platform/brouillons/magasin.ts`) n'a aucun appelant, les deux routes prennent la version pure.
- Trous de la gate : le `scope` de `.claude/quality.json` est sans effet (commandes globales), aucun
  agent dédié n'existe (`checks[].agent`, `applier` absents), et `lint:boundaries` — seul porteur
  falsifiable de `I1` — n'est joué par personne, ce que `docs/ci.md` assume.
- Dérives de documentation : `tests/unit/**` manque à la pyramide de `docs/test.md` ; et c'est
  `docs/ci.md`, pas `CLAUDE.md`, qui est périmé sur le wrangler de `dev`.
- En amont : le paquet a été renommé `@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin`
  en 1.0.0 ; notre nom est gelé à `0.22.0`, le nouveau est à `1.1.6`. Codemod officiel
  (`npx @cloudflare/codemods vitest:pool-workers-to-vitest-plugin`), et la seule rupture de `0.22.0`
  (MSW ≥ 2.14) ne nous touche pas — MSW est absent. Chantier distinct, sans lien avec la mesure.
- **J'ai arrêté l'ordre suivant** : `lint:boundaries` en bloquant dans la gate du cycle ; réparer la
  mutation ou la retirer ; `knip` en informatif ; retirer ce qui prétend faussement (le `scope`, le
  rapport de couverture global) ; les agents par check ensuite. Rien ne monte côté CI.
- **Un ADR est dû** avant de bâtir : prendre la mutation plutôt que la couverture comme indicateur de
  profondeur des tests est structurant, et se fonde sur un fait d'architecture, pas sur un réglage.

## Prochaine étape
Ajouter `lint:boundaries` à `.claude/quality.json` en `blocking` — l'invariant `I1` a un contrôleur
mécanique que rien ne lance.

## Écarté
- **Activer `vite.build.sourcemap` pour ramener la couverture sur `src/` — mort, et mesuré.** Les
  `.map` produits sont corrects (sources réelles, `sourcesContent`), mais le remappage n'a jamais
  lieu : `true` fait disparaître les 19 chunks sans rien ajouter à `src/`, `'hidden'` rend le
  comportement d'origine, `'inline'` ne termine pas (tué à 20 min contre ~50 s). `DEBUG=istanbuljs`
  ne mentionne aucun `.wrangler` : les chunks n'atteignent pas le transformateur. Déclencheur : le
  commentaire `//# sourceMappingURL=` en fin de chunk ; le site exact du rejet n'est pas épinglé.
  Effet de bord si la piste revenait : 7 `.map` atterrissent dans `dist/client/_astro`, servis au public.
- **Le fournisseur de couverture V8 — clos par le runtime.** `workerd` ne fournit `node:inspector`,
  dont `@vitest/coverage-v8` a besoin, que comme une souche non fonctionnelle ; le pool refuse donc ce
  fournisseur depuis `0.14.2` — seule entrée « coverage » de tout son changelog. **Condition de
  réouverture** : que `workerd` implémente réellement `node:inspector` — décision du runtime, pas du
  pool, et aucun mouvement depuis. Le ticket amont #12589 est marqué « fait » sans qu'aucune version
  n'ait livré le pont de couverture : c'est le changelog qui fait foi.
- Exclure `.wrangler/**` de la couverture — le rapport paraîtrait plus propre en mesurant beaucoup moins.
- Poser un seuil de couverture nu — `docs/test.md` la veut informative, et un seuil sur une mesure
  visant le bundle serait un mensonge chiffré.
- Ajouter un outil de duplication — les volumes ne le justifient pas, et il n'y a ni `TODO` ni
  escape-hatch nulle part.
- Rendre des checks bloquants **côté CI** — la CI est informative par décision du 2026-09-06, et
  promouvoir un garde touche trois surfaces ; la gate du cycle `run` est le bon endroit.
