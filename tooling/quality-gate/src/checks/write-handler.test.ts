import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { writeHandlerCheck } from "./write-handler";

/**
 * Fixtures de fichiers/arborescences minimales simulant des endpoints
 * d'API dans `apps/*` (dépôt greenfield, aucune app réelle encore).
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "write-handler",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("writeHandlerCheck — FR-006 : endpoint d'écriture obligatoirement via writeHandler (ADR-0004)", () => {
  it("est enregistré sous l'id `write-handler` et tourne au régime par-changement", () => {
    expect(writeHandlerCheck.id).toBe("write-handler");
    expect(writeHandlerCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand un endpoint POST ne passe pas par writeHandler", async () => {
    const result = await writeHandlerCheck.run(ctxFor("post-without-write-handler"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/writeHandler/);
  });

  it("rapporte échoué quand un endpoint PUT ne passe pas par writeHandler", async () => {
    const result = await writeHandlerCheck.run(ctxFor("put-without-write-handler"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/writeHandler/);
  });

  it("ne rapporte pas d'échec quand l'endpoint POST passe par writeHandler", async () => {
    const result = await writeHandlerCheck.run(ctxFor("post-with-write-handler"));

    expect(result.statut).toBe("passé");
  });

  it("ne rapporte pas d'échec pour un endpoint de lecture (GET), hors périmètre de FR-006", async () => {
    const result = await writeHandlerCheck.run(ctxFor("get-without-write-handler"));

    expect(result.statut).toBe("passé");
  });
});
