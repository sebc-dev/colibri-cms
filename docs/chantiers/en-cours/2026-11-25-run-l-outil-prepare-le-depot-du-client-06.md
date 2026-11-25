# Run bloqué — l'outil de livraison prépare le dépôt du client

Portée : 020-deploiement-instance-client · ticket 06
Ouvert le 2026-11-25 · Actualisé le 2026-11-25 · branche `impl/l-outil-prepare-le-depot-du-client-06` · HEAD `b086916`

## Objectif
Mener à sa PR le ticket 06 : le geste `depot` de `scripts/livraison.mjs`, qui prépare le dépôt d'un
client depuis une version du produit.

## Contexte à charger
à lire      `openspec/changes/020-deploiement-instance-client/tickets/06-l-outil-prepare-le-depot-du-client.md` — le contrat du ticket
à lire      `openspec/changes/020-deploiement-instance-client/` (proposal, design, deltas) — le change

## Acquis
- Le run `wf_864ede7a-b28` (mode `test`) s'est arrêté en `blocked-verify`, après huit agents :
  branche, brief, triage, implémentation, écriture et validation des tests, ceinture.
- Le workflow n'a rien commité : le code et les deux tests neufs sont restés dans l'arbre de travail
  de la branche. Ni quality gate, ni review, ni PR n'ont été joués.
- La ceinture a jugé les tests intacts (deux fichiers neufs, aucun retrait, aucun `.skip`). Elle a
  refusé parce que la suite complète a rougi à cause du code de production.
- Sortie d'erreur rendue par le verifier, non tronquée :
  `npm test` : EXIT=1, « Test Files 3 failed | 203 passed (206) ; Tests 28 failed | 1649 passed
  (1677) ». Erreur : `Error: No such module "node:os"` / « [vitest-plugin] "node:os" ... is not
  available at this Worker's compatibility date and flags ». Échecs :
  `tests/unit/controle-d-instance-depot.test.ts` (11), `tests/unit/inventaire-de-livraison.test.ts`
  (15), `tests/unit/controle-d-instance.test.ts` (2). Les trois font
  `await import("../../scripts/livraison.mjs")`, et l'implémentation a ajouté à
  `scripts/livraison.mjs` `import { tmpdir } from 'node:os';` (ligne 9, employé ligne 248 dans
  `mkdtempSync(join(tmpdir(), 'depot-du-client-'))`), module absent de `workerd`.
- Les deux tests du ticket lancés seuls ont passé : 2 fichiers, 21 tests.

## Prochaine étape
J'allais faire corriger par l'humain l'import de `node:os` dans `scripts/livraison.mjs` (le dossier
temporaire reçu de l'enveloppe du script, ou un import dynamique dans le geste `depot` seul), sans
toucher aux tests, puis reprendre **dans la session qui a lancé le run** :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.502340.js",
         resumeFromRunId: "wf_864ede7a-b28",
         args: { changeDir: "openspec/changes/020-deploiement-instance-client", ticket: "06", rerun: "2" })
```

En mode `test`, le jeton `rerun` reprend à la ceinture : les tests écrits restent ceux du run.
Après un `/clear`, cette reprise n'existe plus : commiter l'arbre, puis relancer
`/scd-spec-dev:run 020-deploiement-instance-client 06`.

## Écarté
- Reprise nue, sans jeton `rerun` — le cache aurait resservi le même échec.
- Activer `nodejs_compat` dans la configuration de test pour faire passer `node:os` — hors du
  périmètre du ticket, qui interdit de modifier `vitest.config.ts`.
- Retoucher les trois tests existants qui importent `livraison.mjs` — ils ne sont pas en cause.
