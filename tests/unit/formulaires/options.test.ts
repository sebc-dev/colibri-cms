/**
 * Ticket 03 — vérifier une correction des options (SC-03b à SC-03h), ADR-0018.
 * Couture : `appliquerOptions(formulaireDeclare, brouillonCourant, corpsBrut)`
 * de `src/core/formulaires/options.ts`, fonction pure (I2).
 */
import { describe, it, expect } from "vitest";
import {
  LIBELLE_OPTION_LONGUEUR_MAX,
  OPTIONS_PAR_CHAMP_MAX,
  type FormulaireDeclare,
} from "../../../src/core/formulaires/declaration.ts";
import { appliquerOptions } from "../../../src/core/formulaires/options.ts";

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
        { id: "o1", libelle: "Vanille", prix: 1200 },
        { id: "o2", libelle: "Chocolat", prix: 1500 },
      ],
    },
    {
      id: "decor",
      nature: "choix-multiple",
      libelle: "Décor",
      obligatoire: false,
      avecPrix: false,
      options: [{ id: "o1", libelle: "Fleurs" }],
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

const BROUILLON_VIDE = { champs: {}, derniersNumeros: {} };

const PARFUM_VALIDE = {
  id: "parfum",
  options: [
    { id: "o1", libelle: "Vanille", prix: "12" },
    { id: "o2", libelle: "Chocolat", prix: "15" },
  ],
};
const DECOR_VALIDE = {
  id: "decor",
  options: [{ id: "o1", libelle: "Fleurs" }],
};

function corps(...champs: unknown[]): unknown {
  return { champs };
}

function parfumAvec(options: unknown[]): unknown {
  return corps({ id: "parfum", options }, DECOR_VALIDE);
}

function decorAvec(options: unknown[]): unknown {
  return corps(PARFUM_VALIDE, { id: "decor", options });
}

function refusDe(resultat: ReturnType<typeof appliquerOptions>) {
  expect(resultat.ok).toBe(false);
  expect(resultat).toMatchObject({ ok: false, erreur: "valeur-refusee" });
  expect(resultat).not.toHaveProperty("contenu");
  return (resultat as { refus: { champ: string; raison: string }[] }).refus;
}

describe("soumission valide (référence)", () => {
  it("SC-03d — la soumission de référence est acceptée, libellés nettoyés, prix en centimes", () => {
    const r = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      corps(
        {
          id: "parfum",
          options: [
            { id: "o1", libelle: "  Vanille ", prix: "12,5" },
            { id: "o2", libelle: "Chocolat", prix: "15" },
          ],
        },
        DECOR_VALIDE,
      ),
    );
    expect(r).toMatchObject({
      ok: true,
      contenu: {
        champs: {
          parfum: [
            { id: "o1", libelle: "Vanille", prix: 1250 },
            { id: "o2", libelle: "Chocolat", prix: 1500 },
          ],
          decor: [{ id: "o1", libelle: "Fleurs" }],
        },
      },
    });
  });
});

describe("SC-03b — prix refusé", () => {
  it.each(["", "-1", "12,505", "douze", "100000"])(
    "SC-03b — prix « %s » refusé sur le prix de cette option",
    (prix) => {
      const r = appliquerOptions(
        DECLARATION,
        BROUILLON_VIDE,
        parfumAvec([
          { id: "o1", libelle: "Vanille", prix: "12" },
          { id: "o2", libelle: "Chocolat", prix },
        ]),
      );
      const refus = refusDe(r);
      expect(refus.map((x) => x.champ)).toContain("parfum.1.prix");
    },
  );
});

describe("SC-03c — au moins une option", () => {
  it("SC-03c — champ à choix soumis sans option refusé sur ce champ", () => {
    const refus = refusDe(
      appliquerOptions(DECLARATION, BROUILLON_VIDE, decorAvec([])),
    );
    expect(refus.map((x) => x.champ)).toContain("decor");
  });
});

describe("SC-03d — au plus 30 options", () => {
  const options = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ libelle: `Décor ${String(i)}` }));

  it("SC-03d — les bornes sont des constantes nommées", () => {
    expect(OPTIONS_PAR_CHAMP_MAX).toBe(30);
    expect(LIBELLE_OPTION_LONGUEUR_MAX).toBe(80);
  });

  it("SC-03d — 30 options valides sont acceptées", () => {
    const r = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      decorAvec(options(30)),
    );
    expect(r.ok).toBe(true);
  });

  it("SC-03d — 31 options sont refusées sur ce champ", () => {
    const refus = refusDe(
      appliquerOptions(DECLARATION, BROUILLON_VIDE, decorAvec(options(31))),
    );
    expect(refus.map((x) => x.champ)).toContain("decor");
  });
});

