/**
 * Change 010, ticket 07 — la logique de liste de l'écran d'un formulaire,
 * testée seule (fonctions pures, sans DOM).
 */
import { describe, it, expect } from "vitest";
import {
  ajouter,
  corpsDEnregistrement,
  deplacer,
  lignesDepuis,
  peutAjouter,
  peutRetirer,
  retirer,
} from "../../src/admin/ilots-svelte-5/formulaire-carte.ts";
import { OPTIONS_PAR_CHAMP_MAX } from "../../src/core/formulaires/declaration.ts";

const PARFUMS = [
  { id: "vanille", libelle: "Vanille", prix: 800 },
  { id: "chocolat", libelle: "Chocolat", prix: 900 },
  { id: "fraise", libelle: "Fraise", prix: 1000 },
];

function libelles(lignes: readonly { libelle: string }[]): string[] {
  return lignes.map((l) => l.libelle);
}

describe("SC-07a — monter un choix", () => {
  it("SC-07a — monter « Fraise » de deux rangs la place en tête, les autres gardent leur ordre", () => {
    // Arrange
    const lignes = lignesDepuis(PARFUMS, 0);

    // Act
    const apres = deplacer(deplacer(lignes, 2, -1), 1, -1);

    // Assert
    expect(libelles(apres)).toEqual(["Fraise", "Vanille", "Chocolat"]);
  });

  it("SC-07a — monter la première ligne ou descendre la dernière ne change rien (bornes)", () => {
    const lignes = lignesDepuis(PARFUMS, 0);
    expect(libelles(deplacer(lignes, 0, -1))).toEqual(libelles(lignes));
    expect(libelles(deplacer(lignes, 2, 1))).toEqual(libelles(lignes));
    expect(libelles(deplacer(lignes, 9, -1))).toEqual(libelles(lignes));
  });

  it("SC-07a — le corps envoyé suit l'ordre de l'écran et garde les identifiants", () => {
    // Arrange
    const lignes = deplacer(deplacer(lignesDepuis(PARFUMS, 0), 2, -1), 1, -1);

    // Act
    const corps = corpsDEnregistrement([
      { id: "parfum", avecPrix: true, lignes },
    ]);

    // Assert
    expect(corps.champs[0]?.options).toEqual([
      { id: "fraise", libelle: "Fraise", prix: "10" },
      { id: "vanille", libelle: "Vanille", prix: "8" },
      { id: "chocolat", libelle: "Chocolat", prix: "9" },
    ]);
  });
});

describe("SC-07b — la saisie part telle quelle", () => {
  it("SC-07b — un prix écrit « douze » est envoyé tel quel, sans être corrigé ni écarté", () => {
    // Arrange
    const lignes = lignesDepuis(PARFUMS, 0).map((l) =>
      l.id === "fraise" ? { ...l, prix: "douze" } : l,
    );

    // Act
    const corps = corpsDEnregistrement([
      { id: "parfum", avecPrix: true, lignes },
    ]);

    // Assert
    expect(corps.champs[0]?.options[2]).toEqual({
      id: "fraise",
      libelle: "Fraise",
      prix: "douze",
    });
  });

  it("SC-07b — un champ sans prix n'envoie aucun prix, une option ajoutée aucun identifiant", () => {
    // Arrange
    const lignes = ajouter(
      lignesDepuis([{ id: "mariage", libelle: "Mariage" }], 0),
      5,
    );

    // Act
    const corps = corpsDEnregistrement([
      { id: "occasion", avecPrix: false, lignes },
    ]);

    // Assert
    expect(corps.champs[0]?.options).toEqual([
      { id: "mariage", libelle: "Mariage" },
      { libelle: "" },
    ]);
  });

  it("SC-07b — le prix prérempli se relit en français (« 12,50 »)", () => {
    const ligne = lignesDepuis([{ id: "a", libelle: "A", prix: 1250 }], 0).at(
      0,
    );
    expect(ligne?.prix).toBe("12,50");
  });
});

describe("SC-07a — ajouter, retirer, bornes", () => {
  it("SC-07a — ajouter pose une ligne vide, sans identifiant, en fin de liste", () => {
    const apres = ajouter(lignesDepuis(PARFUMS, 0), 7);
    expect(apres).toHaveLength(4);
    expect(apres[3]).toEqual({ cle: 7, id: undefined, libelle: "", prix: "" });
  });

  it("SC-07a — au plafond, ajouter ne change rien et peutAjouter est faux", () => {
    // Arrange
    let lignes = lignesDepuis([{ id: "a", libelle: "A" }], 0);
    while (lignes.length < OPTIONS_PAR_CHAMP_MAX)
      lignes = ajouter(lignes, lignes.length);

    // Act / Assert
    expect(lignes).toHaveLength(OPTIONS_PAR_CHAMP_MAX);
    expect(peutAjouter(lignes)).toBe(false);
    expect(ajouter(lignes, 99)).toHaveLength(OPTIONS_PAR_CHAMP_MAX);
    expect(peutAjouter(lignes.slice(1))).toBe(true);
  });

  it("SC-07a — retirer enlève la ligne visée ; la dernière restante ne se retire pas", () => {
    // Arrange
    const lignes = lignesDepuis(PARFUMS, 0);

    // Act
    const apres = retirer(lignes, 1);

    // Assert
    expect(libelles(apres)).toEqual(["Vanille", "Fraise"]);
    const seule = lignesDepuis([{ id: "a", libelle: "A" }], 0);
    expect(peutRetirer(seule)).toBe(false);
    expect(retirer(seule, 0)).toHaveLength(1);
    expect(retirer(lignes, 5)).toHaveLength(3);
  });
});
