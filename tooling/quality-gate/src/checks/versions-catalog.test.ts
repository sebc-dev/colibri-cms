import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { versionsCatalogCheck } from "./versions-catalog";

/**
 * Fixtures minimales pour FR-013 : toute dépendance structurante doit
 * provenir du catalogue `pnpm-workspace.yaml` (`catalog:`), et les majeures
 * Astro / adaptateur `@astrojs/cloudflare` déclarées dans ce catalogue ne
 * doivent pas être mélangées (peer deps strictes — ADR-0003 : Astro 7 ⇒
 * adaptateur 14 ; Astro 6 est incompatible avec l'adaptateur 14).
 * Scénarios isolés sous `test-fixtures/versions-catalog/`.
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "versions-catalog",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("versionsCatalogCheck — FR-013 : dépendances structurantes hors catalogue / majeures incompatibles (ADR-0003)", () => {
  it("est enregistré sous l'id `versions-catalog` et tourne au régime par-changement", () => {
    expect(versionsCatalogCheck.id).toBe("versions-catalog");
    expect(versionsCatalogCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand une dépendance structurante est épinglée en dur au lieu de `catalog:`", async () => {
    const result = await versionsCatalogCheck.run(ctxFor("dependency-not-in-catalog"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/astro/i);
  });

  it("rapporte échoué quand les majeures Astro et de l'adaptateur @astrojs/cloudflare sont incompatibles", async () => {
    const result = await versionsCatalogCheck.run(ctxFor("mismatched-majors"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toBeTruthy();
  });

  it("rapporte passé quand toutes les dépendances structurantes utilisent `catalog:` et que les majeures Astro/adaptateur sont compatibles", async () => {
    const result = await versionsCatalogCheck.run(ctxFor("clean"));

    expect(result.statut).toBe("passé");
  });
});
