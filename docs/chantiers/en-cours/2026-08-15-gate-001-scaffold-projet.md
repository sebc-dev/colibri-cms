# Gate 001-scaffold-projet — 1 Critical · 0 Major

Portée : 001-scaffold-projet · gate
Ouvert le 2026-08-15 · Actualisé le 2026-08-15 · branche `work/reprise-socle-v2` · HEAD `7de5f7b`

## Objectif
Aligner la spec et le plan sur l'état que `arch-invariants.sh` calcule réellement pour `I3` et
`I4` : le squelette des cinq zones les fait sortir de « hors portée ».

## Contexte à charger
à lire  `specs/001-scaffold-projet/spec.md` — porte US2·3, FR-009, SC-010, § NON inclus
à lire  `specs/001-scaffold-projet/plan.md` — § Réutilisation du socle, § Étape de vérification
à situer `.github/scripts/arch-invariants.sh` — gardes `exists 'src/render/*'` (l.68) et
  `exists 'src/admin/*'` (l.92) ; `exists()` teste `git ls-files` (l.37)

## À corriger
### Critical (1)
- [US2·3 · FR-009] `spec.md` — `US2` scénario 3 exige que « les autres invariants » restent hors
  portée, quand `FR-009` fait poser un fichier versionné dans les cinq zones : les gardes du script
  sortent alors `I3` (`src/render/*`) et `I4` (`src/admin/*`) de « hors portée ». Les deux `SHALL`
  ne peuvent pas être vrais ensemble, et le script sort à 0 — rien n'attrape l'écart. → Réécrire le
  partage en **7 exercés / 3 hors portée** (`I6`, `I7`, `I9`) dans les quatre passages solidaires :
  `spec.md` US2·3, § NON inclus (bullet 2), `SC-010` ; `plan.md` § Réutilisation du socle et
  étape 3. Rien de ce qui est construit ne change. Phase : `specify`, puis répercussion `plan`
- [rattaché] `docs/ci.md` affecte `I1` **et** `I3` au job `boundaries` ; ce lot n'y pose que `I1`
  (`T11`). Cohérent, mais aucun document ne dit que la case reste partiellement `[à compléter]` —
  à écrire dans la même reprise, puisqu'elle rouvre l'histoire d'`I3`. Phase : `specify`

### Minor restés en conversation (7)
Non portés ici, par contrat. Ils sont dans le rapport de la passe du 15/08 : le § Résumé qui dit
inexistantes des commandes et sans outil des invariants que `arch-invariants.sh` vérifie déjà ; le
décompte « huit commandes normatives » (`ci.md` en marque sept) et ses deux listes divergentes ;
« knip » comme nom d'outil (SC-002) ; l'atomicité de FR-019 ; le pattern `If…then` de FR-008 ; le
message du lanceur de tests cité en spec ; `T1` et `T29` non marquées `[P]`.

## Prochaine étape
Corriger le Critical par `/scd-sdd:specify 001`, puis répercuter dans `plan.md`. **Committer la
correction avant de relancer la gate** : `tasks.md` a été jugé non commité cette passe, ce qui a
forcé le régime intégral ; sans commit, la passe suivante le forcera encore.

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
- Ne pas poser `src/render/zone.ts` ni `src/admin/zone.ts` pour garder vrai le « cinq hors
  portée » — écarté le 15/08 : ça violerait `FR-009` et remettrait six contrôles sur dix en
  « HORS PORTÉE », ce que l'encadré de la spec (« pourquoi pas un `.gitkeep` ») refuse
  explicitement. C'est le texte qui est faux, pas le squelette.
