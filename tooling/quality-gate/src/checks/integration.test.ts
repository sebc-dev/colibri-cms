import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { integrationCheck } from "./integration";

/**
 * Fixtures minimales pour FR-001 : suite d'intégration s'appuyant sur de
 * vraies ressources de données locales (ADR-0005 ; ADR-0006 §7). Chaque
 * scénario est un mini-projet vitest isolé sous `tests/integration/`,
 * emplacement attendu par `integrationCheck.applies` (dépôt greenfield,
 * aucune app réelle encore — cf. `no-suite`).
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "integration",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("integrationCheck — FR-001 : suite d'intégration sur de vraies ressources de données locales (ADR-0005 ; ADR-0006 §7)", () => {
  it("est enregistré sous l'id `integration` et tourne au régime par-changement", () => {
    expect(integrationCheck.id).toBe("integration");
    expect(integrationCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand un test de la suite d'intégration échoue", async () => {
    const result = await integrationCheck.run(ctxFor("failing-suite"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte passé quand tous les tests de la suite d'intégration réussissent", async () => {
    const result = await integrationCheck.run(ctxFor("passing-suite"));

    expect(result.statut).toBe("passé");
  });

  it("ne s'applique pas à une arborescence sans suite d'intégration (dépôt greenfield)", () => {
    expect(integrationCheck.applies(ctxFor("no-suite"))).toBe(false);
  });
});
