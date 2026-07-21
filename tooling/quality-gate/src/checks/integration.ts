/**
 * Contrôle `integration` — FR-001 : suite d'intégration s'appuyant sur de
 * vraies ressources de données locales (ADR-0005 ; ADR-0006 §7 ; ne pas
 * sur-mocker D1/R2/KV). Délègue l'exécution à une instance vitest dédiée
 * localisée sous `tests/integration/`, en sous-processus isolé (le CLI
 * vitest de ce paquet, résolu par chemin plutôt que via un shell, pour rester
 * portable Windows compris — cf. `typecheck.ts`) afin de ne pas interférer
 * avec le run vitest du portail lui-même.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";

const require = createRequire(import.meta.url);

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

/** Emplacement attendu de la suite d'intégration (dépôt greenfield : peut être absent). */
function dossierSuite(ctx: GateContext): string {
  return path.join(racine(ctx), "tests", "integration");
}

/** Chemin du CLI vitest, résolu via la dépendance de ce paquet (jamais de spawn shell/`npx`). */
function cheminVitestCli(): string {
  const packageJson = require.resolve("vitest/package.json");
  return path.join(path.dirname(packageJson), "vitest.mjs");
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const cwd = dossierSuite(ctx);

  if (!existsSync(cwd)) {
    return { id: "integration", statut: "ignoré" };
  }

  const resultat = spawnSync(process.execPath, [cheminVitestCli(), "run"], {
    cwd,
    encoding: "utf-8",
  });

  if (resultat.error) {
    return { id: "integration", statut: "échoué", cause: resultat.error.message };
  }

  if (resultat.status !== 0) {
    const sortie = [resultat.stdout, resultat.stderr]
      .filter((flux) => Boolean(flux))
      .join("\n")
      .trim();

    return {
      id: "integration",
      statut: "échoué",
      cause: sortie || `la suite d'intégration a échoué (code ${resultat.status})`,
    };
  }

  return { id: "integration", statut: "passé" };
}

export const integrationCheck: Check = {
  id: "integration",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(dossierSuite(ctx));
  },
  run,
};
