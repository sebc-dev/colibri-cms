# Run bloqué — le repli et le tiroir

Portée : 005-mise-en-page-administration · ticket 04
Ouvert le 2026-09-27 · Clos le 2026-09-27 · branche `impl/repli-et-tiroir-04` (worktree, aucun commit) · HEAD `fe5cd67`

## Objectif
Permettre de replier la barre latérale en rail d'icônes sur écran large (choix retenu en
`localStorage`), et la remplacer par un tiroir `<dialog>` sous 768 px. Le ticket a été lancé en
`run-parallel` avec les tickets 10 et 11 (run `wf_163537a5-59c`).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/04-repli-et-tiroir.md` — le ticket
à lire      `openspec/changes/005-mise-en-page-administration/design.md` — §D3/D8 (repli, tiroir)
à lire      `docs/architecture.md` — I12 (`script-src 'self'` seul)
à situer    `.git/scd-worktrees/repli-et-tiroir-04/` — le SEUL exemplaire du travail (non commité : `GabaritCadre.astro`, `MenuRubriques.astro` modifiés, `cadre.ts` non suivi)
à situer    `tests/integration/liste-des-pages.test.ts:121` — SC-02c, désormais rouge

## Acquis
- Le run s'est arrêté en `blocked-verify` à cause de vrais défauts, observés dans Chromium sur
  l'artefact bâti :
  1. **Script bloqué par la CSP.** Astro met en ligne le petit `<script>` de module de
     `GabaritCadre.astro`, et aucun `.js` externe n'est émis pour `cadre.ts`. `script-src 'self'`
     (I12) le bloque : ni le repli ni le tiroir ne fonctionnent sous la vraie CSP. Avec `bypassCSP`,
     SC-04a à SC-04f se comportent comme attendu.
  2. **Le bouton de repli recouvre « Mes pages »** dans le rail : la première rubrique ne répond plus
     au clic (`#bouton-repli-menu intercepts pointer events`).
  3. **L'infobulle du rail est coupée** par l'`overflow-hidden` de l'`<aside>`.
  4. **Régression** : `liste-des-pages.test.ts:121` (SC-02c, `not.toMatch(/<button[\s>]/i)`) échoue
     à cause des nouveaux `<button>` du cadre. Le test n'a pas été modifié. Il faut arbitrer : soit
     il visait le contenu de la liste et doit être resserré, soit le cadre ne doit pas porter de
     bouton sur cette page.
- typecheck, lint et build passent. Ce qui reste à contrôler par un humain après correction :
  bouton de menu toujours visible en haut d'une page longue à 360 px, et aucun mouvement visible avec
  « réduire les animations ».
- Le ticket 11 dépend en pratique de celui-ci : sans tiroir, la barre latérale de 224 px reste
  affichée sur téléphone et écrase la fiche (SC-11d).

## Prochaine étape
Faire émettre `cadre.ts` en fichier externe, et non inline (option Astro sur l'inlining des scripts,
ou `import` depuis un fichier servi par `'self'`). Corriger ensuite le chevauchement du bouton de
repli et le rognage de l'infobulle, arbitrer SC-02c, puis relancer `/scd-spec-dev:run
005-mise-en-page-administration 04`, ou finir dans le worktree et ouvrir la PR à la main.

## Issue
Repris à la main dans le worktree. Le script était inliné par Astro, qui met en ligne tout script
de moins de 4 Ko : `build.assetsInlineLimit` exclut désormais les `.js` (`astro.config.ts`), ce qui
répare aussi le script de « Mes pages », inliné sur main. Repliée, le bouton de repli passe dans le
flux, sous les icônes ; l'`<aside>` ne rogne plus le rail, donc l'infobulle reste entière (survol et
focus). Arbitrage humain : SC-02c porte sur `<main>`. SC-04a à SC-04f constatés sous la vraie CSP
dans Chromium ; 216/216 tests, typecheck et lint verts.

## Écarté
- Assouplir la CSP (`'unsafe-inline'` ou un hash) : interdit par I12 et ADR-0010.
