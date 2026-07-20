import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { boundariesCheck } from "./boundaries";

/**
 * Fixtures de fichiers/arborescences minimales simulant `packages/core`,
 * `packages/db` et `apps/*` (dépôt greenfield, aucun package réel encore).
 * Chaque scénario est un dossier isolé sous `test-fixtures/boundaries/`.
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "boundaries",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("boundariesCheck — FR-004 : frontières d'imports déclarées (ADR-0004)", () => {
  it("est enregistré sous l'id `boundaries` et tourne au régime par-changement", () => {
    expect(boundariesCheck.id).toBe("boundaries");
    expect(boundariesCheck.regimes).toContain("par-changement");
  });

  it("s'applique par défaut à une arborescence contenant des packages", () => {
    expect(boundariesCheck.applies(ctxFor("clean"))).toBe(true);
  });

  it("rapporte échoué quand @colibri/core importe cloudflare* hors types", async () => {
    const result = await boundariesCheck.run(ctxFor("cloudflare-runtime-import-in-core"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/cloudflare/i);
  });

  it("ne rapporte pas d'échec quand @colibri/core importe cloudflare* uniquement en `import type`", async () => {
    const result = await boundariesCheck.run(ctxFor("cloudflare-type-only-import-in-core"));

    expect(result.statut).toBe("passé");
  });

  it("rapporte échoué quand @colibri/db importe depuis apps/*", async () => {
    const result = await boundariesCheck.run(ctxFor("apps-import-in-db"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/apps/i);
  });

  it("rapporte échoué quand @colibri/core importe depuis apps/*", async () => {
    const result = await boundariesCheck.run(ctxFor("apps-import-in-core"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/apps/i);
  });

  it("rapporte passé quand aucun import interdit n'est présent dans l'arborescence", async () => {
    const result = await boundariesCheck.run(ctxFor("clean"));

    expect(result.statut).toBe("passé");
  });
});
