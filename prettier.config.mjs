// Configuration Prettier, racine du monorepo.
//
// Consommée explicitement par le contrôle `lint-format` (FR-011, via l'API
// Node de Prettier) — choix utilisateur (cf. plan.md) pour le contrôle de
// format, indépendant du lint ESLint.
export default {
  printWidth: 100,
  trailingComma: "all",
};
