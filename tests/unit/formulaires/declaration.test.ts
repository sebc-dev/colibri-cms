/**
 * Ticket 01 — Le produit lit les formulaires déclarés par l'intégrateur
 * (openspec/changes/010-reglage-des-formulaires/tickets/
 * 01-lire-la-declaration-des-formulaires.md), ADR-0018.
 *
 * Couture : `lireFormulairesDeclares(fichiers)` de
 * `src/core/formulaires/declaration.ts`, fonction pure (I2) qui reçoit la
 * liste des fichiers bruts `{ id, contenu }` (id = nom du répertoire).
 */
import { describe, it, expect } from "vitest";
import { lireFormulairesDeclares } from "../../../src/core/formulaires/declaration.ts";

function trouver<T extends { readonly id: string }>(
  liste: readonly T[],
  id: string,
): T {
  const trouve = liste.find((e) => e.id === id);
  if (trouve === undefined) throw new Error(`entrée absente : ${id}`);
  return trouve;
}

const GATEAU = {
  nom: "Devis gâteau",
  champs: [
    {
      id: "parfum",
      nature: "choix-unique",
      libelle: "Parfum",
      avecPrix: true,
      options: [
        { id: "vanille", libelle: "Vanille", prix: 800 },
        { id: "chocolat", libelle: "Chocolat", prix: 900 },
        { id: "fraise", libelle: "Fraise", prix: 1000 },
      ],
    },
    {
      id: "occasion",
      nature: "choix-multiple",
      libelle: "Occasion",
      options: [
        { id: "anniversaire", libelle: "Anniversaire" },
        { id: "mariage", libelle: "Mariage" },
      ],
    },
    { id: "nom", nature: "texte", libelle: "Votre nom" },
    {
      id: "courriel",
      nature: "email",
      libelle: "Votre adresse e-mail",
      obligatoire: true,
    },
  ],
};

const ATELIER = {
  nom: "Devis atelier",
  champs: [
    {
      id: "stage",
      nature: "choix-unique",
      libelle: "Stage",
      avecPrix: true,
      options: [{ id: "initiation", libelle: "Initiation", prix: 4500 }],
    },
    {
      id: "niveau",
      nature: "choix-unique",
      libelle: "Niveau",
      options: [
        { id: "debutant", libelle: "Débutant" },
        { id: "confirme", libelle: "Confirmé" },
      ],
    },
    { id: "message", nature: "texte-long", libelle: "Message" },
    { id: "telephone", nature: "telephone", libelle: "Téléphone" },
  ],
};

