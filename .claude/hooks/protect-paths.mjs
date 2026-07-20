#!/usr/bin/env node
/**
 * Hook `PreToolUse` — FR-021 : refuse toute écriture IA (Edit|Write|MultiEdit)
 * sous un chemin possédé par l'humain (`tests/`, `migrations/`, tout dossier
 * `schema` à n'importe quelle profondeur, config des frontières, seam
 * d'auth), avant que l'écriture n'ait lieu.
 *
 * Protocole Claude Code : payload JSON sur stdin, `process.exit(2)` +
 * message sur stderr pour bloquer (ADR-0002 §3), `process.exit(0)` pour
 * laisser passer.
 *
 * FR-023 : la liste des chemins protégés provient de la source unique
 * `tooling/quality-gate/src/protected-paths.ts` — jamais dupliquée ici.
 */

import { estCheminProtege } from "../../tooling/quality-gate/src/protected-paths.ts";

const OUTILS_ECRITURE = new Set(["Edit", "Write", "MultiEdit"]);

function lireStdin() {
  return new Promise((resolve) => {
    let donnees = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      donnees += chunk;
    });
    process.stdin.on("end", () => resolve(donnees));
  });
}

async function main() {
  const entree = await lireStdin();

  let payload;
  try {
    payload = JSON.parse(entree);
  } catch {
    process.exit(0);
    return;
  }

  const nomOutil = payload?.tool_name;
  if (!OUTILS_ECRITURE.has(nomOutil)) {
    process.exit(0);
    return;
  }

  const cheminFichier = payload?.tool_input?.file_path;
  if (typeof cheminFichier !== "string" || cheminFichier.length === 0) {
    process.exit(0);
    return;
  }

  if (estCheminProtege(cheminFichier)) {
    process.stderr.write(
      `Chemin protégé : écriture refusée sur « ${cheminFichier} ». Ce chemin est possédé par l'humain (tests/, migrations/, dossiers schema/, config des frontières, seam d'auth — ADR-0006 §9) et ne peut pas être modifié par l'IA.`,
    );
    process.exit(2);
    return;
  }

  process.exit(0);
}

main();
