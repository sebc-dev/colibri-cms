/**
 * Ticket 06 — les options courantes d'un formulaire (SC-06d), ADR-0018.
 * Couture : `optionsCourantes(formulaireDeclare, brouillon)` de
 * `src/core/formulaires/brouillon.ts`, fonction pure (I2).
 */
import { describe, it, expect } from "vitest";
import type { FormulaireDeclare } from "../../../src/core/formulaires/declaration.ts";
import { optionsCourantes } from "../../../src/core/formulaires/brouillon.ts";

const DECLARATION: FormulaireDeclare = {
  id: "gateau",
  nom: "Devis gâteau",
  champs: [
    {
      id: "parfum",
      nature: "choix-unique",
      libelle: "Parfum",
      obligatoire: true,
      avecPrix: true,
      options: [
        { id: "vanille", libelle: "Vanille", prix: 800 },
        { id: "chocolat", libelle: "Chocolat", prix: 900 },
      ],
    },
    {
      id: "decor",
      nature: "choix-multiple",
      libelle: "Décor",
      obligatoire: false,
      avecPrix: false,
      options: [{ id: "fleurs", libelle: "Fleurs" }],
    },
    {
      id: "nom",
      nature: "texte",
      libelle: "Nom",
      obligatoire: true,
      avecPrix: false,
    },
  ],
};

describe("SC-06d — un brouillon qui ne s'accorde plus à la déclaration", () => {
  it("SC-06d — ignore le champ disparu, montre le départ du champ nouveau, garde les autres champs, sans échouer", () => {
    // Arrange : « ancien » n'est plus déclaré ; « decor » est inconnu du brouillon.
    const brouillon = {
      champs: {
        parfum: [{ id: "vanille", libelle: "Vanille", prix: 1000 }],
        ancien: [{ id: "x", libelle: "Disparu" }],
      },
      derniersNumeros: {},
    };

    // Act
    const courantes = optionsCourantes(DECLARATION, brouillon);

    // Assert
    expect(courantes.has("ancien")).toBe(false);
    expect(courantes.get("decor")).toEqual([
      { id: "fleurs", libelle: "Fleurs" },
    ]);
    expect(courantes.get("parfum")).toEqual([
      { id: "vanille", libelle: "Vanille", prix: 1000 },
    ]);
    expect(courantes.has("nom")).toBe(false);
  });

  it("SC-06d — un brouillon de forme inattendue est tenu pour absent", () => {
    for (const brouillon of [undefined, null, 42, "x", [], { champs: 3 }]) {
      const courantes = optionsCourantes(DECLARATION, brouillon);
      expect(courantes.get("parfum")).toEqual(DECLARATION.champs[0]?.options);
    }
  });

  it("SC-06d — un champ dont le brouillon ne s'accorde plus (prix absents) montre la déclaration", () => {
    const brouillon = {
      champs: { parfum: [{ id: "vanille", libelle: "Vanille" }] },
    };

    const courantes = optionsCourantes(DECLARATION, brouillon);

    expect(courantes.get("parfum")).toEqual(DECLARATION.champs[0]?.options);
  });

  // Le brouillon d'un champ à choix porte toute sa liste : ce que la
  // publication en fera est réservé à la story « Aperçu et publication »
  // (docs/adr/_candidates/brouillon-d-un-champ-a-choix-porte-toute-sa-liste.md).
  it("SC-06d — la liste du brouillon reste celle de l'éditrice : les options de départ ajoutées, retirées ou renommées depuis ne s'y mêlent pas", () => {
    // Arrange : la déclaration offre vanille et chocolat ; le brouillon porte
    // vanille renommée et fraise, une option que la déclaration n'a plus.
    const brouillon = {
      champs: {
        parfum: [
          { id: "vanille", libelle: "Vanille de Madagascar", prix: 1000 },
          { id: "fraise", libelle: "Fraise", prix: 1100 },
        ],
      },
      derniersNumeros: {},
    };

    // Act
    const courantes = optionsCourantes(DECLARATION, brouillon);

    // Assert
    expect(courantes.get("parfum")).toEqual([
      { id: "vanille", libelle: "Vanille de Madagascar", prix: 1000 },
      { id: "fraise", libelle: "Fraise", prix: 1100 },
    ]);
  });

  it("SC-06d — un champ passé de choix multiple à choix unique garde la liste de son brouillon", () => {
    // Arrange : « decor » devient un choix unique, sans changer de marque de prix.
    const declaration: FormulaireDeclare = {
      ...DECLARATION,
      champs: DECLARATION.champs.map((champ) =>
        champ.id === "decor" ? { ...champ, nature: "choix-unique" } : champ,
      ),
    };
    const brouillon = {
      champs: { decor: [{ id: "o2", libelle: "Rubans" }] },
      derniersNumeros: { decor: 2 },
    };

    // Act
    const courantes = optionsCourantes(declaration, brouillon);

    // Assert
    expect(courantes.get("decor")).toEqual([{ id: "o2", libelle: "Rubans" }]);
  });

  it("SC-06d — un champ devenu sans option ne montre aucune option de son brouillon", () => {
    // Arrange : « decor » devient un champ texte, sans option.
    const declaration: FormulaireDeclare = {
      ...DECLARATION,
      champs: DECLARATION.champs.map((champ) =>
        champ.id === "decor"
          ? { id: "decor", nature: "texte", libelle: "Décor", obligatoire: false, avecPrix: false }
          : champ,
      ),
    };
    const brouillon = {
      champs: { decor: [{ id: "fleurs", libelle: "Fleurs" }] },
      derniersNumeros: {},
    };

    // Act
    const courantes = optionsCourantes(declaration, brouillon);

    // Assert
    expect(courantes.has("decor")).toBe(false);
  });
});
