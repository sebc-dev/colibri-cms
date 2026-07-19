/**
 * Rendu du résultat agrégé du portail sous deux formes dérivées d'un même
 * `GateResult` : un rapport lisible par un humain (FR-017/SC-004) et une
 * représentation structurée lisible par machine (FR-018). Les deux formes
 * partagent la même source, garantissant l'absence de divergence de statut
 * pour un même contrôle (FR-028).
 */

import type { GateResult, MachineReport } from "./types";

/**
 * Produit un rapport texte listant chaque contrôle du résultat avec son
 * statut, et pour tout contrôle `échoué` un résumé de la cause en langage
 * clair (FR-017). Aucun contrôle du résultat n'est omis (SC-004).
 */
export function renderHuman(result: GateResult): string {
  const lignes = result.checks.map((check) => {
    const cause = check.statut === "échoué" && check.cause ? ` — ${check.cause}` : "";
    return `- ${check.id} : ${check.statut}${cause}`;
  });

  return [`Verdict : ${result.verdict} (${result.nbEchecs} échec(s))`, ...lignes].join("\n");
}

/**
 * Produit la représentation structurée lisible par machine du même
 * `GateResult` que `renderHuman`, dérivée sans transformation de statut
 * (FR-018), pour garantir l'absence de divergence entre les deux formes
 * (FR-028).
 */
export function renderMachine(result: GateResult): MachineReport {
  return {
    verdict: result.verdict,
    nbEchecs: result.nbEchecs,
    checks: result.checks.map((check) => ({
      contrôle: check.id,
      statut: check.statut,
      ...(check.cause !== undefined ? { cause: check.cause } : {}),
    })),
  };
}
