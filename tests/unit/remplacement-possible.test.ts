/**
 * Ticket 01 (017) — Le remplacement de l'adresse n'est possible que si
 * l'instance porte la clé ET l'identifiant de compte (ADR-0033).
 *
 * Couture : `src/core/auth/remplacement.ts`, logique pure (I2).
 */
import { describe, it, expect } from "vitest";
import { remplacementPossible } from "../../src/core/auth/remplacement.ts";

const COMPTE = "0123456789abcdef0123456789abcdef";
const CLE = "jeton-de-test";

describe("remplacementPossible", () => {
  it("SC-01d — sans clé, sans identifiant de compte, ou sans les deux, le remplacement n'est pas possible", () => {
    expect(remplacementPossible(COMPTE, undefined)).toBe(false);
    expect(remplacementPossible(undefined, CLE)).toBe(false);
    expect(remplacementPossible(undefined, undefined)).toBe(false);
  });

  it("SC-01d — avec la clé et l'identifiant de compte, le remplacement est possible", () => {
    expect(remplacementPossible(COMPTE, CLE)).toBe(true);
  });

  it("SC-01d — une clé ou un compte vide vaut absent", () => {
    expect(remplacementPossible("", CLE)).toBe(false);
    expect(remplacementPossible(COMPTE, "")).toBe(false);
  });
});
