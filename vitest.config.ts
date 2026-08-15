// vitest.config.ts — job `test`/`coverage` (docs/ci.md). Les tests s'exécutent
// dans workerd via @cloudflare/vitest-pool-workers (ADR-0013) : l'oracle est
// celui du produit, contre les implémentations de D1 et non des simulacres.
import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['lcov'],
      reportsDirectory: 'coverage',
    },
  },
});
