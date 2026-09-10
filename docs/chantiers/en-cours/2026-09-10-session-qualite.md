# Session qualité — ce que la quality gate ne mesure pas

Portée : socle
Ouvert le 2026-09-10 · Actualisé le 2026-09-10 · branche `chore/session-qualite-2026-09-10` · HEAD `bbda056`

## Objectif
J'allais établir où sont les trous de la quality gate en la jouant en local, puis décider lesquels
valent une correction. Aucun code de production n'était visé.

## Contexte à charger
à lire      `.claude/quality.json` — la gate, cible de l'étape suivante : `scope`, agents (36 l.)
à lire      `stryker.conf.json` — le montage du rejeu complet qui reste à jouer (11 l.)
à situer    `docs/ci.md` › encadré « `npm run mutation` » — porte désormais le montage, la preuve et
            la politique de lecture du chiffre ; à relire avant de publier un score, pas avant
à situer    `docs/adr/0013-profondeur-des-tests-mesuree-par-la-mutation.md` — la question que je lui
            posais est tranchée et l'ADR reste intact : ne pas le rouvrir

## Acquis
- **J'ai tranché : ADR-0013 n'est pas à réexaminer.** Sa prémisse — le mutant emporté par le build
  jusque dans le worker bâti — tient dès lors que le mutant s'active. Je n'ai pas touché à l'ADR.
- Export mort confirmé à la lecture : la variante D1 de `pagePorteUnBrouillon`
  (`src/platform/brouillons/magasin.ts`) n'a aucun appelant, les deux routes prennent la version pure.
- Trous de la gate restants : le `scope` de `.claude/quality.json` est sans effet (les commandes sont
  globales), et aucun agent dédié n'existe (`checks[].agent`, `applier` absents).
- Outillage : `--incremental false` et `--no-incremental` n'existent pas côté CLI (l'argument est pris
  pour un fichier de config) — pour ignorer l'historique, pointer `--incrementalFile` vers un chemin neuf.
- En amont : le paquet a été renommé `@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin`
  en 1.0.0 ; notre nom est gelé à `0.22.0` (nous résolvons `0.20.3`), le nouveau est à `1.1.6`.
  Codemod officiel, et la seule rupture (MSW ≥ 2.14) ne nous touche pas.
- **J'ai arrêté l'ordre restant** : retirer ce qui prétend faussement (le `scope`), `knip` en
  informatif, les agents par check, puis un rejeu complet quand le reste est stable — je l'ai chiffré
  à ~2 h 45 à la cadence mesurée. Rien ne monte côté CI.

## Prochaine étape
Retirer du montage de la gate ce qui prétend sans effet : le `scope` de `.claude/quality.json`
(`changedOnly`, `paths`) ne filtre rien, les cinq commandes étant globales. Trancher entre le retirer
et le rendre effectif — et si on le retire, dire où la restriction au diff se joue à la place.

## Écarté
- **Injecter le mutant par les liaisons Miniflare — inutile.** `define` plus un module de setup
  suffisent ; un binding serait arrivé dans `env`, pas dans `process.env`, faute de `nodejs_compat`.
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
