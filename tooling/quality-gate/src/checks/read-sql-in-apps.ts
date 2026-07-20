/**
 * Contrôle `read-sql-in-apps` — FR-005 : toute lecture SQL partagée doit
 * vivre dans `@colibri/db` ; ce contrôle rapporte `échoué` si du SQL de
 * lecture (SELECT) apparaît dans `apps/*`. L'écriture (INSERT/UPDATE/DELETE)
 * n'est pas concernée par ce contrôle.
 */

import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";
import { existsSync } from "node:fs";
import { listerFichiersSource, lireFichier } from "./fs-utils";

/** Détecte une chaîne littérale contenant une requête SQL de lecture (SELECT). */
const REGEX_SELECT = /["'`][^"'`]*?\bselect\b[^"'`]*?["'`]/i;

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const dossierApps = path.join(racine(ctx), "apps");
  const causes: string[] = [];

  for (const fichier of listerFichiersSource(dossierApps)) {
    const contenu = lireFichier(fichier);
    if (REGEX_SELECT.test(contenu)) {
      causes.push(`SQL de lecture (SELECT) détecté dans ${fichier}`);
    }
  }

  if (causes.length > 0) {
    return { id: "read-sql-in-apps", statut: "échoué", cause: causes.join(" ; ") };
  }

  return { id: "read-sql-in-apps", statut: "passé" };
}

export const readSqlInAppsCheck: Check = {
  id: "read-sql-in-apps",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(path.join(racine(ctx), "apps"));
  },
  run,
};
