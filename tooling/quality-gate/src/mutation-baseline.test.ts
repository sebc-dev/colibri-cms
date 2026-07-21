import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chargerBaseline, verifierCliquet, type MutantSurvivant, type SurvivorBaselineEntry } from "./mutation-baseline";

/**
 * Gouvernance de la base de référence des survivants tolérés (R7 —
 * FR-024, FR-026, FR-029 ; ADR-0006 §"Seuils"). Fixtures isolées sous
 * `test-fixtures/mutation-baseline/<scenario>/`.
 *
 * Contrat attendu de `chargerBaseline` (durci par ce lot) : distinguer
 * explicitement trois états — `absente` (fichier inexistant), `illisible`
 * (JSON invalide/schéma non conforme) et `présente` (fichier valide, y
 * compris explicitement vide) — plutôt que de confondre les deux premiers
 * avec un tableau vide implicite (FR-029).
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "test-fixtures",
  "mutation-baseline",
);

function cheminFixture(scenario: string): string {
  return path.join(fixturesRoot, scenario);
}

describe("chargerBaseline — FR-024 : dérivation explicite depuis une base versionnée (ADR-0006 §Seuils)", () => {
  it("rapporte l'état `présente` avec exactement les entrées définies par le fichier versionné, sans valeur implicite", () => {
    const resultat = chargerBaseline(cheminFixture("versionnee-explicite-deux-entrees"));

    expect(resultat).toEqual({
      etat: "présente",
      entries: [
        {
          fichier: "packages/core/src/a.ts",
          mutateur: "EqualityOperator",
          ligne: 1,
          commentaire: "Fixture FR-024 : première entrée versionnée explicite.",
        },
        {
          fichier: "packages/core/src/b.ts",
          mutateur: "StringLiteral",
          ligne: 2,
          commentaire: "Fixture FR-024 : seconde entrée versionnée explicite.",
        },
      ],
    });
  });

  it("dérive un contenu distinct d'une seconde base versionnée — jamais un seuil ou une liste codés en dur", () => {
    const resultat = chargerBaseline(cheminFixture("versionnee-explicite-une-entree"));

    expect(resultat).toEqual({
      etat: "présente",
      entries: [
        {
          fichier: "packages/core/src/c.ts",
          mutateur: "BlockStatement",
          ligne: 7,
          commentaire:
            "Fixture FR-024 : base versionnée distincte — le contenu diffère de `versionnee-explicite-deux-entrees`, preuve que la dérivation suit le fichier, jamais un défaut implicite.",
        },
      ],
    });
  });
});

describe("chargerBaseline — FR-029 : fail-closed absente/illisible, vide-explicite valide (ADR-0006 §Seuils)", () => {
  it("rapporte l'état `absente` quand mutation-survivors.baseline.json n'existe pas dans la racine donnée", () => {
    const resultat = chargerBaseline(cheminFixture("absente"));

    expect(resultat).toEqual({ etat: "absente" });
  });

  it("rapporte l'état `illisible` (jamais `absente` ni un tableau vide) quand le fichier contient un JSON invalide", () => {
    const resultat = chargerBaseline(cheminFixture("illisible"));

    expect(resultat.etat).toBe("illisible");
  });

  it("rapporte l'état `illisible` (jamais une exception propagée) quand le JSON est syntaxiquement valide mais ne respecte pas le schéma (entrée sans `mutateur` ni `ligne`)", () => {
    const appelSansException = () => chargerBaseline(cheminFixture("illisible-schema-non-conforme"));

    expect(appelSansException).not.toThrow();
    expect(appelSansException().etat).toBe("illisible");
  });

  it("distingue `illisible` de `absente` : les deux existent comme états séparés et observables", () => {
    const absente = chargerBaseline(cheminFixture("absente"));
    const illisible = chargerBaseline(cheminFixture("illisible"));

    expect(absente.etat).not.toBe(illisible.etat);
  });

  it("rapporte l'état `présente` avec un tableau d'entrées vide quand le fichier existe explicitement sans survivant toléré", () => {
    const resultat = chargerBaseline(cheminFixture("vide-explicite"));

    expect(resultat).toEqual({ etat: "présente", entries: [] });
  });

  it("distingue une base explicitement vide (`présente`, entries: []) d'une base absente — ce ne sont jamais le même état", () => {
    const vide = chargerBaseline(cheminFixture("vide-explicite"));
    const absente = chargerBaseline(cheminFixture("absente"));

    expect(vide.etat).not.toBe(absente.etat);
  });
});

describe("verifierCliquet — FR-026 : un mutant tué doit être retiré, la base ne doit jamais être élargie (ADR-0006 §Seuils)", () => {
  const survivantSeuil: SurvivorBaselineEntry = {
    fichier: "packages/core/src/seuil.ts",
    mutateur: "EqualityOperator",
    ligne: 4,
  };

  it("est conforme quand un mutant tué (absent des survivants courants) est retiré de la nouvelle base", () => {
    const ancienne: SurvivorBaselineEntry[] = [survivantSeuil];
    const nouvelle: SurvivorBaselineEntry[] = [];
    const survivantsCourants: MutantSurvivant[] = [];

    const resultat = verifierCliquet(ancienne, nouvelle, survivantsCourants);

    expect(resultat).toEqual({ conforme: true, violations: [] });
  });

  it("est non conforme quand un mutant tué reste toléré dans la nouvelle base au lieu d'en être retiré", () => {
    const ancienne: SurvivorBaselineEntry[] = [survivantSeuil];
    const nouvelle: SurvivorBaselineEntry[] = [survivantSeuil];
    const survivantsCourants: MutantSurvivant[] = [];

    const resultat = verifierCliquet(ancienne, nouvelle, survivantsCourants);

    expect(resultat.conforme).toBe(false);
    expect(resultat.violations.length).toBeGreaterThan(0);
  });

  it("est non conforme quand la nouvelle base ajoute un survivant absent de l'ancienne (base élargie)", () => {
    const nouveauSurvivant: SurvivorBaselineEntry = {
      fichier: "packages/core/src/autre.ts",
      mutateur: "BooleanLiteral",
      ligne: 9,
    };
    const ancienne: SurvivorBaselineEntry[] = [];
    const nouvelle: SurvivorBaselineEntry[] = [nouveauSurvivant];
    const survivantsCourants: MutantSurvivant[] = [
      { fichier: "packages/core/src/autre.ts", mutateur: "BooleanLiteral" },
    ];

    const resultat = verifierCliquet(ancienne, nouvelle, survivantsCourants);

    expect(resultat.conforme).toBe(false);
    expect(resultat.violations.length).toBeGreaterThan(0);
  });

  it("est non conforme quand le nombre toléré pour un couple (fichier, mutateur) déjà présent augmente", () => {
    const ancienne: SurvivorBaselineEntry[] = [survivantSeuil];
    const nouvelle: SurvivorBaselineEntry[] = [survivantSeuil, survivantSeuil];
    const survivantsCourants: MutantSurvivant[] = [
      { fichier: survivantSeuil.fichier, mutateur: survivantSeuil.mutateur },
      { fichier: survivantSeuil.fichier, mutateur: survivantSeuil.mutateur },
    ];

    const resultat = verifierCliquet(ancienne, nouvelle, survivantsCourants);

    expect(resultat.conforme).toBe(false);
    expect(resultat.violations.length).toBeGreaterThan(0);
  });

  it("est conforme (edge) quand les deux bases sont vides et qu'aucun survivant courant n'existe", () => {
    const resultat = verifierCliquet([], [], []);

    expect(resultat).toEqual({ conforme: true, violations: [] });
  });
});
