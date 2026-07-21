/**
 * Exécution de sous-processus partagée par les contrôles qui invoquent un
 * outil long (Stryker, vitest) en sous-processus — `mutation.ts`,
 * `integration.ts`. Toujours asynchrone (jamais `spawnSync`) : une exécution
 * longue ne doit pas bloquer la boucle d'événements du worker vitest qui
 * héberge le contrôle, sous peine d'expiration du canal RPC interne de
 * vitest (accusé de réception `onTaskUpdate`, délai fixe non configurable
 * côté hôte) pendant que le sous-processus tourne.
 */

import { spawn } from "node:child_process";

export interface ResultatProcessus {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

/**
 * Reproduit la forme du résultat de `spawnSync` (`error`, `status`,
 * `stdout`, `stderr`) consommée par les contrôles, sans bloquer le fil
 * d'exécution pendant l'attente du sous-processus.
 */
export function spawnAsync(
  commande: string,
  args: string[],
  options: { cwd: string },
): Promise<ResultatProcessus> {
  return new Promise((resolve) => {
    let enfant: ReturnType<typeof spawn>;

    try {
      enfant = spawn(commande, args, { cwd: options.cwd });
    } catch (error) {
      resolve({ status: null, stdout: "", stderr: "", error: error as Error });
      return;
    }

    let stdout = "";
    let stderr = "";

    enfant.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    enfant.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    enfant.on("error", (error) => {
      resolve({ status: null, stdout, stderr, error });
    });

    enfant.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}
