import type { Check } from "../types";

/**
 * Registre ordonné des contrôles — source de définition unique consommée par
 * `runGate` en local et en CI, quel que soit le régime (FR-019). Chaque
 * contrôle réel (`integration`, `boundaries`, `typecheck`, `mutation`, …) est
 * ajouté ici au fil des lots, tagué par son ou ses `regimes`. Vide en R1 : le
 * socle du runner ne dépend d'aucun contrôle concret pour être testé.
 */
export const checks: Check[] = [];
