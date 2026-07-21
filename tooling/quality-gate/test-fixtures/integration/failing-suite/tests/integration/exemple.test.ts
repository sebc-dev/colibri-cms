// Fixture : suite d'intégration simulée dont un test échoue (FR-001).
import { describe, expect, it } from "vitest";

describe("suite d'intégration (fixture)", () => {
  it("échoue délibérément pour simuler un test d'intégration en échec", () => {
    expect(1).toBe(2);
  });
});
