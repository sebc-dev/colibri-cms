import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GateContext } from "./types";
import { main } from "../bin/gate";
import { mutationCheck } from "./checks/mutation";

/**
 * R11 — FR-030, SC-006 : sémantique end-to-end du régime planifié. Ni
 * `mutation.test.ts` (contrôle isolé, sans passer par le CLI) ni
 * `gate.test.ts` (mapping générique flag→régime, avec des contrôles factices)
 * n'asservissent la composition complète attendue par T57 : flag CLI
 * `--regime=planifie` → régime → exécution du vrai contrôle `mutation` →
 * verdict → code de sortie. Ce test compose `bin/gate.ts::main` avec le vrai
 * `mutationCheck` sur les fixtures déjà utilisées par `mutation.test.ts`.
 *
 * Caractérisation légitime (T57 le demande explicitement) : la logique
 * CLI/runner/mutation-check du régime planifié est déjà implémentée (R6/R7),
 * donc ce test est attendu vert dès son ajout — seule la pièce `nightly.yml`
 * (T58) manque encore, couverte séparément par `nightly-workflow.test.ts`
 * (qui, elle, est rouge tant que le workflow n'existe pas).
 */
const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "test-fixtures",
  "mutation",
);

function ctxFor(scenario: string): GateContext {
  return { cwd: path.join(fixturesRoot, scenario) };
}

describe("Régime planifié bout-en-bout (bin/gate.ts::main + mutationCheck) — FR-030, SC-006", () => {
  it(
    "produit un verdict BLOQUÉ et un code de sortie non-zéro quand un mutant survivant du core est absent de la base de référence",
    async () => {
      const exitCode = await main(["--regime=planifie"], {
        ctx: ctxFor("survivor-not-in-baseline"),
        checks: [mutationCheck],
      });

      expect(exitCode).not.toBe(0);
    },
    120_000,
  );

  it(
    "produit un verdict TOUT VERT et le code de sortie 0 quand l'unique mutant survivant du core est couvert par une base de référence exhaustive",
    async () => {
      const exitCode = await main(["--regime=planifie"], {
        ctx: ctxFor("survivor-covered-by-baseline"),
        checks: [mutationCheck],
      });

      expect(exitCode).toBe(0);
    },
    120_000,
  );
});
