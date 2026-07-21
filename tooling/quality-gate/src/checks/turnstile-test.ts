/**
 * Contrôle `turnstile-test` — FR-008/FR-009 : toute route publique
 * (`export const POST|PUT|PATCH|DELETE = writeHandler({ auth: "public" }, ...)`)
 * doit être couverte par un test colocalisé vérifiant le rejet en l'absence
 * de jeton Turnstile valide (ADR-0005 ; ADR-0007). En l'absence de toute
 * route publique dans le périmètre (formulaires P2, contrôle dormant), le
 * contrôle est `ignoré` — jamais `échoué` (sémantique stricte : `ignoré`
 * seulement sur un périmètre vérifié vide).
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type { Check, CheckResult, GateContext } from "../types";
import { listerFichiersSource, lireFichier } from "./fs-utils";

/** Endpoint d'écriture déclaré public (auth: "public") — seul périmètre concerné par Turnstile. */
const REGEX_ROUTE_PUBLIQUE =
  /export\s+const\s+(POST|PUT|PATCH|DELETE)\b[^=]*=\s*writeHandler\s*\(\s*\{\s*auth\s*:\s*["']public["']/g;

interface RoutePublique {
  fichier: string;
  methode: string;
}

function racine(ctx: GateContext): string {
  return ctx.cwd ?? process.cwd();
}

/** Recense les routes publiques du périmètre (tolère `apps/` absent). */
function trouverRoutesPubliques(ctx: GateContext): RoutePublique[] {
  const dossierApps = path.join(racine(ctx), "apps");
  const routes: RoutePublique[] = [];

  for (const fichier of listerFichiersSource(dossierApps)) {
    if (fichier.endsWith(".test.ts") || fichier.endsWith(".test.tsx")) {
      continue;
    }

    const contenu = lireFichier(fichier);

    for (const match of contenu.matchAll(REGEX_ROUTE_PUBLIQUE)) {
      const methode = match[1] ?? "?";
      routes.push({ fichier, methode });
    }
  }

  return routes;
}

/** Chemin du test colocalisé attendu pour un fichier de route. */
function cheminTestColocalise(fichierRoute: string): string {
  const { dir, name } = path.parse(fichierRoute);
  return path.join(dir, `${name}.test.ts`);
}

async function run(ctx: GateContext): Promise<CheckResult> {
  const routes = trouverRoutesPubliques(ctx);

  if (routes.length === 0) {
    return { id: "turnstile-test", statut: "ignoré" };
  }

  const causes: string[] = [];

  for (const { fichier, methode } of routes) {
    const cheminTest = cheminTestColocalise(fichier);

    if (!existsSync(cheminTest)) {
      causes.push(
        `route publique ${methode} de ${fichier} n'a aucun test de rejet Turnstile colocalisé (attendu : ${cheminTest})`,
      );
    }
  }

  if (causes.length > 0) {
    return { id: "turnstile-test", statut: "échoué", cause: causes.join(" ; ") };
  }

  return { id: "turnstile-test", statut: "passé" };
}

export const turnstileTestCheck: Check = {
  id: "turnstile-test",
  regimes: ["par-changement"],
  applies(ctx) {
    return trouverRoutesPubliques(ctx).length > 0;
  },
  run,
};
