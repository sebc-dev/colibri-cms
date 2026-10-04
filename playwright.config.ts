// playwright.config.ts — étage « Parcours » (ADR-0014) : un navigateur réel
// ouvre le site bâti, servi comme en production par `wrangler dev` sur une
// base locale neuve. Hors de `npm test` : vitest exclut tests/parcours/.
import { defineConfig } from '@playwright/test';

const PORT = 8788;

export default defineConfig({
  testDir: './tests/parcours',
  testMatch: '**/*.parcours.ts',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    browserName: 'chromium',
  },
  webServer: {
    command:
      `node tests/parcours/preparer-passe.ts && npx wrangler dev --config dist/server/wrangler.json --local --persist-to .wrangler/parcours --port ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}/admin/pages/accueil`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
