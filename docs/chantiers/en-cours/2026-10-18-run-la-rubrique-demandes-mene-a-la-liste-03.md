# Run bloqué — 03, la rubrique « Demandes » mène à la liste des demandes

Portée : 013-reception-et-suivi-des-demandes · ticket 03
Ouvert le 2026-10-18 · Actualisé le 2026-10-18 · branche `impl/la-rubrique-demandes-mene-a-la-liste-03` · HEAD `dce7d4a`

## Objectif
Faire aboutir le ticket 03 jusqu'à la PR, une fois retirée la seule erreur d'analyse, logée dans le
test neuf du ticket.

## Contexte à charger
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/tickets/03-la-rubrique-demandes-mene-a-la-liste.md` — le ticket à honorer
à lire      `openspec/changes/013-reception-et-suivi-des-demandes/` — le change (proposal, delta, design)

## Acquis
- Le run `wf_8fe3a244-ebc` (mode `tdd`) s'est arrêté en `blocked-quality`, après la ceinture et avant
  la review. Les tests et le code ont été laissés non commités sur la branche du ticket.
- La seule erreur, telle que rendue par la gate (check `analyse`, bloquant) :

```
tests/integration/liste-des-demandes.test.ts:144
144:79 error Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined @typescript-eslint/no-unnecessary-condition
```

- L'agent `quality-analyse` a rendu `applicable: false` : aucun agent n'a le droit de toucher un test.
  Son diagnostic : `noUncheckedIndexedAccess` n'est pas activé, `m[1]` est typé `string`, et le groupe
  `([\s\S]*?)` participe à chaque correspondance ; le `?? ''` de `menus()` est une garde morte.
  Le retirer ne change pas le comportement. Le code de production ne remonte rien.
- Copie du workflow qui a lancé le run : `.git/implement-ticket.1571959.js`.

## Prochaine étape
Dans la session qui a lancé le run : retirer le seul `?? ''` de la ligne 144, rejouer
`npx eslint --config eslint.config.analyse.js tests/integration/liste-des-demandes.test.ts` et
`npx vitest run tests/integration/liste-des-demandes.test.ts`, `git add` le test, puis reprendre :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.1571959.js", resumeFromRunId: "wf_8fe3a244-ebc", args: { changeDir: "openspec/changes/013-reception-et-suivi-des-demandes", ticket: "03", oldBase: "impl/chaque-demande-acceptee-est-gardee-01", rerun: "2" })
```

Après le run, vérifier que le test commité porte la retouche. Hors de cette session, la reprise
n'existe plus : commiter le test retouché et le code, puis relancer `/scd-spec-dev:run`.

## Écarté
- Reprise nue, sans jeton `rerun` : elle resservirait la même erreur depuis le cache.
- Relancer le run depuis le début : il réécrirait les tests et l'implémentation pour une seule
  ligne, au prix de plus d'une heure de run.
