/**
 * Source unique des chemins protégés — FR-023.
 *
 * `estCheminProtege` matérialise la liste des chemins possédés par
 * l'humain (ADR-0006 §9 : `tests/`, `migrations/`, tout dossier `schema/`
 * à n'importe quelle profondeur, la config des frontières
 * `.dependency-cruiser.cjs` / `eslint.config.mjs`, et le seam d'auth
 * `lib/auth.ts`). Cette fonction pure est consommée par le hook
 * `PreToolUse` (`protect-paths.mjs`, FR-021) et, à terme, par le contrôle
 * de frontières du portail — jamais dupliquée.
 */

const NOMS_CONFIG_FRONTIERES = new Set([".dependency-cruiser.cjs", "eslint.config.mjs"]);

export function estCheminProtege(chemin: string): boolean {
  if (!chemin) {
    return false;
  }

  const normalise = chemin.replace(/\\/g, "/");

  const segments = normalise.split("/");
  const nomFichier = segments[segments.length - 1];

  if (segments.includes("tests")) {
    return true;
  }
  if (segments.includes("migrations")) {
    return true;
  }
  if (segments.includes("schema")) {
    return true;
  }
  if (nomFichier !== undefined && NOMS_CONFIG_FRONTIERES.has(nomFichier)) {
    return true;
  }
  if (normalise.endsWith("/lib/auth.ts") || normalise === "lib/auth.ts") {
    return true;
  }

  return false;
}
