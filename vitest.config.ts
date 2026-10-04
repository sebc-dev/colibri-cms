// vitest.config.ts — job `test`/`coverage` (docs/ci.md). Les tests s'exécutent
// dans workerd via @cloudflare/vitest-plugin (ADR-0014) : l'oracle est
// celui du produit, contre les implémentations de D1 et non des simulacres.
import { defineConfig, configDefaults } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export default defineConfig({
  // Pont hôte → isolat pour la mutation : `process.env` de workerd est monté
  // par le pool depuis `wrangler.jsonc` et n'hérite jamais de l'hôte, où
  // Stryker pose le mutant actif. La valeur est lue ici, côté Node, et
  // substituée dans `tests/setup/activer-mutant-stryker.ts`, qui la dépose
  // dans l'isolat. `null` hors rejeu de mutation.
  define: {
    __MUTANT_ACTIF_HOTE__: JSON.stringify(process.env.__STRYKER_ACTIVE_MUTANT__ ?? null),
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  test: {
    // Les sandboxes Stryker (.stryker-tmp/, gitignorée) sont des copies des
    // suites. Sans cette exclusion, vitest les collecte quand une sandbox reste
    // sur disque et double le compte de tests et d'erreurs non gérées. Le motif
    // ne matche jamais depuis l'intérieur d'une sandbox (Stryker y lance npm
    // test avec la sandbox pour racine), donc les runs de mutation sont intacts.
    // Même raison pour .wrangler/ : le site factice de recette y bâtit un
    // arbre de travail complet (.wrangler/recette/arbre), tests compris, que
    // vitest collectait en double. Aucun test n'est lancé depuis cet arbre.
    exclude: [...configDefaults.exclude, '**/.stryker-tmp/**', '**/.wrangler/**', 'tests/parcours/**'],
    setupFiles: [
      './tests/setup/ignorer-rejet-wasm-lexer.ts',
      './tests/setup/activer-mutant-stryker.ts',
    ],
    // La mesure ne porte que sur les sources que les tests importent
    // directement (ADR-0013, docs/test.md). Le worker bâti
    // (.wrangler/test-worker/) en est exclu par construction : instrumenté,
    // il figeait la suite (workerd et Node en attente l'un de l'autre, aucun
    // délai de test ne se déclenchait), et sans cartes de sources sa mesure
    // ne se ramenait de toute façon pas à src/. `include` exclut aussi les
    // JSON de contenu, et fait paraître à 0 % un .ts qu'aucun test n'importe.
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.ts'],
      reporter: ['lcov', 'text-summary'],
      reportsDirectory: 'coverage',
      // Un rapport même quand un test échoue : sans lui, un seul rouge
      // effaçait toute la mesure.
      reportOnFailure: true,
    },
  },
});
