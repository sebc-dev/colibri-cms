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
});
