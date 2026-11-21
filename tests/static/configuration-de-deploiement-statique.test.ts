/**
 * Ticket 02 (020-deploiement-instance-client), SC-02f — les fichiers de
 * configuration de déploiement versionnés ne portent aucune valeur d'instance
 * (ADR-0034, I19) : ni compte, ni identifiant de base, ni domaine, ni adresse
 * e-mail propre à une instance.
 */
import { describe, it, expect } from "vitest";

const FICHIERS = import.meta.glob<string>(["/wrangler.jsonc", "/wrangler.astro.jsonc"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const INSTANCE = import.meta.glob<string>("/instance.json", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** Texte sans les commentaires de ligne : seules les valeurs comptent. */
function sansCommentaires(texte: string): string {
  return texte
    .split("\n")
    .filter((ligne) => !ligne.trimStart().startsWith("//"))
    .join("\n");
}

describe("configuration de déploiement versionnée", () => {
  it("SC-02f — aucun identifiant de compte, de base, de domaine ni d’adresse propre à l’instance", () => {
    const fichiers = Object.entries(FICHIERS);
    expect(fichiers).toHaveLength(2);
    const instance = JSON.parse(Object.values(INSTANCE)[0]) as Record<string, string | undefined>;
    for (const [chemin, brut] of fichiers) {
      const texte = sansCommentaires(brut);
      const config = JSON.parse(texte.replace(/,(\s*[}\]])/g, "$1")) as Record<string, unknown>;
      expect(config, chemin).not.toHaveProperty("account_id");
      expect(config, chemin).not.toHaveProperty("routes");
      expect(config, chemin).not.toHaveProperty("route");
      expect(texte, chemin).not.toMatch(/database_id/);
      expect(texte, chemin).not.toMatch(/\b[0-9a-f]{32}\b/);
      expect(texte, chemin).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/);
      for (const valeur of [instance.domain, instance.senderAddress, instance.compteCloudflare]) {
        if (valeur) expect(texte, chemin).not.toContain(valeur);
      }
    }
  });
});
