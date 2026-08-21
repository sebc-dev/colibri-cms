# Gate 002-connexion-par-code — 3 Critical · 11 Major

Portée : 002-connexion-par-code · gate
Ouvert le 2026-08-21 · Actualisé le 2026-08-21 · branche `main` · HEAD `86d7234`

## Objectif
Passer la gate de conformité de 002-connexion-par-code : zéro Critical.

## Contexte à charger
à lire  `specs/002-connexion-par-code/spec.md` — porte FR-005, FR-009, FR-025, FR-027, FR-033, SC-003
à lire  `specs/002-connexion-par-code/plan.md` — porte les décisions 6, 7, 9 et l'étape de vérification
à lire  `specs/002-connexion-par-code/tasks.md` — porte R1, R8, T1, T6, T7, T34, T37, T39

## À corriger
### Critical (3)
- [FR-033/SC-003] `spec.md` — délai plancher sans cible chiffrée (« ne se distinguent pas », « la marge », « la même bande » : jamais un nombre), et T39 règle le seuil d'après la mesure qu'il juge → chiffrer la tolérance (écart p95 ≤ N ms sur K échantillons), puis dériver le plancher. Phase : `specify` puis `plan`
- [FR-005] `spec.md`+`plan.md` — l'étape 3d exige « identique octet pour octet » quand la décision 6 pose un `Set-Cookie` de demande à la seule émission : assertion infaisable, et le périmètre de « contenu identique » (corps / en-têtes) n'est tranché nulle part → trancher le périmètre, puis rendre 3d cohérent. Phase : `specify` puis `plan`
- [FR-005×FR-009] `spec.md` — l'annonce du plafond distingue l'adresse autorisée ; seul le tableau des contrats dit le contraire, aucun FR ne l'exige et T34 / étape 3m ne soumettent que l'adresse autorisée → créer le FR, ajouter une soumission d'adresse inconnue sous plafond. Phase : `specify` puis `tasks`

### Major (11)
- [FR-036/037/028/030/031/032] `spec.md` — six backrefs vers PRD FR-117, qui est l'interdit de vocabulaire et ne les porte pas → justifier l'écart comme le fait FR-026, ou remonter la création du FR produit. Phase : `specify`
- [FR-027] `spec.md` — l'annulation du code précédent n'est exigée ni par PRD FR-121 ni par ADR-0006 → justifier l'écart ou retirer. Phase : `specify`
- [T6/T7] `tasks.md` — la CSP stricte d'administration est livrée sans aucun FR porteur → créer le FR observable des en-têtes d'administration et y rebrancher. Phase : `specify` puis `tasks`
- [ADR-0006 méc. 1] `spec.md` — « le code est haché en base » n'a ni FR ni vérification → ajouter le FR et la lecture de table après émission. Phase : `specify` puis `tasks`
- [I8/étape 2] `plan.md` — le contrôle I8 cherche les chaînes d'`instance.json` en sous-chaîne dans `wrangler.*` : une `destination_address` sur le domaine d'instance rend `ko I8`, contre le bilan « 0 violation(s) » exigé → instruire le cas. Phase : `plan`
- [FR-010×FR-014] `spec.md` — le cas limite affirme que le dernier code reste utilisable « pendant ce temps » : faux au-delà de 15 min, et masque 45 min d'enfermement sans autre entrée → reformuler et assumer le trou. Phase : `specify`
- [ADR-0013] `plan.md` — mesures sur `0.20.3` alors que l'ADR décide la famille `0.21.x`, cité en « appliquée, jamais re-choisie » sans relever l'écart → nommer l'écart ou l'aligner. Phase : `plan`
- [R1] `tasks.md` — ~420 l., et l'encadré affirme à tort que le seul retrait possible est sorti en R2 (T6/T7 sont disjoints) → scinder R1a « la porte » / R1b « la CSP », ou refaire la justification. Phase : `tasks`
- [R1/T1] `tasks.md` — la migration pose trois tables dont deux qu'aucune tâche du lot n'exerce → scinder par lot consommateur, ou l'assumer explicitement. Phase : `tasks`
- [R8] `tasks.md` — lot de vérification qui rejoue R1→R7 sans comportement livré en propre → rendre b/k à R1, a/c/d/f/n à R3, g/j à R4, h/i à R5, m à R6, e à R7. Phase : `tasks`
- [FR-025] `tasks.md` — R8 le déclare livré, aucune tâche de R8 ne l'implémente → ajouter FR-025 aux backrefs de T8, T18, T25, T31, T35. Phase : `tasks`

## Prochaine étape
Corriger les trois Critical par `/scd-sdd:specify 002` (FR-033/SC-003, périmètre de FR-005, FR
de la réponse « plafond »), puis répercuter en `plan` et `tasks`.

## Écarté
_(aucun arbitrage — l'arbitrage des Major a été décliné à la passe 1 ; ils restent tous à corriger)_
