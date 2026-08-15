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

## Prochaine étape
Décider laquelle des deux formes tient, puis l'appliquer dans `.github/workflows/ci.yml` § garde de
la config qualité :
- restreindre la condition au **diff du commit examiné** plutôt qu'au diff cumulé — le garde
  redevient exact, mais chaque commit doit alors être jugé seul ;
- ou admettre `build(deps):`, `chore(deps):` et `fix(deps):` dans la liste des scopes acceptés
  quand le seul fichier de config touché par ce commit est `package.json` — plus étroit, ne
  déplace pas la sémantique du garde.

## Écarté
- **Élargir la liste des scopes acceptés sans condition** — un `build(deps):` pourrait alors
  modifier `eslint.config.js` ou `.npmrc` sans déclaration, ce que le garde existe pour empêcher.
- **Compter sur le label** — la soupape est faite pour un cas exceptionnel déclaré, pas pour
  couvrir en permanence un faux positif ; l'employer ainsi éteint le contrôle au lieu de le
  réparer.

## Contexte à charger
à lire  `.github/workflows/ci.yml` § `quality-config-guard` — les ~25 lignes de `verifier_scopes`
        et de la détection des scripts du portail : c'est tout le sujet
à situer `docs/chantiers/archive/2026-08-15-portail-ci-reveille-par-le-premier-manifeste.md` — où
        le défaut a été trouvé, et le défaut jumeau déjà corrigé
