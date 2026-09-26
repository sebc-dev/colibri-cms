# Run bloqué — la connexion habillée

Portée : 005-mise-en-page-administration · ticket 06
Ouvert le 2026-09-26 · branche `impl/connexion-habillee-06` (worktree, aucun commit) · HEAD `48c4d92`

## Objectif
Habiller `/admin/connexion` en carte Colibri sans changer aucun texte ni comportement. Le ticket a été
lancé en `run-parallel` avec le ticket 03 (run `wf_53c77c9b-c69`).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/06-connexion-habillee.md` — le ticket
à lire      `openspec/changes/005-mise-en-page-administration/proposal.md` — le change
à situer    `.git/scd-worktrees/connexion-habillee-06/` — le SEUL exemplaire du travail (non commité)

## Acquis
- Le run s'est arrêté en `blocked-verify`, pour une raison de mode de vérif et non de code. La ceinture
  est propre (test neuf additif) et SC-06a à SC-06e ont des tests nommés et verts. En revanche, le
  test-validator a classé bloquants SC-06f (aucun défilement à 360 px), SC-06g (zone de toucher
  44 × 44 px) et SC-06h (contraste 4,5:1), faute de test nommé.
- Aucun de ces trois critères n'est observable par HTTP dans workerd, et le BRIEF le signalait déjà.
  Le validateur a lui-même demandé un arbitrage humain pour les faire passer en preuve observée
  (navigateur + vrai téléphone). C'est le même cas que la mémoire « blocked-verify spurious sur
  humanCheck ».
- Suggestions non bloquantes du validateur : SC-06e ne vérifie ni le fond neutre chaud ni Instrument
  Sans, et SC-06b n'exerce que le chemin « adresse inconnue » du plafond.

## Prochaine étape
Arbitrer SC-06f, g et h en preuve observée : à 360 px dans Chromium sur l'artefact bâti, mesure des
cibles et des contrastes, puis confirmation sur un vrai téléphone. Commiter ensuite le travail du
worktree et ouvrir la PR à la main, en laissant ouvertes les cases qui restent à constater.

## Écarté
- Des tests qui vérifient seulement la présence de classes (`max-md:min-h-11`, `max-w-[400px]`) pour
  SC-06f, g et h : ce seraient des tautologies, et le validateur les a refusés d'avance.
