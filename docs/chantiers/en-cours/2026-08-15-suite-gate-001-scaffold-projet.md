# Gate 001-scaffold-projet — 3 Critical · 10 Major

Portée : 001-scaffold-projet · gate
Ouvert le 2026-08-15 · Actualisé le 2026-08-15 · branche `work/reprise-socle-v2` · HEAD `9e03b43`

## Objectif
Passer la gate de conformité : zéro Critical. Cette liste est née d'une passe **intégrale** — la
première depuis la fusion `R1·R2·R3` —, là où les deux dernières passes de l'ancien cycle étaient
en régime delta et ne rejouaient les contrôles de jugement que sur le diff.

## Contexte à charger
à lire   `specs/001-scaffold-projet/spec.md` — porte `FR-002`, `FR-005`, `FR-019`, `FR-021`,
  `SC-002`, `SC-008`, `SC-009`, l'encadré `US5`
à lire   `specs/001-scaffold-projet/plan.md` — § Fichiers touchés (`docs/ci.md`), décision 1,
  étapes 1 et 4 de la vérification bout-en-bout
à lire   `specs/001-scaffold-projet/tasks.md` — porte `R1`, `R2`, `T6`, `T18`, `T33`, `T37`,
  `T39`, `T40`
à situer `docs/ci.md` l. 54-74 — le tableau des commandes n'a **pas** de ligne « Run local » ;
  l. 72 porte « Aucune commande de run local n'existe » en gras
à situer `.github/workflows/nightly.yml` — les jobs `dead-code` et `mutation` portent la même
  garde `-f package.json` que ceux de `ci.yml`

## À corriger
### Critical (3)
- [R1] `tasks.md` — sujets multiples : le lot absorbe les cinq user stories, et sa défense
  « aucune n'est livrable seule » est falsifiée par la mesure de `plan.md` (sonde injectée sous
  `command === 'dev'`, build à 0 page) → extraire `R1b` « le serveur local démarre et lit la base
  migrée » : `T34`-`T37`, livrant `FR-012`, `FR-024`, `SC-006`. Phase : `tasks`
- [FR-021 · US4-3 · SC-007 · T33] `spec.md` — « seules subsistent les tables de service du
  mécanisme de migration » est faux contre la mesure du plan (`sqlite_sequence`, `_cf_METADATA`)
  → garder « aucun objet propre au produit », retirer la seconde moitié. Phase : `specify`, puis
  `plan`/`tasks`
- [T6] `tasks.md` — « et chacune passe » est contredit par `FR-023` (la mutation refuse
  d'exécuter) ; `bloqué par` omet `T22` et `T23` → borner aux jobs de `ci.yml`, sortir `mutation`
  du « chacune passe », compléter la liste. Phase : `tasks`
### Major (10)
- [R2] `tasks.md` — phase de vérification, pas une tranche : ré-encode ce que `R1` a déjà observé
  → faire croître le script dans la section de `R1` qu'il vérifie, `T39` seul en lot. Phase : `tasks`
- [T40] `tasks.md` — vérifie `FR-026` (tout l'arbre) en n'étant bloquée que par `T11`, alors que
  quatre fichiers source arrivent après → la bloquer par `T17`, `T19`, `T27`, `T34`. Phase : `tasks`
- [FR-005 · T18] aucune vérification falsifiante — l'étape 4 n'injecte aucun défaut de lint, un
  config sans règle passe → quatrième défaut injecté, inscrit en critère de `T18`. Phase : `plan`, puis `tasks`
- [SC-002] le `0` de la commande de code mort n'est établi par rien (plancher sans point d'entrée,
  sonde atteinte par une chaîne) → nommer la configuration au plan, ou sortir le code mort de
  `SC-002`. Phase : `plan`, ou `specify`
- [FR-019] `spec.md` — « la commande d'installation » ne désigne pas `npm ci`, qui ne paie aucun
  délai de gel (`docs/ci.md` § Approvisionnement) → requalifier sur l'ajout d'une dépendance. Phase : `specify`
- [FR-002 · SC-008] `spec.md` — « artefact déployable » non falsifiable, le déploiement réel étant
  exclu → réécrire sur la sortie observable. Phase : `specify`
- [plan décision 1] épinglage de TypeScript en `6.0.3` — plafond de version pour toute la flotte
  hors de tout ADR, `docs/adr/_candidates/` vide → déposer un candidat. Phase : `plan`
- [spec § US5] l'encadré recopie une mesure de plateforme et le récit `ADR-0030` → `ADR-0032`
  → réduire à la frontière produit. Phase : `specify`
- [SC-009 · T39] la « pièce datée, conservée » n'a aucun chemin déclaré → le nommer et l'ajouter
  aux fichiers de `R2`. Phase : `plan`, puis `tasks`
- [docs/ci.md édition (a) · T37] la « case vide Run local » n'existe pas, et le paragraphe en gras
  qui la nie n'est corrigé par aucune tâche, l'édition étant bornée à « deux lignes » → nommer les
  deux gestes et corriger la borne. Phase : `plan`, puis `tasks`

## Prochaine étape
Corriger les trois Critical, en commençant par la scission de `R1` — elle déplace `T34`-`T37` et
conditionne la reformulation de `T6`. **Committer avant de relancer la gate** : sans commit, la
passe suivante retombe en régime intégral.

## Écarté
- Dépassement du signal de scission sur le lot de scaffold — assumé le 15/08, maintenu après la
  fusion (~490 l. / 29 concepts). Motif re-vérifié le 15/08 dans `.github/workflows/ci.yml` : les
  jobs bloquants gatent sur `-f package.json`, une coupure après le manifeste produit une PR non
  mergeable. Ne couvre **pas** la tranche du premier Critical, dont l'absence ne rougit rien.
- Rapatrier seulement `astro.config.ts` et `wrangler.jsonc` dans R1 — écarté le 15/08 au profit de
  la fusion complète : ça vidait R2 sans fermer la question pour R3.
- Assumer la fenêtre rouge et la documenter — écarté le 15/08 : sous protection de branche, une PR
  dont un job bloquant est rouge ne se merge pas.
- Ne pas poser `src/render/zone.ts` ni `src/admin/zone.ts` — écarté le 15/08 : ça violerait
  `FR-009` et remettrait six contrôles sur dix en « hors portée ».
