/**
 * Contrôle `write-handler` — FR-006 : tout endpoint d'écriture (POST, PUT,
 * PATCH, DELETE) doit passer par `writeHandler`. Les endpoints de lecture
 * (GET) sont hors périmètre. Analyse statique par regex sur la déclaration
 * exportée de la méthode HTTP.
 */

import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";
import { existsSync } from "node:fs";
import { listerFichiersSource, lireFichier } from "./fs-utils";

/** Méthodes HTTP d'écriture concernées par FR-006 (GET est hors périmètre). */
const REGEX_ENDPOINT_ECRITURE = /export\s+const\s+(POST|PUT|PATCH|DELETE)\b[^=]*=\s*(\w+)/g;

/** Déclaration de fonction (idiomatique Astro), qui ne peut jamais être writeHandler(...). */
const REGEX_ENDPOINT_ECRITURE_FONCTION =
  /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/g;

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const dossierApps = path.join(racine(ctx), "apps");
  const causes: string[] = [];

  for (const fichier of listerFichiersSource(dossierApps)) {
    const contenu = lireFichier(fichier);

    for (const match of contenu.matchAll(REGEX_ENDPOINT_ECRITURE)) {
      const [, methode, valeur] = match;
      if (valeur !== "writeHandler") {
        causes.push(`endpoint ${methode} de ${fichier} ne passe pas par writeHandler`);
      }
    }

    for (const match of contenu.matchAll(REGEX_ENDPOINT_ECRITURE_FONCTION)) {
      const [, methode] = match;
      causes.push(`endpoint ${methode} de ${fichier} ne passe pas par writeHandler`);
    }
  }

  if (causes.length > 0) {
    return { id: "write-handler", statut: "échoué", cause: causes.join(" ; ") };
  }

  return { id: "write-handler", statut: "passé" };
}

export const writeHandlerCheck: Check = {
  id: "write-handler",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(path.join(racine(ctx), "apps"));
  },
  run,
};
