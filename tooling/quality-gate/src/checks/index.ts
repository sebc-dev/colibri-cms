import type { Check } from "../types";
import { authzCoverageCheck } from "./authz-coverage";
import { boundariesCheck } from "./boundaries";
import { integrationCheck } from "./integration";
import { lintFormatCheck } from "./lint-format";
import { migrationCommentCheck } from "./migration-comment";
import { mutationCheck } from "./mutation";
import { readSqlInAppsCheck } from "./read-sql-in-apps";
import { turnstileTestCheck } from "./turnstile-test";
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
  integrationCheck,
  boundariesCheck,
  readSqlInAppsCheck,
  writeHandlerCheck,
  authzCoverageCheck,
  turnstileTestCheck,
  typecheckCheck,
  lintFormatCheck,
  migrationCommentCheck,
  versionsCatalogCheck,
  mutationCheck,
];
