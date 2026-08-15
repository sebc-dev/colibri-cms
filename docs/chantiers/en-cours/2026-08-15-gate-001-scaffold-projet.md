# Gate 001-scaffold-projet — 1 Critical · 0 Major

Portée : 001-scaffold-projet · gate
Ouvert le 2026-08-15 · Actualisé le 2026-08-15 · branche `work/reprise-socle-v2` · HEAD `16d70e7`

## Objectif
Fermer le Critical né de la correction précédente : en réveillant `I3`, le plancher des cinq zones
expose `eslint.config.boundaries.js` — que le lot pose lui-même — au grep littéral d'`arch-invariants`.

## Contexte à charger
à lire  `specs/001-scaffold-projet/plan.md` — § Réutilisation du socle (bullet `src/core/zone.ts`),
  § Étape de vérification (étape 3)
à lire  `specs/001-scaffold-projet/tasks.md` — porte `T11`, `T15`, `T6`
à situer `.github/scripts/arch-invariants.sh` — contrôle `I3` (l. 66-83) : grep de `src/render/…`
  entre guillemets dans tout fichier source hors `src/render/`, exclusion limitée à `src/render/index`

## À corriger
### Critical (1)
- [SC-010 · plan étape 3 · T11] `plan.md` — `eslint.config.boundaries.js` déclare les zones par motif
  de chemin ; le contrôle `I3` le rapporte en violation et `arch-invariants.sh` sort à `1`, ce qui
  falsifie l'étape 3 (« code de sortie nul, aucune violation tolérée »), `SC-010` (`I3` exercé et
  passant) et l'issue de `R2`, dont le mode `inhérent` fait de ce code de sortie toute la preuve.
  **Mesuré le 15/08** sur un dépôt jetable reproduisant le plancher : `'src/render/*'` et
  `'src/render/**'` déclenchent, `'src/render'` et `'render/*'` passent. → Écrire la contrainte au
  plan à côté du bullet `src/core/zone.ts` (aucun fichier hors `src/render/` ne porte la chaîne
  littérale `src/render/` suivie de quelque chose) et la câbler dans `T11`. Phase : `plan`, puis
  répercussion `tasks`

### Minor à corriger dans la même passe (6) — choix humain du 15/08
- [SC-002] `spec.md` — `knip` nommé comme outil → désigner la commande par son rôle. Phase : `specify`
- [FR-019] `spec.md` — deux comportements sous un « ; » → scinder. Phase : `specify`
- [FR-008] `spec.md` — `If…then` là où la présence de `package.json` appelle `When`. Phase : `specify`
- [cas limites] `spec.md` — message du lanceur cité verbatim → le dire sans citer l'outil. Phase : `specify`
- [T15] `tasks.md` — annonce « les trois endroits » et n'en énumère que deux. Phase : `tasks`
- [T6] `tasks.md` — `bloqué par` omet `T11` ; `boundaries` est un job à garde de scaffold, sans sa
  configuration il ne passe pas. Phase : `tasks`

## Prochaine étape
Corriger le Critical par `/scd-sdd:plan 001`, répercuter dans `tasks.md`, puis passer les 6 Minor.
**Committer avant de relancer la gate** — sans commit, la passe suivante retombe en régime intégral.

## Écarté
- Dépassement du signal de scission sur le lot de scaffold — assumé le 15/08, arbitrage rendu une
  première fois le 15/08 sur R1 (15 concepts contre ≈ 7) et **maintenu** après la fusion, qui le
  porte à ~27. Motif : un scaffold n'offre aucun point de coupure où les jobs bloquants soient
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
