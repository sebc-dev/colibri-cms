/**
 * Ticket 03 — Le noyau vérifie chaque coordonnée selon sa nature
 * (openspec/changes/008-reglages-transverses/tickets/
 * 03-verifier-les-coordonnees.md), ADR-0017.
 *
 * Couture : `src/core/reglages/coordonnees.ts`, logique pure (I2) :
 * - `verifierCoordonnee(nature, valeur)` rend `{ ok: true, valeur }` (valeur
 *   trimée) ou `{ ok: false, raison }` (code de raison, pas de texte) ;
 * - `coordonneesCourantes(declarees, brouillon)` rend les coordonnées dans
 *   l'ordre et la nature de la déclaration, la valeur venant du brouillon
 *   (objet identifiant -> valeur) sinon de la valeur de départ.
 */
import { describe, it, expect } from "vitest";
import {
  verifierCoordonnee,
  coordonneesCourantes,
} from "../../../src/core/reglages/coordonnees.ts";
import type { CoordonneeDeclaree } from "../../../src/core/reglages/declaration.ts";

describe("vérification des coordonnées selon leur nature", () => {
  it("SC-03a — téléphone : formes usuelles et 6 à 15 chiffres acceptés, le reste refusé", () => {
    for (const valeur of [
      "01 23 45 67 89",
      "+33 (0)1.23.45.67.89",
      "123456",
      "1".repeat(15),
    ]) {
      expect(verifierCoordonnee("telephone", valeur).ok, valeur).toBe(true);
    }
    for (const valeur of [
      "12345",
      "1".repeat(16),
      "01 23 AB",
      "01 + 23 45 67",
    ]) {
      const verdict = verifierCoordonnee("telephone", valeur);
      expect(verdict.ok, valeur).toBe(false);
      if (!verdict.ok) expect(verdict.raison.length).toBeGreaterThan(0);
    }
  });

  it("SC-03b — e-mail : adresse simple acceptée, formes fautives et 255 caractères refusées", () => {
    expect(verifierCoordonnee("email", "atelier@exemple.fr").ok).toBe(true);
    const limite = `${"a".repeat(243)}@exemple.fr`;
    expect(limite).toHaveLength(254);
    expect(verifierCoordonnee("email", limite).ok).toBe(true);

    const trop = `${"a".repeat(244)}@exemple.fr`;
    expect(trop).toHaveLength(255);
    for (const valeur of [
      "atelier@exemple",
      "@exemple.fr",
      "atelier exemple@exemple.fr",
      "a@b@exemple.fr",
      trop,
    ]) {
      const verdict = verifierCoordonnee("email", valeur);
      expect(verdict.ok, valeur).toBe(false);
      if (!verdict.ok) expect(verdict.raison.length).toBeGreaterThan(0);
    }
  });

  it("SC-03c — texte d'une ligne (120 max) et adresse postale (5 lignes, 300 caractères max)", () => {
    expect(verifierCoordonnee("texte", "a".repeat(120)).ok).toBe(true);
    expect(verifierCoordonnee("texte", "a".repeat(121)).ok).toBe(false);
    expect(verifierCoordonnee("texte", "ligne un\nligne deux").ok).toBe(false);

    const lignes = (n: number) =>
      Array.from({ length: n }, (_, i) => `ligne ${String(i)}`).join("\n");
    expect(verifierCoordonnee("adresse", lignes(5)).ok).toBe(true);
    expect(verifierCoordonnee("adresse", lignes(6)).ok).toBe(false);
    expect(verifierCoordonnee("adresse", lignes(7)).ok).toBe(false);
    // 3 lignes, mais plus de 300 caractères au total.
    const longue = ["a".repeat(100), "b".repeat(100), "c".repeat(101)].join(
      "\n",
    );
    expect(longue.length).toBeGreaterThan(300);
    expect(verifierCoordonnee("adresse", longue).ok).toBe(false);
  });

  it("SC-03c — vide admise pour toute nature, valeur trimée", () => {
    for (const nature of ["texte", "telephone", "email", "adresse"] as const) {
      const verdict = verifierCoordonnee(nature, "   ");
      expect(verdict.ok, nature).toBe(true);
      if (verdict.ok) expect(verdict.valeur).toBe("");
    }
    const verdict = verifierCoordonnee("email", "  atelier@exemple.fr  ");
    expect(verdict.ok && verdict.valeur).toBe("atelier@exemple.fr");
  });

  it("SC-03d — orpheline ignorée, déclarée sans valeur au brouillon garde sa valeur de départ", () => {
    const declarees: readonly CoordonneeDeclaree[] = [
      {
        id: "telephone",
        nature: "telephone",
        nom: "Téléphone",
        valeur: "01 23 45 67 89",
      },
      { id: "courriel", nature: "email", valeur: "atelier@exemple.fr" },
    ];
    const courantes = coordonneesCourantes(declarees, {
      courriel: "autre@exemple.fr",
      disparue: "valeur orpheline",
    });

    expect(courantes.map((c) => c.id)).toEqual(["telephone", "courriel"]);
    expect(courantes.map((c) => c.nature)).toEqual(["telephone", "email"]);
    expect(courantes[0]?.valeur).toBe("01 23 45 67 89");
    expect(courantes[1]?.valeur).toBe("autre@exemple.fr");
  });
});
