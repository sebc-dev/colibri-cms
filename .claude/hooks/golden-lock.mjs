#!/usr/bin/env node
/**
 * Hook `PreToolUse` — FR-022 : refuse toute commande `Bash` tentant une
 * mise à jour de golden/snapshot (`--update`/`-u`) et renvoie la raison du
 * refus sur stderr (ADR-0006 §9 : golden lock — un changement de snapshot
 * est une revue humaine, jamais un `--update` lancé par l'IA).
 *
 * Protocole Claude Code : payload JSON sur stdin, `process.exit(2)` +
 * message sur stderr pour bloquer (ADR-0002 §3), `process.exit(0)` pour
 * laisser passer.
 */

// Repère --update ou -u en tant que mot/flag isolé (pas en sous-chaîne
// d'un autre mot, ex. --unsafe-perm).
const REGEX_MISE_A_JOUR_GOLDEN = /(^|\s)(--update|-u)(\s|$)/;

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

  if (payload?.tool_name !== "Bash") {
    process.exit(0);
    return;
  }

  const commande = payload?.tool_input?.command;
  if (typeof commande !== "string") {
    process.exit(0);
    return;
  }

  if (REGEX_MISE_A_JOUR_GOLDEN.test(commande)) {
    process.stderr.write(
      `Mise à jour de golden/snapshot refusée : la commande « ${commande} » contient --update/-u. Un changement de golden est une revue humaine, jamais un --update lancé par l'IA (ADR-0006 §9 — golden lock).`,
    );
    process.exit(2);
    return;
  }

  process.exit(0);
}

main();
