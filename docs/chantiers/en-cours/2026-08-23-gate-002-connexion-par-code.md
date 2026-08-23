# Gate 002-connexion-par-code — 4 Critical · 8 Major

Portée : 002-connexion-par-code · gate
Ouvert le 2026-08-23 · Actualisé le 2026-08-23 · branche `main` · HEAD `582135b`

## Objectif
Passer la gate de conformité de 002-connexion-par-code : zéro Critical. Cycle rouvert par le
premortem du 2026-08-23, qui a touché les trois documents après un `PRÊT`.

## Contexte à charger
à lire  `specs/002-connexion-par-code/spec.md` — porte FR-024, FR-025, FR-040, FR-041, FR-045, FR-046, SC-007, SC-008, SC-014, SC-015, la table d'E/S et la Légende
à lire  `specs/002-connexion-par-code/plan.md` — porte les décisions 8 et 14, la l. 562, les étapes **m**, **n**, **o**, **p**, la table de couverture
à lire  `specs/002-connexion-par-code/tasks.md` — porte R5, R7, R11, T17, T21, T25, T40, T41, T46, T63

## À corriger
### Critical (4)
- [FR-040/SC-015] `spec.md` — le `shall` promet une irréversibilité que la décision 14 retire (40 bits, hachage cassable hors ligne) et que `T62` ne teste pas (recherche de chaîne littérale) → écrire la borne dans `FR-040` et `SC-015`, ou l'y assumer. Phase : `specify`
- [FR-045] `spec.md` — quand c'est l'**épreuve du plafond** qui échoue, « la même réponse que si elle avait abouti » est indéterminée : `A` et `B` satisfont également `FR-039` ; `T51` ne teste qu'une écriture en base → borner l'énoncé aux opérations nommées et arrêter la réponse due. Phase : `specify`
- [T25/R5] `tasks.md` — le test exige les verdicts `redemander`/`autre-appareil` (nés en R7/T35) et les quinze minutes (R8/T43) ; ni `verdict.ts` ni `regles.ts` ne sont dans les `Fichiers :` de R5, déclaré `TDD` : le lot ne peut pas fermer au vert → reformuler `T25` sur la durée du cookie d'appareil, ou la déplacer en R7/R8. Phase : `tasks`
- [étape n] `plan.md`+`tasks.md` — **m** se referme sur « le plafond toujours atteint » et **n** attend la réponse `A`, que la décision 8 rend impossible ; `T63` exige pourtant que le script sorte à `0` → vider la fenêtre en tête de **n**, ou déplacer **n** avant **m**. Phase : `plan` puis `tasks`

### Major (8)
- [plan.md:562] `plan.md` — cite `T39` pour le gel du plancher ; `T39` est aujourd'hui l'étape « code », le gel est `T54` (renumérotation du premortem) → `T39` → `T54`. Phase : `plan`
- [R5/expire_le] `tasks.md` — `T21` écrit une ligne dont `expire_le` et `essais_restants` sont `NOT NULL`, mais leurs bornes naissent en R8 et `regles.ts` n'est pas dans les fichiers de R5 : R5 devra recopier ce que le critère (2) de `T58` interdit → ajouter `regles.ts` aux fichiers de R5. Phase : `tasks`
- [FR-046] `plan.md`+`tasks.md` — la mention annonce une durée dont la règle est en R8 ; `T40` porte impl **et** assertion sans test préalable dans un lot `TDD` ; la couverture renvoie à « étape 3 », absente de la séquence `a…r` → nommer l'étape, scinder `T40`, rattacher la règle. Phase : `plan` puis `tasks`
- [R11/mode check] `tasks.md` — la justification de mode nomme « ces **quatre** vérifications » ; le lot en porte cinq depuis que `T65` vérifie `SC-008` → étendre la justification à `SC-008`. Phase : `tasks`
- [FR-041/SC-014] `spec.md` — la table d'E/S impose les en-têtes à **quatre** formes de réponse ; `SC-014` et l'étape **p** (`T17`) n'en tirent que trois, l'écran de connexion n'est jamais observé → ajouter la quatrième forme. Phase : `specify`, puis `plan` et `tasks`
- [SC-008] `plan.md`+`tasks.md` — deux porteurs concurrents : le plan le fait lire dans `src/admin/connexion/`, ce qui exclut l'écran d'accueil ; `T65` en fait une assertion sur les cinq écrans → trancher un porteur unique et corriger le lieu. Phase : `plan` puis `tasks`
- [FR-022/FR-023] `tasks.md` — l'étape **j** est la seule observation sur un cookie de session réel, et `T41`, qui l'écrit, ne porte pas leur backref → ajouter `FR-022`/`FR-023` au backref de `T41`. Phase : `tasks`
- [FR-024/FR-025/SC-007] `spec.md` — les trois énumérations d'écrans (deux, quatre, quatre) oublient l'annonce du plafond, que `T64` et `T65` vérifient → aligner les trois sur les écrans réellement servis. Phase : `specify`

