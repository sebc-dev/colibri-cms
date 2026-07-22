/**
 * Contrôle `versions-catalog` — FR-013 : toute dépendance structurante doit
 * provenir du catalogue centralisé `pnpm-workspace.yaml` (`catalog:`
 * ADR-0003), et les majeures d'Astro / de son adaptateur d'exécution
 * `@astrojs/cloudflare` déclarées dans ce catalogue ne doivent pas être
 * mélangées (peer dependency stricte : `@astrojs/cloudflare@14.x` exige
 * `astro@^7`, `@astrojs/cloudflare@13.x` exige `astro@^6`).
 *
 * Analyse statique légère : le sous-ensemble YAML utile (`catalog:` puis
 * paires `clé: valeur` indentées) est extrait à la main plutôt que via une
 * dépendance YAML complète, la structure attendue étant simple et stable.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";
import { lireFichier, listerFichiersAvecPredicat } from "./fs-utils";

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

/** Extrait les paires `nom: version` du bloc `catalog:` d'un `pnpm-workspace.yaml`. */
function parserCatalogue(contenuYaml: string): Map<string, string> {
  const catalogue = new Map<string, string>();
  const lignes = contenuYaml.split(/\r?\n/);
  let dansCatalogue = false;

  for (const ligne of lignes) {
    if (/^catalog:\s*$/.test(ligne)) {
      dansCatalogue = true;
      continue;
    }

    if (!dansCatalogue) {
      continue;
    }

    if (ligne.trim() === "") {
      continue;
    }

    if (!/^\s/.test(ligne)) {
      // Retour à l'indentation racine : fin du bloc `catalog:`.
      dansCatalogue = false;
      continue;
    }

    const correspondance = /^\s+["']?([^"':]+)["']?:\s*["']?([^"'\s]+)["']?\s*$/.exec(ligne);
    if (correspondance) {
      const [, nom, version] = correspondance;
      if (nom && version) {
        catalogue.set(nom, version);
      }
    }
  }

  return catalogue;
}

function extraireMajeure(version: string): number | undefined {
  const correspondance = /^(\d+)\./.exec(version);
  return correspondance?.[1] ? Number(correspondance[1]) : undefined;
}

/** Majeure Astro requise par la majeure de `@astrojs/cloudflare`, d'après ses `peerDependencies` publiées. */
const MAJEURE_ASTRO_REQUISE_PAR_ADAPTATEUR: Record<number, number> = {
  14: 7,
  13: 6,
};

function causesMajeuresIncompatibles(catalogue: Map<string, string>): string[] {
  const versionAstro = catalogue.get("astro");
  const versionAdaptateur = catalogue.get("@astrojs/cloudflare");

  if (!versionAstro || !versionAdaptateur) {
    return [];
  }

  const majeureAstro = extraireMajeure(versionAstro);
  const majeureAdaptateur = extraireMajeure(versionAdaptateur);

  if (majeureAstro === undefined || majeureAdaptateur === undefined) {
    return [];
  }

  const majeureAstroAttendue = MAJEURE_ASTRO_REQUISE_PAR_ADAPTATEUR[majeureAdaptateur];

  if (majeureAstroAttendue !== undefined && majeureAstroAttendue !== majeureAstro) {
    return [
      `catalogue : astro@${versionAstro} et @astrojs/cloudflare@${versionAdaptateur} ont des majeures incompatibles (astro@${majeureAstroAttendue}.x attendu)`,
    ];
  }

  return [];
}

function causesDependancesHorsCatalogue(base: string, catalogue: Map<string, string>): string[] {
  const causes: string[] = [];
  const fichiersPackageJson = listerFichiersAvecPredicat(base, (nom) => nom === "package.json");

  for (const fichier of fichiersPackageJson) {
    let paquet: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

    try {
      paquet = JSON.parse(lireFichier(fichier)) as typeof paquet;
    } catch {
      continue;
    }

    for (const champ of ["dependencies", "devDependencies"] as const) {
      const dependances = paquet[champ];
      if (!dependances) {
        continue;
      }

      for (const [nom, version] of Object.entries(dependances)) {
        if (catalogue.has(nom) && version !== "catalog:") {
          causes.push(`${nom} dans ${fichier} doit référencer "catalog:" (trouvé "${version}")`);
        }
      }
    }
  }

  return causes;
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const base = racine(ctx);
  const contenuYaml = lireFichier(path.join(base, "pnpm-workspace.yaml"));
  const catalogue = parserCatalogue(contenuYaml);

  const causes = [
    ...causesDependancesHorsCatalogue(base, catalogue),
    ...causesMajeuresIncompatibles(catalogue),
  ];

  if (causes.length > 0) {
    return { id: "versions-catalog", statut: "échoué", cause: causes.join(" ; ") };
  }

  return { id: "versions-catalog", statut: "passé" };
}

export const versionsCatalogCheck: Check = {
  id: "versions-catalog",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(path.join(racine(ctx), "pnpm-workspace.yaml"));
  },
  run,
};
