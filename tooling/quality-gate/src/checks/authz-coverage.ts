/**
 * Contrôle `authz-coverage` — FR-007/SC-005 : 100 % des endpoints d'écriture
 * (`export const POST|PUT|PATCH|DELETE = writeHandler(...)`, même analyse
 * statique que `write-handler.ts`) doivent être couverts par un test
 * d'autorisation colocalisé (ADR-0006 §7). Un endpoint sans son
 * `<fichier>.test.ts` colocalisé fait échouer le contrôle ; une couverture
 * partielle (au moins un endpoint non couvert parmi plusieurs) échoue aussi.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";
import { listerFichiersSource, lireFichier } from "./fs-utils";

/** Méthodes HTTP d'écriture concernées (mêmes que FR-006/`write-handler.ts`). */
const REGEX_ENDPOINT_ECRITURE =
  /export\s+const\s+(POST|PUT|PATCH|DELETE)\b[^=]*=\s*writeHandler\b/g;

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

/** Chemin du test d'autorisation colocalisé attendu pour un fichier d'endpoint. */
function cheminTestColocalise(fichierEndpoint: string): string {
  const { dir, name } = path.parse(fichierEndpoint);
  return path.join(dir, `${name}.test.ts`);
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const dossierApps = path.join(racine(ctx), "apps");
  const causes: string[] = [];

  for (const fichier of listerFichiersSource(dossierApps)) {
    if (fichier.endsWith(".test.ts") || fichier.endsWith(".test.tsx")) {
      continue;
    }

    const contenu = lireFichier(fichier);

    for (const match of contenu.matchAll(REGEX_ENDPOINT_ECRITURE)) {
      const [, methode] = match;
      const cheminTest = cheminTestColocalise(fichier);

      if (!existsSync(cheminTest)) {
        causes.push(
          `endpoint ${methode} de ${fichier} n'a aucun test d'autorisation colocalisé (attendu : ${cheminTest})`,
        );
      }
    }
  }

  if (causes.length > 0) {
    return { id: "authz-coverage", statut: "échoué", cause: causes.join(" ; ") };
  }

  return { id: "authz-coverage", statut: "passé" };
}

export const authzCoverageCheck: Check = {
  id: "authz-coverage",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(path.join(racine(ctx), "apps"));
  },
  run,
};
