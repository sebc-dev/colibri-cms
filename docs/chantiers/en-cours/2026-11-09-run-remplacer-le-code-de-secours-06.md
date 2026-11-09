# Run bloqué — 016/06, remplacer le code de secours

Portée : 016-moyen-de-reprise · ticket 06
Ouvert le 2026-11-09 · branche `impl/remplacer-le-code-de-secours-06` · HEAD `096a123`

## Objectif
Faire passer le ticket 06 au vert, puis ouvrir sa PR.

## Contexte à charger
à lire      `openspec/changes/016-moyen-de-reprise/tickets/06-remplacer-le-code-de-secours.md` — le ticket et ses critères SC-06a à SC-06g
à lire      `openspec/changes/016-moyen-de-reprise/` — le change (proposal, deltas, design)

## Acquis
- Le run `wf_227ef1c3-d7f` s'est arrêté en `blocked-red` après la phase Green. L'implémentation
  (`src/pages/admin/code-de-secours.astro`, `src/platform/auth/code-de-secours.ts`,
  `src/admin/textes.ts`) et le test neuf `tests/integration/code-de-secours-remplacer.test.ts`
  étaient restés non commités sur la branche.
- Sortie de l'implémenteur, non tronquée :
  `npm test` — « Test Files 1 failed | 176 passed (177); Tests 2 failed | 1374 passed (1376).
  Échecs : SC-06a (ligne 200) et SC-06c (ligne 232) de tests/integration/code-de-secours-remplacer.test.ts.
  Les 7 autres cas du fichier passent, dont les trois SC-06g. »
- Diagnostic de l'implémenteur, que j'ai vérifié en lisant le test : SC-06a et SC-06c sèment la
  session « autre appareil » **avant** de créer le premier code, puis attendent qu'elle soit encore
  ouverte. Or SC-06g exige que la création du code ferme les autres sessions. Les deux tests se
  contredisent : aucun code ne peut satisfaire les deux.

## Prochaine étape
Retouche humaine du test : dans SC-06a et SC-06c, semer la session `autre` après le premier
`creerCode(courante)`, comme le fait déjà « SC-06g — remplacer ». Aucune assertion ne change.
`git add` la retouche, puis reprendre dans la session qui a lancé le run :

    Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.06.js",
             resumeFromRunId: "wf_227ef1c3-d7f",
             args: { changeDir: "openspec/changes/016-moyen-de-reprise", ticket: "06",
                     oldBase: "impl/le-code-ne-sert-qu-une-fois-03", rerun: "2" })

Après un `/clear`, la reprise n'existe plus : commiter la retouche et relancer
`/scd-spec-dev:run 016-moyen-de-reprise 06`.

## Écarté
- Changer le code pour que la création ne ferme pas les autres sessions : SC-06g l'exige, le
  défaut est dans la mise en place de SC-06a et SC-06c, pas dans le comportement.
