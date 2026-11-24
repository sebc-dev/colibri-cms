/**
 * Ticket 09 (020-deploiement-instance-client) — contrôles statiques de
 * l'inventaire de livraison : tout nom lu sur `env` dans `src/` et toute
 * variable lue par les scripts de construction figure dans la liste déclarée
 * (SC-09a) ; l'outil de livraison n'a aucun geste sur le code de secours
 * (SC-09g).
 */
import { describe, it, expect } from "vitest";
import { ENTREES_DECLAREES } from "../../src/platform/instance/inventaire.ts";

const SOURCES = import.meta.glob<string>(["/src/**/*.{ts,astro}", "!/src/**/*.d.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const SCRIPTS_DE_CONSTRUCTION = import.meta.glob<string>("/scripts/recuperer-images-publiees.mjs", {
  query: "?raw",
  import: "default",
  eager: true,
});
const OUTIL = import.meta.glob<string>("/scripts/livraison.mjs", {
  query: "?raw",
  import: "default",
  eager: true,
});
const COUTURES = import.meta.glob<string>(
  ["/src/platform/instance/plateforme-de-livraison.ts", "/src/platform/instance/inventaire.ts"],
  { query: "?raw", import: "default", eager: true },
);

function nomsLus(sources: Record<string, string>, motif: RegExp): string[] {
  const noms = new Set<string>();
  for (const texte of Object.values(sources)) {
    for (const m of texte.matchAll(motif)) noms.add(m[1]);
  }
  return [...noms].sort((a, b) => a.localeCompare(b));
}

describe("l'inventaire de livraison, contrôles statiques", () => {
  it("SC-09a — tout nom lu sur env dans src/ figure dans la liste déclarée", () => {
    const lus = nomsLus(SOURCES, /\benv\.([A-Z][A-Z0-9_]+)\b/g);
    expect(lus).toEqual(expect.arrayContaining(["DB", "ASSETS", "JETON_DEPOT"]));
    const declares = ENTREES_DECLAREES.map((e) => e.nom);
    for (const nom of lus) expect(declares, nom).toContain(nom);
  });

  it("SC-09a — toute variable lue par les scripts de construction figure dans la liste déclarée", () => {
    const lus = nomsLus(SCRIPTS_DE_CONSTRUCTION, /\benv\.([A-Z][A-Z0-9_]+)\b/g);
    expect(lus).toContain("COLIBRI_CLE_LECTURE_DEPOT");
    const declares = ENTREES_DECLAREES.map((e) => e.nom);
    for (const nom of lus) expect(declares, nom).toContain(nom);
  });

  it("SC-09g — les gestes de l'outil de livraison énumérés : aucun sur le code de secours", () => {
    const source = Object.values(OUTIL)[0];
    expect(source, "scripts/livraison.mjs lisible").toBeDefined();
    const gestes = [...source.matchAll(/geste === '([a-z]+)'/g)].map((m) => m[1]);
    const usage = [...source.matchAll(/usage : livraison\.mjs ([a-z|]+)/g)].flatMap((m) => m[1].split("|"));
    const tous = new Set([...gestes, ...usage]);
    expect(tous).toContain("inventaire");
    for (const geste of tous) expect(geste, geste).not.toMatch(/secours|reprise|code/);
    expect(Object.keys(COUTURES)).toHaveLength(2);
    for (const [chemin, texte] of Object.entries(COUTURES)) {
      expect(texte, chemin).not.toMatch(/code_de_secours|secours|empreinte/i);
    }
    expect(source).not.toMatch(/code_de_secours|secours|empreinte/i);
  });
});
