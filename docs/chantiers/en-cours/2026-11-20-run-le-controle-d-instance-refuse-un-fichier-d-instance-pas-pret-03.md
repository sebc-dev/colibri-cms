# Run bloqué — ticket 03 : le contrôle d'instance refuse un fichier d'instance pas prêt

Portée : 020-deploiement-instance-client · ticket 03
Ouvert le 2026-11-20 · branche `impl/le-controle-d-instance-refuse-un-fichier-d-instance-pas-pret-03` · HEAD `3938f4f`

## Objectif
J'allais mener le ticket 03 jusqu'à sa PR par `/scd-spec-dev:run-parallel 02 03` (mode tdd), depuis
`origin/main`, en parallèle du ticket 02 dont les fichiers sont disjoints.

## Contexte à charger
à lire      `openspec/changes/020-deploiement-instance-client/tickets/03-le-controle-d-instance-refuse-un-fichier-d-instance-pas-pret.md` — le contrat du ticket
à lire      `openspec/changes/020-deploiement-instance-client/` (proposal, design, specs) — le change

## Acquis
- Le run `wf_15bb465c-f8d` s'est arrêté en `blocked-quality` sur le ticket 03, à la quality gate,
  avant la review. Le ticket 02 a abouti dans le même run.
- **Tout le travail du ticket 03 est dans le worktree, non commité** — c'est son seul exemplaire :
  `/home/negus/projets/colibri-cms/.git/scd-worktrees/le-controle-d-instance-refuse-un-fichier-d-instance-pas-pret-03`
  - neufs : `src/platform/instance/controle.ts`, `scripts/livraison.mjs`,
    `tests/unit/controle-d-instance.test.ts`.
- La gate avait relevé deux bloquants. Le correcteur a résorbé ce qui touchait le code : le JSDoc de
  `scripts/livraison.mjs` (typecheck, TS2352) et le `delete` de `controle.ts` (analyse). Après ce
  correctif : typecheck à 0 erreur, 20 tests verts sur 20, lint propre.
- Il reste une seule erreur bloquante, du check `analyse`, dans le **test neuf**. Aucun agent du
  cycle n'a le droit d'éditer un test, et le projet ne déclare pas d'`applier`.

```
tests/unit/controle-d-instance.test.ts
  18:45  error  Do not delete dynamically computed property keys  @typescript-eslint/no-dynamic-delete

✖ 1 problem (1 error, 0 warnings)
```

- La ligne en cause, dans l'assistant `texte()` du test : `for (const nom of retirer) delete contenu[nom];`
- Empreinte du test au moment du blocage :
  `ba130f8a108e814a5560a7785d01b480b75bf49682269ea882639e242aa62895`.
- Le constat `knip` (consultatif) ne cite aucun fichier du ticket.

## Prochaine étape
Retouche humaine des lignes 17-18 du test neuf, sans changer ce qu'il vérifie : construire l'objet
filtré au lieu de le muter, par exemple

```ts
const contenu = Object.fromEntries(
  Object.entries({ ...pret, ...surcharge }).filter(([nom]) => !retirer.includes(nom)),
);
```

Puis `git -C <worktree> add tests/unit/controle-d-instance.test.ts`, et reprise dans la session qui a
lancé le run, sur la seule chaîne `03`, avec le jeton `rerun` transmis au ticket (la copie de
`implement-parallel.js` doit porter `rerun: step.rerun`) :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-parallel.4021645.js",
         resumeFromRunId: "wf_15bb465c-f8d",
         args: { changeDir: "openspec/changes/020-deploiement-instance-client",
                 implPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.4021645.js",
                 chains: [ { id: "03", tickets: [ { ticket: "03", rerun: "2" } ] } ] })
```

Après un `/clear`, la reprise n'existe plus : commiter la retouche et le travail du worktree sur la
branche du ticket, puis relancer `/scd-spec-dev:run 03`.

## Écarté
- Un `eslint-disable` sur la ligne : c'est un escape-hatch, que la review d'intégrité bloque.
- Reprise nue sans jeton `rerun` : elle resservirait le même échec depuis le cache.
- Supprimer le worktree : il porte le seul exemplaire du travail.
