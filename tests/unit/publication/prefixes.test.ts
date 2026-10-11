/**
 * Change 011, ticket 12 — les préfixes que la publication a le droit
 * d'écrire (I9, ADR-0025), seul porteur : `src/core/publication/prefixes.ts`.
 */
import { describe, it, expect } from "vitest";
import {
  PREFIXES_AUTORISES,
  cheminAutorise,
  identifiantValide,
} from "../../../src/core/publication/prefixes.ts";

describe("PREFIXES_AUTORISES", () => {
  it("SC-12d — la branche principale n'a que les préfixes du contenu, jamais .github/", () => {
    expect([...PREFIXES_AUTORISES.principale].sort((a, b) => a.localeCompare(b))).toEqual(
      [
        "content/formulaires/",
        "content/medias/",
        "content/pages/",
        "content/publication.json",
        "content/reglages/",
      ].sort((a, b) => a.localeCompare(b)),
    );
    for (const prefixe of [...PREFIXES_AUTORISES.principale, ...PREFIXES_AUTORISES.media]) {
      expect(prefixe.startsWith(".github")).toBe(false);
    }
  });

  it("SC-12d — la branche des images n'a que medias/", () => {
    expect([...PREFIXES_AUTORISES.media]).toEqual(["medias/"]);
  });
});

describe("cheminAutorise", () => {
  it.each([
    "content/pages/accueil/page.json",
    "content/pages/accueil/presentation.md",
    "content/reglages/reglages.json",
    "content/formulaires/devis-gateau/formulaire.json",
    "content/medias/media-fixture-hero.json",
    "content/publication.json",
  ])("SC-12d — %s est autorisé sur la branche principale", (chemin) => {
    expect(cheminAutorise(chemin)).toBe(true);
  });

  it.each([
    [".github/workflows/build.yml"],
    [".github/CODEOWNERS"],
    ["src/core/zone.ts"],
    ["package.json"],
    ["medias/abc.png"],
    ["content/pagesX/accueil/page.json"],
  ])("SC-12d — %s est refusé sur la branche principale", (chemin) => {
    expect(cheminAutorise(chemin)).toBe(false);
  });

  it.each([
    ["segment .. qui sort du préfixe", "content/pages/../../.github/workflows/build.yml"],
    ["segment .. même retombant dans un préfixe", "content/pages/../pages/accueil/page.json"],
    ["segment vide", "content/pages//accueil/page.json"],
    ["chemin absolu", "/content/pages/accueil/page.json"],
    ["chemin vide", ""],
  ])("SC-12d — un chemin à %s est refusé", (_cas, chemin) => {
    expect(cheminAutorise(chemin)).toBe(false);
  });

  it("SC-12d — la branche des images accepte medias/ et refuse le reste", () => {
    expect(cheminAutorise("medias/abc.png", "media")).toBe(true);
    expect(cheminAutorise("content/pages/accueil/page.json", "media")).toBe(false);
    expect(cheminAutorise(".github/workflows/build.yml", "media")).toBe(false);
  });
});

describe("identifiantValide", () => {
  it.each(["accueil", "devis-gateau", "a", "media-2", "9lunes"])(
    "SC-12d — « %s » est un identifiant admis",
    (id) => {
      expect(identifiantValide(id)).toBe(true);
    },
  );

  it.each([
    ["vide", ""],
    ["point de départ", ".github"],
    ["remontée", ".."],
    ["séparateur", "a/b"],
    ["majuscule", "Accueil"],
    ["tiret de tête", "-accueil"],
    ["espace", "mon page"],
    ["accent", "présentation"],
  ])("SC-12d — un identifiant %s est refusé", (_cas, id) => {
    expect(identifiantValide(id)).toBe(false);
  });
});
