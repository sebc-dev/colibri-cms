// Configuration ESLint (flat config), racine du monorepo.
//
// Consommée explicitement par le contrôle `lint-format` (FR-011, via l'API
// Node d'ESLint) pour que la même configuration s'applique aussi bien au
// dépôt réel qu'aux fixtures isolées de `tooling/quality-gate/test-fixtures/`
// (qui n'ont pas leur propre configuration). Règles non type-checkées
// volontairement : les fixtures de test ne fournissent pas de `tsconfig.json`
// de projet complet.
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.astro/**", "**/.wrangler/**", "**/.turbo/**"],
  },
  ...tseslint.configs.recommended,
);
