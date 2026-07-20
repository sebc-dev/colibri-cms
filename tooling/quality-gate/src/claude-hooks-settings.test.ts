import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * FR-021/FR-022 (câblage) : `.claude/settings.json` déclare les hooks
 * `PreToolUse` requis — matcher `Edit|Write|MultiEdit` vers
 * `protect-paths.mjs` (FR-021), matcher `Bash` vers `golden-lock.mjs`
 * (FR-022) — sans quoi les scripts ne sont jamais invoqués par Claude Code.
 */
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const settingsPath = path.join(repoRoot, ".claude", "settings.json");

function lireSettings(): { hooks?: { PreToolUse?: Array<{ matcher?: string; hooks?: Array<{ command?: string }> }> } } {
  if (!existsSync(settingsPath)) {
    throw new Error(`.claude/settings.json introuvable à ${settingsPath}`);
  }
  return JSON.parse(readFileSync(settingsPath, "utf-8"));
}

describe(".claude/settings.json — câblage PreToolUse des hooks de protection", () => {
  it("déclare un hook PreToolUse pour Edit|Write|MultiEdit vers protect-paths.mjs", () => {
    const settings = lireSettings();
    const entrees = settings.hooks?.PreToolUse ?? [];

    const correspond = entrees.some(
      (entree) =>
        (entree.matcher ?? "").includes("Edit") &&
        (entree.matcher ?? "").includes("Write") &&
        (entree.hooks ?? []).some((h) => (h.command ?? "").includes("protect-paths.mjs")),
    );

    expect(correspond).toBe(true);
  });

  it("déclare un hook PreToolUse pour Bash vers golden-lock.mjs", () => {
    const settings = lireSettings();
    const entrees = settings.hooks?.PreToolUse ?? [];

    const correspond = entrees.some(
      (entree) =>
        (entree.matcher ?? "").includes("Bash") &&
        (entree.hooks ?? []).some((h) => (h.command ?? "").includes("golden-lock.mjs")),
    );

    expect(correspond).toBe(true);
  });
});
