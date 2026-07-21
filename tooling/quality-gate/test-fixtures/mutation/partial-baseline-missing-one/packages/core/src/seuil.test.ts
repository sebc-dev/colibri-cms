import { describe, expect, it } from "vitest";
import { estAdulte, estMajeur } from "./seuil";

// Fixture (FR-025, borne) : suite volontairement incomplète sur les deux
// fonctions — aucun test ne couvre le bord exact (18 et 21), laissant deux
// mutants survivre.
describe("seuils (fixture)", () => {
  it("retourne vrai pour un âge nettement majeur", () => {
    expect(estMajeur(20)).toBe(true);
  });

  it("retourne vrai pour un âge nettement adulte", () => {
    expect(estAdulte(25)).toBe(true);
  });
});
