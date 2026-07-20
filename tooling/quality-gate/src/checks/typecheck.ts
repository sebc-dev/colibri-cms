/**
 * Contrôle `typecheck` — FR-010 : vérification de types statique en mode
 * strict (ADR-0004 ; CLAUDE.md § Style). Utilise l'API du compilateur
 * TypeScript (équivalent programmatique de `tsc --noEmit`) plutôt qu'un
 * spawn de processus, pour rester portable (Windows compris) et éviter les
 * soucis de résolution du binaire `tsc` selon le répertoire courant.
 *
 * Cherche `tsconfig.json` en remontant depuis `ctx.cwd`, construit un
 * programme TypeScript à partir de ce fichier, puis rapporte `échoué` dès
 * qu'un diagnostic pré-émission (syntaxique ou de type) existe.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { Check, CheckResult, GateContext } from "../types";

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const base = racine(ctx);
  const cheminConfig = ts.findConfigFile(base, ts.sys.fileExists, "tsconfig.json");

  if (!cheminConfig) {
    return { id: "typecheck", statut: "passé" };
  }

  const fichierConfig = ts.readConfigFile(cheminConfig, ts.sys.readFile);

  if (fichierConfig.error) {
    return {
      id: "typecheck",
      statut: "échoué",
      cause: ts.flattenDiagnosticMessageText(fichierConfig.error.messageText, "\n"),
    };
  }

  const analyse = ts.parseJsonConfigFileContent(
    fichierConfig.config,
    ts.sys,
    path.dirname(cheminConfig),
  );

  const programme = ts.createProgram({ rootNames: analyse.fileNames, options: analyse.options });
  const diagnostics = ts.getPreEmitDiagnostics(programme);

  if (diagnostics.length > 0) {
    const messages = diagnostics.map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        return `${diagnostic.file.fileName}:${line + 1} ${message}`;
      }
      return message;
    });

    return { id: "typecheck", statut: "échoué", cause: messages.join(" ; ") };
  }

  return { id: "typecheck", statut: "passé" };
}

export const typecheckCheck: Check = {
  id: "typecheck",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(path.join(racine(ctx), "tsconfig.json"));
  },
  run,
};
