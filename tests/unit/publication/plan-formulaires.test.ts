/**
 * Change 011, ticket 14 — les options d'un champ à choix partent telles que
 * l'éditrice les a vues (ADR-0026, ADR-0018).
 *
 * Contrat attendu de `construirePlan` : `instantane.formulaires` (facultatif)
 * liste les formulaires en brouillon, chacun `{ declare, publie, brouillon }`
 * (`declare` : FormulaireDeclare ; `publie` : ContenuOptions ou absent ;
 * `brouillon` : ContenuOptions). Le plan écrit
 * `content/formulaires/<id>/formulaire.json` : tout vient de la déclaration,
 * sauf la liste d'options de chaque champ à choix, donnée par `optionsCourantes`.
 */
import { describe, it, expect } from "vitest";
import { construirePlan, type InstantanePublication } from "../../../src/core/publication/plan.ts";
import type { ChampDeclare, FormulaireDeclare } from "../../../src/core/formulaires/declaration.ts";
import type { ContenuOptions } from "../../../src/core/formulaires/options.ts";

const aleatoire = (octets: number): Uint8Array =>
  Uint8Array.from({ length: octets }, (_v, i) => (i * 7 + 1) % 256);

const CHEMIN = "content/formulaires/devis-gateau/formulaire.json";

const PARFUM: ChampDeclare = {
  id: "parfum",
  nature: "choix-unique",
  libelle: "Parfum",
  obligatoire: true,
  avecPrix: true,
  options: [
    { id: "vanille", libelle: "Vanille", prix: 800 },
    { id: "chocolat", libelle: "Chocolat", prix: 900 },
    { id: "fraise", libelle: "Fraise", prix: 1000 },
  ],
};

const OCCASION: ChampDeclare = {
  id: "occasion",
  nature: "choix-multiple",
  libelle: "Occasion",
  obligatoire: false,
  avecPrix: false,
  options: [
    { id: "anniversaire", libelle: "Anniversaire" },
    { id: "mariage", libelle: "Mariage" },
  ],
};

const NOM: ChampDeclare = {
  id: "nom",
  nature: "texte",
  libelle: "Votre nom",
  obligatoire: false,
  avecPrix: false,
};

function gateau(champs: readonly ChampDeclare[]): FormulaireDeclare {
  return { id: "devis-gateau", nom: "Devis gâteau", champs };
}

/** Le brouillon de l'éditrice : ordre, ids, libellés et prix (centimes) qui lui sont propres. */
const PARFUMS_DU_BROUILLON = [
  { id: "chocolat", libelle: "Chocolat noir", prix: 950 },
  { id: "vanille", libelle: "Vanille", prix: 800 },
  { id: "fraise", libelle: "Fraise", prix: 1000 },
  { id: "o1", libelle: "Café", prix: 1100 },
];

function brouillonParfum(options = PARFUMS_DU_BROUILLON): ContenuOptions {
  return { champs: { parfum: options }, derniersNumeros: { parfum: 1 } };
}

function instantane(
  declare: FormulaireDeclare,
  brouillon: ContenuOptions,
  publie?: ContenuOptions,
): InstantanePublication {
  return {
    pages: [],
    images: [],
    imagesEffacees: [],
    formulaires: [{ declare, publie, brouillon }],
  };
}

interface FormulaireJson {
  nom: string;
  champs: { id: string; nature: string; libelle: string; options?: unknown }[];
}

function formulaireDepose(inst: InstantanePublication): { texte: string; json: FormulaireJson } {
  const plan = construirePlan(inst, aleatoire);
  const ecriture = plan.ecritures.find((e) => e.chemin === CHEMIN);
  if (ecriture === undefined) throw new Error(`chemin absent du plan : ${CHEMIN}`);
  return { texte: ecriture.contenu, json: JSON.parse(ecriture.contenu) as FormulaireJson };
}

function champDepose(json: FormulaireJson, id: string): FormulaireJson["champs"][number] {
  const champ = json.champs.find((c) => c.id === id);
  if (champ === undefined) throw new Error(`champ absent : ${id}`);
  return champ;
}

