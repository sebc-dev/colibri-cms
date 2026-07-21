import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "bin/**/*.test.ts"],
    // Les contrôles invoquent de vrais outils (ESLint, Prettier, tsc) dont le
    // démarrage à froid dépasse le défaut de 5 s ; on laisse de la marge pour
    // éviter des timeouts flaky en local et en CI. Les tests plus longs
    // (mutation/Stryker) gardent leur timeout inline propre.
    testTimeout: 30_000,
  },
});
