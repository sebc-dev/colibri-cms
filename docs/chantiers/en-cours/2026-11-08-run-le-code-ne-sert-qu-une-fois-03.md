# Run du ticket 016/03 bloqué en `blocked-red`

Portée : 016-moyen-de-reprise · ticket 03
Ouvert le 2026-11-08 · branche `impl/le-code-ne-sert-qu-une-fois-03` (empilée sur `impl/entrer-par-le-code-de-secours-02`) · HEAD `9152f87`

## Objectif
Faire passer le ticket 03 (le code de secours ne sert qu'une fois) jusqu'à sa PR.

## Contexte à charger
à lire      `openspec/changes/016-moyen-de-reprise/tickets/03-le-code-ne-sert-qu-une-fois.md` — le ticket, § « L'écran de réponse »
à lire      `openspec/changes/016-moyen-de-reprise/design.md` § D6 — « la réponse rend directement l'écran du nouveau code (pas de redirection) »

## Acquis
- Le workflow `wf_b2cadced-488` a écrit le test neuf `tests/integration/code-de-secours-usage-unique.test.ts`
  (rouge comme attendu), puis le code : `src/platform/auth/code-de-secours.ts`,
  `src/pages/admin/reprise.astro`, `src/admin/NouveauCodeDeSecours.astro`, `src/admin/textes.ts`,
  `docs/cahier-de-test.md`. Ce travail est resté **non commité** dans l'arbre de la branche.
- Le run s'est arrêté au vert : l'implémenteur a constaté que le test neuf passait, mais que
  12 cas de `tests/integration/code-de-secours-entrer.test.ts` (ticket 02) échouaient.
  Sortie rendue : `AssertionError: expected [301,302,303,307,308] to include 200`.
- Cause relevée : l'assistant `ouvre()` de ce test (ligne 136) exige une redirection après le POST
  de `/admin/reprise`. Le design (D6) et le ticket 03 remplacent cette redirection par une réponse 200
  qui affiche le nouveau code et pose le cookie. Le test du ticket 02 figeait un comportement que
  le ticket 03 était prévu pour changer.
- Seul un humain a le droit de retoucher ce test.

## Prochaine étape
1. Retouche humaine de la ligne 136 : `expect(reponse.status).toBe(200);` (le cookie et l'accès à
   `/admin/mes-pages` restent vérifiés juste après). Les lignes 288 et 304 visent la garde, pas la
   reprise : elles ne changent pas.
2. Commiter cette retouche seule : `git commit -- tests/integration/code-de-secours-entrer.test.ts`.
3. Reprise, dans la session qui a lancé le run seulement :
   `Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.1336534.js", resumeFromRunId: "wf_b2cadced-488", args: { changeDir: "openspec/changes/016-moyen-de-reprise", ticket: "03", base: "impl/entrer-par-le-code-de-secours-02", oldBase: "impl/entrer-par-le-code-de-secours-02", rerun: "2" })`
   Dans une autre session : commiter l'arbre puis relancer `/scd-spec-dev:run 016-moyen-de-reprise 03`.

## Écarté
- Changer D6 pour garder la redirection : le code entrerait alors dans une adresse, ce que le design
  refuse explicitement.
