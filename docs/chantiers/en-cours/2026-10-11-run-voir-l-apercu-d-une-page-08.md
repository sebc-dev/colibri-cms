# Run bloqué — ticket 08, voir l'aperçu d'une page

Portée : 011-apercu-et-publication · ticket 08
Ouvert le 2026-10-11 · branche `impl/voir-l-apercu-d-une-page-08` · HEAD `3856202`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/voir-l-apercu-d-une-page-08`

## Objectif
Faire aboutir le run du ticket 08 (mode `test`) jusqu'à la PR, après correction des deux erreurs du
check `analyse` restées dans les tests neufs du ticket.

## Contexte à charger
à lire      `openspec/changes/011-apercu-et-publication/tickets/08-voir-l-apercu-d-une-page.md` — le ticket
à lire      `openspec/changes/011-apercu-et-publication/` — le change (proposal, specs, design)

## Acquis
- Le run parallèle `wf_3cc85afe-34d` (tickets 07, 08, 12) a mené le 07 à la PR #213 et arrêté le 08
  en `blocked-quality`. Le code et les deux tests neufs sont restés **non commités** dans le worktree
  ci-dessus, conservé : rien n'est perdu. La ceinture était passée avant la quality gate.
- L'implémenteur a débordé la ligne `**Fichiers :**` du ticket, pour trois raisons qu'il a données :
  `src/admin/apercu.css` (feuille externe, un `<style>` en ligne étant refusé), `src/site/page.astro`
  (emplacement nommé `bandeau`, vide sur le site public) et un commentaire de `src/pages/[...slug].astro`.
- Sortie rejouée à la main dans le worktree après le run :

```
tests/integration/apercu-d-une-page.test.ts
  270:30  error  Invalid type "string | undefined" of template literal expression  @typescript-eslint/restrict-template-expressions

tests/static/apercu-statique.test.ts
  14:3  error  Simplify this regular expression to reduce its complexity from 23 to the 20 allowed  sonarjs/regex-complexity

✖ 2 problems (2 errors, 0 warnings)
```

## Prochaine étape
J'allais faire deux retouches de forme, sans retirer aucune assertion : affiner `href` avant la
ligne 270 (`if (href === undefined) throw new Error(…)`), puis remplacer la regex
`TERMES_DEVELOPPEUR` par un tableau de termes testés un à un. Ensuite, reprendre dans la session de
lancement — la copie de l'orchestrateur transmet `rerun` :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-parallel.011.js",
         resumeFromRunId: "wf_3cc85afe-34d",
         args: { changeDir: "openspec/changes/011-apercu-et-publication",
                 implPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.011.js",
                 chains: [{ id: "08", tickets: [{ ticket: "08", rerun: "2" }] }] })
```

Hors de cette session : commiter le travail dans le worktree, puis relancer
`/scd-spec-dev:run 011-apercu-et-publication 08` depuis ce worktree.

## Écarté
- Éteindre les règles par `eslint-disable` : les deux remontées sont fondées, pas des faux positifs.
- Relever le seuil de `sonarjs/regex-complexity` : décision de configuration hors ticket.
