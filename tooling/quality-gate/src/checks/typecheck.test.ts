import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { typecheckCheck } from "./typecheck";

/**
 * Fixtures minimales pour FR-010 : vérification de types statique en mode
 * strict (`tsc --noEmit`). Chaque scénario est un mini-projet TypeScript
 * isolé sous `test-fixtures/typecheck/`.
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "typecheck",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("typecheckCheck — FR-010 : vérification de types statique en mode strict (ADR-0004 ; CLAUDE.md § Style)", () => {
  it("est enregistré sous l'id `typecheck` et tourne au régime par-changement", () => {
    expect(typecheckCheck.id).toBe("typecheck");
    expect(typecheckCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand `tsc --noEmit` détecte une erreur de type en mode strict", async () => {
    const result = await typecheckCheck.run(ctxFor("type-error"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte passé quand `tsc --noEmit` ne détecte aucune erreur de type", async () => {
    const result = await typecheckCheck.run(ctxFor("clean"));

    expect(result.statut).toBe("passé");
  });
});
