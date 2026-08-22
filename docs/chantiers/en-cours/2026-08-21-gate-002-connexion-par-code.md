# Gate 002-connexion-par-code — 5 Critical · 13 Major

Portée : 002-connexion-par-code · gate
Ouvert le 2026-08-21 · Actualisé le 2026-08-22 · branche `main` · HEAD `659a48a`

## Objectif
Passer la gate de conformité de 002-connexion-par-code : zéro Critical.

## Contexte à charger
à lire  `specs/002-connexion-par-code/spec.md` — porte FR-019/026/029/030/035, SC-001/003/006/012
à lire  `specs/002-connexion-par-code/plan.md` — porte les décisions 8 et 9, `juger()`, l'étape 3e
à lire  `specs/002-connexion-par-code/tasks.md` — porte R1, R4/T22, R6/T32, R10/T52

## À corriger
### Critical (5)
- [SC-003×FR-008] `spec.md` — cent tirs par adresse sont inexécutables sous cinq messages/heure : dès le 6ᵉ, 95 tirs passent par la branche « plafond » sans travail, le p95 devient trivial et la fenêtre est saturée pour 3i/3j/3m → trancher l'interaction, puis l'écrire en artefact de test. Phase : `specify` puis `plan`
- [SC-012] `spec.md` — le rapport se juge contre un travail indéductible d'une mesure `curl` (réponse rendue à `max(plancher, travail)`), et aucun instrument n'est aux fichiers touchés → nommer l'instrument, ou reformuler sur une grandeur observable. Phase : `specify` ou `plan`
- [FR-019/FR-035/SC-006] `spec.md` — « route d'administration » n'est défini nulle part ; `/admin/connexion` est servie sans session et `FR-035` la renvoie à elle-même ; le chemin inconnu contredit `FR-035` → définir le terme en Légende et rédiger l'exception. Phase : `specify`
- [décision 9] `plan.md` — le retrait de `destination_address` déplace la partition des quatre lieux d'`I8` et supprime le garde-fou qu'`ADR-0009` énonce, sans candidat ADR ; le motif est un faux positif d'un contrôle informatif → déposer le candidat, ou remonter le défaut d'`I8`. Phase : `plan` puis `adr`
- [R4/T22] `tasks.md` — l'étape `o` consomme le code extrait à l'étape `f`, qui est en R5 : injouable dans R4, et le critère « le script sort à 0 » y est faux → descendre `o` en R5. Phase : `tasks`

### Major (13)
- [FR-025] `tasks.md`+`plan.md` — six lots livrent du texte sans critère local, et le « porteur unique » est démenti par T53 (deux porteurs) → critère d'acceptation par tâche productrice. Phase : `tasks` puis `plan`
- [FR-025/SC-007] `spec.md` — aucun lexique de « terme de développeur » n'est énuméré : le constat n'est pas falsifiable → énumérer ou référencer une liste. Phase : `specify`
- [juger()] `plan.md` — « aucune ligne vivante » exclut les codes expirés/consommés, donc `FR-031`/`FR-014`/`SC-009` sont inimplémentables → recherche par appareil sans filtre d'état. Phase : `plan`
- [FR-030] `spec.md` — « seul le dernier message reçu » contredit `FR-027`, borné à l'appareil → aligner. Phase : `specify`
- [FR-026] `spec.md` — grave en `shall` permanent ce que le périmètre diffère (`FR-013` du PRD) → borner l'énoncé au lot. Phase : `specify`
- [SC-001] `spec.md` — l'épreuve traverse « la réception réelle du message », exclue : extraire le `.eml` est de l'aide → borner ou renvoyer à une instance livrée. Phase : `specify`
- [run_worker_first] `plan.md` — non instruit alors qu'`ADR-0026` et `ADR-0015` en font dépendre le périmètre gardé et le porteur d'en-têtes → déclarer `/admin/*`, ou mesurer et écrire pourquoi c'est inutile. Phase : `plan`
- [R1] `tasks.md` — la note « budget assumé » est fausse (trois retraits restent) et ~9 concepts sont tenus pour 5 déclarés → refaire la justification ou scinder. Phase : `tasks`
- [R1/T5] `tasks.md` — `ouvrirSession` est implémenté sans appelant ni test dans le lot, son premier appel est en R6 → descendre en R6. Phase : `tasks`
- [R1/T1] `tasks.md` — la note sur la migration à trois tables cite le plan au lieu d'argumenter la reviewability → scinder par lot consommateur (touche le § Contrats du plan), ou écrire le coût. Phase : `tasks` puis `plan`
- [R1/R6 étape k] `tasks.md` — `k` tient sur une session semée que rien ne rebranche sur le cookie de `j` → T34 porte le recâblage. Phase : `tasks`
- [R6/T32] `tasks.md` — « sur tout le parcours » est vérifié avant que R7 et R9 n'ajoutent des écrans → volet parcours-large à R10. Phase : `tasks`
- [étape ℓ] `tasks.md` — l'étape 3ℓ du plan (origine étrangère → 403, défaut injecté gardant `security.checkOrigin`) n'est portée par aucun lot → l'affecter. Phase : `tasks`

## Prochaine étape
Arbitrage de sortie ouvert (budget de deux passes atteint, garde sur la divergence déclenchée :
`Critical + Major` passe de 14 à 18). Recommandation de la passe 2 : **scinder** — l'amas
d'indiscernabilité (`FR-005`, `FR-006`, `FR-007`, `FR-033`, `FR-038`, `FR-039`, `SC-003`,
`SC-012`, `SC-013`) rejoint la feature anti-abus, qui sert le même `SC-021` du PRD et la même
menace ; `002` redevient « l'éditrice entre par un code ». Trois Critical partent avec l'amas.

## Signalements hors gate
- **Socle** : `.github/scripts/arch-invariants.sh` rend `I8` par un `grep -nF` en sous-chaîne
  (l. 171), si bien qu'une adresse hébergée sur le domaine d'instance le fait rougir. C'est le
  **seul** motif du retrait de `destination_address` (Critical `décision 9`) : un contrôle
  informatif défaillant a fait retirer une restriction de sécurité réelle. → `/scd-sdd:audit archi`.
- **Outillage** : la passe delta est **inatteignable sur ce dépôt**. §D39 la conditionne à ce que
  la gate commite les corrections, mais `specs-integrity` exige un commit **signé** pour
  `spec.md`, `plan.md` et le texte de `tasks.md`, et la signature est réservée à l'humain. La
  règle « Non détecté à la passe N » tombe avec elle, faute de savoir quel texte a bougé.
  Toute passe restera **intégrale** tant que `specs/002-connexion-par-code/` n'est pas commité.

## Écarté
_(aucun arbitrage — décliné à la passe 1, sans préférence exprimée à la passe 2 ; les 13 Major restent à corriger)_
