# Audit claude-md — 0 Critical · 1 Major

Portée : socle · audit
Ouvert le 2026-08-15 · Actualisé le 2026-08-15 · branche `work/reprise-socle-v2` · HEAD `38fb7773391fda30cd5189489b0bb32765bd0a0d`

## Objectif
Corriger le seul Major retenu au gate (verdict global déjà CONFORME, zéro Critical).

## Contexte à charger
à lire  `CLAUDE.md` — le document jugé
à lire  `docs/ci.md` — l'amont dont dépend l'état réel du cooldown npm et de la section Commandes

## À corriger
### Lot A — éditions dans `CLAUDE.md`
- **[Gotcha `.npmrc`] Major** — l.61 affirme au présent « `.npmrc` porte `min-release-age=7` », alors que le fichier n'existe pas encore sur le dépôt et que `docs/ci.md:189,195` le formule au normatif / « à poser au scaffold » → reformuler au futur/normatif, ex. « `.npmrc` devra porter `min-release-age=7` au scaffold (voir `docs/ci.md`) : une dépendance publiée il y a moins de 7 jours sera inutilisable. »

## Prochaine étape
`/scd-sdd:resume audit-claude-md` pour traiter le Lot A, puis relancer `/scd-sdd:audit claude-md`.

## Issue
Lot A corrigé le 2026-08-15 : la gotcha `.npmrc` (l.61) reformulée au futur/normatif — « devra
porter … au scaffold (voir `docs/ci.md`) » — au lieu de l'affirmation au présent. `/scd-sdd:audit
claude-md` relancé la même passe : **CONFORME · 0 Critical · 0 Major**, le Major corrigé vérifié
cohérent avec `docs/ci.md:189-196`. Fermé en 2 passes.
