import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { readSqlInAppsCheck } from "./read-sql-in-apps";

/**
 * Fixtures de fichiers/arborescences minimales simulant `apps/*` et
 * `packages/db` (dépôt greenfield, aucun package réel encore).
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "read-sql-in-apps",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("readSqlInAppsCheck — FR-005 : SQL de lecture interdit hors @colibri/db (ADR-0004)", () => {
  it("est enregistré sous l'id `read-sql-in-apps` et tourne au régime par-changement", () => {
    expect(readSqlInAppsCheck.id).toBe("read-sql-in-apps");
    expect(readSqlInAppsCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand une requête SQL de lecture (SELECT) est présente dans apps/*", async () => {
    const result = await readSqlInAppsCheck.run(ctxFor("select-in-apps"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/select/i);
  });

  it("ne rapporte pas d'échec quand apps/* ne contient qu'une requête d'écriture (INSERT)", async () => {
    const result = await readSqlInAppsCheck.run(ctxFor("insert-only-in-apps"));

    expect(result.statut).toBe("passé");
  });

  it("ne rapporte pas d'échec pour du SQL de lecture situé dans @colibri/db (emplacement autorisé)", async () => {
    const result = await readSqlInAppsCheck.run(ctxFor("select-in-db"));

    expect(result.statut).toBe("passé");
  });

  it("rapporte passé quand apps/* ne contient aucun SQL", async () => {
    const result = await readSqlInAppsCheck.run(ctxFor("clean"));

    expect(result.statut).toBe("passé");
  });
});
