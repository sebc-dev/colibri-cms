/**
 * Ticket 01 (016) — Créer le code de secours : la forme du code
 * (openspec/changes/016-moyen-de-reprise/tickets/01-creer-le-code-de-secours.md),
 * ADR-0032.
 *
 * Couture : `src/core/auth/code.ts`, logique pure (I2) :
 * - `engendrerCodeDeSecours()` rend vingt-six signes de l'alphabet Crockford ;
 * - `grouperCodeDeSecours(code)` rend la forme affichée, groupes de quatre.
 */
import { describe, it, expect } from "vitest";
import {
  engendrerCodeDeSecours,
  grouperCodeDeSecours,
  normaliserCode,
} from "../../src/core/auth/code.ts";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

describe("la forme du code de secours", () => {
  it("SC-01f — un code engendré compte vingt-six signes de l'alphabet sans confusables, affiché en groupes séparés", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = engendrerCodeDeSecours();
      expect(code).toHaveLength(26);
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
      for (const signe of code) {
        expect(ALPHABET).toContain(signe);
      }
    }

    const code = "0123456789ABCDEFGHJKMNPQRS";
    const groupe = grouperCodeDeSecours(code);
    expect(groupe).toBe("0123 4567 89AB CDEF GHJK MNPQ RS");
    expect(groupe.split(" ").map((g) => g.length)).toEqual([
      4, 4, 4, 4, 4, 4, 2,
    ]);
    // La forme affichée se ramène à la valeur par la normalisation existante.
    expect(normaliserCode(groupe)).toBe(code);
  });

  it("SC-01g — sur 32 000 codes, chaque signe paraît à chaque position avec la fréquence attendue", () => {
    const echantillon = 32_000;
    const compteurs: number[][] = Array.from({ length: 26 }, () =>
      new Array<number>(32).fill(0),
    );
    for (let i = 0; i < echantillon; i += 1) {
      const code = engendrerCodeDeSecours();
      expect(code).toHaveLength(26);
      for (let position = 0; position < 26; position += 1) {
        const rang = ALPHABET.indexOf(code[position]);
        expect(rang).toBeGreaterThanOrEqual(0);
        compteurs[position][rang] += 1;
      }
    }

    // Attendu : 1 000 par case, écart-type ≈ 31,1. Borne à ±200 (≈ 6,4 σ) :
    // sur 832 cases, une chance sur plus de dix millions de rougir par hasard.
    const attendu = echantillon / 32;
    const borne = 200;
    for (let position = 0; position < 26; position += 1) {
      for (let rang = 0; rang < 32; rang += 1) {
        const ecart = Math.abs(compteurs[position][rang] - attendu);
        expect(
          ecart,
          `signe ${ALPHABET[rang]} à la position ${String(position)}`,
        ).toBeLessThanOrEqual(borne);
      }
    }
  }, 30_000);
});
