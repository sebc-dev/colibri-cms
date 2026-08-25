# Gate 001-scaffold-projet — 5 items à corriger, 3 arbitrages

Portée : 001-scaffold-projet · gate
Ouvert le 2026-08-19 · Actualisé le 2026-08-19 · branche `main` · HEAD `3ee1756`

## Objectif
Passer la gate de conformité : zéro Critical. Le cycle avait rouvert parce que `e9d1931` (17/08) a
corrigé dans `spec.md` et `plan.md` une mesure qui s'était révélée fausse — le build émet
`dist/server/entry.mjs` avec ou sans la sonde — et que `tasks.md` n'avait pas suivi.

## Contexte à charger
à lire  `specs/001-scaffold-projet/spec.md` — porte `FR-005`, `FR-016`, `FR-022`
à lire  `specs/001-scaffold-projet/tasks.md` — porte `T16`, `T29`, `T37`, la ligne de mode de `R2`
à lire  `docs/ci.md` — l. 455 (colonne Statut d'`ADR-0021`), cible de la correction de `T16`

## À corriger
### Major (5) — aucun ne bloque le démarrage
- [T16] `tasks.md` l. 150-157 — exige que le « Rendu » de la colonne Statut « nomme `I1` comme sa
  portée » ; `docs/ci.md` l. 455 ne le fait pas (`I1` vit dans la colonne *Invariant*), et la tâche
  a été cochée avant cette réécriture → ajouter `I1` à la colonne Statut, ce qui rend la ligne
  lisible seule. Phase : `/scd-sdd:audit ci` (ou `tasks` si l'on aligne l'assertion à la place)
- [T37 · R2] `tasks.md` l. 231, 252-255 — mode `check` déclaré sans qu'aucune tâche ne porte
  l'observation, là où `R1` appariait `T15` à `T16` → nommer l'observation sur ce patron.
  Phase : `tasks`
- [T29 · FR-016] `tasks.md` l. 197-199 — déclarée `inhérent`, donc sa preuve vivrait dans les
  étapes 1 à 5 ; or depuis `ADR-0032` aucun contrôle ne couvre « aucune valeur propre à l'instance »
  dans la configuration de déploiement → basculer cette moitié en `check`, observation nommée.
  Phase : `tasks`
- [FR-022] `spec.md` l. 148-150, 241-243 — `shall` inconditionnel que la livraison réelle violera :
  `ADR-0032` loge les liaisons de plateforme dans ce fichier, « `database_id` compris », et `I8` y
  loge la destination d'acheminement → borner au périmètre du lot (« aucune valeur d'instance autre
  que les liaisons de plateforme, dont aucune n'est encore renseignée »). Phase : `specify`
- [FR-005] `spec.md` l. 173-174 — satisfait par une configuration ESLint sans une seule règle ; la
  clause qui ferme le trou vit dans `plan.md` l. 351-357 et `T18`, jamais dans la spec → y porter la
  clause de défaut injecté. Phase : `specify`

## Signalement amont
Hors périmètre de cette gate — elle atteste les specs, pas le socle. Les quatre premiers sont des
contrôles de jugement sur du texte inchangé depuis l'ancre, donc hors du décompte de la passe.
- `.astro` et `.svelte` sont **hors du champ** de `lint:boundaries` : `plan.md` décision 5 n'installe
  pas les greffons ESLint correspondants, si bien qu'ESLint saute ces fichiers en silence et sort à
  `0` — alors que `site/` et `admin/` sont les zones faites de `.astro`. Le défaut injecté de `SC-004`
  est un `.ts` et ne le rattrape pas. Aggravant : `docs/ci.md` l. 71 annonce désormais la matrice
  `I1` « **réelle** ». Piège différé, il se referme sur la première feature qui pose un `.astro`.
- `lint:boundaries`, `dev` et `db:migrate` échappent à `quality-config-guard`, qui ne surveille que
  sept lignes de scripts de `package.json` (`docs/ci.md` l. 280-282) — dont celle qui porte `I1`.
- `docs/preuves/` est érigé en domicile des pièces de toute la flotte dans `plan.md` l. 370-377, sans
  candidat ADR, quand le même plan refuse cet argument au plafond TypeScript.
- La concession de `FR-004` (test vert à vide) neutralise un job **bloquant** et son retrait n'est
  inscrit nulle part hors une puce de cas limite de `spec.md`.
- `docs/ci.md` se contredit (l. 25-26 « le dépôt ne porte aucun code » contre l. 57, 71 et 455) et
  `CLAUDE.md` l. 23 et 58-59 portent les mêmes énoncés périmés.
→ `/scd-sdd:audit ci`, `/scd-sdd:revise-contract`.

## Issue
Le Critical a été fermé en **une passe de correction** : `T36` a été réécrite sur la double absence
de l'étape 6 (aucun fichier dérivé de `sonde-dev.ts`, aucune occurrence de `_sonde`), l'ancienne
assertion « aucun fichier d'entrée serveur » étant fausse sur toute implémentation correcte. Quatre
Major ont été fermés dans le même geste : citation morte de l'encadré de `R1` recalée sur la mesure
courante, motif de fusion étendu à une seconde branche, modes déclarés par sous-ensemble, `T16`
remise en forme observable — cette dernière correction ayant produit le premier Major de la liste
ci-dessus. Deux passes en tout.

## Prochaine étape
Les cinq Major ne bloquent rien — le contrat est passé sans Critical et l'implémentation a déjà été
livrée (R1 le 15/08, R2 le 16/08). Deux d'entre eux décrivent un écart entre ce qui est écrit et ce
qui est dans le dépôt (`T16`, `T29`), les trois autres un contrat plus faible que le code. J'avais
prévu de les traiter par `/scd-sdd:specify 001` (`FR-022`, `FR-005`), `/scd-sdd:tasks 001` (`T37`,
`T29`) et `/scd-sdd:audit ci` (`T16`, plus tout le signalement amont).

## Écarté
- [R1 · encadré · branche 2] le motif de fusion invoque `FR-008` comme contrainte, alors que le
  « et chacun passe » qui rend les quatre configurations nécessaires est une phrase que `T6` s'est
  donnée — assumé le 19/08 : l'arbitrage du dépassement repose **entièrement sur la branche 1**
  (fenêtre rouge des jobs bloquants), les quatre configurations n'étant là que par commodité de
  couverture. Le lot est livré, la scission n'aura pas lieu ; ce qui compte est qu'une feature
  future ne réutilise pas la moitié circulaire en croyant qu'elle porte quelque chose.
- [FR-016] non atomique — trois comportements en une phrase — assumé le 19/08 : cosmétique sur un
  lot fermé. Seule la moitié « mode de `T29` » reste à corriger.
- [couverture documentaire] aucun `FR` ne couvre `docs/ci.md` § L'état du dépôt ni les gotchas de
  `CLAUDE.md` — assumé le 19/08 : créer une exigence rétroactive élargirait le périmètre d'un lot
  déjà mergé pour lui faire éditer des documents qu'il n'a pas touchés. Le remède est amont, et il
  est nommé au signalement ci-dessus. `T37` suit ce sort pour sa moitié « exigence porteuse ».
- [R1] dépassement des signaux de scission (~570 l. / 26 concepts) — assumé le 15/08 : la garde de
  scaffold des jobs bloquants teste `-f package.json`, une coupure après le manifeste produit une PR
  non mergeable.
- [R1 · encadré] la frontière du lot, la migration y restant malgré la liste de `T6` — assumé le
  15/08, confirmé Major le 19/08 contre une requalification en Critical : `T42`, qui porte le mode
  `inhérent` du lot, est bloquée par `T32` et `T33`, et l'étape 5 du script constate la migration.
- [T42] `T4` et `T14` listées en `bloqué par` sans étape du plan portant leur assertion — assumé le
  15/08, **motif réécrit le 19/08**, le précédent (« se découvre à l'implémentation à coût nul »)
  ayant été consommé sans rien découvrir : les deux tâches ont bien été vérifiées, hors du script ;
  c'est la déclaration de mode qui est imprécise, pas la preuve qui manque.
- [plan] sort des quatre configurations racine face à `boundaries/no-unknown-files` non mesuré —
  assumé le 15/08 : se découvre à l'implémentation à coût nul.
- Rapatrier seulement `astro.config.ts` et `wrangler.jsonc` dans R1 — écarté le 15/08 : ça vidait R2
  sans fermer la question pour R3.
- Assumer la fenêtre rouge et la documenter — écarté le 15/08 : sous protection de branche, une PR
  dont un job bloquant est rouge ne se merge pas.
- Ne pas poser `src/render/zone.ts` ni `src/admin/zone.ts` — écarté le 15/08 : ça violerait `FR-009`
  et remettrait six contrôles sur dix en « hors portée ».
