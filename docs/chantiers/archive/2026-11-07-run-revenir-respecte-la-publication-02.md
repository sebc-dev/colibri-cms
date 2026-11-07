# Run bloqué : revenir respecte la publication

Portée : 015-restauration · ticket 02
Ouvert le 2026-11-07 · branche `impl/revenir-respecte-la-publication-02` · HEAD `c35f0eb`

## Objectif
J'allais livrer le ticket 02 par `/scd-spec-dev:run`. Le run `wf_cfb8797d-267` s'est arrêté en
`blocked-quality`, avant la review et sans PR.

## Contexte à charger
à lire      `openspec/changes/015-restauration/tickets/02-revenir-respecte-la-publication.md` — le contrat du ticket
à lire      `openspec/changes/015-restauration/` — le change, proposal, design et specs

## Acquis
- Le workflow avait laissé son code et ses tests non commités sur la branche : le travail n'était pas perdu.
- La gate avait rendu un seul échec bloquant, localisé dans un test neuf, qu'aucun agent n'a le droit de corriger :

```
checkId: analyse · severity: blocking · measured: 1 error · threshold: exit 0
location: tests/integration/revenir-et-publication.test.ts:216
216:77 error Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically  sonarjs/no-alphabetical-sort (ligne: expect(elements(section(...,'data-recap-pages')).sort()).toEqual(['Accueil','Tarifs']))
```

- Elle avait aussi rendu un avis non bloquant :

```
checkId: dup · severity: advisory · measured: 2 new clones · threshold: 0 new clones vs origin/main
Found 34 clones (2 new). ERROR: jscpd found 2 new clones not in the baseline (allowed: 0)
```

## Prochaine étape
Corriger la seule ligne 216 du test, sans changer l'assertion : `.sort((a, b) => a.localeCompare(b))`.
Puis `git add` ce test, pour que le rejeu ne l'annule pas, et reprendre dans la session qui a lancé le run :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.3335008.js", resumeFromRunId: "wf_cfb8797d-267", args: { changeDir: "openspec/changes/015-restauration", ticket: "02", oldBase: "impl/une-page-revient-a-sa-version-publiee-01", rerun: "2" })
```

Hors de cette session, la reprise n'existait plus : relancer `/scd-spec-dev:run 015-restauration 02`,
après avoir commité le travail en vol.

## Écarté
- Reprise nue : elle aurait resservi le même échec depuis le cache.
- Désactiver la règle dans le test : un escape-hatch, sans raison ici.

## Issue
Reprise jouée le 2026-11-07 : la ligne 216 du test a été corrigée, puis le run a repris avec `rerun: "2"` et a ouvert sa PR.
