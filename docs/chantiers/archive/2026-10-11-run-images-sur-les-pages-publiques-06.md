# Run bloqué — ticket 06, images sur les pages publiques

Portée : 011-apercu-et-publication · ticket 06
Ouvert le 2026-10-11 · branche `impl/images-sur-les-pages-publiques-06` · HEAD `f8090a5`
Worktree : `/home/negus/projets/colibri-cms/.git/scd-worktrees/images-sur-les-pages-publiques-06`
Bloqué par : arbitrage humain — l'aperçu reçoit-il les images publiées dès le ticket 06 ?

## Objectif
Faire aboutir le run du ticket 06 (mode `test`) jusqu'à la PR sans casser SC-08b (l'aperçu a le même
contenu que la page publique), puis laisser partir le ticket 09 empilé derrière.

## Contexte à charger
à lire      `openspec/changes/011-apercu-et-publication/tickets/06-images-sur-les-pages-publiques.md` — le ticket
à lire      `openspec/changes/011-apercu-et-publication/tickets/09-l-apercu-montre-les-brouillons.md` § Décisions — l'image dans l'aperçu
à lire      `openspec/changes/011-apercu-et-publication/` — le change (proposal, specs, design)

## Acquis
- Le run parallèle `wf_4ca90c1a-225` (tickets 06, 09, 11, 15) a arrêté le 06 en `blocked-verify` ; le
  09, empilé derrière, n'a pas démarré. Le code et les deux tests neufs sont restés **non commités**
  dans le worktree ci-dessus, conservé.
- La ceinture a trouvé un diff de tests strictement additif. Le rouge vient de deux tests du ticket 08,
  que ce ticket ne modifie pas. Rejoué à la main dans le worktree après le run :

```
npx vitest run tests/integration/apercu-d-une-page.test.ts
   × SC-08b — l'aperçu a le même contenu que la page publique, élément par élément, hors bandeau
   × SC-08b — l'aperçu de la page d'accueil a le même contenu que la page publique /
 Test Files  1 failed (1)
      Tests  2 failed | 12 passed (14)
```

  Dans les deux cas, attendu et obtenu sont identiques à un élément près, présent sur la page publique
  et absent de l'aperçu, juste avant `</main>` :
  `<img src="/_astro/media-fixture-hero.CGcAvttI.png" width="1280" height="640" alt="Image d'accueil du site de démonstration" loading="lazy" decoding="async">`
- Cause relevée par le vérificateur : `src/pages/[...slug].astro` passe désormais
  `images: imagesPubliees()` à `composerPage`, la route de l'aperçu ne passe rien. Sur la base
  `f8090a5`, le même fichier passe (14/14). La décomposition n'avait pas vu que l'aperçu et la page
  publique divergent entre le 06 et le 09.
- Autres remontées, non bloquantes pour le run : le test-validator juge deux trous bloquants
  (assertion tautologique SC-06b, `tests/unit/rendu/images.test.ts:56` ; SC-06f testé sur
  `composerPage` seulement, jamais sur une construction qui échoue) ; complexité cognitive 20/15 à
  `src/core/rendu/page.ts:182`.

## Prochaine étape
J'attendais l'arbitrage entre deux voies :
- A : dans le 06, passer aussi `imagesPubliees()` à `composerPage` dans
  `src/pages/admin/apercu/[...slug].astro` (hors de la ligne `**Fichiers :**` du 06, déjà dans celle du
  09) ; le 09 y ajoutera ensuite les images en brouillon.
- B : garder le 06 tel quel, PR rouge sur SC-08b, puis fusionner le 06 et le 09 à la suite.

Puis reprendre dans la session de lancement — la copie de l'orchestrateur transmet `rerun` :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-parallel.973170.js",
         resumeFromRunId: "wf_4ca90c1a-225",
         args: { changeDir: "openspec/changes/011-apercu-et-publication",
                 implPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.973170.js",
                 chains: [{ id: "06->09", tickets: [
                   { ticket: "06", rerun: "2" },
                   { ticket: "09", base: "impl/images-sur-les-pages-publiques-06",
                     oldBase: "impl/images-sur-les-pages-publiques-06" } ] }] })
```

Hors de cette session : commiter le travail dans le worktree, puis relancer
`/scd-spec-dev:run 011-apercu-et-publication 06` depuis ce worktree.

## Écarté
- Retoucher SC-08b pour ignorer les images : ce serait affaiblir un test existant pour faire passer le
  ticket.
- Lancer le 09 sur le 06 rouge : il hériterait de l'écart, et la chaîne s'arrête d'elle-même.

## Issue
Voie A arbitrée le 2026-10-11 : l'aperçu reçoit les images publiées (`dbf9e2a`). Reprise avec
`rerun: "2"` : le run est allé jusqu'à l'enregistrement, puis s'est arrêté en
`blocked-tests-touched-after-verify` — le correcteur de review avait retouché deux tests, hors de son
rôle. Retouches auditées par un `test-edit-validator` neuf sur la version d'avant reconstituée à
l'octet près : additives, probantes, sauf SC-06f qui ne vérifiait pas « aucun site n'est produit ».
Test renforcé et fixtures commitées (`a43bccf`), puis PR #225 ouverte à la main. Le correcteur a
aussi ajouté une décision au ticket 09 (`architecture-F-2`), laissée à l'arbitrage humain.
