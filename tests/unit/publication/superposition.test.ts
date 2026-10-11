/**
 * Change 011, ticket 01 — la superposition déclaration < publié < brouillon,
 * côté `core/` (pur, I2 : aucune lecture de base, les données sont injectées).
 * Couture : `appliquerBrouillonSurEmplacement` appliqué deux fois (SC-01a,
 * SC-01g) et `optionsCourantes` avec la liste publiée en repli (SC-01f).
 */
import { describe, it, expect } from "vitest";
import {
  appliquerBrouillonSurEmplacement,
  type Brouillon,
  type ContenuCorrige,
} from "../../../src/core/pages/brouillon.ts";
import type { Emplacement } from "../../../src/core/pages/declaration.ts";
import type { FormulaireDeclare } from "../../../src/core/formulaires/declaration.ts";
import { optionsCourantes } from "../../../src/core/formulaires/brouillon.ts";

const BOUTON: Emplacement = {
  id: "bouton",
  nature: "bouton-action",
  rang: 0,
  libelle: "Départ",
  destination: "/depart",
};
const VIDEO: Emplacement = {
  id: "video",
  nature: "lien-video",
  rang: 1,
  lien: "https://www.youtube.com/watch?v=depart",
};

function brouillonDe(...corrections: [string, ContenuCorrige][]): Brouillon {
  return new Map(corrections);
}

function superposer(
  emplacement: Emplacement,
  publie: Brouillon,
  brouillon: Brouillon,
): Emplacement {
  return appliquerBrouillonSurEmplacement(
    appliquerBrouillonSurEmplacement(emplacement, publie),
    brouillon,
  );
}

describe("SC-01a — brouillon s'il y en a un, publié sinon, départ à défaut", () => {
  const publie = brouillonDe(
    [
      "bouton",
      { nature: "bouton-action", libelle: "Publié", destination: "/publie" },
    ],
    [
      "video",
      { nature: "lien-video", lien: "https://www.youtube.com/watch?v=publie" },
    ],
  );
  const brouillon = brouillonDe([
    "bouton",
    {
      nature: "bouton-action",
      libelle: "Brouillon",
      destination: "/brouillon",
    },
  ]);

  it("SC-01a — l'emplacement qui porte un brouillon montre le brouillon", () => {
    expect(superposer(BOUTON, publie, brouillon)).toMatchObject({
      libelle: "Brouillon",
      destination: "/brouillon",
    });
  });

  it("SC-01a — l'emplacement sans brouillon montre sa dernière version publiée", () => {
    expect(superposer(VIDEO, publie, brouillon)).toMatchObject({
      lien: "https://www.youtube.com/watch?v=publie",
    });
  });

  it("SC-01a — l'emplacement jamais publié et sans brouillon montre son contenu de départ", () => {
    expect(superposer(BOUTON, new Map(), new Map())).toEqual(BOUTON);
  });
});

describe("SC-01g — une version publiée qui ne correspond plus à la déclaration est ignorée", () => {
  it("SC-01g — la version publiée d'une autre nature que celle déclarée n'est pas montrée", () => {
    const publie = brouillonDe([
      "bouton",
      { nature: "lien-video", lien: "https://exemple.test/v" },
    ]);

    expect(superposer(BOUTON, publie, new Map())).toEqual(BOUTON);
  });

  it("SC-01g — un emplacement retiré de la déclaration n'est jamais produit, un ajouté présente son départ", () => {
    // Arrange : la déclaration ne porte plus « ancien », et porte « nouveau ».
    const nouveau: Emplacement = {
      id: "nouveau",
      nature: "bouton-action",
      rang: 0,
      libelle: "Départ du nouveau",
      destination: "/nouveau",
    };
    const publie = brouillonDe([
      "ancien",
      {
        nature: "bouton-action",
        libelle: "Ancien publié",
        destination: "/ancien",
      },
    ]);

    // Act : la lecture parcourt la déclaration, jamais l'état publié.
    const montres = [nouveau].map((e) => superposer(e, publie, new Map()));

    // Assert
    expect(montres).toEqual([nouveau]);
    expect(JSON.stringify(montres)).not.toContain("Ancien publié");
  });
});

describe("SC-01f — champ à choix dont la marque avec/sans prix change", () => {
  function declaration(avecPrix: boolean): FormulaireDeclare {
    return {
      id: "f",
      nom: "F",
      champs: [
        {
          id: "decor",
          nature: "choix-multiple",
          libelle: "Décor",
          obligatoire: false,
          avecPrix,
          options: avecPrix
            ? [{ id: "d1", libelle: "Départ", prix: 100 }]
            : [{ id: "d1", libelle: "Départ" }],
        },
      ],
    };
  }

  it("SC-01f — champ passé sans prix : brouillon avec prix désaccordé, liste publiée sans prix accordée, lecture sur le publié", () => {
    const brouillon = {
      champs: { decor: [{ id: "b1", libelle: "Brouillon", prix: 500 }] },
      derniersNumeros: {},
    };
    const publie = {
      champs: { decor: [{ id: "p1", libelle: "Publié" }] },
      derniersNumeros: {},
    };

    const courantes = optionsCourantes(declaration(false), brouillon, publie);

    expect(courantes.get("decor")).toEqual([{ id: "p1", libelle: "Publié" }]);
  });

  it("SC-01f — champ passé avec prix : brouillon sans prix désaccordé, liste publiée avec prix accordée, lecture sur le publié", () => {
    const brouillon = {
      champs: { decor: [{ id: "b1", libelle: "Brouillon" }] },
      derniersNumeros: {},
    };
    const publie = {
      champs: { decor: [{ id: "p1", libelle: "Publié", prix: 700 }] },
      derniersNumeros: {},
    };

    const courantes = optionsCourantes(declaration(true), brouillon, publie);

    expect(courantes.get("decor")).toEqual([
      { id: "p1", libelle: "Publié", prix: 700 },
    ]);
  });

  it("SC-01f — publié lui aussi désaccordé : retombe sur le contenu de départ sans échouer", () => {
    const brouillon = {
      champs: { decor: [{ id: "b1", libelle: "Brouillon", prix: 500 }] },
      derniersNumeros: {},
    };
    const publie = {
      champs: { decor: [{ id: "p1", libelle: "Publié", prix: 700 }] },
      derniersNumeros: {},
    };

    const courantes = optionsCourantes(declaration(false), brouillon, publie);

    expect(courantes.get("decor")).toEqual([{ id: "d1", libelle: "Départ" }]);
  });

  it("SC-01f — brouillon accordé : il prime sur le publié", () => {
    const brouillon = {
      champs: { decor: [{ id: "b1", libelle: "Brouillon" }] },
      derniersNumeros: {},
    };
    const publie = {
      champs: { decor: [{ id: "p1", libelle: "Publié" }] },
      derniersNumeros: {},
    };

    const courantes = optionsCourantes(declaration(false), brouillon, publie);

    expect(courantes.get("decor")).toEqual([
      { id: "b1", libelle: "Brouillon" },
    ]);
  });
});