## Prochaine étape
Corriger par `/scd-sdd:specify 002` (FR-040/SC-015, FR-045, FR-041/SC-014, FR-024/FR-025/SC-007),
puis `/scd-sdd:plan 002` (étape **n**, plan.md:562, FR-046, SC-008), puis `/scd-sdd:tasks 002`
(T25/R5, R5/expire_le, R11/mode check, FR-022/FR-023, et les répercussions). Puis **commiter les
corrections en signant** (voir Signalements) et relancer `/scd-sdd:analyze 002`.

## Écarté
- [R1] 8 concepts pour 6 — assumé le 23/08 : l'excédent est de l'outillage (harnais, migration, montée de dépendance), et toute extraction produirait un lot horizontal.
- [R5/R7] ~9 concepts chacun, ~380 et ~360 l. — assumé le 23/08 : les deux lots se relisent d'un bloc plutôt qu'en quatre moitiés.
- [R11] lot de vérification pure, horizontal par la lettre — assumé le 23/08 : trois de ses cinq tâches sont des propriétés « une fois tout écrit » qui ne peuvent naître plus tôt.
- [compteurs de concepts] sous-déclarés (R1 6/8, R5 6/9, R7 6/9, R8 3/5) — assumé le 23/08 : compteurs gardés tels quels, au prix que le signal de scission reste aveugle aux passes suivantes.
- [SC-011] « les caractères qui se confondent à la lecture » non énuméré, Crockford gardant `5`/`S`, `8`/`B`, `2`/`Z` — assumé le 23/08 : le critère reste réfutable par une relecture stricte.
- [FR-039] six soumissions distinguent l'adresse autorisée avant que `FR-039` n'égalise — assumé le 23/08 : résidu d'indiscernabilité conservé, la justification restant en l'état.
- [FR-005] « Deux réponses seulement » alors que le plan en a une troisième (`POST` sans cookie d'appareil → `303`, testée par `T24`) — assumé le 23/08 : comportement laissé hors contrat.
- [SC-009] « cinq causes de refus » pour six énumérées, propagé en `plan.md:191` et `T46` — assumé le 23/08 : une cause de refus sur six restera non vérifiée.

## Signalements hors gate
- **Socle** : `.github/scripts/arch-invariants.sh` rend `I8` par un `grep -nF` en sous-chaîne
  (l. 171), si bien qu'une adresse hébergée sur le domaine d'instance le fait rougir. La décision 9
  du plan **signale** le défaut plutôt que de le contourner ; il rougira chez toute cliente dont la
  boîte est sur son propre domaine. → `/scd-sdd:audit archi`.
- **Outillage** : la gate ne peut pas remplir sa précondition de passe delta — commiter les
  corrections —, `specs-integrity` exigeant un commit **signé** pour `spec.md`, `plan.md` et le
  texte de `tasks.md`. L'humain commite lui-même ; l'ancre `HEAD` d'une fiche est donc fausse d'une
  passe tant que la gate ne commite pas elle-même.
- **Format** : cette fiche dépasse le plafond de ~50 lignes. C'est la taille des findings, jamais
  un défaut de rédaction — une liste de corrections ne se tronque pas.
