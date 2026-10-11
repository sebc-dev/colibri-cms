# Run bloqué — ticket 12, déposer le contenu publié

Portée : 011-apercu-et-publication · ticket 12
Ouvert le 2026-10-11 · branche `impl/deposer-le-contenu-publie-12` · HEAD `3856202`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/deposer-le-contenu-publie-12`

## Objectif
Faire aboutir le run du ticket 12 (mode `tdd`) jusqu'à la PR, après correction des onze erreurs du
check `analyse` : une dans le code de production, dix dans les tests neufs du ticket.

## Contexte à charger
à lire      `openspec/changes/011-apercu-et-publication/tickets/12-deposer-le-contenu-publie.md` — le ticket
à lire      `openspec/changes/011-apercu-et-publication/` — le change (proposal, specs, design)

## Acquis
- Le run parallèle `wf_3cc85afe-34d` (tickets 07, 08, 12) a arrêté le 12 en `blocked-quality`. Le
  code et les tests sont restés **non commités** dans le worktree ci-dessus, conservé : rien n'est
  perdu. La ceinture était passée avant la quality gate.
- Le conseiller `quality-analyse` a proposé, pour `depot.ts`, de sortir le corps de la boucle de
  `deposerContenu` dans une fonction locale `tenterUneFois(…): Promise<ResultatDepot | 'rejouer'>`.
  Il l'a mesuré sur une copie : 16 tombe à 7 et 4, sans changer le comportement.
- Il a noté que le comparateur de `forge-en-memoire.ts:263` compare unité par unité exprès : l'ordre
  doit rester binaire, jamais `localeCompare`.
- Sortie rejouée à la main dans le worktree après le run :

```
src/core/publication/depot.ts
  19:23   error  Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed  sonarjs/cognitive-complexity
tests/unit/publication/depot-contenu.test.ts
  159:5   error  Prefer "expect(forge.appels).toHaveLength(appelsAvant)" over this generic assertion […]  sonarjs/prefer-specific-assertions
  197:19, 197:49, 198:22, 199:18  error  Unnecessary optional chain on a non-nullish value  @typescript-eslint/no-unnecessary-condition
tests/unit/publication/forge-en-memoire.ts
  263:76  error  Extract this nested ternary operation into an independent statement  sonarjs/no-nested-conditional
tests/unit/publication/plan.test.ts
  139:40, 140:75  error  Provide a compare function that depends on "String.localeCompare" […]  sonarjs/no-alphabetical-sort
tests/unit/publication/prefixes.test.ts
  14:47, 21:9  error  Provide a compare function that depends on "String.localeCompare" […]  sonarjs/no-alphabetical-sort
✖ 11 problems (11 errors, 0 warnings)
```

## Prochaine étape
J'allais extraire `tenterUneFois` dans `depot.ts`, puis retoucher les tests sans retirer aucune
assertion : `toHaveLength(3)` avant la déstructuration des lignes 197-199 puis retrait des `?.`,
`toHaveLength(appelsAvant)` ligne 159, le comparateur binaire écrit en `if` dans une fonction, un
comparateur explicite sur les quatre `.sort()`. Ensuite, reprise dans la session de lancement avec
la commande de la fiche du ticket 08, en remplaçant la chaîne par
`{ id: "12", tickets: [{ ticket: "12", rerun: "2" }] }`.

Hors de cette session : commiter le travail dans le worktree, puis relancer
`/scd-spec-dev:run 011-apercu-et-publication 12` depuis ce worktree.

## Écarté
- Éteindre les règles par `eslint-disable`.
- Couper `sonarjs/no-alphabetical-sort` dans `eslint.config.analyse.js` alors qu'elle mord ici sur
  des tests corrects (les deux côtés sont triés pareil) : décision de configuration hors ticket.
- `localeCompare` dans le double `forge-en-memoire.ts` : il casserait l'ordre binaire voulu.

## Issue
Retouches faites le 2026-10-11 : `tenterUneFois` extrait de `depot.ts`, et retouches de forme des quatre
fichiers de test, aucune assertion retirée. Un `prettier --write` avait reformaté ces fichiers en entier :
j'ai reconstitué les originaux en rejouant les écritures des agents (empreintes identiques à celles de la
quality gate), puis refait les retouches. Reprise avec `rerun: "2"` : le run a abouti à la PR #214. La
review a retenu des tests que le correcteur n'a pas le droit d'écrire : les réglages
(`architecture-F-1`), l'`injoignable` rejoué au déplacement (`error-handling-F-1`) et la priorité du
brouillon (`coverage-F-3`). Ils restent à ajouter.
