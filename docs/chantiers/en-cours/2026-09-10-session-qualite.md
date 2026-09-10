# Session qualité — ce que la quality gate ne mesure pas

Portée : socle
Ouvert le 2026-09-10 · Actualisé le 2026-09-10 · branche `chore/session-qualite-2026-09-10` · HEAD `f923bbf`

## Objectif
J'allais établir où sont les trous de la quality gate en la jouant en local, puis décider lesquels
valent une correction. Aucun code de production n'était visé.

## Contexte à charger
à lire      `vitest.config.ts` — là où la piste d'activation se joue : liaisons Miniflare (27 l.)
à lire      `stryker.conf.json` — le montage courant, base des rejeux de vérification (11 l.)
à lire      `.claude/quality.json` — la gate, encore à amender : `scope`, agents (36 l.)
à lire      `docs/adr/0013-profondeur-des-tests-mesuree-par-la-mutation.md` — sa prémisse est en
            cause ; à relire avant de trancher, ses Alternatives portent les pistes mortes (100 l.)
à extraire  `docs/ci.md` › encadré « `npm run mutation` n'atteste rien » — le constat, déjà écrit
à extraire  `docs/ci.md` › « Commandes du projet » — le registre à raccorder aux constats restants
à extraire  `docs/test.md` › « Pyramide » et « Commandes » — les deux dérives à y corriger
à situer    `reports/stryker-incremental.json` — 4034 l., produit par l'attelage aveugle : rien à en tirer

## Acquis
- **J'ai décidé de ne pas toucher à ADR-0013** : réexaminer une décision acceptée revient à l'humain,
  pas à la session qui trouve le défaut. Le constat qui la met en cause est écrit dans `docs/ci.md`.
- Export mort confirmé à la lecture : la variante D1 de `pagePorteUnBrouillon`
  (`src/platform/brouillons/magasin.ts`) n'a aucun appelant, les deux routes prennent la version pure.
- Trous de la gate restants : le `scope` de `.claude/quality.json` est sans effet (les commandes sont
  globales), et aucun agent dédié n'existe (`checks[].agent`, `applier` absents).
- Dérives de documentation, trois : `tests/unit/**` manque à la pyramide de `docs/test.md` ; c'est
  `docs/ci.md`, pas `CLAUDE.md`, qui est périmé sur le wrangler de `dev` ; et le § « Commandes » de
  `docs/test.md` annonce un seuil de couverture « sur le code nouveau » qu'ADR-0013 restreint.
- En amont : le paquet a été renommé `@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin`
  en 1.0.0 ; notre nom est gelé à `0.22.0` (nous résolvons `0.20.3`), le nouveau est à `1.1.6`.
  Codemod officiel, et la seule rupture (MSW ≥ 2.14) ne nous touche pas. **Devenu moins accessoire** :
  ce qu'un mutant voit dans l'isolat est une affaire de pool.
- **J'ai arrêté l'ordre suivant** : éprouver l'activation dans l'isolat, puis trancher ADR-0013 ;
  `knip` en informatif ; retirer ce qui prétend faussement (le `scope`, le rapport de couverture
  global) ; les agents par check ensuite. Rien ne monte côté CI.

## Prochaine étape
Éprouver la piste d'activation : injecter `__STRYKER_ACTIVE_MUTANT__` dans l'isolat par les liaisons
Miniflare de `vitest.config.ts`, puis vérifier sur un mutant dont l'issue est connue — l'inversion du
tri par rang, `src/core/pages/declaration.ts:119`, qu'un test d'intégration attrape — qu'il passe de
« survivant » à « tué ». Si aucun moyen n'existe, ADR-0013 est à réexaminer.

## Écarté
- **Alléger la commande de test pour accélérer le rejeu — morte, et mesurée.** Restreindre aux étages
  statique et unitaire descend le rejeu de 19 s à 3,9 s, mais retire l'intégration de l'oracle et
  fabrique de faux rescapés : `trierPagesDeclarees` y sort à 0 % alors que la suite complète tue bien
  le mutant du tri. Le build par mutant n'est pas du gaspillage — c'est lui qui porte la mutation.
- **Brider la concurrence — sans objet.** La péremption venait du seuil seul ; la machine sature
  (2,8× pour onze processus), brider n'aurait ni coûté ni rapporté.
- **Resserrer le périmètre muté à `src/core/` — mauvais rapport.** `platform/` ne pèse que 256 mutants
  sur 1321 : on abandonnerait la couche qui touche D1 pour un cinquième du temps, contre l'ADR.
- **Retirer la mutation — écarté en l'état.** ADR-0013 range « renoncer à tout indicateur de
  profondeur » parmi ses alternatives écartées ; le geste demanderait un ADR qui le supersède.
- Sourcemaps pour ramener la couverture sur `src/`, et fournisseur V8 — tous deux morts et mesurés,
  avec leur condition de réouverture, désormais portés par ADR-0013 § Alternatives considérées.
- Exclure `.wrangler/**` de la couverture — le rapport paraîtrait plus propre en mesurant beaucoup moins.
- Poser un seuil de couverture nu — `docs/test.md` la veut informative, et un seuil sur une mesure
  visant le bundle serait un mensonge chiffré.
- Ajouter un outil de duplication — les volumes ne le justifient pas, et il n'y a ni `TODO` ni
  escape-hatch nulle part.
- Rendre des checks bloquants **côté CI** — la CI est informative par décision du 2026-09-06, et
  promouvoir un garde touche trois surfaces ; la gate du cycle `run` est le bon endroit.
