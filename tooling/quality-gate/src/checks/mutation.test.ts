import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { mutationCheck } from "./mutation";

/**
 * Fixtures minimales pour FR-002/FR-003/FR-025/FR-029 : contrôle de mutation
 * (Stryker) du `core`, cantonné au régime planifié, comparé à la base de
 * référence des survivants tolérés (ADR-0006 §3, §7, §Seuils). Scénarios
 * isolés sous `test-fixtures/mutation/`.
 *
 * Les scénarios `baseline-absente`/`baseline-illisible` (FR-029) utilisent un
 * core sans aucun mutant réellement exploitable (fonction identité pure) afin
 * d'isoler l'assertion : le contrôle doit échouer à cause de l'état de la
 * base de référence elle-même, jamais à cause d'un survivant non couvert
 * (déjà couvert par FR-025 ci-dessus).
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "mutation",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("mutationCheck — FR-002, FR-003, FR-025 : mutants survivants du core vs base de référence (ADR-0006 §3, §7, §Seuils)", () => {
  it("est enregistré sous l'id `mutation` et tourne exclusivement au régime planifié", () => {
    expect(mutationCheck.id).toBe("mutation");
    expect(mutationCheck.regimes).toEqual(["planifie"]);
  });

  it("ne tourne jamais au régime par-changement (mutation hors chemin PR, ADR-0006 §Seuils)", () => {
    expect(mutationCheck.regimes).not.toContain("par-changement");
  });

  it("rapporte échoué quand un mutant survivant du core n'est pas présent dans la base de référence (FR-002)", async () => {
    const result = await mutationCheck.run(ctxFor("survivor-not-in-baseline"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte passé quand l'unique mutant survivant du core est couvert par une base de référence exhaustive (FR-025)", async () => {
    const result = await mutationCheck.run(ctxFor("survivor-covered-by-baseline"));

    expect(result.statut).toBe("passé");
  });

  it("rapporte échoué quand la base de référence ne couvre qu'un des deux mutants survivants — non exhaustive (FR-025, borne)", async () => {
    const result = await mutationCheck.run(ctxFor("partial-baseline-missing-one"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte échoué (jamais passé) quand packages/core existe sans aucun mutant survivant réel mais que la base de référence est absente (FR-029)", async () => {
    const result = await mutationCheck.run(ctxFor("baseline-absente"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte échoué (jamais passé) quand packages/core existe sans aucun mutant survivant réel mais que la base de référence est illisible (FR-029)", async () => {
    const result = await mutationCheck.run(ctxFor("baseline-illisible"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte ignoré (jamais échoué) quand aucun packages/core n'existe encore, en régime planifié (FR-003, bootstrap greenfield)", async () => {
    const result = await mutationCheck.run(ctxFor("no-core"));

    expect(result.statut).toBe("ignoré");
  });

  it("ne s'applique pas à une arborescence sans packages/core (FR-003)", () => {
    expect(mutationCheck.applies(ctxFor("no-core"))).toBe(false);
  });

  it("s'applique à une arborescence où packages/core existe (FR-002)", () => {
    expect(mutationCheck.applies(ctxFor("survivor-not-in-baseline"))).toBe(true);
  });
});
