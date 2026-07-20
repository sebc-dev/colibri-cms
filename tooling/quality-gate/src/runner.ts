import { checks as registry } from "./checks/index";
import type { Check, CheckResult, GateContext, GateResult, Regime } from "./types";

/**
 * Exécute chaque contrôle du régime demandé, dans l'ordre du registre, sans
 * jamais s'arrêter au premier échec (FR-014). Filtre par régime depuis la
 * source de définition unique (FR-019/FR-020). Chaque contrôle est enveloppé
 * en fail-closed : toute exception (outil absent, mal configuré, terminaison
 * anormale) est rapportée `échoué`, jamais `passé` ni silencieusement ignorée
 * (FR-027). Agrège un verdict `TOUT VERT` ssi aucun contrôle n'est échoué,
 * sinon `BLOQUÉ` (FR-015).
 *
 * `checks` est injectable (tests) ; par défaut, le registre unique de
 * `checks/index.ts` est utilisé en local comme en CI, garantissant la parité.
 */
export async function runGate(
  ctx: GateContext,
  regime: Regime,
  checks: Check[] = registry,
): Promise<GateResult> {
  const results: CheckResult[] = [];

  for (const check of checks) {
    if (!check.regimes.includes(regime)) {
      continue;
    }

    try {
      results.push(await check.run(ctx));
    } catch (error) {
      results.push({
        id: check.id,
        statut: "échoué",
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const nbEchecs = results.filter((result) => result.statut === "échoué").length;

  return {
    verdict: nbEchecs === 0 ? "TOUT VERT" : "BLOQUÉ",
    nbEchecs,
    regime,
    checks: results,
  };
}
