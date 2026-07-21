import { describe, expect, it } from "vitest";
import { identite } from "./identite";

// Fixture (FR-029) : couverture totale — aucun mutant ne doit survivre ici,
// afin que le résultat du contrôle mutation reflète uniquement l'état de la
// base de référence (absente), pas un survivant non couvert.
describe("identite (fixture)", () => {
  it("retourne la valeur reçue telle quelle", () => {
    expect(identite(42)).toBe(42);
  });
});
