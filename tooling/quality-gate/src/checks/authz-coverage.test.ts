import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { authzCoverageCheck } from "./authz-coverage";

/**
 * Fixtures minimales pour FR-007/SC-005 : 100 % des endpoints d'écriture
 * (mêmes déclarations `writeHandler` que `write-handler.ts`) doivent être
 * couverts par un test d'autorisation colocalisé, sous
 * `test-fixtures/authz-coverage/` (dépôt greenfield, aucune app réelle
 * encore — cf. `no-apps-dir`).
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "authz-coverage",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("authzCoverageCheck — FR-007/SC-005 : couverture des endpoints d'écriture par un test d'autorisation (ADR-0006 §7)", () => {
  it("est enregistré sous l'id `authz-coverage` et tourne au régime par-changement", () => {
    expect(authzCoverageCheck.id).toBe("authz-coverage");
    expect(authzCoverageCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand un endpoint d'écriture n'a aucun test d'autorisation colocalisé (FR-007)", async () => {
    const result = await authzCoverageCheck.run(ctxFor("endpoint-without-authz-test"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/autorisation/i);
  });

  it("rapporte passé quand 100 % des endpoints d'écriture sont couverts par un test d'autorisation (SC-005)", async () => {
    const result = await authzCoverageCheck.run(ctxFor("all-endpoints-covered"));

    expect(result.statut).toBe("passé");
  });

  it("rapporte échoué quand au moins un endpoint d'écriture, parmi plusieurs, n'est pas couvert (couverture partielle, corollaire de SC-005)", async () => {
    const result = await authzCoverageCheck.run(ctxFor("partial-coverage"));

    expect(result.statut).toBe("échoué");
  });

  it("ne s'applique pas à une arborescence sans apps/* (dépôt greenfield)", () => {
    expect(authzCoverageCheck.applies(ctxFor("no-apps-dir"))).toBe(false);
  });
});
