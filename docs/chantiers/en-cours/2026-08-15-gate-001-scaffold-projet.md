# Gate 001-scaffold-projet — 0 Critical · 2 Major

Portée : 001-scaffold-projet · gate
Ouvert le 2026-08-15 · Actualisé le 2026-08-15 · branche `work/reprise-socle-v2` · HEAD `d655ed8`

## Objectif
Refondre le découpage de `tasks.md` selon l'arbitrage rendu à la gate du 15/08 : les trois
premiers lots deviennent une seule PR, et le motif du dépassement de seuil est réécrit.

## Contexte à charger
à lire  `specs/001-scaffold-projet/tasks.md` — porte R1, R2, R3, R4
à lire  `specs/001-scaffold-projet/plan.md` — § Approche, § Fichiers touchés
à situer `.github/workflows/ci.yml` — chaque job teste `-f package.json` (la garde de scaffold)

## À corriger
### Major (1)
- [R1·R2·R3] `tasks.md` — R1 posait `package.json`, ce qui levait la garde de scaffold sur `build`
  et `test` (bloquants) alors que `astro.config.ts` et `wrangler.jsonc` n'arrivaient qu'en R2 →
  fusionner les trois lots en un seul, de sorte que les configurations arrivent avec le manifeste.
  Le nouveau lot est à écrire comme **un** sujet — le scaffold est atomique, il n'a pas de point
  de coupure où la CI bloquante soit verte — sans quoi la re-passe le lira comme trois sujets, ce
  qui est le seul défaut de découpage qui rende un Critical. Phase : `tasks`

### Minor restés en conversation (6)
Non portés ici, par contrat. Ils sont dans le rapport de la passe du 15/08 : « knip » comme nom
d'outil (SC-002), le message du lanceur de tests cité en spec, le décompte « huit commandes
normatives », l'atomicité de FR-019, le candidat ADR de l'épinglage TypeScript, le pattern
`If…then` de FR-008.

## Prochaine étape
J'allais fusionner R1, R2 et R3 par `/scd-sdd:tasks 001`, en reprenant le motif d'arbitrage
ci-dessous dans l'encadré du lot fusionné.

## Écarté
- Dépassement du signal de scission sur le lot de scaffold — assumé le 15/08, arbitrage rendu une
  première fois le 15/08 sur R1 (15 concepts contre ≈ 7) et **maintenu** après la fusion, qui le
  porte à ~26. Motif : un scaffold n'offre aucun point de coupure où les jobs bloquants soient
  verts ; scinder déplacerait la fenêtre rouge au lieu de la fermer. Le budget en lignes, lui,
  reste dans les clous.
- Rapatrier seulement `astro.config.ts` et `wrangler.jsonc` dans R1 — écarté au profit de la
  fusion complète : ça vidait R2 de sa substance sans fermer la question pour R3.
- Assumer la fenêtre rouge et le documenter — écarté : sous protection de branche, une PR dont un
  job bloquant est rouge ne se merge pas.
