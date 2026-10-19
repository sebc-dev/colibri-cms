# Run bloqué : noter la suite d'une demande

Portée : 013-reception-et-suivi-des-demandes · ticket 07
Ouvert le 2026-10-19 · Actualisé le 2026-10-19 · branche `impl/noter-la-suite-d-une-demande-07` · HEAD `4fef939`

## Objectif
Mener le ticket 07 jusqu'à sa PR après l'arrêt du run `wf_4a7f86ec-c57` en `blocked-verify` (mode `tdd`).

## Contexte à charger
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/tickets/07-noter-la-suite-d-une-demande.md` — le ticket à honorer
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/` — le change (proposal, spec suivi-des-demandes, design)

## Acquis
- Le workflow avait écrit le code et les deux tests neufs du ticket (`tests/integration/suite-d-une-demande.test.ts`,
  `tests/parcours/demandes-suite.parcours.ts`), laissés non commités sur la branche. La ceinture les avait
  trouvés strictement additifs, et `npm test` était vert.
- L'implémenteur avait porté la liste déroulante dans un îlot partagé, `src/admin/ilots-svelte-5/ChoixSuite.svelte`
  (monté par `src/admin/MontageChoixSuite.astro`), au lieu des écrans `EcranDemandes.svelte` / `EcranDemande.svelte`
  que nommait la ligne **Fichiers :** du ticket.
- La ceinture s'était arrêtée sur SC-07c, côté écran, après une passe d'auto-correction en observé sans effet.
  Sortie du verifier, telle quelle :
  > Cote serveur, prouve : avec un trigger raise(abort) la reponse est 500 {ok:false}, sans 'panne/abort/sqlite/d1_error/stack',
  > et la demande garde 'devis-envoye'. TEXTE_SUITE_NON_ENREGISTREE est bien "La suite n'a pas pu etre enregistree. Reessayez
  > dans quelques instants.", sans terme de developpeur. Cote ecran, INFIRME : le parcours du ticket
  > tests/parcours/demandes-suite.parcours.ts echoue sur 2 passes sur 2 (le message n'est jamais visible). Dans le snapshot
  > ARIA, la liste est revenue a 'Devis envoye' mais le paragraphe sous la ligne est vide. Observation directe dans chromium
  > avec la reponse /suite forcee en 500 : 'PAGEERROR: Cannot set properties of null (setting 'value')', paragraphe
  > aria-live = "". Cause dans src/admin/ilots-svelte-5/ChoixSuite.svelte, bloc catch de choisir() :
  > `(evenement.currentTarget as HTMLSelectElement).value = avant;` est execute apres un await, quand currentTarget vaut
  > null. La ligne leve une erreur, donc `echec = true` ne s'execute jamais. `suite = avant`, place juste avant, fait bien
  > revenir la liste. L'ecran ne dit donc pas que la suite n'a pas pu etre enregistree. C'est un defaut constate, pas un
  > critere inobservable : correction a faire par le fix-applier, puis rejeu du parcours.
  > Parcours : `expect(getByText("La suite n'a pas pu etre enregistree...")).toBeVisible()` -> element(s) not found.
- Le parcours Playwright n'entrait pas dans `npm test` : seul le verifier l'avait joué.

## Prochaine étape
J'allais faire corriger `choisir()` dans `ChoixSuite.svelte` (lire la liste déroulante avant l'`await`, ou ne
s'appuyer que sur `suite = avant`), sans toucher aux tests, puis reprendre — dans la session du lancement seulement :
`Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.1367136.js", resumeFromRunId: "wf_4a7f86ec-c57", args: { changeDir: "openspec/changes/013-reception-et-suivi-des-demandes", ticket: "07", oldBase: "impl/le-detail-d-une-demande-06", rerun: "2" })`
puis vérifier que le verifier avait rejoué le parcours `demandes-suite`.
Hors de cette session : commiter la correction, puis relancer `/scd-spec-dev:run 013-reception-et-suivi-des-demandes 07`.

## Écarté
- Reprise nue sans correction : elle aurait resservi le même échec depuis le cache.
- Retoucher le parcours : le test décrivait bien le critère, le défaut était dans le code.
