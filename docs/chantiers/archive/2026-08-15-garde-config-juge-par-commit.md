# `quality-config-guard` juge par commit une condition établie sur le diff cumulé

Portée : socle
Ouvert le 2026-08-15 · branche `chore/chantiers-portail-ci` · HEAD `0b90517`

## Objectif
Fermer un faux positif du garde de configuration qualité, trouvé le 2026-08-15 en traitant les
échecs de la PR #22. Il n'a rien bloqué ce jour-là — le label `config-change` l'a couvert — mais il
mordra la prochaine PR qui mêle un changement de config et un changement de dépendance sans label.

## Acquis
- J'ai constaté que le garde établit « les scripts du portail ont bougé » sur le **diff cumulé**
  (`BASE_SHA...HEAD`), puis exige un scope de config sur **chaque** commit touchant `package.json`.
- Conséquence mesurée sur #22 : le commit `build(deps): forcer qs >= 6.15.2`, qui ne touche que le
  bloc `overrides`, s'est fait reprocher des scripts écrits par un **autre** commit. Son scope est
  pourtant celui qu'exige `dependency-review` pour ce même changement — les deux gardes attendent
  des scopes que le même commit ne peut pas porter ensemble.
- J'ai décidé de ne pas le corriger dans la PR #23 : elle portait la correction de l'auto-match de
  `dependency-review` et devait rester relisable d'un coup d'œil.
- C'est la **même famille** de défaut que celui-là — un garde greppable dont la portée du signal ne
  coïncide pas avec la portée du jugement. Le premier se voyait ; celui-ci se cache derrière une
  soupape.

## Issue
Fermé le 2026-08-16 — commit `c4bed39`, PR #25. `verifier_scopes` prend un motif de ligne en
premier argument ; quand il est fourni, seuls les commits dont le diff **sur ces chemins** porte
une ligne correspondante sont jugés. Le volet (a) passe `''` : y toucher **est** le fait surveillé.
Le motif des scripts est défini une seule fois (`SCRIPTS_PORTAIL`) et sert à la condition d'entrée
comme au filtre — deux copies auraient divergé.

Vérifié par rejeu sur le diff réel de la PR #22 (`7552e44` → `f9a64a6`) : le volet (b) signalait
`build(deps)` **et** `chore(scaffold)`, il ne signale plus que le second. Et sur un témoin
synthétique à deux commits `build(deps):` — celui qui ne touche que les dépendances passe, celui
qui modifie aussi le script `test` est signalé : le filtre n'ouvre aucune échappatoire.

## Écarté
- **Élargir la liste des scopes acceptés sans condition** — un `build(deps):` pourrait alors
  modifier `eslint.config.js` ou `.npmrc` sans déclaration, ce que le garde existe pour empêcher.
- **Compter sur le label** — la soupape est faite pour un cas exceptionnel déclaré, pas pour
  couvrir en permanence un faux positif ; l'employer ainsi éteint le contrôle au lieu de le
  réparer.
- **Admettre les scopes `deps` quand le seul fichier de config touché est `package.json`** — la
  seconde forme envisagée à l'ouverture, écartée à l'application : elle ajoutait une exception à la
  liste des scopes là où le défaut était dans la **portée du jugement**. Le garde serait resté faux
  — un commit sans scope, glissé dans une PR dont un autre commit touche les scripts, aurait
  continué d'être signalé à tort.

## Contexte à charger
à lire  `.github/workflows/ci.yml` § `quality-config-guard` — les ~25 lignes de `verifier_scopes`
        et de la détection des scripts du portail : c'est tout le sujet
à situer `docs/chantiers/archive/2026-08-15-portail-ci-reveille-par-le-premier-manifeste.md` — où
        le défaut a été trouvé, et le défaut jumeau déjà corrigé
