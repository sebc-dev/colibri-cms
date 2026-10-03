/**
 * Ticket 02 — Le produit lit la déclaration des réglages posée par
 * l'intégrateur (openspec/changes/008-reglages-transverses/tickets/
 * 02-lire-la-declaration-des-reglages.md), ADR-0017.
 *
 * Couture : `lireReglagesDeclares(reglagesJson, mention)` de
 * `src/core/reglages/declaration.ts`, fonction pure (I2) qui reçoit le contenu
 * brut de `reglages.json` et le texte de `mention.md`.
 */
import { describe, it, expect } from "vitest";
import { lireReglagesDeclares } from "../../../src/core/reglages/declaration.ts";

describe("lecture de la déclaration des réglages", () => {
  it("SC-02a — trois coordonnées valides sont rendues dans l'ordre déclaré, avec identifiant, nature, nom et valeur", () => {
    const brut = {
      coordonnees: [
        {
          id: "telephone",
          nature: "telephone",
          nom: "Téléphone de l'atelier",
          valeur: "01 23 45 67 89",
        },
        {
          id: "courriel",
          nature: "email",
          nom: "Courriel",
          valeur: "atelier@example.org",
        },
        {
          id: "adresse",
          nature: "adresse",
          nom: "Adresse",
          valeur: "1 rue des Tilleuls, 75000 Paris",
        },
      ],
      reseaux: [],
    };

    const lu = lireReglagesDeclares(brut, "");

    expect(lu.coordonnees).toEqual([
      {
        id: "telephone",
        nature: "telephone",
        nom: "Téléphone de l'atelier",
        valeur: "01 23 45 67 89",
      },
      {
        id: "courriel",
        nature: "email",
        nom: "Courriel",
        valeur: "atelier@example.org",
      },
      {
        id: "adresse",
        nature: "adresse",
        nom: "Adresse",
        valeur: "1 rue des Tilleuls, 75000 Paris",
      },
    ]);
  });

  it("SC-02b — nature inconnue, identifiant absent et identifiant répété sont écartés, la valide reste, sans échec", () => {
    const brut = {
      coordonnees: [
        { id: "a", nature: "texte", nom: "Première", valeur: "un" },
        { id: "b", nature: "fax", nom: "Nature inconnue", valeur: "deux" },
        { nature: "texte", nom: "Sans identifiant", valeur: "trois" },
        { id: "a", nature: "texte", nom: "Répétée", valeur: "quatre" },
      ],
      reseaux: [],
    };

    const lecture = () => lireReglagesDeclares(brut, "");

    expect(lecture).not.toThrow();
    expect(lecture().coordonnees).toEqual([
      { id: "a", nature: "texte", nom: "Première", valeur: "un" },
    ]);
  });

  it("SC-02c — une coordonnée sans nom ou au nom fait d'espaces est lue sans nom, jamais nommée d'après son identifiant", () => {
    const brut = {
      coordonnees: [
        { id: "sans-nom", nature: "email", valeur: "a@example.org" },
        { id: "nom-blanc", nature: "texte", nom: "   ", valeur: "x" },
      ],
      reseaux: [],
    };

    const { coordonnees } = lireReglagesDeclares(brut, "");

    expect(coordonnees).toHaveLength(2);
    for (const coordonnee of coordonnees) {
      expect(coordonnee.nom).toBeUndefined();
      expect(coordonnee).not.toHaveProperty("nom", coordonnee.id);
      const { id, ...horsId } = coordonnee;
      expect(Object.values(horsId)).not.toContain(id);
    }
    expect(coordonnees.map((c) => c.id)).toEqual(["sans-nom", "nom-blanc"]);
  });

  it("SC-02d — un répertoire garni rend le contenu de départ des trois réglages", () => {
    const brut = {
      coordonnees: [
        {
          id: "tel",
          nature: "telephone",
          nom: "Téléphone",
          valeur: "01 23 45 67 89",
        },
      ],
      reseaux: [
        { nom: "Instagram", lien: "https://example.org/insta" },
        { nom: "Facebook", lien: "https://example.org/fb" },
      ],
    };

    const lu = lireReglagesDeclares(
      brut,
      "Vos données servent à répondre à votre demande.",
    );

    expect(lu.coordonnees).toEqual([
      {
        id: "tel",
        nature: "telephone",
        nom: "Téléphone",
        valeur: "01 23 45 67 89",
      },
    ]);
    expect(lu.reseaux).toEqual([
      { nom: "Instagram", lien: "https://example.org/insta" },
      { nom: "Facebook", lien: "https://example.org/fb" },
    ]);
    expect(lu.mention).toBe("Vos données servent à répondre à votre demande.");
  });
});
