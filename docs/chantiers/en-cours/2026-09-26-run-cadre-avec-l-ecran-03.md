# Run bloqué — le cadre avec l'écran

Portée : 005-mise-en-page-administration · ticket 03
Ouvert le 2026-09-26 · branche `impl/cadre-avec-l-ecran-03` (worktree, aucun commit) · HEAD `48c4d92`

## Objectif
Envelopper les quatre écrans dans `GabaritCadre.astro` (logo + `MenuRubriques.astro`) et retirer les
îlots de démonstration. Le ticket a été lancé en `run-parallel` avec le ticket 06 (run `wf_53c77c9b-c69`).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/03-cadre-avec-l-ecran.md` — le ticket
à lire      `openspec/changes/005-mise-en-page-administration/design.md` § D3, D9 — l'approche
à situer    `.git/scd-worktrees/cadre-avec-l-ecran-03/` — le SEUL exemplaire du travail (non commité)

## Acquis
- Le run s'est arrêté en `blocked-quality`, après une implémentation et une vérif attestées (ceinture
  propre, test neuf additif). Le seul check bloquant en échec, `analyse`
  (`eslint --config eslint.config.analyse.js .`), a relevé 8 erreurs, toutes dans le test neuf
  `tests/integration/cadre-avec-l-ecran.test.ts` :
  `prefer-regexp-exec` (typescript-eslint + sonarjs) aux l. 191, 197 et 281 ; `no-non-null-assertion`
  aux l. 193 et 199 (`correspondance![1]` juste après `expect(correspondance).not.toBeNull()`).
- Le conseiller n'a pas pu les corriger. Il n'y a pas d'`applier` de projet dans `.claude/quality.json`,
  et le fix-applier générique ne touche jamais un test.
- Forme propre proposée par le conseiller, sans escape-hatch : `re.exec(x)` à la place de `x.match(re)`,
  et une garde qui rétrécit le type (`if (c === null) throw new Error('…'); return c[1];`).
- `knip` (check consultatif) a échoué pour une cause que le ticket introduit : en supprimant
  `ActionRapide.svelte`, il retire le dernier consommateur de tooltip. `bits-ui` et
  `WithoutChildrenOrChild` paraissent donc inutilisés, mais seulement parce que `knip.json` ignore
  `src/admin/composants/ui/**`.

## Prochaine étape
Dans le worktree, réécrire les l. 191-199 et 281 du test sous la forme ci-dessus, sans changer
d'assertion. Rejouer ensuite `analyse` puis le test du ticket, puis commiter et ouvrir la PR à la main.
Décider enfin du sort de `knip` : `ignoreDependencies` pour `bits-ui`, ou attendre qu'un ticket 04-11
rebranche tooltip ou dialog.

## Écarté
- `eslint-disable` sur le test, ou un assouplissement de `eslint.config.analyse.js` : ce sont des
  escape-hatches.
- Retirer `bits-ui` ou l'export `WithoutChildrenOrChild` : la spec `socle-ilots-admin` (l. 21) et les
  ADR-0009 et 0010 s'appuient dessus.
