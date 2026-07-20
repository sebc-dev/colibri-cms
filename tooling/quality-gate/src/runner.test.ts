import { describe, expect, it, vi } from "vitest";
import type { Check, CheckResult, GateContext, Regime } from "./types";
import { runGate } from "./runner";

/**
 * Construit un faux contrôle (double minimal) toujours applicable, dont le
 * comportement de `run` est fourni par le test. Aucune I/O réelle.
 */
function fakeCheck(
  id: string,
  regimes: Regime[],
  run: (ctx: GateContext) => Promise<CheckResult>,
): Check {
  return {
    id,
    regimes,
    applies: () => true,
    run: vi.fn(run),
  };
}

function passing(id: string, regimes: Regime[] = ["par-changement"]): Check {
  return fakeCheck(id, regimes, async () => ({ id, statut: "passé" }));
}

function failing(id: string, regimes: Regime[] = ["par-changement"]): Check {
  return fakeCheck(id, regimes, async () => ({
    id,
    statut: "échoué",
    cause: `${id} a échoué`,
  }));
}

const ctx: GateContext = {} as GateContext;

describe("runGate — FR-014 : exécution complète sans court-circuit", () => {
  it("exécute chaque contrôle du régime jusqu'au bout même si un contrôle intermédiaire échoue", async () => {
    const first = passing("check-1");
    const middleFailing = failing("check-2");
    const last = passing("check-3");

    const result = await runGate(ctx, "par-changement", [first, middleFailing, last]);

    expect(last.run).toHaveBeenCalledTimes(1);
    expect(result.checks.map((c) => c.id)).toEqual(["check-1", "check-2", "check-3"]);
  });
});

describe("runGate — FR-019 : filtrage par régime depuis le registre unique", () => {
  it("n'exécute pas un contrôle appartenant à un autre régime que celui demandé (régime par-changement)", async () => {
    const parChangement = passing("check-par-changement", ["par-changement"]);
    const planifie = passing("check-planifie", ["planifie"]);

    const result = await runGate(ctx, "par-changement", [parChangement, planifie]);

    expect(planifie.run).not.toHaveBeenCalled();
    expect(result.checks.map((c) => c.id)).toEqual(["check-par-changement"]);
  });

  it("n'exécute pas un contrôle appartenant à un autre régime que celui demandé (régime planifié)", async () => {
    const parChangement = passing("check-par-changement", ["par-changement"]);
    const planifie = passing("check-planifie", ["planifie"]);

    const result = await runGate(ctx, "planifie", [parChangement, planifie]);

    expect(parChangement.run).not.toHaveBeenCalled();
    expect(result.checks.map((c) => c.id)).toEqual(["check-planifie"]);
  });
});

describe("runGate — FR-015 : agrégation du verdict", () => {
  it("produit le verdict TOUT VERT avec nbEchecs à 0 quand aucun contrôle n'est échoué", async () => {
    const result = await runGate(ctx, "par-changement", [passing("check-1"), passing("check-2")]);

    expect(result.verdict).toBe("TOUT VERT");
    expect(result.nbEchecs).toBe(0);
  });

  it("produit le verdict BLOQUÉ avec le nombre exact de contrôles échoués dès qu'au moins un contrôle échoue", async () => {
    const result = await runGate(ctx, "par-changement", [
      passing("check-1"),
      failing("check-2"),
      failing("check-3"),
    ]);

    expect(result.verdict).toBe("BLOQUÉ");
    expect(result.nbEchecs).toBe(2);
  });

  it("produit le verdict TOUT VERT avec nbEchecs à 0 quand aucun contrôle n'appartient au régime (périmètre de contrôles vide)", async () => {
    const result = await runGate(ctx, "par-changement", []);

    expect(result.verdict).toBe("TOUT VERT");
    expect(result.nbEchecs).toBe(0);
  });
});

describe("runGate — FR-027 : garde-fou fail-closed", () => {
  it("rapporte échoué (jamais passé ni ignoré) quand un contrôle lève une exception, et le verdict devient BLOQUÉ", async () => {
    const throwing: Check = {
      id: "check-throws",
      regimes: ["par-changement"],
      applies: () => true,
      run: vi.fn(async () => {
        throw new Error("outil introuvable");
      }),
    };

    const result = await runGate(ctx, "par-changement", [throwing]);

    const reported = result.checks.find((c) => c.id === "check-throws");
    expect(reported?.statut).toBe("échoué");
    expect(result.verdict).toBe("BLOQUÉ");
  });

  it("continue d'exécuter et de rapporter les contrôles suivants après qu'un contrôle a levé une exception", async () => {
    const throwing: Check = {
      id: "check-throws",
      regimes: ["par-changement"],
      applies: () => true,
      run: vi.fn(async () => {
        throw new Error("outil mal configuré");
      }),
    };
    const after = passing("check-after");

    const result = await runGate(ctx, "par-changement", [throwing, after]);

    expect(after.run).toHaveBeenCalledTimes(1);
    expect(result.checks.map((c) => c.id)).toEqual(["check-throws", "check-after"]);
  });
});
