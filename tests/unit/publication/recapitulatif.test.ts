/**
 * Change 011, ticket 10 — le récapitulatif de l'écran Publier, pur.
 */
import { it, expect } from "vitest";
import {
  composerRecapitulatif,
  recapitulatifEstVide,
  retourSur,
  RETOUR_PAR_DEFAUT,
  type EntreesRecapitulatif,
} from "../../../src/core/publication/recapitulatif.ts";

const AUCUN = new Set<string>();

function entrees(
  surcharge: Partial<EntreesRecapitulatif> = {},
): EntreesRecapitulatif {
  return {
    pagesDeclarees: [
      { slug: "accueil", titre: "Accueil" },
      { slug: "tarifs", titre: "Tarifs" },
    ],
    slugsAvecBrouillon: AUCUN,
    reglagesAvecBrouillon: AUCUN,
    formulairesDeclares: [{ id: "devis-gateau", nom: "Devis gâteau" }],
    formulairesAvecBrouillon: AUCUN,
    ...surcharge,
  };
}

it("SC-10d — seul le réglage « Mention d'information » en brouillon : un réglage, ni page ni formulaire", () => {
  const recap = composerRecapitulatif(
    entrees({ reglagesAvecBrouillon: new Set(["mention"]) }),
  );

  expect(recap.reglages).toEqual([
    { nom: "mention", libelle: "Mention d'information" },
  ]);
  expect(recap.pages).toEqual([]);
  expect(recap.formulaires).toEqual([]);
  expect(recapitulatifEstVide(recap)).toBe(false);
});

it("SC-10d — les pages suivent l'ordre posé et seules celles à brouillon sont listées", () => {
  const recap = composerRecapitulatif(
    entrees({ slugsAvecBrouillon: new Set(["tarifs", "accueil", "inconnue"]) }),
  );

  expect(recap.pages.map((p) => p.slug)).toEqual(["accueil", "tarifs"]);
});

it("SC-10d — les trois objets ensemble : réglages dans l'ordre de l'écran Réglages, noms non déclarés écartés", () => {
  const recap = composerRecapitulatif(
    entrees({
      slugsAvecBrouillon: new Set(["accueil"]),
      reglagesAvecBrouillon: new Set([
        "mention",
        "coordonnees",
        "reseaux",
        "inconnu",
      ]),
      formulairesAvecBrouillon: new Set(["devis-gateau", "absent"]),
    }),
  );

  expect(recap.pages).toEqual([{ slug: "accueil", titre: "Accueil" }]);
  expect(recap.reglages).toEqual([
    { nom: "coordonnees", libelle: "Coordonnées" },
    { nom: "reseaux", libelle: "Réseaux sociaux" },
    { nom: "mention", libelle: "Mention d'information" },
  ]);
  expect(recap.formulaires).toEqual([
    { id: "devis-gateau", nom: "Devis gâteau" },
  ]);
  expect(recapitulatifEstVide(recap)).toBe(false);
});

it("SC-10f — sans aucun brouillon, le récapitulatif est vide", () => {
  expect(recapitulatifEstVide(composerRecapitulatif(entrees()))).toBe(true);
});

it("SC-10f — un formulaire en brouillon rend le récapitulatif non vide", () => {
  const recap = composerRecapitulatif(
    entrees({ formulairesAvecBrouillon: new Set(["devis-gateau"]) }),
  );

  expect(recap.formulaires).toEqual([
    { id: "devis-gateau", nom: "Devis gâteau" },
  ]);
  expect(recapitulatifEstVide(recap)).toBe(false);
});

it("SC-10h — l'adresse de retour interne sous /admin/ est conservée, avec sa requête", () => {
  expect(retourSur("/admin/reglages")).toBe("/admin/reglages");
  expect(retourSur("/admin/formulaires/devis-gateau?x=1")).toBe(
    "/admin/formulaires/devis-gateau?x=1",
  );
  expect(retourSur("/admin/reglages#ancre")).toBe("/admin/reglages#ancre");
  // Un point encodé au milieu d'un nom n'est pas un segment de point.
  expect(retourSur("/admin/pages/a%2eb")).toBe("/admin/pages/a%2eb");
});

it("SC-10h — toute adresse de retour non interne retombe sur l'écran par défaut", () => {
  const refusees = [
    null,
    undefined,
    "",
    "https://evil.example/admin/x",
    "//evil.example/admin/",
    "/autre",
    "/admin/../secret",
    "/admin//evil.example",
    "/admin/\\evil",
    "/admin/a\nb",
    "/admin/publier",
    "/admin/publier/suite",
    "/admin/./x",
    "/admin/a\u007Fb",
    "/admin/publier#x",
    "/admin/publier?retour=/admin/reglages",
    // Segments de point encodés : le navigateur les résout comme `.` et `..`.
    "/admin/%2e/x",
    "/admin/%2E/x",
    "/admin/%2e%2e/x",
    "/admin/%2E%2E/x",
    "/admin/%2E%2e",
    "/admin/.%2e/mes-pages",
    "/admin/%2e./x",
    "/admin/x/%2e%2e/publier",
  ];
  for (const brut of refusees) {
    expect(retourSur(brut), String(brut)).toBe(RETOUR_PAR_DEFAUT);
  }
});
