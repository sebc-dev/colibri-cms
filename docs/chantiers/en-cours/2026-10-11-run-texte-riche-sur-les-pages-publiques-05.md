# Run bloqué — ticket 05, texte riche sur les pages publiques

Portée : 011-apercu-et-publication · ticket 05
Ouvert le 2026-10-11 · branche `impl/texte-riche-sur-les-pages-publiques-05` · HEAD `d672531`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/texte-riche-sur-les-pages-publiques-05`

## Objectif
Faire aboutir le run du ticket 05 (mode `tdd`) jusqu'à la PR, après correction des deux erreurs du
check `analyse` restées dans le test neuf `tests/unit/rendu/texte-riche.test.ts`.

## Contexte à charger
à lire      `openspec/changes/011-apercu-et-publication/tickets/05-texte-riche-sur-les-pages-publiques.md` — le ticket
à lire      `openspec/changes/011-apercu-et-publication/` — le change (proposal, specs, design)

## Acquis
- Le run parallèle `wf_56527fa6-1a7` (tickets 03, 05, 10, 13→14) a arrêté le 05 en `blocked-quality`.
  Le code et les tests neufs sont restés **non commités** dans le worktree ci-dessus, conservé : rien
  n'est perdu. La ceinture était passée avant la quality gate.
- L'implémenteur a débordé la ligne `**Fichiers :**` du ticket : `src/site/page.astro`, et la fixture
  du site jetable (`page.json` complété d'un emplacement `presentation`, plus `presentation.md`).
- Les deux erreurs viennent de l'ordre TDD : le helper `documentDe` a été écrit avant le type
  `TexteRicheRendu`. Une fois ce type en place, la garde `?.` et le `as NoeudDocument` sont morts.
  Aucun agent du run n'a le droit de retoucher un test après l'implémentation.
- Sortie rejouée à la main dans le worktree après le run :

```
tests/unit/rendu/texte-riche.test.ts
  29:18  error  Unnecessary optional chain on a non-nullish value                                  @typescript-eslint/no-unnecessary-condition
  32:10  error  This assertion is unnecessary since it does not change the type of the expression  @typescript-eslint/no-unnecessary-type-assertion

✖ 2 problems (2 errors, 0 warnings)
```

- Le triage d'escalade a noté, pour la review sécurité : `lienDeTexteRicheAutorise`
  (`src/core/pages/texte-riche.ts`) accepte `//hôte-externe` comme lien relatif.

## Prochaine étape
J'allais réécrire `documentDe` (lignes 28-32) sans retirer aucune assertion :
`const emplacement = composee.emplacements.at(0);`, puis
`if (emplacement?.nature !== 'texte-riche') throw …`, puis `return emplacement.document;` sans `as`
ni test `'document' in`. Ensuite, reprendre dans la session de lancement, après avoir ajouté
`rerun: step.rerun` aux arguments passés à `implement-ticket` dans la copie de l'orchestrateur :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-parallel.4177859.js",
         resumeFromRunId: "wf_56527fa6-1a7",
         args: { changeDir: "openspec/changes/011-apercu-et-publication",
                 implPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.4177859.js",
                 chains: [{ id: "05", tickets: [{ ticket: "05", rerun: "2" }] }] })
```

Hors de cette session : commiter le travail dans le worktree, puis relancer
`/scd-spec-dev:run 011-apercu-et-publication 05` depuis ce worktree.

## Écarté
- `eslint-disable` : les deux remontées sont fondées, pas des faux positifs.
- Rendre `document` optionnel dans le type de production pour taire la règle : le type mentirait.
- `eslint --fix` seul : il ne corrige que l'assertion, pas la garde `?.`.
- Le constat knip (avis) : faux positifs du worktree sans `node_modules/.bin`, antérieurs au ticket.
