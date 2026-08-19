# Gate 001-scaffold-projet — 1 Critical · 8 Major

Portée : 001-scaffold-projet · gate
Ouvert le 2026-08-19 · Actualisé le 2026-08-19 · branche `main` · HEAD `66282ad`

## Objectif
Passer la gate de conformité : zéro Critical. Le cycle a rouvert parce que `e9d1931` (17/08) a
corrigé dans `spec.md` et `plan.md` une mesure qui s'est révélée fausse — le build émet
`dist/server/entry.mjs` avec ou sans la sonde — et que `tasks.md` n'a pas suivi.

## Contexte à charger
à lire  `specs/001-scaffold-projet/tasks.md` — porte `T36`, l'encadré de `R1`, `T16`, `T42`
à lire  `specs/001-scaffold-projet/spec.md` — porte `FR-005`, `FR-016`, `FR-022`, `US5`
à lire  `specs/001-scaffold-projet/plan.md` — l. 196-201 (la forme falsifiable retenue) et l. 404

## À corriger
### Critical (1)
- [T36] `tasks.md` l. 219-221 — « le répertoire de sortie ne porte aucun fichier d'entrée serveur » est faux sur toute impl correcte (`plan.md` l. 196-199 : 15 fichiers avec ou sans la sonde) → réécrire sur la double absence de l'étape 6 : aucun fichier dérivé de `sonde-dev.ts`, aucune occurrence de `_sonde` sous `dist/`. Phase : `tasks`
### Major (8)
- [R1 · encadré] `tasks.md` l. 42-44 — la citation « le build repasse à 0 page(s) / 3 fichiers » n'existe plus dans `plan.md` ; et l. 37-38 « la base migrée est une condition » est démentie par la liste de `T6`. La frontière du lot reste arbitrée (voir `## Écarté`) : c'est le texte qui est à recaler, pas le découpage → recaler les deux affirmations sur la mesure courante. Phase : `tasks`
- [R1 · motif de fusion] `tasks.md` l. 46-53 — motif écrit sur `build` et `test` « tous deux bloquants », quand quatre des huit tâches de `T6` servent des jobs informatifs (`boundaries`, `lint`) ou nocturnes (`dead-code`, `mutation`) → étendre le motif, ou extraire ces tâches. Phase : `tasks`
- [FR-022 · US5] `spec.md` l. 148-150, 241-243 — « elle n'en a d'ailleurs aucune à porter » contredit `docs/stack.md` § Configuration d'instance (six valeurs, dont l'identifiant de base D1) et `ADR-0032` (« `database_id` compris, à la livraison réelle ») → borner `FR-022` au périmètre du lot. Phase : `specify`
- [FR-016 · FR-022 · T29] `tasks.md` l. 171-173 — la vérification « aucune valeur propre à l'instance » n'a aucun porteur mécanique depuis qu'`ADR-0032` a sorti la configuration de déploiement du périmètre d'`I10` ; `FR-016` est en outre non atomique → scinder `FR-016` et nommer l'observation qui prouve chaque clause. Phase : `specify` puis `tasks`
- [R1 · T42] `tasks.md` l. 31 vs 196-199 — le mode `inhérent` déclaré exclut `T5`, `T41`, `T6`, `T15`, `T16`, sans second mode déclaré → déclarer le mode par sous-ensemble. Phase : `tasks`
- [T16] `tasks.md` l. 131-133 — « aucune des lignes touchées ne laisse croire le job clos » est un jugement de lecture, pas une trace → réécrire en forme observable. Phase : `tasks`
- [FR-005] `spec.md` l. 173-174 — satisfait par une configuration ESLint sans une seule règle ; le trou est refermé dans `plan.md` l. 355-357 et `T18`, jamais dans la spec → porter la clause de défaut injecté dans `FR-005`. Phase : `specify`
- [couverture] aucun `FR` ne couvre la mise à jour de `docs/ci.md` § L'état du dépôt ni des deux gotchas de `CLAUDE.md`, quand `FR-025` porte l'édition documentaire symétrique → créer le `FR` sur le patron de `FR-025`. Phase : `specify` puis `tasks`

## Signalement amont
`docs/ci.md` se contredit (l. 25-26 « le dépôt ne porte aucun code » contre l. 57 « Réelle — posée
par `specs/001-scaffold-projet` ») et `CLAUDE.md` l. 23 et 58-59 portent les mêmes énoncés périmés.
Hors périmètre de cette gate → `/scd-sdd:audit ci`, `/scd-sdd:revise-contract`.

## Prochaine étape
Corriger `T36` par `/scd-sdd:tasks 001` — c'est le seul bloquant.

## Écarté
- [R1] dépassement des signaux de scission (~570 l. / 26 concepts) — assumé le 15/08 : la garde de
  scaffold des jobs bloquants teste `-f package.json`, une coupure après le manifeste produit une PR
  non mergeable.
- [R1 · encadré] la frontière du lot, la migration y restant malgré la liste de `T6` — assumé le
  15/08, **confirmé Major le 19/08** contre une requalification en Critical : `T42`, qui porte le
  mode `inhérent` du lot, est bloquée par `T32` et `T33`, et l'étape 5 du script unique constate la
  migration. Seul le texte du motif est à corriger, ci-dessus.
- [T42] `T4` et `T14` listées en `bloqué par` sans étape du plan portant leur assertion — assumé le
  15/08 : se découvre à l'implémentation à coût nul.
- [plan] sort des quatre configurations racine face à `boundaries/no-unknown-files` non mesuré —
  assumé le 15/08 : se découvre à l'implémentation à coût nul.
- Rapatrier seulement `astro.config.ts` et `wrangler.jsonc` dans R1 — écarté le 15/08 : ça vidait R2
  sans fermer la question pour R3.
- Assumer la fenêtre rouge et la documenter — écarté le 15/08 : sous protection de branche, une PR
  dont un job bloquant est rouge ne se merge pas.
- Ne pas poser `src/render/zone.ts` ni `src/admin/zone.ts` — écarté le 15/08 : ça violerait `FR-009`
  et remettrait six contrôles sur dix en « hors portée ».
