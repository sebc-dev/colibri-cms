# Gate 001-scaffold-projet — 3 Major

Portée : 001-scaffold-projet · gate
Ouvert le 2026-08-15 · Actualisé le 2026-08-15 · branche `work/reprise-socle-v2` · HEAD `b10386b`

## Objectif
Passer la gate de conformité : zéro Critical. Atteint à la passe 2. Restent trois Major, nés des
corrections de cette passe — aucun ne bloque le démarrage de l'implémentation.

## Contexte à charger
à lire   `specs/001-scaffold-projet/plan.md` — étape 3 de la vérification bout-en-bout (le bilan
  annoncé), § Fichiers touchés
à lire   `specs/001-scaffold-projet/tasks.md` — porte `R2`, `T42`, et les tâches `T4`, `T14`, `T29`
à situer `.github/scripts/arch-invariants.sh` l. 66-88 — `I3` émet **deux** `ok` (`I3 (a)` et
  `I3 (b)`) quand `src/render/` existe ; un seul `hors` sinon. C'est cette asymétrie qui décide du
  premier point

## À corriger
### Major (3)
- [plan étape 3 · T10] `plan.md`, `tasks.md` — « le bilan lira `8 au vert · 4 hors portée` » est
  faux : sur l'arbre livré il lira **9 au vert** (`I2`, `I3 (a)`, `I3 (b)`, `I4`, `I5`, `I8`,
  `I10`, `ADR-0015 (a)`, `ADR-0024`) → corriger le chiffre aux deux endroits. Phase : `plan`, puis `tasks`
- [R2] `tasks.md` — le lot déclare `inhérent` avec pour preuve « le script rejoué de bout en bout »,
  et aucune tâche ne porte ce rejeu ; `R1` a `T42`, `R2` n'a pas d'équivalent → ajouter une tâche de
  clôture (rejeu complet sur l'arbre augmenté, code de sortie nul), bloquée par `T36`. Phase : `tasks`
- [T42] `tasks.md` — `bloqué par` omet `T4` (étape 1), `T29` (étape 3) et `T14` (étape 4), dont les
  assertions vivent dans les étapes qu'elle assemble → compléter la liste. Phase : `tasks`

## Prochaine étape
Les trois se corrigent par `/scd-sdd:tasks 001` (les deux derniers) et `/scd-sdd:plan 001` (le
chiffre du bilan, à répercuter ensuite dans `T10`). Puis relancer la gate, qui les appariera.

## Issue
Les **3 Critical** et les **10 Major** de la passe 1 sont corrigés, en **une passe** : `R2` extrait
de `R1` (tranche du serveur local), `FR-021`/`SC-007`/`T33` alignés sur la mesure du plan (le moteur
pose ses propres tables), `T6` borné aux jobs d'intégration ; côté Major, l'ancien lot de
vérification dissous et le script réparti dans les tâches qu'il constate, `docs/preuves/` ouvert,
le plafond TypeScript déposé en candidat ADR, `SC-002` ramené à six commandes, `FR-019`, `FR-002`
et `SC-008` requalifiés, `docs/ci.md` passé à quatre gestes. Commits `10b3741`, `7e789a1`, `6a7700c`.

## Écarté
- Dépassement du signal de scission sur le lot de scaffold — assumé le 15/08, maintenu à la passe 2.
  Chiffres du jour : ~570 lignes / 26 concepts, le lot ayant absorbé les étapes 1 à 5 du script.
  Motif re-vérifié dans `.github/workflows/ci.yml` (l. 54, 107, 133, 602, 633) : les jobs bloquants
  gatent sur `-f package.json`, une coupure après le manifeste produit une PR non mergeable.
- Rapatrier seulement `astro.config.ts` et `wrangler.jsonc` dans R1 — écarté le 15/08 au profit de
  la fusion complète : ça vidait R2 sans fermer la question pour R3.
- Assumer la fenêtre rouge et la documenter — écarté le 15/08 : sous protection de branche, une PR
  dont un job bloquant est rouge ne se merge pas.
- Ne pas poser `src/render/zone.ts` ni `src/admin/zone.ts` — écarté le 15/08 : ça violerait
  `FR-009` et remettrait six contrôles sur dix en « hors portée ».