describe("lecture de la déclaration des formulaires", () => {
  it("SC-01a — deux formulaires valides sont rendus par identifiant croissant, champs et options dans l'ordre déclaré", () => {
    const lus = lireFormulairesDeclares([
      { id: "devis-gateau", contenu: GATEAU },
      { id: "devis-atelier", contenu: ATELIER },
    ]);

    expect(lus.map((f) => f.id)).toEqual(["devis-atelier", "devis-gateau"]);

    const atelier = trouver(lus, "devis-atelier");
    expect(atelier.nom).toBe("Devis atelier");
    expect(atelier.champs.map((c) => c.id)).toEqual([
      "stage",
      "niveau",
      "message",
      "telephone",
    ]);
    expect(atelier.champs.map((c) => c.nature)).toEqual([
      "choix-unique",
      "choix-unique",
      "texte-long",
      "telephone",
    ]);
    expect(atelier.champs.map((c) => c.libelle)).toEqual([
      "Stage",
      "Niveau",
      "Message",
      "Téléphone",
    ]);

    const gateau = trouver(lus, "devis-gateau");
    expect(gateau.nom).toBe("Devis gâteau");
    expect(gateau.champs.map((c) => c.id)).toEqual([
      "parfum",
      "occasion",
      "nom",
      "courriel",
    ]);
    const parfum = trouver(gateau.champs, "parfum");
    expect(parfum.options?.map((o) => o.id)).toEqual([
      "vanille",
      "chocolat",
      "fraise",
    ]);
    expect(parfum.options?.map((o) => o.libelle)).toEqual([
      "Vanille",
      "Chocolat",
      "Fraise",
    ]);
    const occasion = trouver(gateau.champs, "occasion");
    expect(occasion.options?.map((o) => o.id)).toEqual([
      "anniversaire",
      "mariage",
    ]);
    const nom = trouver(gateau.champs, "nom");
    expect(nom.options ?? []).toEqual([]);
    expect(trouver(gateau.champs, "courriel").obligatoire).toBe(true);
    expect(nom.obligatoire).toBe(false);
  });

  it("SC-01b — le prix de chaque option d'un champ avec prix est lu ; un prix d'option d'un champ sans prix est ignoré", () => {
    const lus = lireFormulairesDeclares([
      {
        id: "devis",
        contenu: {
          nom: "Devis",
          champs: [
            {
              id: "parfum",
              nature: "choix-unique",
              libelle: "Parfum",
              avecPrix: true,
              options: [
                { id: "vanille", libelle: "Vanille", prix: 800 },
                { id: "chocolat", libelle: "Chocolat", prix: 1200 },
              ],
            },
            {
              id: "occasion",
              nature: "choix-unique",
              libelle: "Occasion",
              options: [
                { id: "fete", libelle: "Fête", prix: 500 },
                { id: "deuil", libelle: "Deuil" },
              ],
            },
          ],
        },
      },
    ]);

    const champs = trouver(lus, "devis").champs;
    const parfum = trouver(champs, "parfum");
    expect(parfum.avecPrix).toBe(true);
    expect(parfum.options?.map((o) => o.prix)).toEqual([800, 1200]);

    const occasion = trouver(champs, "occasion");
    expect(occasion.avecPrix).toBe(false);
    expect(occasion.options?.map((o) => o.id)).toEqual(["fete", "deuil"]);
    for (const option of occasion.options ?? []) {
      expect(option.prix).toBeUndefined();
      expect("prix" in option).toBe(false);
    }
  });

  it("SC-01c — nature inconnue, identifiant de champ répété et option sans prix en champ avec prix sont écartés, le reste est lu", () => {
    const lire = () =>
      lireFormulairesDeclares([
        {
          id: "devis",
          contenu: {
            nom: "Devis",
            champs: [
              { id: "nom", nature: "texte", libelle: "Nom" },
              { id: "date", nature: "calendrier", libelle: "Date" },
              { id: "doublon", nature: "texte", libelle: "Premier" },
              { id: "doublon", nature: "email", libelle: "Second" },
              {
                id: "parfum",
                nature: "choix-unique",
                libelle: "Parfum",
                avecPrix: true,
                options: [
                  { id: "vanille", libelle: "Vanille", prix: 800 },
                  { id: "sans-prix", libelle: "Sans prix" },
                  { id: "chocolat", libelle: "Chocolat", prix: 900 },
                ],
              },
              { id: "message", nature: "texte-long", libelle: "Message" },
            ],
          },
        },
      ]);

    expect(lire).not.toThrow();
    const champs = trouver(lire(), "devis").champs;
    expect(champs.map((c) => c.id)).toEqual([
      "nom",
      "doublon",
      "parfum",
      "message",
    ]);
    const doublon = trouver(champs, "doublon");
    expect(doublon.nature).toBe("texte");
    expect(doublon.libelle).toBe("Premier");
    const parfum = trouver(champs, "parfum");
    expect(parfum.options?.map((o) => o.id)).toEqual(["vanille", "chocolat"]);
    expect(parfum.options?.map((o) => o.prix)).toEqual([800, 900]);
  });

  it("SC-01d — un champ à choix sans option lisible et un formulaire sans champ lisible sont écartés, les autres sont lus", () => {
    const lus = lireFormulairesDeclares([
      {
        id: "devis-ok",
        contenu: {
          nom: "Devis ok",
          champs: [
            { id: "nom", nature: "texte", libelle: "Nom" },
            {
              id: "parfum",
              nature: "choix-unique",
              libelle: "Parfum",
              avecPrix: true,
              options: [
                { id: "sans-prix", libelle: "Sans prix" },
                { id: "negatif", libelle: "Négatif", prix: -1 },
                { id: "trop", libelle: "Trop cher", prix: 10_000_000 },
                { id: "decimal", libelle: "Décimal", prix: 12.5 },
                { libelle: "Sans identifiant", prix: 100 },
                { id: "sans-libelle", prix: 100 },
              ],
            },
          ],
        },
      },
      {
        id: "devis-casse",
        contenu: {
          nom: "Devis cassé",
          champs: [
            { id: "inconnu", nature: "calendrier", libelle: "Date" },
            { nature: "texte", libelle: "Sans identifiant" },
            {
              id: "vide",
              nature: "choix-unique",
              libelle: "Vide",
              options: [],
            },
          ],
        },
      },
      {
        id: "autre",
        contenu: {
          nom: "Autre",
          champs: [{ id: "message", nature: "texte-long", libelle: "Message" }],
        },
      },
    ]);

    expect(lus.map((f) => f.id)).toEqual(["autre", "devis-ok"]);
    const ok = trouver(lus, "devis-ok");
    expect(ok.champs.map((c) => c.id)).toEqual(["nom"]);
  });
});
