import { describe, expect, it } from "vitest";
import { estCheminProtege } from "./protected-paths";

/**
 * FR-023 (source unique) : `estCheminProtege` est la fonction pure qui
 * matérialise la liste unique des chemins possédés par l'humain
 * (`tests/`, `migrations/`, tout dossier `schema/` à n'importe quelle
 * profondeur, config des frontières, seam
 * d'auth), consommée par le hook de protection (FR-021) ET, à terme, par
 * le contrôle de frontières du portail — jamais dupliquée.
 */
describe("protected-paths — FR-023 : liste unique des chemins protégés (source de vérité)", () => {
  it("considère un fichier sous tests/ comme protégé", () => {
    const chemin = "tests/unit/exemple.test.ts";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(true);
  });

  it("considère un fichier sous migrations/ comme protégé", () => {
    const chemin = "packages/db/migrations/0001_init.sql";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(true);
  });

  it("considère un fichier sous un dossier schema/ imbriqué comme protégé (**/schema/)", () => {
    const chemin = "packages/db/src/schema/users.ts";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(true);
  });

  it("considère la config des frontières (.dependency-cruiser.cjs) comme protégée", () => {
    const chemin = ".dependency-cruiser.cjs";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(true);
  });

  it("considère la config ESLint des frontières (eslint.config.mjs) comme protégée", () => {
    const chemin = "eslint.config.mjs";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(true);
  });

  it("considère le seam d'auth (lib/auth.ts, JWKS) comme protégé", () => {
    const chemin = "apps/admin/src/lib/auth.ts";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(true);
  });

  it("ne considère pas un fichier source ordinaire du cœur comme protégé", () => {
    const chemin = "packages/core/src/render.ts";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(false);
  });

  it("ne confond pas un nom de fichier contenant « schema » en sous-chaîne avec le dossier schema/ (limite)", () => {
    const chemin = "apps/admin/src/lib/schematics.ts";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(false);
  });

  it("retourne false pour une chaîne vide plutôt que de lever une exception (limite)", () => {
    const chemin = "";

    const protege = estCheminProtege(chemin);

    expect(protege).toBe(false);
  });
});
