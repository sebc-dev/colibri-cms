# Run bloqué — ticket 18, issue de la publication

Portée : 011-apercu-et-publication · ticket 18
Ouvert le 2026-10-13 · branche `impl/issue-de-la-publication-18` · HEAD `124975c`

## Objectif
Livrer le ticket 18 (état de la mise en ligne dans le cadre, relance) par `/scd-spec-dev:run`.

## Contexte à charger
à lire      `openspec/changes/011-apercu-et-publication/tickets/18-issue-de-la-publication.md` — le ticket (critères SC-18a à SC-18h)
à lire      `openspec/changes/011-apercu-et-publication/` — le change (proposal, design, deltas)

## Acquis
- Le run `wf_8381b147-15f` s'est arrêté en `blocked-red` (mode tdd), en phase verte : un seul test
  restait rouge sur 30.
- Le code et les tests du ticket sont restés NON COMMITÉS dans l'arbre de la branche (tests ajoutés
  à l'index par le test-writer, code en modifié ou non suivi). Ne pas les perdre : pas de `stash pop`
  aveugle, pas de `checkout --`.
- Cause établie : le test « SC-18e — la relance est gardée : sans session » envoie un POST sans
  `Origin` ni `Content-Type`. Le contrôle d'origine intégré d'Astro
  (`node_modules/astro/dist/core/app/origin-check.js`) le refuse en 403 avant la route ; le 401
  attendu de la garde de session est inatteignable. Le navigateur, lui, envoie `Origin` sur ce
  `fetch` : la route est atteinte en vrai.
- Rejoué à la main (fichiers restaurés ensuite, empreintes sha256 vérifiées) :
  - en ajoutant `content-type: application/json` à la requête (convention du ticket 15) : vert ;
    garde de session retirée de la route : rouge (`expected 502 to be 401`) — le test garde la session ;
  - en acceptant 401 ou 403 : vert ; garde retirée : toujours vert — le test ne garde plus la session.

Sortie d'erreur du run, non tronquée :
```
 FAIL  tests/integration/issue-de-la-publication.test.ts > SC-18e — la relance est gardée : sans session, rien n’est déposé
AssertionError: expected 403 to be 401 // Object.is equality
- Expected
+ Received
- 401
+ 403
 ❯ tests/integration/issue-de-la-publication.test.ts:252:26
    252|   expect(reponse.status).toBe(401);
```

## Prochaine étape
Faire trancher la correction du test par l'humain, l'appliquer (sans `git add` : les tests sont en
intent-to-add, la ceinture les voit entiers comme ajoutés), puis reprendre — dans la session qui a
lancé le run seulement :
```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.3422051.js",
         resumeFromRunId: "wf_8381b147-15f",
         args: { changeDir: "openspec/changes/011-apercu-et-publication", ticket: "18",
                 oldBase: "impl/confirmer-met-en-ligne-les-brouillons-15", rerun: "2" })
```
Après un `/clear` : commiter code et tests en `wip` sur la branche, puis relancer `/scd-spec-dev:run
011-apercu-et-publication 18` (le run repart du début, écriture des tests comprise).

## Écarté
- Toucher la route ou désactiver `checkOrigin` : le code est juste, c'est la requête du test qui ne
  ressemble pas à celle du navigateur ; `checkOrigin` protège contre les envois intersites.
