import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "bin/**/*.test.ts"],
    // Les contrôles invoquent de vrais outils en sous-processus dont le
    // démarrage à froid dépasse le défaut de 5 s : ESLint/Prettier/tsc
    // (lint-format, typecheck) et surtout un run Stryker complet par scénario
    // (mutation, R6). On relève le timeout global en conséquence.
    testTimeout: 120_000,
  },
});
