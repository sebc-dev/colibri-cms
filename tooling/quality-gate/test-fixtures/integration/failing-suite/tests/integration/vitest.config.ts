import { defineConfig } from "vitest/config";

// Fixture : configuration minimale de la suite d'intégration (FR-001). La
// suite réelle utilisera @cloudflare/vitest-pool-workers pour de vraies
// ressources de données locales (ADR-0005) ; cette fixture reste volontairement
// un projet vitest ordinaire, le contrôle n'ayant qu'à constater un échec/succès.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
