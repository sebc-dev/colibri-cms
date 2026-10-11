/**
 * Change 011, ticket 08 — Contrôles statiques de l'aperçu : aucun terme de
 * développeur dans le bandeau (FR-117), aucune directive client ni style en
 * ligne (I4, I12), gabarit partagé avec la page publique (I3).
 */
import { describe, it, expect } from "vitest";
import {
  TEXTE_BANDEAU_APERCU,
  TEXTE_LIEN_RETOUR_APERCU,
  TEXTE_BOUTON_VOIR_APERCU,
} from "../../src/admin/textes.ts";

const TERMES_DEVELOPPEUR = [
  /\b(commit|branche|branch|build)\b/i,
  /\b(d[ée]ploiement|d[ée]ployer|deploy)\b/i,
  /\b(github|git|json|html|css|api)\b/i,
  /\b(cache|serveur|server|draft|preview|merge|pull)\b/i,
  /\b(d[ée]p[ôo]t|push|404|422)\b/i,
  /\bbrouillon d[ée]ploy\b/i,
];

describe("aperçu d'une page — statique", () => {
  it("SC-08h — aucun terme de développeur dans le bandeau ni dans les textes de l'aperçu", () => {
    for (const texte of [
      TEXTE_BANDEAU_APERCU,
      TEXTE_LIEN_RETOUR_APERCU,
      TEXTE_BOUTON_VOIR_APERCU,
    ]) {
      for (const termes of TERMES_DEVELOPPEUR) {
        expect(texte).not.toMatch(termes);
      }
    }
  });

  it("SC-08f — le bandeau est un composant d'administration hors du gabarit du site, sans script ni style en ligne", async () => {
    const bandeau = (await import("../../src/admin/BandeauApercu.astro?raw"))
      .default;
    const gabarit = (await import("../../src/site/page.astro?raw")).default;

    expect(bandeau).not.toMatch(/client:/);
    expect(bandeau).not.toMatch(/<script|\sstyle=|<style/);
    expect(gabarit).not.toContain("BandeauApercu");
  });

  it("SC-08b — la route d'aperçu et la route publique importent le même gabarit", async () => {
    const route = (
      await import("../../src/pages/admin/apercu/[...slug].astro?raw")
    ).default;
    const publique = (await import("../../src/pages/[...slug].astro?raw"))
      .default;

    expect(route).toContain("site/page.astro");
    expect(publique).toContain("site/page.astro");
    expect(route).not.toMatch(/client:/);
  });
});
