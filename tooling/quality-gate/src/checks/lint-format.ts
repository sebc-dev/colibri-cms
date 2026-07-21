/**
 * Contrôle `lint-format` — FR-011 : lint (ESLint) et contrôle de format
 * (`prettier --check`), deux déclencheurs d'échec indépendants (ADR-0002
 * §3). Utilise les API Node d'ESLint et de Prettier plutôt qu'un spawn de
 * processus, pour rester portable. La configuration réelle du dépôt
 * (`eslint.config.mjs`, `prettier.config.mjs`) est chargée explicitement
 * depuis la racine du dépôt afin de s'appliquer aussi aux fixtures isolées
 * de `test-fixtures/lint-format/`, qui n'ont pas leur propre configuration.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ESLint } from "eslint";
import { format } from "prettier";
import type { Check, CheckResult, GateContext } from "../types";
import { listerFichiersSource, lireFichier } from "./fs-utils";

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

/** Racine du dépôt (4 niveaux au-dessus de `src/checks/`), où vivent `eslint.config.mjs` et `prettier.config.mjs`. */
function racineDepot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
}

async function verifierEslint(fichiers: string[], depot: string): Promise<string[]> {
  if (fichiers.length === 0) {
    return [];
  }

  const eslint = new ESLint({
    cwd: depot,
    overrideConfigFile: path.join(depot, "eslint.config.mjs"),
  });

  const resultats = await eslint.lintFiles(fichiers);
  const causes: string[] = [];

  for (const resultat of resultats) {
    for (const message of resultat.messages) {
      if (message.severity === 2) {
        const suffixeRegle = message.ruleId ? ` (${message.ruleId})` : "";
        causes.push(`${resultat.filePath}:${message.line} ${message.message}${suffixeRegle}`);
      }
    }
  }

  return causes;
}

async function verifierPrettier(fichiers: string[], depot: string): Promise<string[]> {
  if (fichiers.length === 0) {
    return [];
  }

  const module = (await import(pathToFileURL(path.join(depot, "prettier.config.mjs")).href)) as {
    default: Record<string, unknown>;
  };
  const configuration = module.default;
  const causes: string[] = [];

  for (const fichier of fichiers) {
    const contenu = lireFichier(fichier);
    const formate = await format(contenu, { ...configuration, filepath: fichier });

    if (formate !== contenu) {
      causes.push(`${fichier} n'est pas formaté selon Prettier (prettier --check échouerait)`);
    }
  }

  return causes;
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const base = racine(ctx);
  const depot = racineDepot();
  const fichiers = listerFichiersSource(base);

  const causes = [
    ...(await verifierEslint(fichiers, depot)),
    ...(await verifierPrettier(fichiers, depot)),
  ];

  if (causes.length > 0) {
    return { id: "lint-format", statut: "échoué", cause: causes.join(" ; ") };
  }

  return { id: "lint-format", statut: "passé" };
}

export const lintFormatCheck: Check = {
  id: "lint-format",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(racine(ctx));
  },
  run,
};
