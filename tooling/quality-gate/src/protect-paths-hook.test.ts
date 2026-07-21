import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * FR-021 : un hook `PreToolUse` (`.claude/hooks/protect-paths.mjs`) refuse
 * toute écriture IA (Edit/Write/MultiEdit) sous un chemin possédé par
 * l'humain, **avant** que l'écriture n'ait lieu, et renvoie la raison du
 * refus au modèle (ADR-0002 §3 : `exit 2` bloque et transmet le message).
 *
 * Test en boîte noire : on simule le payload JSON `PreToolUse` sur stdin
 * (protocole Claude Code), et on observe le code de sortie + stderr —
 * jamais l'implémentation interne du hook.
 */
const require = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const tsxCli = path.join(path.dirname(require.resolve("tsx/package.json")), "dist", "cli.mjs");

function runHook(payload: unknown) {
  const hookPath = path.join(repoRoot, ".claude", "hooks", "protect-paths.mjs");
  return spawnSync(process.execPath, [tsxCli, hookPath], {
    input: JSON.stringify(payload),
    cwd: repoRoot,
    encoding: "utf-8",
  });
}

describe("protect-paths.mjs — FR-021 : refus d'écriture IA sous un chemin protégé (PreToolUse)", () => {
  it("refuse (exit 2) et renvoie une raison sur stderr pour un Write sous tests/", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { file_path: "tests/unit/exemple.test.ts", content: "x" },
    };

    const result = runHook(payload);

    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/protég|refus|interdit/i);
  });

  it("refuse (exit 2) pour un Edit sous migrations/", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: "packages/db/migrations/0001_init.sql",
        old_string: "a",
        new_string: "b",
      },
    };

    const result = runHook(payload);

    expect(result.status).toBe(2);
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it("refuse (exit 2) pour un MultiEdit sous un dossier schema/ imbriqué", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "MultiEdit",
      tool_input: {
        file_path: "packages/db/src/schema/users.ts",
        edits: [{ old_string: "a", new_string: "b" }],
      },
    };

    const result = runHook(payload);

    expect(result.status).toBe(2);
  });

  it("refuse (exit 2) pour une édition du seam d'auth (lib/auth.ts)", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { file_path: "apps/admin/src/lib/auth.ts", content: "x" },
    };

    const result = runHook(payload);

    expect(result.status).toBe(2);
  });

  it("laisse passer (exit 0) une écriture sous un chemin non protégé", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { file_path: "packages/core/src/render.ts", content: "x" },
    };

    const result = runHook(payload);

    expect(result.status).toBe(0);
  });

  it("laisse passer (exit 0) un événement d'un autre outil que Edit|Write|MultiEdit, même sur un chemin protégé (limite du matcher)", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      tool_name: "Read",
      tool_input: { file_path: "tests/unit/exemple.test.ts" },
    };

    const result = runHook(payload);

    expect(result.status).toBe(0);
  });
});
