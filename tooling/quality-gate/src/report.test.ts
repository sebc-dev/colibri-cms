import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { CheckResult, GateResult } from "./types";
import { renderHuman, renderMachine } from "./report";

/**
 * Construit un `GateResult` de test sans passer par `runGate` — double
 * minimal, sur le modèle de `fakeCheck`/`passing`/`failing` de
 * `runner.test.ts`, mais au niveau du résultat agrégé plutôt que du contrôle.
 */
function buildResult(checks: CheckResult[]): GateResult {
  const nbEchecs = checks.filter((check) => check.statut === "échoué").length;

  return {
    verdict: nbEchecs === 0 ? "TOUT VERT" : "BLOQUÉ",
    nbEchecs,
    regime: "par-changement",
    checks,
  };
}

describe("renderHuman — FR-017 : rapport lisible listant chaque contrôle avec son statut et une cause pour les échecs", () => {
  it("liste chaque contrôle du résultat avec son identifiant et son statut", () => {
    const result = buildResult([
      { id: "check-a", statut: "passé" },
      { id: "check-b", statut: "ignoré" },
    ]);

    const human = renderHuman(result);

    expect(human).toContain("check-a");
    expect(human).toContain("passé");
    expect(human).toContain("check-b");
    expect(human).toContain("ignoré");
  });

  it("inclut un résumé de la cause en langage clair pour tout contrôle échoué", () => {
    const result = buildResult([
      { id: "check-lint", statut: "échoué", cause: "3 erreurs ESLint dans src/foo.ts" },
    ]);

    const human = renderHuman(result);

    expect(human).toContain("3 erreurs ESLint dans src/foo.ts");
  });
});

describe("renderHuman — SC-004 : statut exposé pour 100 % des contrôles, aucun contrôle muet", () => {
  it("expose un statut pour chacun des contrôles définis, quel que soit leur nombre ou leur statut", () => {
    const checks: CheckResult[] = [
      { id: "check-1", statut: "passé" },
      { id: "check-2", statut: "échoué", cause: "échec" },
      { id: "check-3", statut: "ignoré" },
      { id: "check-4", statut: "passé" },
    ];
    const result = buildResult(checks);

    const human = renderHuman(result);

    for (const check of checks) {
      expect(human).toMatch(new RegExp(`${check.id}[^\\n]*${check.statut}`));
    }
  });
});

describe("renderMachine — FR-018 : représentation structurée dérivée du même résultat", () => {
  const machineSchema = z.object({
    verdict: z.enum(["TOUT VERT", "BLOQUÉ"]),
    nbEchecs: z.number(),
    checks: z.array(
      z.object({
        contrôle: z.string(),
        statut: z.enum(["passé", "échoué", "ignoré"]),
        cause: z.string().optional(),
      }),
    ),
  });

  it("produit un objet validé par le schéma machine attendu, avec le verdict et le nombre d'échecs agrégés", () => {
    const result = buildResult([
      { id: "check-1", statut: "passé" },
      { id: "check-2", statut: "échoué", cause: "boum" },
    ]);

    const machine = renderMachine(result);

    const parsed = machineSchema.safeParse(machine);
    expect(parsed.success).toBe(true);
    expect(machine.verdict).toBe("BLOQUÉ");
    expect(machine.nbEchecs).toBe(1);
  });

  it("reflète dans le tableau machine le statut de chaque contrôle du résultat source", () => {
    const result = buildResult([
      { id: "check-alpha", statut: "passé" },
      { id: "check-beta", statut: "ignoré" },
    ]);

    const machine = renderMachine(result);

    expect(machine.checks).toEqual([
      { contrôle: "check-alpha", statut: "passé" },
      { contrôle: "check-beta", statut: "ignoré" },
    ]);
  });
});

describe("renderHuman/renderMachine — FR-028 : absence de divergence de statut entre les deux représentations", () => {
  it("rapporte le même statut pour chaque contrôle dans le rapport lisible et dans la représentation machine", () => {
    const result = buildResult([
      { id: "check-a", statut: "passé" },
      { id: "check-b", statut: "échoué", cause: "cause b" },
      { id: "check-c", statut: "ignoré" },
    ]);

    const human = renderHuman(result);
    const machine = renderMachine(result);

    for (const entry of machine.checks) {
      expect(human).toMatch(new RegExp(`${entry.contrôle}[^\\n]*${entry.statut}`));
    }
  });

  it("est en défaut si un contrôle échoué du résultat machine n'apparaît pas comme échoué dans le rapport lisible", () => {
    const result = buildResult([{ id: "check-critique", statut: "échoué", cause: "panne" }]);

    const human = renderHuman(result);
    const machine = renderMachine(result);
    const machineEntry = machine.checks.find((c) => c.contrôle === "check-critique");

    expect(machineEntry?.statut).toBe("échoué");
    expect(human).toMatch(/check-critique[^\n]*échoué/);
  });
});
