/**
 * Contrôle `boundaries` — FR-004 : vérifie les frontières d'imports déclarées
 * par ADR-0004. Deux interdictions ciblées par analyse statique légère
 * (lecture de fichiers + regex sur les déclarations d'import), sans dépendre
 * d'un outil externe :
 *
 * - `@colibri/core` ne doit importer `cloudflare*` qu'en `import type`
 *   (aucun import runtime).
 * - ni `@colibri/core` ni `@colibri/db` ne doivent importer depuis `apps/*`.
 */

import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";
import { existsSync } from "node:fs";
import { listerFichiersSource, lireFichier } from "./fs-utils";

interface ImportDeclare {
  spec: string;
  typeOnly: boolean;
}

const REGEX_IMPORT = /^\s*import\s+(type\s+)?[\s\S]*?from\s+["']([^"']+)["']/gm;
const REGEX_EXPORT_FROM = /^\s*export\s+(type\s+)?[\s\S]*?from\s+["']([^"']+)["']/gm;
const REGEX_CLOUDFLARE = /^@?cloudflare/i;
const REGEX_APPS = /(^|\/)apps(\/|$)/;

function parseImports(contenu: string): ImportDeclare[] {
  const resultats: ImportDeclare[] = [];
  for (const match of contenu.matchAll(REGEX_IMPORT)) {
    const spec = match[2];
    if (spec === undefined) {
      continue;
    }
    resultats.push({ typeOnly: Boolean(match[1]), spec });
  }
  for (const match of contenu.matchAll(REGEX_EXPORT_FROM)) {
    const spec = match[2];
    if (spec === undefined) {
      continue;
    }
    resultats.push({ typeOnly: Boolean(match[1]), spec });
  }
  return resultats;
}

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

function analyserDossier(dossier: string, interdireCloudflareRuntime: boolean): string[] {
  const causes: string[] = [];

  for (const fichier of listerFichiersSource(dossier)) {
    const contenu = lireFichier(fichier);

    for (const { spec, typeOnly } of parseImports(contenu)) {
      if (interdireCloudflareRuntime && !typeOnly && REGEX_CLOUDFLARE.test(spec)) {
        causes.push(`import runtime de cloudflare* interdit dans ${fichier} (${spec})`);
      }
      if (REGEX_APPS.test(spec)) {
        causes.push(`import d'apps/* interdit dans ${fichier} (${spec})`);
      }
    }
  }

  return causes;
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const base = racine(ctx);
  const causes = [
    ...analyserDossier(path.join(base, "packages", "core"), true),
    ...analyserDossier(path.join(base, "packages", "db"), false),
  ];

  if (causes.length > 0) {
    return { id: "boundaries", statut: "échoué", cause: causes.join(" ; ") };
  }

  return { id: "boundaries", statut: "passé" };
}

export const boundariesCheck: Check = {
  id: "boundaries",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(path.join(racine(ctx), "packages"));
  },
  run,
};
