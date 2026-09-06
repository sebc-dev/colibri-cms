# Run bloqué — graphe d'imports Svelte (ticket 03)

Portée : 002-socle-ilots-admin · ticket 03
Ouvert le 2026-09-02 · Actualisé le 2026-09-02 · branche `impl/socle-ilots-admin-03` · HEAD `052b95f`
Bloqué par : geste humain sur un fichier de config qualité

## Objectif
Livrer le ticket 03 (mode `observé`) : étendre le contrôle `boundaries` aux `.svelte` pour que la
frontière I1 (ADR-0009) morde, prouver le rejet d'un import public→admin, constater le poids public.

## Statut du run
`blocked-impl` — `implementer` s'est arrêté : **tout le livrable passe par
`eslint.config.boundaries.js`, déjà versionné**, que `.claude/hooks/garde-agent.py` refuse d'éditer.
Sortie non tronquée :

```
⛔ Config qualité : « eslint.config.boundaries.js » est déjà versionné.
   Ce qui contraint l'agent ne se modifie pas par l'agent —
   la soupape CI est un scope de commit, que j'écris aussi facilement
   que la modification elle-même. Passe la main à l'humain.
   (La CRÉATION d'une config au scaffold, elle, reste autorisée.)
```
J'ai décidé que le blocage est **structurel**, pas transitoire : le ticket 03 ne peut pas être livré
par `/scd-sdd:run`. Aucune PR ouverte, aucun critère coché ; la branche existe (travail non perdu).

## Acquis
- Base : `main` à jour (dépendance 02 mergée, PR #49). Rien à empiler.
- Vérifié sans toucher au fichier protégé : `npm run typecheck` (0 err), `npm run lint:boundaries`
  baseline (0 err — `.svelte` pas scanné), `npm run build` OK.
- C3 vacuement vrai aujourd'hui : le build ne produit **aucune** route publique (`grep pattern`
  → uniquement `/admin/*`, `/_image`, `/_server-islands`) — rien à faire fuiter encore.
- `implementer` a laissé `package.json` + `package-lock.json` **modifiés non commités** dans l'arbre
  (ajout de `svelte-eslint-parser`, nécessaire au scan `.svelte`). Arbre sale à traiter.

## Prochaine étape
Geste humain : commit `chore(config):` (ou label `config-change`) sur `eslint.config.boundaries.js`
ajoutant un bloc `files: ['src/**/*.svelte']` (parser `svelte-eslint-parser` + `tseslint.parser`
pour `<script lang="ts">`), en factorisant SETTINGS/RULES du bloc `.ts`, sans changer la matrice I1
ni le style sans-barre-finale. Y intégrer le `package.json` (scope `deps`). Puis reprendre la preuve
observée (fixture d'import délibéré site→admin, capture de l'erreur `lint:boundaries`).

## Écarté
- Livrer via le workflow — refusé à la source par le garde ; le contrat du ticket (éditer une config
  qualité) est par nature hors du périmètre d'écriture de l'agent. À signaler éventuellement en amont.
- Committer moi-même les modifs `package.json`/lock — relève du même commit humain de config/deps.

## Contexte à charger
à lire  `specs/002-socle-ilots-admin/03-graphe-imports-svelte.md` — les 3 critères observables
à lire  `specs/002-socle-ilots-admin/SPEC.md` — hors-périmètre + couture de test (graphe d'imports)

## Issue
Débloqué le 2026-09-02 par geste humain — l'édition de la config qualité était, comme attendu,
réservée à l'humain. Le blocage était structurel (le livrable = éditer `eslint.config.boundaries.js`),
pas transitoire.
- Config : `148ce53` (`chore(config):` — scan `.svelte`/`.astro`, matrice I1 inchangée).
- Deps : `4f133ff` (`svelte-eslint-parser`, `astro-eslint-parser`).
- Cases : `3eb8455` (les 3 critères cochés).
Preuve observée capturée : `lint:boundaries` flague `site → admin` et laisse `admin → platform` ;
build sans route publique (C3 vacuement vrai). Livré par la PR de `impl/socle-ilots-admin-03`.
