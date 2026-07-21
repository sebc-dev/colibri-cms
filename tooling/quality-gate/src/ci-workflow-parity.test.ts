import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checks as registry } from "./checks/index";
import { mutationCheck } from "./checks/mutation";
import { runGate } from "./runner";
import type { GateContext } from "./types";

/**
 * FR-020 / SC-002 : pour un même commit et le régime par-changement, le
 * portail doit produire le même verdict agrégé qu'il s'exécute en local ou
 * en CI. La parité n'est garantie que si la CI rejoue le **même** point
 * d'entrée (`runGate` + registre unique de `checks/index.ts`), pas une copie
 * ou un sous-ensemble ad hoc de contrôles. On vérifie donc deux choses :
 * (1) `.github/workflows/ci.yml` invoque bien ce point d'entrée unique, sans
 * changer de régime ni avaler le code de sortie ; (2) le registre réel, en
 * régime par-changement, exclut le contrôle de mutation (réservé au régime
 * planifié), comme le fera cette étape CI unique.
 */
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ciWorkflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");

function lireWorkflowCi(): string {
  return readFileSync(ciWorkflowPath, "utf-8");
}

const ctx: GateContext = {} as GateContext;

describe("ci.yml — FR-020 : le verdict agrégé produit en local et en CI est identique (même régime)", () => {
  it("l'étape CI invoque le point d'entrée unique du portail (`pnpm gate`) sans changer de régime par défaut", () => {
    const workflow = lireWorkflowCi();

    expect(workflow).toMatch(/run:\s*pnpm gate\b/);
    expect(workflow).not.toMatch(/--regime[= ]planifie/);
  });

  it("le registre réel filtré en régime par-changement (celui que la CI rejoue) exclut le contrôle de mutation", async () => {
    const resultatParChangement = await runGate(ctx, "par-changement", registry);

    const idsExecutes = resultatParChangement.checks.map((check) => check.id);

    expect(idsExecutes).not.toContain(mutationCheck.id);
  });
});

describe("ci.yml — SC-002 : pour un même commit, le verdict agrégé local et CI ne divergent jamais", () => {
  it("l'étape CI propage le code de sortie du portail sans continue-on-error ni suppression d'erreur", () => {
    const workflow = lireWorkflowCi();

    expect(workflow).not.toMatch(/continue-on-error:\s*true/);
    expect(workflow).not.toMatch(/pnpm gate[^\n]*\|\|\s*true/);
  });

  it("exécuter deux fois runGate en régime par-changement avec le registre unique produit le même verdict agrégé pour un même contexte, comme l'exigent une exécution locale et l'étape CI unique", async () => {
    const resultatLocal = await runGate(ctx, "par-changement", registry);
    const resultatCi = await runGate(ctx, "par-changement", registry);

    expect(resultatCi.verdict).toBe(resultatLocal.verdict);
    expect(resultatCi.checks.map((c) => c.id).sort()).toEqual(
      resultatLocal.checks.map((c) => c.id).sort(),
    );
  });
});
