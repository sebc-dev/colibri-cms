/**
 * Change 011, ticket 12 — le plan de dépôt, pur (`core/`, I2) : depuis un
 * instantané, les fichiers à écrire et à supprimer. Aucun dépôt ici.
 *
 * Contrat de `construirePlan(instantane, aleatoire)` :
 *   - `instantane.pages[]` : `{ slug, titre, rang, emplacements (déclaration),
 *     publie (Brouillon), brouillon (Brouillon) }` ; seules les pages dont
 *     `brouillon` n'est pas vide sont réécrites ;
 *   - `instantane.images[]` : fiches (`FicheMedia`) nouvellement publiées ou
 *     redécrites ; `instantane.imagesEffacees[]` : identifiants à retirer ;
 *   - `instantane.reglages` est facultatif : absent, aucun fichier de réglage ;
 *   - `aleatoire(octets)` fournit l'aléa (le noyau reste pur) ;
 *   - rend `{ ecritures: { chemin, contenu }[], suppressions: string[], marque }`.
 */
import { describe, it, expect } from "vitest";
import { construirePlan, type InstantanePublication } from "../../../src/core/publication/plan.ts";
import { cheminAutorise } from "../../../src/core/publication/prefixes.ts";
import { lireFicheMedia, type FicheMedia } from "../../../src/core/medias/fiche.ts";
import type { Brouillon } from "../../../src/core/pages/brouillon.ts";
import type { Emplacement } from "../../../src/core/pages/declaration.ts";

const MARKDOWN_RICHE = "## Nos gâteaux\n\nDes **gâteaux** faits maison :\n\n- tarte\n- éclair";

const aleatoire = (octets: number): Uint8Array =>
  Uint8Array.from({ length: octets }, (_v, i) => (i * 17 + 3) % 256);

function emplacementsDe(slug: string): readonly Emplacement[] {
  return [
    { id: "presentation", nature: "texte-riche", rang: 0, contenu: `Texte de ${slug}`, nom: "Présentation" },
    { id: "bouton-devis", nature: "bouton-action", rang: 1, libelle: "Demander un devis", destination: "/contact" },
  ];
}

function brouillonDe(...entrees: [string, Brouillon extends ReadonlyMap<string, infer V> ? V : never][]): Brouillon {
  return new Map(entrees);
}

const VIDE: Brouillon = new Map();

function page(slug: string, titre: string, rang: number, brouillon: Brouillon, publie: Brouillon = VIDE) {
  return { slug, titre, rang, emplacements: emplacementsDe(slug), publie, brouillon };
}

const FICHE_NOUVELLE: FicheMedia = {
  id: "media-fixture-hero",
  nomOrigine: "media-fixture-hero.png",
  format: "png",
  largeur: 1280,
  hauteur: 640,
  description: "Image d'accueil du site de démonstration",
};

function instantane(partiel: Partial<InstantanePublication> = {}): InstantanePublication {
  return {
    pages: [
      page(
        "accueil",
        "Accueil",
        0,
        brouillonDe(["presentation", { nature: "texte-riche", markdown: MARKDOWN_RICHE }]),
        brouillonDe(["bouton-devis", { nature: "bouton-action", libelle: "Réserver", destination: "/contact" }]),
      ),
      page("tarifs", "Tarifs", 1, VIDE),
      page("contact", "Contact", 2, VIDE),
    ],
    images: [],
    imagesEffacees: [],
    ...partiel,
  };
}

function contenuDe(plan: ReturnType<typeof construirePlan>, chemin: string): string {
  const ecriture = plan.ecritures.find((e) => e.chemin === chemin);
  if (ecriture === undefined) throw new Error(`chemin absent du plan : ${chemin}`);
  return ecriture.contenu;
}

describe("construirePlan — quels fichiers", () => {
  it("SC-12a — seule la page à brouillon est réécrite : son page.json et son Markdown, rien de Tarifs ni de Contact", () => {
    const plan = construirePlan(instantane(), aleatoire);
    const chemins = plan.ecritures.map((e) => e.chemin);

    expect(chemins).toContain("content/pages/accueil/page.json");
    expect(chemins).toContain("content/pages/accueil/presentation.md");
    expect(chemins.filter((c) => c.startsWith("content/pages/tarifs"))).toEqual([]);
    expect(chemins.filter((c) => c.startsWith("content/pages/contact"))).toEqual([]);
    expect(chemins.filter((c) => c.startsWith("content/reglages"))).toEqual([]);
    expect(contenuDe(plan, "content/pages/accueil/presentation.md").trim()).toBe(MARKDOWN_RICHE);
  });

  it("SC-12a — le page.json reprend la structure déclarée et les valeurs publiées après superposition", () => {
    const plan = construirePlan(instantane(), aleatoire);
    const texte = contenuDe(plan, "content/pages/accueil/page.json");
    const json = JSON.parse(texte) as {
      titre: string;
      rang: number;
      emplacements: { id: string; nature: string; libelle?: string; destination?: string; contenu?: string }[];
    };

    expect(json.titre).toBe("Accueil");
    expect(json.rang).toBe(0);
    expect(json.emplacements.map((e) => e.id)).toEqual(["presentation", "bouton-devis"]);
    const bouton = json.emplacements.find((e) => e.id === "bouton-devis");
    expect(bouton?.libelle).toBe("Réserver");
    expect(bouton?.destination).toBe("/contact");
    expect(json.emplacements.find((e) => e.id === "presentation")?.contenu).toBeUndefined();
  });

  it("SC-12a — aucune page à brouillon : seule la marque de publication est écrite", () => {
    const plan = construirePlan(
      instantane({ pages: [page("accueil", "Accueil", 0, VIDE), page("tarifs", "Tarifs", 1, VIDE)] }),
      aleatoire,
    );
    expect(plan.ecritures.map((e) => e.chemin)).toEqual(["content/publication.json"]);
    expect(plan.suppressions).toEqual([]);
  });
});

