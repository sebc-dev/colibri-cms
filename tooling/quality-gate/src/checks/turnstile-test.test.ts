import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "../types";
import { turnstileTestCheck } from "./turnstile-test";

/**
 * Fixtures minimales pour FR-008/FR-009 : toute route publique (`writeHandler
 * ({ auth: "public" }, …)`) doit être couverte par un test vérifiant le rejet
 * en l'absence de jeton Turnstile valide ; en l'absence de toute route
 * publique, le contrôle est `ignoré` (formulaires P2, contrôle dormant —
 * ADR-0007), jamais `échoué`. Dépôt greenfield : aucune app réelle encore
 * (cf. `no-apps-dir`).
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test-fixtures",
  "turnstile-test",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("turnstileTestCheck — FR-008/FR-009 : route publique couverte par un test de rejet Turnstile (ADR-0005 ; ADR-0007)", () => {
  it("est enregistré sous l'id `turnstile-test` et tourne au régime par-changement", () => {
    expect(turnstileTestCheck.id).toBe("turnstile-test");
    expect(turnstileTestCheck.regimes).toContain("par-changement");
  });

  it("rapporte échoué quand une route publique n'a aucun test colocalisé vérifiant le rejet sans jeton Turnstile valide (FR-008)", async () => {
    const result = await turnstileTestCheck.run(ctxFor("public-route-without-turnstile-test"));

    expect(result.statut).toBe("échoué");
    expect(result.cause).toMatch(/turnstile/i);
  });

  it("ne rapporte pas d'échec quand la route publique est couverte par un test de rejet Turnstile", async () => {
    const result = await turnstileTestCheck.run(ctxFor("public-route-with-turnstile-test"));

    expect(result.statut).toBe("passé");
  });

  it("rapporte ignoré (jamais échoué) quand aucune route publique n'existe (FR-009 — formulaires P2, contrôle dormant)", async () => {
    const result = await turnstileTestCheck.run(ctxFor("no-public-route"));

    expect(result.statut).toBe("ignoré");
  });

  it("ne s'applique pas (périmètre vérifié vide) quand aucune route publique n'existe", () => {
    expect(turnstileTestCheck.applies(ctxFor("no-public-route"))).toBe(false);
  });
});
