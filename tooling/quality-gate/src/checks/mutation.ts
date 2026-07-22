/**
 * Contrôle `mutation` — FR-002, FR-003, FR-025 : mesure des mutants
 * survivants du `core` via Stryker, comparés à la base de référence
 * exhaustive des survivants tolérés (ADR-0006 §3, §7, §Seuils). Cantonné au
 * régime planifié (nightly) — jamais exécuté sur le chemin PR, la mutation
 * étant coûteuse.
 *
 * Invoque le CLI Stryker en sous-processus, résolu par chemin (jamais de
 * spawn shell/`npx`), à l'image du patron déjà suivi par
 * `integration.ts`/`typecheck.ts`. Un « command runner » Stryker (plutôt
 * que le plugin `vitest-runner`) exécute la suite vitest du `core` pour
 * chaque mutant : robuste, sans dépendance à l'intégration spécifique d'un
 * framework de test, et cohérent avec le patron déjà en place pour lancer
 * vitest en sous-processus (cf. `integration.ts`).
 *
 * Le rapport JSON et la configuration générée vivent dans un répertoire
 * temporaire hors de l'arborescence analysée (jamais sous `packages/core`
 * ni à la racine du dépôt/scénario), pour ne polluer ni le dépôt réel ni
 * les fixtures de test isolées.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";
import { chargerBaseline, survivantsNonCouverts, type MutantSurvivant } from "../mutation-baseline";
import { spawnAsync } from "./process-utils";

const require = createRequire(import.meta.url);

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

/** Emplacement attendu du `core` mutable (dépôt greenfield : peut être absent, cf. FR-003). */
function dossierCore(ctx: GateContext): string {
  return path.join(racine(ctx), "packages", "core");
}

/** Chemin du CLI Stryker, résolu via la dépendance de ce paquet (jamais de spawn shell/`npx`). */
function cheminStrykerCli(): string {
  const packageJson = require.resolve("@stryker-mutator/core/package.json");
  return path.join(path.dirname(packageJson), "bin", "stryker.js");
}

/** Chemin du CLI vitest, résolu via la dépendance de ce paquet — voir `integration.ts`. */
function cheminVitestCli(): string {
  const packageJson = require.resolve("vitest/package.json");
  return path.join(path.dirname(packageJson), "vitest.mjs");
}

/** Convertit un chemin Windows en chemin à séparateurs `/`, seuls acceptés par la config JSON Stryker. */
function versSlash(chemin: string): string {
  return chemin.split(path.sep).join("/");
}

interface MutantRapporte {
  status: string;
  mutatorName: string;
}

interface RapportStryker {
  files: Record<string, { mutants: MutantRapporte[] }>;
}

/** Extrait les mutants au statut `Survived` du rapport JSON Stryker. */
function collecterSurvivants(rapport: RapportStryker): MutantSurvivant[] {
  const survivants: MutantSurvivant[] = [];

  for (const [fichier, donnees] of Object.entries(rapport.files)) {
    for (const mutant of donnees.mutants) {
      if (mutant.status === "Survived") {
        survivants.push({ fichier, mutateur: mutant.mutatorName });
      }
    }
  }

  return survivants;
}

/**
 * Construit la configuration Stryker pour cette exécution : mutate le
 * `core`, exécute la suite vitest du `core` via un « command runner »,
 * rapporte en JSON dans le répertoire temporaire fourni.
 */
function construireConfiguration(dossierTemp: string): Record<string, unknown> {
  const commande = `"${process.execPath}" "${cheminVitestCli()}" run --root packages/core`;

  return {
    packageManager: "npm",
    mutate: ["packages/core/src/**/*.ts", "!packages/core/src/**/*.test.ts"],
    // Restreint aux opérateurs de comparaison/égalité : les mutateurs
    // structurels (ConditionalExpression, BooleanLiteral) génèrent trop de
    // bruit non actionnable sur des gardes déjà couvertes par ailleurs.
    mutator: { excludedMutations: ["ConditionalExpression", "BooleanLiteral"] },
    testRunner: "command",
    commandRunner: { command: commande },
    checkers: [],
    reporters: ["json"],
    jsonReporter: { fileName: versSlash(path.join(dossierTemp, "mutation.json")) },
    concurrency: 1,
    tempDirName: versSlash(path.join(dossierTemp, ".stryker-tmp")),
    timeoutMS: 60_000,
  };
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const base = racine(ctx);

  if (!existsSync(dossierCore(ctx))) {
    return { id: "mutation", statut: "ignoré" };
  }

  const dossierTemp = mkdtempSync(path.join(tmpdir(), "quality-gate-mutation-"));
  const cheminRapport = path.join(dossierTemp, "mutation.json");
  const cheminConfig = path.join(dossierTemp, "stryker.conf.json");

  try {
    writeFileSync(cheminConfig, JSON.stringify(construireConfiguration(dossierTemp)), "utf-8");

    const resultat = await spawnAsync(process.execPath, [cheminStrykerCli(), "run", cheminConfig], {
      cwd: base,
    });

    if (resultat.error) {
      return { id: "mutation", statut: "échoué", cause: resultat.error.message };
    }

    if (!existsSync(cheminRapport)) {
      const sortie = [resultat.stdout, resultat.stderr]
        .filter((flux) => Boolean(flux))
        .join("\n")
        .trim();

      return {
        id: "mutation",
        statut: "échoué",
        cause: sortie || `Stryker n'a produit aucun rapport de mutation (code ${resultat.status})`,
      };
    }

    const rapport = JSON.parse(readFileSync(cheminRapport, "utf-8")) as RapportStryker;
    const survivants = collecterSurvivants(rapport);
    const etatBaseline = chargerBaseline(base);

    if (etatBaseline.etat === "absente" || etatBaseline.etat === "illisible") {
      return {
        id: "mutation",
        statut: "échoué",
        cause: `Base de référence des survivants tolérés ${etatBaseline.etat} (mutation-survivors.baseline.json) — FR-029 : ne peut jamais tolérer un survivant par défaut.`,
      };
    }

    const nonCouverts = survivantsNonCouverts(survivants, etatBaseline.entries);

    if (nonCouverts.length > 0) {
      const cause = nonCouverts
        .map(
          (survivant) =>
            `${survivant.fichier} : mutant survivant (${survivant.mutateur}) absent de la base de référence`,
        )
        .join(" ; ");

      return { id: "mutation", statut: "échoué", cause };
    }

    return { id: "mutation", statut: "passé" };
  } finally {
    rmSync(dossierTemp, { recursive: true, force: true });
  }
}

export const mutationCheck: Check = {
  id: "mutation",
  regimes: ["planifie"],
  applies(ctx) {
    return existsSync(dossierCore(ctx));
  },
  run,
};
