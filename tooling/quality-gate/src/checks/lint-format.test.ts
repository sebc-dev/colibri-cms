import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { lintFormatCheck } from "./lint-format";

/**
 * Fixtures minimales pour FR-011 : lint (ESLint) et contrôle de format
 * (`prettier --check`). Deux déclencheurs indépendants d'échec, chacun testé
 * isolément, sous `test-fixtures/lint-format/`.
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "lint-format",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("lintFormatCheck — FR-011 : lint et contrôle de format (ADR-0002 §3)", () => {
  it("est enregistré sous l'id `lint-format` et tourne au régime par-changement", () => {
    expect(lintFormatCheck.id).toBe("lint-format");
    expect(lintFormatCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand ESLint signale une violation", async () => {
    const result = await lintFormatCheck.run(ctxFor("eslint-violation"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte échoué quand `prettier --check` signale un fichier mal formaté", async () => {
    const result = await lintFormatCheck.run(ctxFor("prettier-violation"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte passé quand ni ESLint ni `prettier --check` ne signalent de violation", async () => {
    const result = await lintFormatCheck.run(ctxFor("clean"));

    expect(result.statut).toBe("passé");
  });
});
