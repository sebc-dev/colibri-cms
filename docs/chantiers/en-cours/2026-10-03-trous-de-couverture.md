# Trous de couverture relevés le 2026-10-03

Portée : hors-cycle
Ouvert le 2026-10-03 · Actualisé le 2026-10-03 · branche `main` · HEAD `65db076`

## Objectif
Combler les trous de couverture relevés par une mesure fusionnée par fichier de test : un texte
d'erreur jamais exécuté, la commande de couverture inutilisable, le code navigateur sans test.

## Contexte à charger
à lire      `vitest.config.ts` — le bloc `coverage` à réparer (41 l.)
à lire      `docs/test.md` — doctrine couverture/mutation, ce qu'un seuil pourra porter (110 l.)
à extraire  `tests/integration/plafond-horaire.test.ts` › appels au relais d'envoi — 481 l., le fichier qui cale seul
à situer    `docs/adr/0013-*`, `docs/adr/0014-*` — couverture = exécution, oracle workerd ; à respecter

## Acquis
- Sans mesure, la suite passe ; sous instrumentation istanbul, 50 tests dépassaient 5 s (presque
  tous des parcours de connexion/envoi), et une passe complète à 30 ou 60 s calait au-delà de 10 min.
- Le blocage venait du Worker : miniflare refusait un envoi (« email to … not allowed »), puis
  workerd annulait la requête comme « hung » ; `plafond-horaire.test.ts` calait même seul (> 2 min).
- Vitest n'écrivait aucun rapport quand un test échouait : `--coverage.reportOnFailure` était requis.
- Contournement qui a marché : une passe par fichier de test (`timeout 120`, `--testTimeout=20000`,
  reporter json), fusionnée avec `istanbul-lib-coverage` (présent dans node_modules).
- Le Worker de test était instrumenté, mais sans cartes de sources : la couverture des paquets
  `.wrangler/test-worker/` ne se ramenait pas à `src/`. J'ai rapproché par nom de fonction.
- Côté serveur, seules `texteDuRefusTeleversement` (`src/admin/textes.ts`) n'était jamais exécutée,
  et `lireReglagesDeLaDeclaration` (`src/platform/contenu/reglages.ts`) absente du Worker — pas
  encore branchée par le change 008, à revoir au ticket suivant, pas un trou.
- Aucun test automatique n'exécutait le code navigateur : `src/admin/cadre.ts`,
  `ilots-svelte-5/monter.ts`, `soumettre-correction.ts`, `navigation-liste-des-pages.ts`,
  `pastille-brouillon.ts` et les composants `.svelte` — seule la recette Playwright y passait.

## Prochaine étape
J'allais d'abord ajouter un test direct de `texteDuRefusTeleversement` (geste direct, une PR),
puis réparer `npm run coverage` (délai en mode mesure, `reportOnFailure`, cause du blocage d'envoi),
et enfin porter le choix d'un test automatique du code navigateur par un change ou un ADR.

## Écarté
- Passe complète `--testTimeout=30000` puis `60000` : cale au-delà de 10 min, aucun rapport.
- `pkill -f 'vitest run --coverage'` : tue aussi le shell qui le lance — arrêter par PID.
- Ajouter des cartes de sources au build de test pour ramener la mesure à `src/` : touche la
  config de build, hors du périmètre d'une mesure — à reconsidérer avec la réparation.