describe("construirePlan — formulaire.json des formulaires en brouillon", () => {
  it("SC-14a — une option de départ ajoutée après l'enregistrement (Pistache) n'entre pas : la liste du brouillon part telle quelle", () => {
    const declare = gateau([
      {
        ...PARFUM,
        options: [...(PARFUM.options ?? []), { id: "pistache", libelle: "Pistache", prix: 1200 }],
      },
      NOM,
    ]);

    const { texte, json } = formulaireDepose(instantane(declare, brouillonParfum()));

    expect(champDepose(json, "parfum").options).toEqual(PARFUMS_DU_BROUILLON);
    expect(texte).not.toContain("Pistache");
    expect(texte.endsWith("}\n")).toBe(true);
    expect(texte).toBe(`${JSON.stringify(json, null, 2)}\n`);
  });

  it("SC-14b — une option de départ retirée (Fraise) que le brouillon garde est publiée", () => {
    const declare = gateau([{ ...PARFUM, options: (PARFUM.options ?? []).filter((o) => o.id !== "fraise") }]);

    const { json } = formulaireDepose(instantane(declare, brouillonParfum()));

    const options = champDepose(json, "parfum").options as { id: string; libelle: string }[];
    expect(options.map((o) => o.id)).toContain("fraise");
    expect(options).toEqual(PARFUMS_DU_BROUILLON);
  });

  it("SC-14c — un champ passé de choix unique à choix multiple part en choix multiple, avec la liste du brouillon", () => {
    const declare = gateau([{ ...PARFUM, nature: "choix-multiple" }]);

    const { json } = formulaireDepose(instantane(declare, brouillonParfum()));

    const parfum = champDepose(json, "parfum");
    expect(parfum.nature).toBe("choix-multiple");
    expect(parfum.options).toEqual(PARFUMS_DU_BROUILLON);
  });

  it("SC-14d — un champ à choix devenu champ texte part sans aucune option, et la publication aboutit", () => {
    const declare = gateau([{ id: "parfum", nature: "texte", libelle: "Parfum", obligatoire: true, avecPrix: false }]);

    const { texte, json } = formulaireDepose(instantane(declare, brouillonParfum()));

    const parfum = champDepose(json, "parfum");
    expect(parfum.nature).toBe("texte");
    expect(parfum).not.toHaveProperty("options");
    expect(texte).not.toContain("Café");
  });

  it("SC-14e — un champ à choix sans brouillon part avec sa liste publiée", () => {
    const publie: ContenuOptions = {
      champs: { occasion: [{ id: "mariage", libelle: "Mariage civil" }] },
      derniersNumeros: { occasion: 0 },
    };
    const declare = gateau([PARFUM, OCCASION]);

    const { json } = formulaireDepose(instantane(declare, brouillonParfum(), publie));

    expect(champDepose(json, "occasion").options).toEqual([{ id: "mariage", libelle: "Mariage civil" }]);
    expect(champDepose(json, "parfum").options).toEqual(PARFUMS_DU_BROUILLON);
  });

  it("SC-14e — un champ à choix sans brouillon ni publié part avec la liste de la déclaration", () => {
    const declare = gateau([PARFUM, OCCASION]);

    const { json } = formulaireDepose(instantane(declare, brouillonParfum()));

    expect(champDepose(json, "occasion").options).toEqual(OCCASION.options);
  });

  it("SC-14a — le reste vient de la déclaration : nom, ordre des champs, libellés, nature, obligatoire", () => {
    const declare = gateau([NOM, PARFUM, OCCASION]);

    const { json } = formulaireDepose(instantane(declare, brouillonParfum()));

    expect(json.nom).toBe("Devis gâteau");
    expect(json.champs.map((c) => c.id)).toEqual(["nom", "parfum", "occasion"]);
    expect(json.champs.map((c) => c.libelle)).toEqual(["Votre nom", "Parfum", "Occasion"]);
    expect(champDepose(json, "parfum")).toMatchObject({ nature: "choix-unique", obligatoire: true });
  });
});
