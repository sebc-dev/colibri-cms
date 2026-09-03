// vitest.config.ts — job `test`/`coverage` (docs/ci.md). Les tests s'exécutent
// dans workerd via @cloudflare/vitest-pool-workers (ADR-0013) : l'oracle est
// celui du produit, contre les implémentations de D1 et non des simulacres.
import { defineConfig, configDefaults } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
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
    coverage: {
      provider: 'istanbul',
      reporter: ['lcov'],
      reportsDirectory: 'coverage',
    },
  },
});
