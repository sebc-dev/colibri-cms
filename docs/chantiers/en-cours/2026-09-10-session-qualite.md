# Session qualité — ce que la quality gate ne mesure pas

Portée : socle
Ouvert le 2026-09-10 · Actualisé le 2026-09-10 · branche `chore/session-qualite-2026-09-10` · HEAD `4eba87c`

## Objectif
J'allais établir où sont les trous de la quality gate en la jouant en local, puis décider lesquels
valent une correction. Aucun code de production n'était visé.

## Contexte à charger
à lire      `stryker.conf.json` — la configuration à réparer ou à retirer (9 l.)
à lire      `.claude/quality.json` — la gate, encore à amender : `scope`, agents (36 l.)
à extraire  `docs/ci.md` › « Commandes du projet » — le registre à raccorder aux constats restants
à extraire  `docs/test.md` › « Pyramide » et « Commandes » — les deux dérives à y corriger
à situer    `docs/adr/0013-profondeur-des-tests-mesuree-par-la-mutation.md` — figé, déjà distillé
à situer    `reports/stryker-incremental.json` — 4034 l., le constat est déjà dans Acquis
à situer    `vitest.config.ts` — la couverture s'y règle, mais la piste est morte (voir Écarté)

## Acquis
- Le score de mutation obtenu était **flatteur** : les mutants **expiraient** au lieu d'être tués.
  Ce que `stryker.conf.json` en porte se lit dans le fichier ; qu'une péremption compte comme une
  détection est désormais figé par ADR-0013.
- Trou de test réel dans le rapport incrémental sur disque (à re-prouver par un run ciblé) :
  `src/core/pages/declaration.ts` ne tue aucun mutant — ni l'inversion du tri par rang, ni la
  projection vidée de `{slug, titre}`.
- Export mort confirmé à la lecture : la variante D1 de `pagePorteUnBrouillon`
  (`src/platform/brouillons/magasin.ts`) n'a aucun appelant, les deux routes prennent la version pure.
- Trous de la gate restants : le `scope` de `.claude/quality.json` est sans effet (les commandes sont
  globales), et aucun agent dédié n'existe (`checks[].agent`, `applier` absents).
- Dérives de documentation, trois : `tests/unit/**` manque à la pyramide de `docs/test.md` ; c'est
  `docs/ci.md`, pas `CLAUDE.md`, qui est périmé sur le wrangler de `dev` ; et le § « Commandes » de
  `docs/test.md` annonce un seuil de couverture « sur le code nouveau » qu'ADR-0013 restreint.
- En amont : le paquet a été renommé `@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin`
  en 1.0.0 ; notre nom est gelé à `0.22.0`, le nouveau est à `1.1.6`. Codemod officiel
  (`npx @cloudflare/codemods vitest:pool-workers-to-vitest-plugin`), et la seule rupture de `0.22.0`
  (MSW ≥ 2.14) ne nous touche pas — MSW est absent. Chantier distinct, sans lien avec la mesure.
- **J'ai arrêté l'ordre suivant** : réparer la mutation ou la retirer ; `knip` en informatif ; retirer
  ce qui prétend faussement (le `scope`, le rapport de couverture global) ; les agents par check
  ensuite. Rien ne monte côté CI.

## Prochaine étape
Réparer `stryker.conf.json` — que les mutants meurent au lieu de périmer — ou retirer la mutation.
ADR-0013 a figé l'indicateur, plus rien ne bloque en amont.

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
