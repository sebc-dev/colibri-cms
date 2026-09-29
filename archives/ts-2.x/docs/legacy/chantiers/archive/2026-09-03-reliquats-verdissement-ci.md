# Reliquats du verdissement CI (mutation réelle, doc, erreurs avalées)

Portée : socle
Ouvert le 2026-09-03 · Actualisé le 2026-09-03 · branche `main` · HEAD `7400959`

## Objectif
Trois suites hors-périmètre et non bloquantes, laissées ouvertes après le verdissement des trois
contrôles CI (arch-invariants + nightly, clôturé le 2026-09-03). Aucune n'empêche un merge — ce
sont des dettes de justesse, à prendre quand le socle le mérite.

## Contexte à charger
à situer  `docs/chantiers/archive/2026-09-03-nightly-knip-mutation-rouges.md` — d'où sortent ces reliquats
à situer  `docs/chantiers/en-attente/2026-08-14-durcissement-ci.md` — propriétaire du tuning profond de la mutation (base de mutants, astro hors liste par défaut)
à lire    `stryker.conf.json` — `mutate` scopé core+platform, `coverageAnalysis:off` ; le run réel n'a jamais tourné
à lire    `package.json` › script `test` — `--dangerouslyIgnoreUnhandledErrors` masque 16 erreurs
à situer  `CLAUDE.md` › Gotchas — la ligne « aucun fichier de test » (protégé, commit humain)

## Acquis (2026-09-03)
- La mutation ne CRASHE plus (command runner), mais le VRAI run n'a jamais été joué : `mutate` scopé
  arbitrairement à core+platform, sans base de mutants ni durée mesurée. Un premier run remonterait
  tout le corpus comme neuf. Suite-entière-par-mutant (~19 s) → risque de timeout à surveiller.
- `npm test` sort 0 en avalant 16 « errors » (`--dangerouslyIgnoreUnhandledErrors`) : vert réel sur
  176 tests, mais 16 erreurs non gérées jamais diagnostiquées.
- Le gotcha CLAUDE.md « le dépôt ne porte aucun fichier de test » est FAUX depuis l'ajout des tests
  (11 fichiers, 176 tests) — il induit en erreur toute session qui le lit.

## Prochaine étape
Trois pistes indépendantes, à prendre séparément :
1. mutation : jouer un premier run scopé (`--incremental`), mesurer la durée, poser une base de
   mutants — à coordonner avec `durcissement-ci`, qui possède ce sujet.
2. `npm test` : diagnostiquer les 16 erreurs avalées, décider si le drapeau reste justifié.
3. CLAUDE.md : corriger le gotcha périmé (commit humain `chore(config):`, fichier protégé).

## Écarté
- Tout fondre dans `durcissement-ci` : seul le point 1 y appartient ; 2 et 3 sont d'autres natures.
- Ouvrir en `en-cours/` : ces trois pistes sont différées, pas en vol — elles n'ont pas à s'annoncer
  comme actives au démarrage.

## Issue
Fermé le 2026-09-03. Pistes 2 et 3 livrées via PR #52 (mergée, merge commit `77742d9`) :
- Piste 2 (erreurs avalées) — `--dangerouslyIgnoreUnhandledErrors` remplacé par une suppression
  ciblée du rejet WASM es-module-lexer : un setupFile (`tests/setup/ignorer-rejet-wasm-lexer.ts`)
  neutralise le seul `WebAssembly.compile` refusé par workerd, tout autre rejet redevient visible.
- Piste 3 (gotcha) — le gotcha « le dépôt ne porte aucun fichier de test » / « lcov 0 octet »,
  faux depuis l'ajout des tests, corrigé dans `CLAUDE.md`.
Piste 1 (premier vrai run de mutation) non traitée ici : elle appartient au chantier
`durcissement-ci` (2026-08-14), qui porte déjà la base de mutants survivants et la réserve
Stryker/astro. Rien n'est perdu en fermant.
