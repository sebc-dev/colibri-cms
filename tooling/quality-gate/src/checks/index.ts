import type { Check } from "../types";
import { boundariesCheck } from "./boundaries";
import { lintFormatCheck } from "./lint-format";
import { migrationCommentCheck } from "./migration-comment";
import { readSqlInAppsCheck } from "./read-sql-in-apps";
import { typecheckCheck } from "./typecheck";
import { versionsCatalogCheck } from "./versions-catalog";
import { writeHandlerCheck } from "./write-handler";

/**
 * Registre ordonné des contrôles — source de définition unique consommée par
 * `runGate` en local et en CI, quel que soit le régime (FR-019). Chaque
 * contrôle réel (`integration`, `boundaries`, `typecheck`, `mutation`, …) est
 * ajouté ici au fil des lots, tagué par son ou ses `regimes`.
 */
export const checks: Check[] = [
  boundariesCheck,
  readSqlInAppsCheck,
  writeHandlerCheck,
  typecheckCheck,
  lintFormatCheck,
  migrationCommentCheck,
  versionsCatalogCheck,
];
