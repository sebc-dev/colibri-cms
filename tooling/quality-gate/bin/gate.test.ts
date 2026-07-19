import { describe, expect, it } from "vitest";
import type { Check, GateContext } from "../src/types";
import { main } from "./gate";

/**
 * `main` est la fonction testable de l'entrée CLI : elle calcule le code de
 * sortie sans jamais appeler `process.exit` elle-même (ce dernier est réservé
 * au véritable point d'entrée du script). Les contrôles sont injectés pour ne
 * dépendre d'aucun outil réel en R1.
 */
function fakeCheck(id: string, statut: "passé" | "échoué"): Check {
  return {
    id,
    regimes: ["par-changement"],
    applies: () => true,
    run: async () => ({ id, statut }),
  };
}

const ctx: GateContext = {} as GateContext;

describe("bin/gate — FR-016 : code de sortie reflétant le verdict agrégé", () => {
  it("renvoie un code de sortie non-zéro quand le verdict agrégé est BLOQUÉ", async () => {
    const exitCode = await main([], { ctx, checks: [fakeCheck("check-1", "échoué")] });

    expect(exitCode).not.toBe(0);
  });

  it("renvoie le code de sortie 0 quand le verdict agrégé est TOUT VERT", async () => {
    const exitCode = await main([], { ctx, checks: [fakeCheck("check-1", "passé")] });

    expect(exitCode).toBe(0);
  });
});
