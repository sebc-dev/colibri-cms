# Le portail CI réveillé par le premier `package.json`

Portée : socle
Ouvert le 2026-08-15 · branche `chore/chantiers-portail-ci` · HEAD `0b90517`

## Objectif
Le lot `R1` de `001-scaffold-projet` pose le premier manifeste du dépôt. Trois contrôles bloquants
qui dormaient sous la garde de scaffold (`if [ -f package.json ]`) se sont exécutés pour la
première fois de leur existence, et deux ont échoué. Il fallait savoir lesquels étaient de vrais
défauts et lesquels de la forme.

## Issue
- **`dependency-review`, volet (a) — défaut réel, corrigé.** Son `git grep` de `--min-release-age`
  couvre `.github/workflows/**`, où il vit lui-même : sa propre commande contenait la chaîne
  cherchée. Structurel — aucune PR n'aurait pu le faire passer. Les deux motifs portent désormais
  une classe de caractères (`[-]`, `[f]`) : même chaînes matchées, motif qui ne se matche plus.
  Aucun chemin retiré du périmètre. PR #23, commit `351bc47`.
- **`sca` — vulnérabilité réelle, corrigée.** `qs` 6.15.1 (GHSA-q8mj-m7cp-5q26, CVSS 6.3), tiré par
  `@stryker-mutator/core` → `typed-rest-client@2.3.1`, qui l'épingle **exactement** — `npm update`
  ne pouvait rien. `overrides` vers `^6.15.2`, résolu en 6.15.3, la version que `typed-rest-client`
  3.1.0 utilise nativement. Un seul paquet change dans le lockfile. Commit `530ee7f` (dans #22).
- **`quality-config-guard` — forme seule.** Le commit du lot portait `chore(scaffold):`, absent de
  la liste attendue. Levé par le label `config-change` sur la PR, soupape prévue par le workflow.

**La correction du garde ne se prouve pas sur `main`** — sans manifeste, son volet se déclare hors
portée. Elle s'est vérifiée au rebase de #22 : `Cooldown déclaré : 7 jours.` sans erreur, soit la
première exécution réelle de ce contrôle.

## Écarté
- **Exclure `ci.yml` du périmètre du grep** — la correction évidente, et elle crée un angle mort :
  un vrai contournement écrit dans un workflow ne serait plus vu. C'est précisément le fichier le
  plus plausible pour en porter un.
- **Filtrer les résultats par numéro de ligne** — casse au premier ajout de ligne au-dessus.
- **Attendre une version de `@stryker-mutator/core` tirant `typed-rest-client` 3.x** — supprime
  l'override à entretenir, mais dépend d'un tiers sans date, et `sca` est bloquant.
- **Poser les labels puis pousser dans le même geste** — a produit trois runs à la même seconde,
  dont `cancel-in-progress` a gardé un au hasard, sans les labels. Poser les labels **avant** de
  pousser, ou re-déclencher ensuite.

## Contexte à charger
à situer `docs/chantiers/archive/2026-08-15-garde-config-juge-par-commit.md` — le second défaut
        trouvé en chemin, même famille, autre garde ; corrigé le 2026-08-16 (PR #25)
