# nightly : dead-code (knip) et mutation (stryker) rouges

Portée : socle
Ouvert le 2026-09-03 · Actualisé le 2026-09-03 · branche `main` · HEAD `e5b7c43`

## Objectif
Faire passer les deux jobs de `nightly.yml` (informatifs, jamais requis) du rouge au vert, sans
masquer un vrai signal. Correctifs TESTÉS en scratchpad ; les fichiers cibles sont protégés
(`knip.*`, `stryker.conf.*`) → commits humains `chore(ci):`.

## Contexte à charger
à situer  `.github/workflows/nightly.yml` — jobs `dead-code` (`npm run knip`) et `mutation` (`npm run mutation`)
à situer  `docs/chantiers/en-attente/2026-08-14-durcissement-ci.md` — la mutation y est déjà un `[à compléter]` (base de mutants, astro hors liste par défaut) ; le tuning profond y retourne
à lire    `vitest.config.ts` — pool Cloudflare Workers (ADR-0013), cause du crash stryker

## Acquis (tout reproduit le 2026-09-03)
- **knip** sort en 1 sur 36 faux positifs : knip ne trace pas les imports du `<script>` de module
  `.astro` ni les entrypoints `injectRoute`. Une seule chaîne (`src/pages/admin/ilots.astro` →
  `monter.ts` → îlots → shadcn → `lib/utils`) explique 19 fichiers + 5 deps ; `cloudflare:*` est un
  builtin workerd ; les 5 `zone.ts` sont exigés par FR-009. **Rien n'est réellement mort** — le seul
  `MessageEmail` sert dans son fichier. **Correctif config-only PROUVÉ vert** (exit 0, sortie vide) :
  entry `pages/**/*.astro` + `ilots-svelte-5/monter.ts` + `d1/sonde-dev.ts` ; ignore `**/zone.ts` +
  `composants/ui/**` ; ignoreDependencies `cloudflare`,`@lucide/svelte` ; `ignoreExportsUsedInFile`.
- **mutation** crashait au **dry-run** (`Cannot convert object to primitive value`) : le runner
  vitest de Stryker ne pilote pas le pool Workers. **Le `command` runner (`npm test`) PROUVE le
  dry-run vert** (« Initial test run succeeded »). Réserve : perd `coverageAnalysis: perTest` →
  suite entière (build compris, ~19 s) par mutant. Sur `src/**/*.ts` entier ce serait un risque de
  timeout → scoper `mutate` + `--incremental`.

## Prochaine étape — deux commits humains `chore(ci):`
1. `knip.json` ← le contenu prouvé (voir Acquis). Vérifier : `npm run knip` → exit 0.
2. `stryker.conf.json` : `testRunner:"command"`, `commandRunner.command:"npm test"`,
   `coverageAnalysis:"off"` ; restreindre `mutate` (ex. `src/core/**`,`src/platform/**`) et jouer
   `--incremental` en nightly. Vérifier : `npm run mutation` ne crashe plus.

## Écarté
- Supprimer des fichiers « morts » : aucun ne l'est (échafaudage atteignable + marqueurs FR-009).
- Éditer les fichiers protégés en session — refusé par le garde config-qualité.
- Rendre Stryker compatible perTest avec le pool Workers — infaisable via ce runner ; le tuning
  profond (base de mutants, scope) appartient à `durcissement-ci`.
