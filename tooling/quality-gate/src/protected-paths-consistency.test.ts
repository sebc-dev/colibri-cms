import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { estCheminProtege } from "./protected-paths";

/**
 * FR-023 : le hook de protection (`protect-paths.mjs`) doit dériver ses
 * refus de la **même définition unique** que celle utilisée par le
 * contrôle de frontières du portail (`protected-paths.ts`), jamais d'une
 * liste dupliquée en dur dans le hook. On le vérifie en boîte noire : pour
 * chaque chemin sondé, le verdict du hook doit être en parité exacte avec
 * `estCheminProtege`, y compris sur les cas limites qui distingueraient une
 * liste dupliquée moins précise (ex. faux positif sur « schematics.ts »).
 */
const require = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const tsxCli = path.join(path.dirname(require.resolve("tsx/package.json")), "dist", "cli.mjs");

function runHook(fichier: string) {
  const hookPath = path.join(repoRoot, ".claude", "hooks", "protect-paths.mjs");
  const payload = {
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: { file_path: fichier, content: "x" },
  };
  return spawnSync(process.execPath, [tsxCli, hookPath], {
    input: JSON.stringify(payload),
    cwd: repoRoot,
    encoding: "utf-8",
  });
}

const cheminsSondes = [
  "tests/unit/exemple.test.ts",
  "packages/db/migrations/0001_init.sql",
  "packages/db/src/schema/users.ts",
  ".dependency-cruiser.cjs",
  "eslint.config.mjs",
  "apps/admin/src/lib/auth.ts",
  "packages/core/src/render.ts",
  "apps/admin/src/lib/schematics.ts",
];

describe("protect-paths.mjs — FR-023 : dérive de la même définition unique que le portail", () => {
  it.each(cheminsSondes)(
    "le verdict du hook pour « %s » correspond exactement à estCheminProtege",
    (chemin) => {
      const attendu = estCheminProtege(chemin);

      const result = runHook(chemin);

      expect(result.status).toBe(attendu ? 2 : 0);
    },
  );
});
