# Gate 002-connexion-par-code — 5 Major

Portée : 002-connexion-par-code · gate
Ouvert le 2026-08-21 · Actualisé le 2026-08-23 · branche `main` · HEAD `2eae7d1`

## Objectif
Passer la gate de conformité de 002-connexion-par-code : zéro Critical.

## Contexte à charger
à lire  `specs/002-connexion-par-code/spec.md` — porte FR-024, FR-025, FR-040, FR-041, SC-007, SC-008, SC-011, SC-015, la table d'E/S et la Légende
à lire  `specs/002-connexion-par-code/plan.md` — porte l'étape 3p, la décision 14 et la table de couverture
à lire  `specs/002-connexion-par-code/tasks.md` — porte R1, R11, T17, T39, T57, T60

## À corriger
### Critical (0)

### Major (5)
- [FR-041] `spec.md` — la table d'E/S a gagné une quatrième forme de réponse (l'écran de connexion) à qui elle impose les en-têtes, mais l'étape **p** et `SC-014` n'en tirent que trois → ajouter la quatrième forme à l'étape **p** et à `SC-014`. Phase : `specify`, puis `plan` et `tasks`
- [SC-008] `plan.md`+`tasks.md` — deux porteurs concurrents : le plan fait lire ces absences dans `src/admin/connexion/` (« ne passent pas par ce script »), ce qui exclut l'écran d'accueil que `FR-024` et `SC-008` couvrent ; `T60` en fait une assertion de script sur tous les écrans → trancher un porteur unique et corriger le lieu. Phase : `plan` puis `tasks`
- [FR-022/FR-023] `tasks.md` — le plan nomme l'étape **j** comme porteur observable des quatre attributs, mais `T39`, qui l'écrit, ne porte pas leur backref, et R1 les livre sans qu'aucun de ses chemins n'émette de `Set-Cookie` → ajouter `FR-022`/`FR-023` au backref de `T39` et écrire que R1 n'en livre que la sérialisation (arbitré le 23/08 : le backref seul, aucune frontière de lot ne bouge). Phase : `tasks`
- [FR-025/SC-007] `spec.md` — l'énumération d'écrans oublie l'annonce du plafond (`?etape=plafond`), que `T55` et `T59` vérifient pourtant ; `FR-024` n'en vise que deux quand `SC-008` et `T60` en mesurent cinq → aligner les trois énumérations sur les écrans réellement servis. Phase : `specify`
- [FR-040/SC-015] `spec.md` — « ne permet pas de retrouver le code » promet une irréversibilité que la décision 14 du plan retire (« la conservation, jamais l'irréversibilité calculatoire ») sans que la spec porte la borne → écrire la borne dans `FR-040` et `SC-015`. Phase : `specify`

## Prochaine étape
Corriger les trois entrées de phase `specify` (`FR-041`, `FR-025`/`SC-007`, `FR-040`/`SC-015`) par
`/scd-sdd:specify 002`, puis `SC-008` par `/scd-sdd:plan 002`, puis `FR-041`, `SC-008` et
`FR-022`/`FR-023` par `/scd-sdd:tasks 002`. Puis **commiter les corrections en signant** (voir
Outillage) et relancer `/scd-sdd:analyze 002`.

## Signalements hors gate
- **Socle** : `.github/scripts/arch-invariants.sh` rend `I8` par un `grep -nF` en sous-chaîne
  (l. 171), si bien qu'une adresse hébergée sur le domaine d'instance le fait rougir. La décision 9
  du plan a rétabli `destination_address` et **signale** le défaut plutôt que de le contourner ; il
  reste vrai, et rougira chez toute cliente dont la boîte est sur son propre domaine.
  → `/scd-sdd:audit archi`.
- **Outillage** : la gate ne peut pas remplir sa précondition de passe delta (§D39) — commiter les
  corrections —, `specs-integrity` exigeant un commit **signé** pour `spec.md`, `plan.md` et le
  texte de `tasks.md`. La manœuvre reste que l'humain commite lui-même. **Elle a mordu à la
  passe 4** : la ligne `HEAD` d'une fiche est prise **avant** le commit de l'humain, si bien que
  l'ancre inscrite à la passe 3 désignait encore l'état jugé à la passe 2. Le delta de la passe 4
  a donc recouvert **deux** passes de corrections au lieu d'une. Excès de couverture, jamais
  défaut — mais l'ancre d'une fiche de gate est fausse d'une passe tant que la gate ne commite pas
  elle-même.

## Écarté
_(aucun arbitrage — décliné à la passe 1, sans préférence à la passe 2, renvoyé à la correction aux
passes 3 et 4)_

## Issue
Quatre passes. La passe 1 avait relevé 3 Critical et 11 Major, la passe 2 en a trouvé 5 et 13 sur
le texte que la première avait fait écrire, la passe 3 est retombée à 1 et 2, la quatrième à 0
Critical. Les **18** findings de la passe 2 puis les **3** de la passe 3 ont tous été corrigés —
dont l'amas d'indiscernabilité (`SC-003` conduite hors plafond, `SC-012` récrit sur une grandeur
observable), la scission de R1, la garde du ramassage des lignes mortes sans laquelle le plafond de
`FR-008` n'était jamais atteint, et la mention de `FR-030` réécrite pour ne plus dicter le mot que
`SC-007` cherche.

**Ce que la gate a nommé sans jamais le compter, et qui n'a donc jamais été traité.** Six findings
de jugement portaient sur du texte inchangé depuis l'ancre : le dispositif les rapporte hors
décompte pour ne pas boucler, et ils meurent avec le rapport. Ils sont consignés ici parce que
quatre d'entre eux sont substantiels.

- [FR-034/SC-011] « les caractères qui se confondent à la lecture » n'est pas énuméré, et
  l'alphabet retenu au plan (Crockford) conserve `5`/`S`, `8`/`B`, `2`/`Z` — `SC-011` est faux au
  sens littéral. Même défaut que « terme de développeur » avant son énumération en Légende.
- [FR-005 / contrats] la spec écrit « **Deux réponses seulement** » ; le plan en a une troisième
  (`POST` sans cookie d'appareil → `303`), implémentée par `T25`, testée par `T24`, et gouvernée
  par aucun `FR`.
- [étape n] l'étape attend la réponse `A`, mais **m** laisse le plafond atteint et ne le vide pas —
  par la décision 8, la réponse serait `B`. Le remède est déjà écrit à **m** : reculer `emis_le`.
- [FR-039 / plafond] le plafond ne se déclenche que sur l'adresse autorisée : six soumissions la
  désignent, quelle que soit l'égalité que `FR-039` impose une fois le plafond atteint. `ADR-0006`
  nomme la propriété ; la justification de `FR-039` affirme l'inverse.
- [T25 / I6] aucune tâche n'exige que `connexion.astro` importe le garde, dont `I6 (a)` et
  l'assertion de bilan de `T8` dépendent — atténué, R5 portant déjà `session/cookies.ts`.
- [SC-009] « cinq causes de refus » pour six énumérées. Déjà nommé à la passe 3.
