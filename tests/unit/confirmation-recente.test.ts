/**
 * Ticket 01 (018) — Une confirmation de moins d'une minute fait patienter (ADR-0033).
 *
 * Couture : `src/core/auth/regles.ts`, logique pure (I2).
 */
import { describe, it, expect } from "vitest";
import { DELAI_APRES_CONFIRMATION_MS, confirmationRecente } from "../../src/core/auth/regles.ts";

const MAINTENANT = Date.parse("2026-11-11T10:00:00Z");

describe("confirmationRecente", () => {
  it("SC-01a — le délai d'attente après la confirmation vaut une minute", () => {
    expect(DELAI_APRES_CONFIRMATION_MS).toBe(60_000);
  });

  it("SC-01a — vérifiée il y a 59 s, ou à l'instant : récente (attente)", () => {
    expect(confirmationRecente(MAINTENANT - 59_000, MAINTENANT)).toBe(true);
    expect(confirmationRecente(MAINTENANT, MAINTENANT)).toBe(true);
  });

  it("SC-01b — vérifiée il y a 60 s ou 61 s : plus récente (le code part)", () => {
    expect(confirmationRecente(MAINTENANT - 60_000, MAINTENANT)).toBe(false);
    expect(confirmationRecente(MAINTENANT - 61_000, MAINTENANT)).toBe(false);
  });

  it("SC-01a — un instant dans le futur (horloges décalées) vaut attente", () => {
    expect(confirmationRecente(MAINTENANT + 30_000, MAINTENANT)).toBe(true);
  });
});