describe("construirePlan — le Markdown lisible", () => {
  it("SC-12b — un texte riche (titre, gras, liste) est déposé en Markdown, pas en chaîne échappée dans un JSON", () => {
    const plan = construirePlan(instantane(), aleatoire);
    const markdown = contenuDe(plan, "content/pages/accueil/presentation.md");

    expect(markdown).toContain("## Nos gâteaux");
    expect(markdown).toContain("**gâteaux**");
    expect(markdown).toContain("- tarte\n- éclair");
    expect(markdown).not.toContain("\\n");
    expect(markdown.startsWith("{")).toBe(false);
    expect(contenuDe(plan, "content/pages/accueil/page.json")).not.toContain("gâteaux");
  });
});

describe("construirePlan — les fiches d'images", () => {
  it("SC-12c — la fiche d'une image publiée pour la première fois porte identité, nom d'origine, format, largeur, hauteur, description", () => {
    const plan = construirePlan(instantane({ images: [FICHE_NOUVELLE] }), aleatoire);
    const brut: unknown = JSON.parse(contenuDe(plan, "content/medias/media-fixture-hero.json"));

    expect(lireFicheMedia(brut)).toEqual(FICHE_NOUVELLE);
    expect(Object.keys(brut as object).sort((a, b) => a.localeCompare(b))).toEqual(
      ["description", "format", "hauteur", "id", "largeur", "nomOrigine"].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("SC-12c — la fiche d'une image redécrite est réécrite avec sa nouvelle description", () => {
    const redecrite = { ...FICHE_NOUVELLE, description: "Une nouvelle description" };
    const plan = construirePlan(instantane({ images: [redecrite] }), aleatoire);
    const fiche = lireFicheMedia(JSON.parse(contenuDe(plan, "content/medias/media-fixture-hero.json")));
    expect(fiche?.description).toBe("Une nouvelle description");
  });

  it("SC-12c — la fiche d'une image effacée est supprimée du dépôt", () => {
    const plan = construirePlan(instantane({ imagesEffacees: ["media-ancienne"] }), aleatoire);
    expect(plan.suppressions).toEqual(["content/medias/media-ancienne.json"]);
    expect(plan.ecritures.map((e) => e.chemin)).not.toContain("content/medias/media-ancienne.json");
  });
});

describe("construirePlan — chemins autorisés et marque", () => {
  it("SC-12d — chaque chemin écrit ou supprimé appartient aux préfixes autorisés, aucun ne commence par .github/", () => {
    const plan = construirePlan(
      instantane({ images: [FICHE_NOUVELLE], imagesEffacees: ["media-ancienne"] }),
      aleatoire,
    );
    const chemins = [...plan.ecritures.map((e) => e.chemin), ...plan.suppressions];

    expect(chemins.length).toBeGreaterThan(3);
    for (const chemin of chemins) {
      expect(cheminAutorise(chemin)).toBe(true);
      expect(chemin.startsWith(".github/")).toBe(false);
    }
  });

  it.each([
    ["page", { pages: [page("../.github/workflows", "X", 0, brouillonDe(["presentation", { nature: "texte-riche", markdown: "a" }]))] }],
    ["page cachée", { pages: [page(".github", "X", 0, brouillonDe(["presentation", { nature: "texte-riche", markdown: "a" }]))] }],
    ["image", { images: [{ ...FICHE_NOUVELLE, id: "../../.github/workflows/build" }] }],
    ["image effacée", { imagesEffacees: ["a/../b"] }],
  ])("SC-12d — un identifiant de %s qui sortirait des préfixes fait refuser le plan", (_cas, partiel) => {
    expect(() => construirePlan(instantane(partiel as Partial<InstantanePublication>), aleatoire)).toThrow();
  });

  it("SC-12d — un identifiant d'emplacement hors de la forme admise fait refuser le plan", () => {
    const mauvais: Emplacement = { id: "../x", nature: "texte-riche", rang: 0, contenu: "t" };
    const pages = [
      { ...page("accueil", "Accueil", 0, brouillonDe(["../x", { nature: "texte-riche", markdown: "a" }])), emplacements: [mauvais] },
    ];
    expect(() => construirePlan(instantane({ pages }), aleatoire)).toThrow();
  });

  it("SC-12d — la marque de publication fait 128 bits en hexadécimal, déposée dans content/publication.json", () => {
    const plan = construirePlan(instantane(), aleatoire);

    expect(plan.marque).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.parse(contenuDe(plan, "content/publication.json"))).toEqual({ publication: plan.marque });
  });

  it("SC-12d — le JSON est stable : même instantané, même aléa, mêmes fichiers, saut de ligne final", () => {
    const un = construirePlan(instantane({ images: [FICHE_NOUVELLE] }), aleatoire);
    const deux = construirePlan(instantane({ images: [FICHE_NOUVELLE] }), aleatoire);

    expect(deux).toEqual(un);
    const json = contenuDe(un, "content/pages/accueil/page.json");
    expect(json.endsWith("}\n")).toBe(true);
    expect(json).toBe(`${JSON.stringify(JSON.parse(json), null, 2)}\n`);
  });
});
