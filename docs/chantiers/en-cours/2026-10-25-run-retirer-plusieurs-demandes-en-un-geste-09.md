# Run bloqué : retirer plusieurs demandes en un geste

Portée : 013-reception-et-suivi-des-demandes · ticket 09
Ouvert le 2026-10-25 · Actualisé le 2026-10-25 · branche `impl/retirer-plusieurs-demandes-en-un-geste-09` · HEAD `529c313`

## Objectif
Mener le ticket 09 jusqu'à sa PR après l'arrêt du run `wf_9165ddae-059` en `blocked-verify` (mode `tdd`).

## Contexte à charger
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/tickets/09-retirer-plusieurs-demandes-en-un-geste.md` — le ticket à honorer
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/` — le change (proposal, spec suivi-des-demandes, design, ux)

## Acquis
- Le workflow avait écrit le code et les trois tests neufs du ticket, laissés non commités sur la branche. Le
  verifier avait jugé les cinq critères prouvés, parcours Playwright compris.
- En corrigeant les manques relevés par la validation, le test-writer avait retouché deux tests du ticket 08, hors
  de la ligne **Fichiers :** et sans dérogation déclarée. La ceinture s'était arrêtée là-dessus. Sortie du verifier,
  telle quelle :
  > removedAssertions : tests/unit/demandes/retrait.test.ts (fichier existant, ticket 08, hors de la liste Fichiers du
  > ticket 09) : cas refusé `{ ids: ['d-1', 'd-2'], motif: 'ordinaire' }` retiré du tableau `refuses` ; titre du cas
  > affaibli de « ids vide, à deux ids ou non textuel » en « ids vide ou non textuel » —
  > tests/integration/retrait-d-une-demande.test.ts (fichier existant, ticket 08, hors de la liste Fichiers du ticket
  > 09) : cas `{ ids: [id, autre], motif: 'ordinaire' }` → 400 retiré, ainsi que `const autre = await semerPresente(...)`
  > et `expect((await ligne(db, autre))?.etat).toBe('presente')` ; titre affaibli (« deux ids » retiré).
  > Ce retrait suit le contrat (le ticket 09 dit : « La route du ticket 08 accepte désormais de 1 à 50 identifiants »,
  > et retrait-groupe.test.ts prouve à la place l'acceptation de 1 et 50 et le refus de 0, 51 et d'un id répété). Mais
  > aucune dérogation n'est déclarée au ticket, ces fichiers ne figurent pas dans sa liste Fichiers, et la doctrine dit :
  > au doute, additiveOnly=false. C'est à l'humain d'arbitrer.
- L'humain avait accepté la retouche. Je l'avais commitée seule (`529c313`), en laissant le code en vol non commité.

## Prochaine étape
J'allais reprendre — dans la session du lancement seulement :
`Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.6946.js", resumeFromRunId: "wf_9165ddae-059", args: { changeDir: "openspec/changes/013-reception-et-suivi-des-demandes", ticket: "09", oldBase: "impl/retirer-une-demande-depuis-son-detail-08", rerun: "2" })`
puis vérifier que les deux tests du 08 commités portaient toujours la retouche.
Hors de cette session : commiter le code en vol, puis relancer `/scd-spec-dev:run 013-reception-et-suivi-des-demandes 09`.

## Écarté
- Refuser la retouche : les cas « deux identifiants → 400 » contredisaient le ticket 09 et auraient échoué avec le
  nouveau code.
- Finir à la main : la quality gate et la relecture du workflow n'auraient pas tourné.
