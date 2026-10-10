/**
 * Ticket 03 — lecture d'un prix saisi (SC-03a), ADR-0018.
 * Couture : `lirePrixSaisi` / `formaterPrix` de `src/core/formulaires/prix.ts`.
 */
import { describe, it, expect } from "vitest";
import {
  formaterPrix,
  lirePrixSaisi,
} from "../../../src/core/formulaires/prix.ts";

describe("SC-03a — lecture d'un prix saisi", () => {
  it.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12,50", 1250],
    ["12.50", 1250],
    ["0", 0],
    ["99999,99", 9_999_999],
  ])("SC-03a — « %s » vaut %i centimes", (saisie, centimes) => {
    expect(lirePrixSaisi(saisie)).toEqual({ ok: true, centimes });
  });

  it("SC-03a — formaterPrix rend la forme française relue par lirePrixSaisi", () => {
    expect(formaterPrix(800)).toBe("8");
    expect(formaterPrix(1250)).toBe("12,50");
    expect(formaterPrix(9_999_999)).toBe("99999,99");
    for (const c of [
      0, 1, 5, 99, 100, 1205, 1250, 500_000, 9_999_998, 9_999_999,
    ]) {
      expect(lirePrixSaisi(formaterPrix(c))).toEqual({ ok: true, centimes: c });
    }
  });

  it("SC-03a — une saisie hors règle est refusée avec une raison", () => {
    for (const saisie of ["", "-1", "12,505", "douze", "100000"]) {
      const lu = lirePrixSaisi(saisie);
      expect(lu.ok).toBe(false);
    }
  });
});
