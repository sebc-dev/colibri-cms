/**
 * Ticket 05 (017) — Le verdict d'un code de remplacement refusé
 * (openspec/changes/017-remplacement-adresse-autorisee/tickets/05-les-refus-du-code-de-remplacement.md),
 * ADR-0033.
 *
 * Couture : `src/core/auth/verdict.ts`, logique pure (I1, I2). Ordre des bornes : brûlé,
 * déjà utilisé, annulé, expiré, autre session que la demandeuse.
 */
import { describe, it, expect } from "vitest";
import { rendreVerdict, SEUIL_ESSAIS_BRULAGE, type LigneCode } from "../../src/core/auth/verdict.ts";

const MAINTENANT = 1_700_000_000_000;
const QUINZE_MINUTES = 15 * 60 * 1000;
const SESSION = "session-demandeuse";

function ligne(surcharge: Partial<LigneCode> = {}): LigneCode {
  return {
    identifiantAppareil: SESSION,
    expireLe: MAINTENANT + QUINZE_MINUTES,
    utiliseLe: null,
    annuleLe: null,
    essais: 0,
    ...surcharge,
  };
}

function verdict(l: LigneCode | null, session = SESSION) {
  return rendreVerdict({ ligne: l, identifiantAppareilCourant: session, maintenant: MAINTENANT });
}

describe("rendreVerdict — code de remplacement", () => {
  it("SC-05a — une saisie sans ligne correspondante est introuvable (l'écran invite à retaper)", () => {
    expect(verdict(null)).toEqual({ valide: false, raison: "introuvable" });
  });

  it("SC-05b — cinq saisies fautives brûlent le code, quatre non (le seuil est de 5)", () => {
    expect(SEUIL_ESSAIS_BRULAGE).toBe(5);
    expect(verdict(ligne({ essais: 4 }))).toEqual({ valide: true });
    expect(verdict(ligne({ essais: 5 }))).toEqual({ valide: false, raison: "brule" });
    expect(verdict(ligne({ essais: 9 }))).toEqual({ valide: false, raison: "brule" });
  });

  it("SC-05c — expiré à quinze minutes pile (expire_le <= maintenant), valable une milliseconde avant", () => {
    expect(verdict(ligne({ expireLe: MAINTENANT }))).toEqual({ valide: false, raison: "expire" });
    expect(verdict(ligne({ expireLe: MAINTENANT - 1 }))).toEqual({ valide: false, raison: "expire" });
    expect(verdict(ligne({ expireLe: MAINTENANT + 1 }))).toEqual({ valide: true });
  });

  it("SC-05d — une autre session que la demandeuse est refusée", () => {
    expect(verdict(ligne(), "autre-session")).toEqual({ valide: false, raison: "mauvais-appareil" });
  });

  it("SC-05e — un code déjà utilisé est refusé", () => {
    expect(verdict(ligne({ utiliseLe: MAINTENANT - 1000 }))).toEqual({ valide: false, raison: "deja-utilise" });
  });

  it("SC-05g — un code annulé (nouvelle proposition ou nouveau code) est refusé", () => {
    expect(verdict(ligne({ annuleLe: MAINTENANT - 1000 }))).toEqual({ valide: false, raison: "annule" });
  });

  it("SC-05b — l'ordre des bornes : brûlé avant utilisé, utilisé avant annulé, annulé avant expiré, expiré avant autre session", () => {
    const tout = ligne({
      essais: 5,
      utiliseLe: MAINTENANT - 1,
      annuleLe: MAINTENANT - 1,
      expireLe: MAINTENANT - 1,
    });
    expect(verdict(tout, "autre-session")).toEqual({ valide: false, raison: "brule" });
    expect(verdict({ ...tout, essais: 0 }, "autre-session")).toEqual({ valide: false, raison: "deja-utilise" });
    expect(verdict({ ...tout, essais: 0, utiliseLe: null }, "autre-session")).toEqual({
      valide: false,
      raison: "annule",
    });
    expect(verdict({ ...tout, essais: 0, utiliseLe: null, annuleLe: null }, "autre-session")).toEqual({
      valide: false,
      raison: "expire",
    });
    expect(verdict(ligne(), "autre-session")).toEqual({ valide: false, raison: "mauvais-appareil" });
  });
});
