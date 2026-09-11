// vitest.config.ts — job `test`/`coverage` (docs/ci.md). Les tests s'exécutent
// dans workerd via @cloudflare/vitest-plugin (ADR-0003) : l'oracle est
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
    exclude: [...configDefaults.exclude, '**/.stryker-tmp/**'],
    setupFiles: [
      './tests/setup/ignorer-rejet-wasm-lexer.ts',
      './tests/setup/activer-mutant-stryker.ts',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['lcov'],
      reportsDirectory: 'coverage',
    },
  },
});
