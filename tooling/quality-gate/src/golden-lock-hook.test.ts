import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * FR-022 : un hook `PreToolUse` (`.claude/hooks/golden-lock.mjs`) refuse
 * toute commande `Bash` tentant une mise à jour de golden/snapshot
 * (`--update`/`-u`) et renvoie la raison du refus (ADR-0006 §9 : golden
 * lock — un changement de snapshot est une revue humaine, jamais un
 * `--update` lancé par l'IA).
 */
const require = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const tsxCli = path.join(path.dirname(require.resolve("tsx/package.json")), "dist", "cli.mjs");

function runHook(payload: unknown) {
  const hookPath = path.join(repoRoot, ".claude", "hooks", "golden-lock.mjs");
  return spawnSync(process.execPath, [tsxCli, hookPath], {
    input: JSON.stringify(payload),
    cwd: repoRoot,
    encoding: "utf-8",
  });
}

describe("golden-lock.mjs — FR-022 : refus d'une mise à jour de golden par l'IA", () => {
  it("refuse (exit 2) et renvoie la raison quand la commande contient --update", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "pnpm --filter @colibri/quality-gate vitest --update" },
    };

    const result = runHook(payload);

    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/golden|snapshot|refus|interdit/i);
  });

  it("refuse (exit 2) quand la commande contient l'alias court -u", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "vitest run -u" },
    };

    const result = runHook(payload);

    expect(result.status).toBe(2);
  });

  it("laisse passer (exit 0) une commande de test sans mise à jour de golden", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "pnpm --filter @colibri/quality-gate test" },
    };

    const result = runHook(payload);

    expect(result.status).toBe(0);
  });

  it("ne bloque pas une commande où « -u » n'est qu'une sous-chaîne d'un autre mot (limite, pas de faux positif)", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "pnpm install --unsafe-perm" },
    };

    const result = runHook(payload);

    expect(result.status).toBe(0);
  });

  it("ne plante pas et ne bloque pas quand tool_input.command est absent (entrée dégradée)", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {},
    };

    const result = runHook(payload);

    expect(result.status).not.toBeNull();
    expect(result.status).not.toBe(2);
  });
});
