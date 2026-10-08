/**
 * Ticket 07 (008) — Le noyau vérifie la liste des réseaux sociaux.
 * Couture : `appliquerListeReseaux` (logique pure, I2).
 */
import { describe, it, expect } from "vitest";
import { appliquerListeReseaux } from "../../../src/core/reglages/reseaux.ts";

function lien(i: number): { nom: string; lien: string } {
  return { nom: `Lien ${String(i)}`, lien: `https://exemple.fr/${String(i)}` };
}

function champsRefuses(corps: unknown): string[] {
  const verdict = appliquerListeReseaux(corps);
  if (verdict.accepte || verdict.raison !== "valeur-refusee") return [];
  return verdict.refus.map((r) => r.champ);
}

describe("SC-07d — bornes et formes de la liste des réseaux", () => {
  it("SC-07d — 12 liens valides sont acceptés, dans l'ordre", () => {
    // Arrange
    const liste = Array.from({ length: 12 }, (_, i) => lien(i));

    // Act
    const verdict = appliquerListeReseaux({ reseaux: liste });

    // Assert
    expect(verdict.accepte).toBe(true);
    if (verdict.accepte) expect(verdict.reseaux).toEqual(liste);
  });

  it("SC-07d — 13 liens sont refusés", () => {
    const liste = Array.from({ length: 13 }, (_, i) => lien(i));
    const verdict = appliquerListeReseaux({ reseaux: liste });
    expect(verdict.accepte).toBe(false);
    expect(champsRefuses({ reseaux: liste })).toContain("reseaux");
  });

  it("SC-07d — un nom de 40 caractères est accepté, un nom vide ou de 41 caractères refusé", () => {
    expect(
      appliquerListeReseaux({
        reseaux: [{ nom: "a".repeat(40), lien: "https://exemple.fr" }],
      }).accepte,
    ).toBe(true);
    expect(
      champsRefuses({ reseaux: [{ nom: "", lien: "https://exemple.fr" }] }),
    ).toEqual(["reseaux.0.nom"]);
    expect(
      champsRefuses({ reseaux: [{ nom: "   ", lien: "https://exemple.fr" }] }),
    ).toEqual(["reseaux.0.nom"]);
    expect(
      champsRefuses({
        reseaux: [{ nom: "a".repeat(41), lien: "https://exemple.fr" }],
      }),
    ).toEqual(["reseaux.0.nom"]);
  });

  it.each([
    ["http://exemple.fr"],
    ["javascript:alert(1)"],
    ["mailto:a@exemple.fr"],
    ["pas une adresse"],
  ])("SC-07d — l'adresse « %s » est refusée", (adresse) => {
    const verdict = appliquerListeReseaux({
      reseaux: [{ nom: "Instagram", lien: adresse }],
    });
    expect(verdict.accepte).toBe(false);
    expect(
      champsRefuses({ reseaux: [{ nom: "Instagram", lien: adresse }] }),
    ).toEqual(["reseaux.0.lien"]);
  });

  it("SC-07d — la liste vide est admise et le nom est trimé", () => {
    const vide = appliquerListeReseaux({ reseaux: [] });
    expect(vide.accepte && vide.reseaux).toEqual([]);
    const trime = appliquerListeReseaux({
      reseaux: [{ nom: "  Blog  ", lien: " https://exemple.fr " }],
    });
    expect(trime.accepte && trime.reseaux).toEqual([
      { nom: "Blog", lien: "https://exemple.fr" },
    ]);
  });
});
