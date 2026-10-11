/**
 * La fiche d'une image publiée — change 011, ticket 02 (ADR-0022, FR-108).
 */
import { describe, it, expect } from "vitest";
import { lireFicheMedia } from "../../../src/core/medias/fiche.ts";

const fiche = {
  id: "media-fixture-hero",
  nomOrigine: "media-fixture-hero.png",
  format: "png",
  largeur: 1280,
  hauteur: 640,
  description: "Image d'accueil",
};

describe("lireFicheMedia", () => {
  it("SC-02a — une fiche bien formée est lue avec son nom, ses dimensions et sa description", () => {
    expect(lireFicheMedia(fiche)).toEqual(fiche);
  });

  it("SC-02a — une description vide reste une fiche valide", () => {
    expect(lireFicheMedia({ ...fiche, description: "" })?.description).toBe("");
  });

  it.each([
    ["non objet", "texte"],
    ["null", null],
    ["id vide", { ...fiche, id: "  " }],
    ["nom absent", { ...fiche, nomOrigine: undefined }],
    ["format inconnu", { ...fiche, format: "svg" }],
    ["largeur nulle", { ...fiche, largeur: 0 }],
    ["hauteur fractionnaire", { ...fiche, hauteur: 1.5 }],
    ["description non texte", { ...fiche, description: 3 }],
  ])("SC-02a — une fiche mal formée (%s) est refusée", (_cas, brut) => {
    expect(lireFicheMedia(brut)).toBeNull();
  });
});
