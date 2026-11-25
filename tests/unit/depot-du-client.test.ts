/**
 * Ticket 06 (020-deploiement-instance-client) — la logique décidable de la
 * préparation du dépôt du client : ce qui n'y entre jamais, premier remplissage
 * ou rejeu, et le choix des images que le contenu de départ désigne.
 */
import { describe, it, expect } from "vitest";
import {
  EXCLUSIONS_DU_DEPOT,
  choisirLesImages,
  decider,
  estExclu,
  identiteDeLaFiche,
  specificationsDExclusion,
} from "../../src/platform/instance/depot-du-client.ts";

describe("ce qui n'entre jamais dans le dépôt du client", () => {
  it("SC-06c — l'automatisation de la forge est exclue, à la racine comme en profondeur", () => {
    expect(estExclu(".github")).toBe(true);
    expect(estExclu(".github/workflows/ci.yml")).toBe(true);
    expect(estExclu("./.github/workflows/ci.yml")).toBe(true);
  });

  it("SC-06d — l'outillage de recette et les documents de travail de l'intégrateur sont exclus", () => {
    for (const chemin of [".claude/skills/recette/SKILL.md", "recette/cahier.md", "openspec/changes/x.md", "docs/adr/0001.md", "CLAUDE.md"]) {
      expect(estExclu(chemin), chemin).toBe(true);
    }
  });

  it("SC-06a — les fichiers du produit, dont celui d'instance et le contenu, ne sont pas exclus", () => {
    for (const chemin of ["package.json", "instance.json", "src/core/x.ts", "content/pages/accueil/page.json", "scripts/livraison.mjs"]) {
      expect(estExclu(chemin), chemin).toBe(false);
    }
  });

  it("SC-06d — un chemin qui ne fait que commencer par un nom exclu n'est pas exclu (borne)", () => {
    expect(estExclu("docs-publics/a.md")).toBe(false);
    expect(estExclu("CLAUDE.md.bak")).toBe(false);
    expect(estExclu("recettes.json")).toBe(false);
  });

  it("SC-06c — chaque exclusion devient un pathspec d'exclusion de l'extraction", () => {
    expect(specificationsDExclusion()).toEqual(EXCLUSIONS_DU_DEPOT.map((exclu) => `:(exclude)${exclu}`));
    expect(specificationsDExclusion()).toContain(":(exclude).github");
  });
});

describe("premier remplissage ou rejeu", () => {
  it("SC-06a — un dépôt vide reçoit le contenu de départ et la branche des images", () => {
    expect(decider({ aDejaUnCommit: false, brancheDesImagesPosee: false })).toEqual({ contenu: "depart", images: "amorcer" });
  });

  it("SC-06e — un dépôt déjà préparé garde son contenu et sa branche des images", () => {
    expect(decider({ aDejaUnCommit: true, brancheDesImagesPosee: true })).toEqual({ contenu: "garder", images: "laisser" });
  });

  it("SC-06e — le contenu et la branche des images se décident séparément", () => {
    expect(decider({ aDejaUnCommit: true, brancheDesImagesPosee: false })).toEqual({ contenu: "garder", images: "amorcer" });
    expect(decider({ aDejaUnCommit: false, brancheDesImagesPosee: true })).toEqual({ contenu: "depart", images: "laisser" });
  });
});

describe("les images que le contenu de départ désigne", () => {
  const source = ["medias/a.png", "medias/b.webp", "medias/c.jpeg", "medias/variantes/a-300.webp", "medias/d.svg"];

  it("SC-06b — chaque image désignée est reprise, quelle que soit son extension reconnue", () => {
    expect(choisirLesImages(["a", "b", "c"], source)).toEqual({
      retenues: ["medias/a.png", "medias/b.webp", "medias/c.jpeg"],
      manquantes: [],
    });
  });

  it("SC-06b — une image désignée une seule fois est reprise une seule fois", () => {
    expect(choisirLesImages(["a", "a"], source).retenues).toEqual(["medias/a.png"]);
  });

  it("SC-06b — une image désignée sans octets est signalée, et les variantes ne sont jamais reprises", () => {
    const resultat = choisirLesImages(["a-300", "d", "absente"], source);
    expect(resultat.retenues).toEqual([]);
    expect(resultat.manquantes).toEqual(["a-300", "d", "absente"]);
  });

  it("SC-06b — un contenu de départ sans image ne retient rien", () => {
    expect(choisirLesImages([], source)).toEqual({ retenues: [], manquantes: [] });
  });

  it("SC-06b — l'identité d'une fiche se lit sur son texte", () => {
    expect(identiteDeLaFiche('{"id":"media-hero"}')).toBe("media-hero");
  });

  it("SC-06b — une fiche illisible ou sans identité n'en porte aucune", () => {
    for (const texte of ["pas du json", "null", "[]", '{"id":""}', '{"id":"  "}', '{"id":3}', "{}"]) {
      expect(identiteDeLaFiche(texte), texte).toBeNull();
    }
  });
});
