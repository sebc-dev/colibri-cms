/**
 * Contrôle `migration-comment` — FR-012 : une migration D1 ne doit jamais se
 * terminer par une ligne de commentaire SQL (`--`). Contourne le bug
 * outillage #7739, qui tronque silencieusement l'application d'une
 * migration se terminant par un commentaire (ADR-0005).
 *
 * Analyse statique : dernière ligne non vide de chaque fichier `.sql` sous
 * `migrations/`. Tolère l'absence du dossier (retourne `passé`), à l'image
 * du patron déjà suivi par `boundaries`/`read-sql-in-apps`.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";
import { lireFichier, listerFichiersAvecPredicat } from "./fs-utils";

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

function derniereLigneSignificative(contenu: string): string | undefined {
  const lignes = contenu.split(/\r?\n/);

  for (let i = lignes.length - 1; i >= 0; i -= 1) {
    const ligne = lignes[i]?.trim();
    if (ligne) {
      return ligne;
    }
  }

  return undefined;
}

function analyserMigrations(dossier: string): string[] {
  const causes: string[] = [];

  for (const fichier of listerFichiersAvecPredicat(dossier, (nom) => nom.endsWith(".sql"))) {
    const derniere = derniereLigneSignificative(lireFichier(fichier));

    if (derniere && derniere.startsWith("--")) {
      causes.push(
        `${fichier} se termine par une ligne de commentaire (bug outillage #7739) : "${derniere}"`,
      );
    }
  }

  return causes;
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const causes = analyserMigrations(path.join(racine(ctx), "migrations"));

  if (causes.length > 0) {
    return { id: "migration-comment", statut: "échoué", cause: causes.join(" ; ") };
  }

  return { id: "migration-comment", statut: "passé" };
}

export const migrationCommentCheck: Check = {
  id: "migration-comment",
  regimes: ["par-changement"],
  applies(ctx) {
    return existsSync(path.join(racine(ctx), "migrations"));
  },
  run,
};
