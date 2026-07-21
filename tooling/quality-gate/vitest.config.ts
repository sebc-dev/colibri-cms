import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "bin/**/*.test.ts"],
    // Le contrôle `mutation` (R6) invoque un vrai run Stryker par scénario
    // (sous-processus complet, dry-run + mutants) : largement au-delà du
    // délai par défaut (5 s). Aligné sur les autres contrôles qui spawnent
    // déjà des sous-processus réels (integration, typecheck, lint-format).
    testTimeout: 120_000,
  },
});
