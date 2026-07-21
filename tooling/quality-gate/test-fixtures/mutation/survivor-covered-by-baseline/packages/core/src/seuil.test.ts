import { describe, expect, it } from "vitest";
import { estMajeur } from "./seuil";

// Fixture (FR-002/FR-025) : suite volontairement incomplète — ne teste que le
// cas nettement majeur, jamais le bord exact 18, laissant un mutant survivre.
describe("estMajeur (fixture)", () => {
  it("retourne vrai pour un âge nettement majeur", () => {
    expect(estMajeur(20)).toBe(true);
  });
});