describe("SC-03e — libellé d'option", () => {
  it.each([
    ["espaces seuls", "   "],
    ["81 caractères", "a".repeat(81)],
    ["saut de ligne", "Fleurs\nroses"],
  ])(
    "SC-03e — libellé %s refusé sur le libellé de l'option",
    (_nom, libelle) => {
      const refus = refusDe(
        appliquerOptions(
          DECLARATION,
          BROUILLON_VIDE,
          decorAvec([{ id: "o1", libelle }]),
        ),
      );
      expect(refus.map((x) => x.champ)).toContain("decor.0.libelle");
    },
  );

  it("SC-03e — libellé identique à la casse près à celui d'une autre option refusé", () => {
    const refus = refusDe(
      appliquerOptions(
        DECLARATION,
        BROUILLON_VIDE,
        decorAvec([{ libelle: "Fleurs" }, { libelle: "FLEURS" }]),
      ),
    );
    expect(refus.map((x) => x.champ)).toContain("decor.1.libelle");
  });

  it("SC-03e — libellé de 80 caractères accepté", () => {
    const r = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      decorAvec([{ id: "o1", libelle: "a".repeat(80) }]),
    );
    expect(r.ok).toBe(true);
  });
});

describe("SC-03f — prix selon la déclaration", () => {
  it("SC-03f — prix sur une option d'un champ sans prix refusé sur cette option", () => {
    const refus = refusDe(
      appliquerOptions(
        DECLARATION,
        BROUILLON_VIDE,
        decorAvec([{ id: "o1", libelle: "Fleurs", prix: "3" }]),
      ),
    );
    expect(refus.map((x) => x.champ)).toContain("decor.0.prix");
  });

  it("SC-03f — prix omis sur une option d'un champ avec prix refusé sur cette option", () => {
    const refus = refusDe(
      appliquerOptions(
        DECLARATION,
        BROUILLON_VIDE,
        parfumAvec([
          { id: "o1", libelle: "Vanille", prix: "12" },
          { id: "o2", libelle: "Chocolat" },
        ]),
      ),
    );
    expect(refus.map((x) => x.champ)).toContain("parfum.1.prix");
  });
});

describe("SC-03g — champs de la soumission et de la déclaration", () => {
  it("SC-03g — champ absent de la déclaration refusé", () => {
    const r = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      corps(PARFUM_VALIDE, DECOR_VALIDE, {
        id: "inconnu",
        options: [{ libelle: "X" }],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r).not.toHaveProperty("contenu");
  });

  it("SC-03g — options pour un champ qui n'est pas à choix refusées", () => {
    const r = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      corps(PARFUM_VALIDE, DECOR_VALIDE, {
        id: "nom",
        options: [{ libelle: "X" }],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r).not.toHaveProperty("contenu");
  });

  it("SC-03g — champ à choix déclaré omis refusé", () => {
    const r = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      corps(PARFUM_VALIDE),
    );
    expect(r.ok).toBe(false);
    expect(r).not.toHaveProperty("contenu");
  });
});

describe("SC-03h — identifiants jamais réattribués", () => {
  it("SC-03h — ajout, retrait, ajout : la dernière option reçoit un identifiant distinct", () => {
    const parfum = (options: unknown[]) =>
      corps({ id: "parfum", options }, DECOR_VALIDE);
    const o1 = { id: "o1", libelle: "Vanille", prix: "12" };
    const o2 = { id: "o2", libelle: "Chocolat", prix: "15" };

    // 1. ajout d'une option sans identifiant
    const r1 = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      parfum([o1, o2, { libelle: "Fraise", prix: "13" }]),
    );
    if (!r1.ok) throw new Error("première correction refusée");
    const ajoutee = r1.contenu.champs.parfum.at(2);
    expect(ajoutee?.id).toBeDefined();

    // 2. retrait de l'option ajoutée
    const r2 = appliquerOptions(DECLARATION, r1.contenu, parfum([o1, o2]));
    if (!r2.ok) throw new Error("deuxième correction refusée");

    // 3. ajout d'une autre option
    const r3 = appliquerOptions(
      DECLARATION,
      r2.contenu,
      parfum([o1, o2, { libelle: "Citron", prix: "11" }]),
    );
    if (!r3.ok) throw new Error("troisième correction refusée");
    const ids = r3.contenu.champs.parfum.map((o) => o.id);
    const derniere = ids[2];
    expect(derniere).not.toBe(ajoutee?.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.slice(0, 2)).toEqual(["o1", "o2"]);
  });
});
