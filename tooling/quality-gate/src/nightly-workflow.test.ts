import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * R11 — FR-030, SC-006 : le comportement du régime planifié (BLOQUÉ +
 * code de sortie non-zéro sur survivant hors base de référence) n'est
 * effectif en pratique que si une exécution récurrente, indépendante de
 * tout chemin pull_request, l'invoque réellement. Ce fichier vérifie
 * statiquement (lecture, sans simulateur `act`) le workflow GitHub Actions
 * `nightly.yml` attendu par T58, dont le contenu est la seule pièce
 * manquante de ce lot (la sémantique CLI/régime elle-même est déjà
 * couverte par `nightly-regime.test.ts`).
 */
const racineDepot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cheminWorkflow = path.join(racineDepot, ".github", "workflows", "nightly.yml");

function lireWorkflow(): string {
  return readFileSync(cheminWorkflow, "utf-8");
}

/**
 * Isole le bloc de l'étape (YAML `steps:`) qui invoque le régime planifié,
 * en repérant la ligne de démarrage d'étape (`- ...`) qui la précède et
 * celle qui la suit. Heuristique volontairement légère (lecture, pas de
 * parseur YAML dans l'outillage) — suffisante pour vérifier qu'aucune
 * option locale à cette étape ne désactive la propagation de l'échec.
 */
function extraireEtapeGate(contenu: string): string {
  const lignes = contenu.split("\n");
  const indexGate = lignes.findIndex((ligne) => /--regime[=\s]planifie/.test(ligne));

  if (indexGate === -1) {
    return "";
  }

  let debut = indexGate;
  while (debut > 0 && !/^\s*-\s/.test(lignes[debut] ?? "")) {
    debut -= 1;
  }

  let fin = indexGate + 1;
  while (fin < lignes.length && !/^\s*-\s/.test(lignes[fin] ?? "")) {
    fin += 1;
  }

  return lignes.slice(debut, fin).join("\n");
}

describe("Workflow CI nightly (.github/workflows/nightly.yml) — FR-030 : build planifié invoquant le régime planifié", () => {
  it("existe à l'emplacement attendu du dépôt", () => {
    expect(existsSync(cheminWorkflow)).toBe(true);
  });

  it("se déclenche sur une planification récurrente (cron), pas uniquement à la demande", () => {
    expect(existsSync(cheminWorkflow)).toBe(true);

    const contenu = lireWorkflow();

    expect(contenu).toMatch(/schedule:/);
    expect(contenu).toMatch(/cron:\s*["']/);
  });

  it("invoque le portail en régime planifié (`pnpm … gate --regime=planifie` ou équivalent `--regime planifie`)", () => {
    expect(existsSync(cheminWorkflow)).toBe(true);

    const contenu = lireWorkflow();

    expect(contenu).toMatch(/gate\s+.*--regime[=\s]planifie/);
  });

  it("ne désactive jamais l'échec de l'étape invoquant le régime planifié (pas de `continue-on-error: true` sur cette étape, FR-030 : le build planifié doit échouer)", () => {
    expect(existsSync(cheminWorkflow)).toBe(true);

    const contenu = lireWorkflow();
    const etapeGate = extraireEtapeGate(contenu);

    expect(etapeGate).not.toBe("");
    expect(etapeGate).not.toMatch(/continue-on-error:\s*true/);
  });
});

describe("Workflow CI nightly — SC-006 : détection indépendante de la discipline d'un dev sur le chemin pull_request", () => {
  it("ne conditionne jamais son déclenchement à un événement pull_request (sinon la détection dépendrait d'une PR ouverte par un dev)", () => {
    expect(existsSync(cheminWorkflow)).toBe(true);

    const contenu = lireWorkflow();

    expect(contenu).not.toMatch(/pull_request\s*:/);
  });
});
