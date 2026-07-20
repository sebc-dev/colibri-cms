import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { migrationCommentCheck } from "./migration-comment";

/**
 * Fixtures minimales pour FR-012 : une migration D1 ne doit jamais se
 * terminer par une ligne de commentaire (contournement du bug outillage
 * #7739). Scénarios isolés sous `test-fixtures/migration-comment/`.
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "migration-comment",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("migrationCommentCheck — FR-012 : migration terminée par un commentaire (ADR-0005, bug #7739)", () => {
  it("est enregistré sous l'id `migration-comment` et tourne au régime par-changement", () => {
    expect(migrationCommentCheck.id).toBe("migration-comment");
    expect(migrationCommentCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand une migration se termine par une ligne de commentaire", async () => {
    const result = await migrationCommentCheck.run(ctxFor("ends-with-comment"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/commentaire/i);
  });

  it("rapporte passé quand une migration se termine par une instruction SQL", async () => {
    const result = await migrationCommentCheck.run(ctxFor("clean"));

    expect(result.statut).toBe("passé");
  });

  it("rapporte passé quand aucun dossier de migrations n'existe (arborescence vide)", async () => {
    const result = await migrationCommentCheck.run(ctxFor("no-migrations"));

    expect(result.statut).toBe("passé");
  });
});
