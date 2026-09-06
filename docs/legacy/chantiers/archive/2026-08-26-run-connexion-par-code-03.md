# Run bloqué — code vers l'adresse autorisée

Portée : 001-connexion-par-code · ticket 03
Ouvert le 2026-08-26 · Actualisé le 2026-08-26 · branche `impl/connexion-par-code-03` · HEAD `417843c`

Bloqué par : plugin scd-sdd 2.2.0 — registre d'agents désynchronisé du script du workflow (réparation humaine)

## Objectif
Implémenter le ticket 03 (mode `test`) via `/scd-sdd:run 001 03`, jusqu'à la PR.

## Contexte à charger
à lire   `specs/001-connexion-par-code/03-code-vers-adresse-autorisee.md` — le ticket et ses 7 critères
à lire   `specs/001-connexion-par-code/SPEC.md` — hors-périmètre et décisions de test

## Acquis
- Le workflow `implement-ticket` n'a pas rendu de statut : il a **jeté** une exception à la phase
  Review (7e agent). Ce n'est pas un `blocked-*` prévu.
- Cause : le script (2.2.0) appelle `agentType: 'scd-sdd:review-context'` (+ six reviewers par
  dimension), agents **absents** du registre installé, qui ne fournit que l'ancien
  `scd-sdd:code-reviewer`. Mismatch de packaging du plugin, pas un défaut du contrat ni de l'arbre.
- Un `resume` seul ne débloque pas : les 6 agents en cache rejoueraient, puis le même agent
  manquant referait tomber le run. Il faut d'abord réparer l'install du plugin.
- Le travail des 6 phases exécutées est **non commité** dans l'arbre (le crash précède
  `progress-recorder`, phase 8). 10 fichiers, dont 3 tests d'intégration et l'implémentation
  (`src/core/auth/`, `src/platform/auth/`, `src/platform/email/`, migration `0002`, `connexion.astro`,
  `wrangler.jsonc`). Aucune PR ouverte.

## Prochaine étape
Réparer l'install du plugin (agents `review-context` + six reviewers présents au registre), puis
`Workflow(resumeFromRunId: wf_76ff3129-dd5)` — ou relancer `/scd-sdd:run 001 03` sur un arbre remis
au propre. Ne pas commiter le code en vol à la main : `progress-recorder` le fera.

## Écarté
- Éditer le script du workflow dans le cache `.claude/` pour taper `code-reviewer` : patch d'un
  fichier de plugin, écrasé à la mise à jour, et il changerait la garantie (review 6 dimensions →
  1). Refusé aussi à la source (garde `.claude/`).
- Commiter le code en vol moi-même pour le « sauver » : hors de mon rôle, et un `resume` rejoue
  l'implémenteur en cache — l'état de l'arbre doit rester tel quel.

## Sortie d'erreur (non tronquée)
```
Error: agent({agentType}): agent type 'scd-sdd:review-context' not found. Available agents: claude, claude-code-guide, Explore, general-purpose, Plan, scd-sdd:branch-setup, scd-sdd:chantier-reader, scd-sdd:code-reviewer, scd-sdd:fix-applier, scd-sdd:implementer, scd-sdd:pr-author, scd-sdd:pr-describer, scd-sdd:progress-recorder, scd-sdd:rebaser, scd-sdd:relander, scd-sdd:review-validator, scd-sdd:test-validator, scd-sdd:test-writer, scd-sdd:ticket-briefer, scd-sdd:verifier, statusline-setup
    at Q (/$bunfs/root/chunk-g7mg0hyc.js:3373:10891)
    at async <anonymous> (/$bunfs/root/chunk-r3qznhja.js:11:263)
    at async <anonymous> (/$bunfs/root/chunk-g7mg0hyc.js:3373:9656)
    at async <anonymous> (/$bunfs/root/chunk-wxkqeed2.js:248:590)
    at processTicksAndRejections (native:7:39)
```
Run ID `wf_76ff3129-dd5` · transcripts sous `…/subagents/workflows/wf_76ff3129-dd5`.

## Issue
Fermé le 2026-08-29 — **livré**. Le blocage était bien un désync du registre plugin (agents
`review-context` + six reviewers absents) : levé côté humain, les sept agents présents au registre.

- Run relancé sur arbre propre (travail en vol remisé, régénéré par le run) : `wf_641e0d13-229` →
  `done`, mode `test`, 26 tests au vert. Les 7 critères du ticket cochés.
- **PR #35 ready** → `main` (non empilée) : https://github.com/sebc-dev/colibri-cms/pull/35.
  Commit d'implémentation `d534a52`. Diff signalé `oversized` (review en deux passes).
- Retour de review appliqué : `DUREE_DE_VIE_CODE_MS` dérivé de `core/auth/code.ts` au lieu d'être
  redéclaré — commit `7ecfec0` (typecheck + build + tests au vert, tests intacts).

Le `resumeFromRunId` de la prochaine étape n'était pas jouable : *same-session only*, et le run
bloqué appartenait à une autre session. Un run frais l'a remplacé.
