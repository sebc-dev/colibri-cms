import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { main } from "../bin/gate";
import { checks as registry } from "./checks/index";
import { mutationCheck } from "./checks/mutation";
import { runGate } from "./runner";
import { renderHuman, renderMachine } from "./report";
import type { GateContext } from "./types";

/**
 * R10 — bout-en-bout, régime par-changement, avec le **registre réel**
 * (`checks/index.ts`, jamais un sous-ensemble ad hoc) : caractérise le
 * comportement attendu de `pnpm gate` sur un diff introduisant une
 * violation déterministe connue (SC-001), la parité rapport lisible /
 * sortie machine (FR-028), et la bascule stricte du verdict agrégé et du
 * code de sortie process (FR-015, FR-016). Contrairement à
 * `ci-workflow-parity.test.ts` (parité local/CI d'un même appel) et
 * `nightly-regime.test.ts` (régime planifié + mutation), ce test compose
 * `bin/gate.ts::main` avec le registre complet en régime par-changement sur
 * des fixtures de violation/absence de violation déjà utilisées par
 * `boundaries.test.ts`.
 *
 * Caractérisation légitime, à l'image de `nightly-regime.test.ts` (R11) :
 * R10 est un lot de vérification pure (aucune ligne `Fichiers:` dans
 * tasks.md), et chaque pièce composée ici — `runner.ts` (R6/R7),
 * `report.ts` (R7), `boundaries.ts` (R2), `bin/gate.ts::main` (R7) — est déjà
 * implémentée et testée unitairement (voir `runner.test.ts`, `report.test.ts`,
 * `boundaries.test.ts`, `bin/gate.test.ts`). Ce test est donc **déjà vert**
 * dès son ajout : il verrouille par composition bout-en-bout, sur le
 * registre réel plutôt que des doubles, que l'assemblage produit bien le
 * comportement attendu par SC-001/FR-015/FR-016/FR-028 — sans qu'aucune
 * pièce de production ne reste à écrire pour ce lot.
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "test-fixtures",
  "boundaries",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("Bout-en-bout (bin/gate.ts::main + registre réel, régime par-changement) — SC-001, FR-028, FR-015, FR-016", () => {
  it(
    "SC-001 : un import runtime cloudflare* dans @colibri/core produit un verdict BLOQUÉ, un code de sortie non-zéro, et le contrôle `boundaries` échoué",
    async () => {
      const ctx = ctxFor("cloudflare-runtime-import-in-core");
      const result = await runGate(ctx, "par-changement", registry);
      const exitCode = await main(["--regime=par-changement"], { ctx, checks: registry });

      expect(exitCode).not.toBe(0);
      expect(result.verdict).toBe("BLOQUÉ");

      const boundariesResult = result.checks.find((check) => check.id === "boundaries");
      expect(boundariesResult?.statut).toBe("échoué");
      expect(boundariesResult?.cause).toMatch(/cloudflare/i);
    },
    120_000,
  );

  it(
    "FR-028 : le statut du contrôle fautif `boundaries` est identique dans le rapport lisible et dans la sortie machine (dérivés du même résultat, jamais divergents)",
    async () => {
      const ctx = ctxFor("cloudflare-runtime-import-in-core");
      const result = await runGate(ctx, "par-changement", registry);

      const humain = renderHuman(result);
      const machine = renderMachine(result);

      const statutMachineBoundaries = machine.checks.find(
        (check) => check.contrôle === "boundaries",
      )?.statut;

      expect(statutMachineBoundaries).toBe("échoué");
      expect(humain).toMatch(/boundaries\s*:\s*échoué/);
    },
    120_000,
  );

  it(
    "SC-004 : le résultat agrégé rapporte un statut pour chacun des contrôles du registre actifs en régime par-changement (aucun contrôle muet) et exclut le contrôle de mutation (réservé au régime planifié)",
    async () => {
      const ctx = ctxFor("cloudflare-runtime-import-in-core");
      const result = await runGate(ctx, "par-changement", registry);

      const idsAttendus = registry
        .filter((check) => check.regimes.includes("par-changement"))
        .map((check) => check.id)
        .sort();
      const idsObtenus = result.checks.map((check) => check.id).sort();

      expect(idsObtenus).toEqual(idsAttendus);
      expect(idsObtenus).not.toContain(mutationCheck.id);
      for (const check of result.checks) {
        expect(["passé", "échoué", "ignoré"]).toContain(check.statut);
      }
    },
    120_000,
  );

  it(
    "FR-015/FR-016 : sur un arbre propre (sans la violation de frontière), le verdict agrégé bascule à TOUT VERT et le code de sortie process à 0",
    async () => {
      const exitCode = await main(["--regime=par-changement"], {
        ctx: ctxFor("clean"),
        checks: registry,
      });

      expect(exitCode).toBe(0);
    },
    120_000,
  );
});
