import { pathToFileURL } from "node:url";
import { checks as registry } from "../src/checks/index";
import { runGate } from "../src/runner";
import type { Check, GateContext, Regime } from "../src/types";

interface MainOptions {
  ctx: GateContext;
  checks: Check[];
}

/** Lit `--regime=<par-changement|planifie>` depuis les arguments ; défaut : `par-changement`. */
function parseRegime(argv: string[]): Regime {
  const flag = argv.find((arg) => arg === "--regime" || arg.startsWith("--regime="));
  if (!flag) {
    return "par-changement";
  }

  const value = flag.includes("=") ? flag.split("=")[1] : argv[argv.indexOf(flag) + 1];

  if (value === "planifie" || value === "par-changement") {
    return value;
  }

  throw new Error(`Régime inconnu : ${value}`);
}

/**
 * Fonction testable de l'entrée CLI : calcule le code de sortie sans jamais
 * appeler `process.exit` elle-même (réservé au véritable point d'entrée).
 * `options.checks` est injectable (tests) ; par défaut, le point d'entrée
 * réel passe le registre unique.
 */
export async function main(argv: string[], options: MainOptions): Promise<number> {
  const regime = parseRegime(argv);
  const result = await runGate(options.ctx, regime, options.checks);

  console.log(
    `Verdict : ${result.verdict} — ${result.nbEchecs} échec(s) sur ${result.checks.length} contrôle(s) (régime ${result.regime})`,
  );

  return result.verdict === "TOUT VERT" ? 0 : 1;
}

const isDirectRun = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isDirectRun) {
  const exitCode = await main(process.argv.slice(2), { ctx: {}, checks: registry });
  process.exit(exitCode);
}
