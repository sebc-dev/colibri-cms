# Le test de mutation saturait la machine et rebâtissait à chaque mutant

Portée : hors-cycle
Ouvert le 2026-10-11 · Actualisé le 2026-10-11 · branche `chore/mutation-un-seul-build` · HEAD `ef72b65`

## Objectif
Le 2026-10-11 vers 04:00, la machine était saturée (charge 44 sur 12 cœurs, ~20 Go). En cause, le
passage complet du dimanche de `colibri-mutation`, parti à 01:11. Il en était à 23 % après
2 h 54, il lui restait ~9 h, et le plafond de 6 h l'aurait tué sans rien enregistrer.

## Contexte à charger
à situer    `~/.config/systemd/user/colibri-mutation.service` — non versionnée ; les réglages
            ci-dessous et leur pourquoi y sont en commentaire

## Issue
Fermé le 2026-10-11 — correctif du dépôt par la PR #202.

- J'ai arrêté le passage à la main (`systemctl --user stop`) : il était perdu de toute façon.
  **Le passage complet du 11/10 manque donc à `historique.tsv` : interrompu, il n'a pas échoué.**
- Hors dépôt, dans l'unité : `CPUWeight=10`. Sous cgroup v2, `Nice=10` ne départage que les
  processus d'un même cgroup. Face à la session voisine dans `app.slice`, le partage se faisait à
  poids égal, 100 contre 100. `TimeoutStartSec` est passé de 6 h à 14 h.
- Hors dépôt, dans le script : `--concurrency 4`, au lieu des 11 runners par défaut.
- Cause du surcoût, et de verdicts faussés : un build par mutant dans le bac à sable partagé.
  Le constat et sa preuve sont dans `docs/ci.md`, via la PR #202.

## Écarté
- Laisser finir en relevant le plafond : environ 9 h de plus de machine saturée, pour des
  verdicts que les collisions de build faussaient.
- Classer les faux « tués » par une heuristique large, comme la présence d'`entry.mjs` dans la
  sortie : elle gonflait le compte à 1486. Seuls des marqueurs précis (amorce 503, `dist/`
  absent au `postbuild`, `ENOENT`) isolent les collisions.
- Sélectionner les tests par `vitest related` : les tests d'intégration atteignent le code par le
  bundle (`SELF.fetch`), invisible au graphe d'imports. On aurait obtenu de faux survivants.
- Le runner vitest de Stryker en `coverageAnalysis: "perTest"` : c'est le seul vrai levier
  restant, puisque la suite complète tourne pour chaque mutant. Il n'a pas été éprouvé : la
  collecte par test à travers l'isolat `workerd` et le bundle (ADR-0013) est incertaine. À
  prototyper avant d'y croire.
- Comparer 11 et 4 runners à configuration égale : pas fait. 4 a été retenu pour la charge et la
  mémoire, pas pour un débit mesuré.
