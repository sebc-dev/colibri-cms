# Run du ticket 01 (entrée au navigateur) bloqué en quality gate

Portée : 009-parcours-navigateur · ticket 01
Ouvert le 2026-10-04 · branche `impl/entrer-dans-l-administration-au-navigateur-01` · HEAD `d9aca79`

## Objectif
J'allais mener le ticket 01 jusqu'à sa PR : `npm run parcours` sert le Worker bâti par `wrangler dev`,
sème une session, et Chromium entre dans l'administration sous garde de fidélité des en-têtes.

## Contexte à charger
à lire      `openspec/changes/009-parcours-navigateur/tickets/01-entrer-dans-l-administration-au-navigateur.md` — le ticket (5 critères)
à lire      `openspec/changes/009-parcours-navigateur/` — le change (design D1–D6, security-review)

## Acquis
- Le run `wf_1ba82452-8b7` s'est arrêté en `blocked-quality`, après une ceinture propre et des
  parcours verts. Le code est resté **non commité** sur la branche du ticket (aucune PR).
- Sortie du check bloquant `analyse` (8 erreurs), non tronquée :
  - `@typescript-eslint/restrict-template-expressions` — nombre interpolé dans un gabarit :
    `playwright.config.ts:16` (`http://localhost:${PORT}`), `:21` (`--port ${PORT}`), `:22` (url),
    `tests/parcours/preparer-passe.ts:34` (`values ('${jeton}', 'parcours', ${maintenant})`).
  - `sonarjs/no-os-command-from-path` — `tests/parcours/entree.parcours.ts:83`
    (`execFileSync("npx", ["vitest","list",…])`), `:87` (`execFileSync("npx", ["playwright","test","--list"])`),
    `:96` (`execFileSync("git", ["diff","--name-only","main"])`).
  - `sonarjs/super-linear-regex` — `tests/parcours/entree.parcours.ts:90` (`/([\w.-]+\.ts):\d+:\d+/g`).
- L'agent `quality-analyse` a refusé d'agir (`applicable:false`) : les emplacements sont un test et de
  la configuration d'outillage, et le projet ne déclare aucun applier.
- Le check `knip` (consultatif) signale `tests/parcours/preparer-passe.ts` comme fichier inutilisé :
  c'est un faux positif. Le fichier est lancé par `node` depuis le `webServer` de Playwright ; il
  faudrait l'ajouter à `entry` dans `knip.json`.

## Prochaine étape
J'allais faire corriger les 8 remontées par l'humain : `String(PORT)` / `String(maintenant)`, une
regex sans retour arrière (`/([^\s:]+\.ts):\d+:\d+/g`), et un arbitrage sur
`no-os-command-from-path` (dérogation en review, ou calibrage de `eslint.config.analyse.js` sur
`tests/**`). Ensuite, reprise depuis cette session uniquement :
`Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.490769.js", resumeFromRunId: "wf_1ba82452-8b7", args: { changeDir: "openspec/changes/009-parcours-navigateur", ticket: "01", rerun: "2" })`.
Après un `/clear` : commiter la correction, puis relancer `/scd-spec-dev:run 01`.

## Écarté
- Laisser l'agent de quality corriger : il n'a pas le droit de toucher un test ni la configuration.
