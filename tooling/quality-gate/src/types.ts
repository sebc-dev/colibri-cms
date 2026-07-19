/**
 * Types du portail de qualité — contrat partagé entre le registre de
 * contrôles, le runner et les entrées CLI (local + CI).
 */

import { z } from "zod";

/** Régime d'exécution : `par-changement` = gate de merge (défaut), `planifie` = nightly (mutation). */
export type Regime = "par-changement" | "planifie";

/** Statut d'un contrôle après exécution. `ignoré` ≠ `passé` (périmètre vide) ; jamais silencieux. */
export type Statut = "passé" | "échoué" | "ignoré";

/** Contexte injecté à chaque contrôle (périmètre git, cwd, etc.). Étendu par `scope.ts`. */
export interface GateContext {
  cwd?: string;
}

/** Résultat rapporté par un contrôle. */
export interface CheckResult {
  id: string;
  statut: Statut;
  cause?: string;
}

/** Un contrôle du registre unique, tagué par le ou les régimes où il tourne. */
export interface Check {
  id: string;
  regimes: Regime[];
  applies(ctx: GateContext): boolean;
  run(ctx: GateContext): Promise<CheckResult>;
}

/** Verdict agrégé d'une exécution de `runGate`. */
export type Verdict = "TOUT VERT" | "BLOQUÉ";

/** Résultat agrégé d'un `runGate` — source unique du rapport lisible et de la sortie machine. */
export interface GateResult {
  verdict: Verdict;
  nbEchecs: number;
  regime: Regime;
  checks: CheckResult[];
}

/**
 * Schéma Zod de la représentation structurée (machine) d'un contrôle,
 * dérivée de `CheckResult` (FR-018).
 */
export const machineCheckSchema = z.object({
  contrôle: z.string(),
  statut: z.enum(["passé", "échoué", "ignoré"]),
  cause: z.string().optional(),
});

/**
 * Schéma Zod de la représentation structurée (machine) du résultat agrégé
 * du portail, produite par `renderMachine` à partir d'un `GateResult`
 * unique (FR-018), en parité de statuts avec `renderHuman` (FR-028).
 */
export const machineReportSchema = z.object({
  verdict: z.enum(["TOUT VERT", "BLOQUÉ"]),
  nbEchecs: z.number(),
  checks: z.array(machineCheckSchema),
});

/** Représentation structurée (machine) inférée du schéma Zod ci-dessus. */
export type MachineReport = z.infer<typeof machineReportSchema>;
