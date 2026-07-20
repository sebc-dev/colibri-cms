import { defineConfig } from "vitest/config";

// Fixture : configuration minimale de la suite d'intégration (FR-001), voir
// failing-suite/tests/integration/vitest.config.ts pour le contexte.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
