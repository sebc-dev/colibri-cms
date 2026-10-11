/**
 * Change 011, ticket 12 — le dépôt du contenu publié sur la branche
 * principale (`depot.ts`, ADR-0021), éprouvé contre le dépôt simulé en
 * mémoire (`forge-en-memoire.ts`, seul double du change).
 *
 * Contrat de `deposerContenu(forge, plan, message)` :
 *   - rend `{ aboutie: true, reconnue, commit, essais }` ou
 *     `{ aboutie: false, raison }` où `raison` est une `IssueForge` ou
 *     `'chemin-refuse'` (un chemin du plan hors des préfixes : rien n'est
 *     appelé sur le dépôt) ;
 *   - `reconnue: true` = l'arbre bâti est déjà celui de la tête de la branche :
 *     le dépôt est compté comme fait, sans nouveau commit ;
 *   - `essais` = nombre de tentatives d'écriture (1 = du premier coup).
 */
import { describe, it, expect } from "vitest";
import { deposerContenu } from "../../../src/core/publication/depot.ts";
import { construirePlan, type InstantanePublication } from "../../../src/core/publication/plan.ts";
import type { PlanDepot } from "../../../src/core/publication/plan.ts";
import type { Brouillon } from "../../../src/core/pages/brouillon.ts";
import type { Emplacement } from "../../../src/core/pages/declaration.ts";
import { ForgeEnMemoire } from "./forge-en-memoire.ts";

const MARKDOWN_RICHE = "## Nos gâteaux\n\nDes **gâteaux** faits maison :\n\n- tarte\n- éclair";
const VIDE: Brouillon = new Map();
const aleatoire = (octets: number): Uint8Array => Uint8Array.from({ length: octets }, (_v, i) => i + 1);

const DEPART: Readonly<Record<string, string>> = {
  "content/pages/accueil/page.json": '{ "titre": "Accueil", "rang": 0 }\n',
  "content/pages/accueil/presentation.md": "Ancien texte d'accueil\n",
  "content/pages/tarifs/page.json": '{ "titre": "Tarifs", "rang": 1 }\n',
  "content/pages/tarifs/presentation.md": "Texte des tarifs\n",
  "content/pages/contact/page.json": '{ "titre": "Contact", "rang": 2 }\n',
  "content/pages/contact/presentation.md": "Texte du contact\n",
  "content/medias/media-ancienne.json": '{ "id": "media-ancienne" }\n',
  ".github/workflows/build.yml": "name: build\n",
};

function emplacementsDe(slug: string): readonly Emplacement[] {
  return [{ id: "presentation", nature: "texte-riche", rang: 0, contenu: `Texte de ${slug}` }];
}

function instantane(partiel: Partial<InstantanePublication> = {}): InstantanePublication {
  const page = (slug: string, titre: string, rang: number, brouillon: Brouillon) => ({
    slug,
    titre,
    rang,
    emplacements: emplacementsDe(slug),
    publie: VIDE,
    brouillon,
  });
  return {
    pages: [
      page("accueil", "Accueil", 0, new Map([["presentation", { nature: "texte-riche", markdown: MARKDOWN_RICHE }]])),
      page("tarifs", "Tarifs", 1, VIDE),
      page("contact", "Contact", 2, VIDE),
    ],
    images: [],
    imagesEffacees: [],
    ...partiel,
  };
}

function planDeBase(partiel: Partial<InstantanePublication> = {}): PlanDepot {
  return construirePlan(instantane(partiel), aleatoire);
}

describe("deposerContenu — ce qui est déposé", () => {
  it("SC-12a — seule la page à brouillon est réécrite dans le dépôt ; Tarifs et Contact restent octet pour octet", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const plan = planDeBase();

    const resultat = await deposerContenu(forge, plan, "Mise à jour du site");

    expect(resultat).toMatchObject({ aboutie: true, reconnue: false, essais: 1 });
    const fichiers = forge.fichiers();
    expect(fichiers.get("content/pages/accueil/presentation.md")?.trim()).toBe(MARKDOWN_RICHE);
    expect(fichiers.get("content/pages/accueil/page.json")).not.toBe(DEPART["content/pages/accueil/page.json"]);
    for (const chemin of Object.keys(DEPART).filter((c) => c.includes("/tarifs/") || c.includes("/contact/"))) {
      expect(fichiers.get(chemin)).toBe(DEPART[chemin]);
    }
  });

  it("SC-12a — l'écriture est un seul commit à un parent, déplacé sans force", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const avant = forge.historique();

    await deposerContenu(forge, planDeBase(), "Mise à jour du site");

    const apres = forge.historique();
    expect(apres).toHaveLength(avant.length + 1);
    expect(apres[0]?.parents).toEqual([avant[0]?.sha]);
    expect(forge.commitsCrees).toBe(1);
    expect(forge.deplacementsForces).toBe(0);
  });

  it("SC-12b — le texte riche est déposé en Markdown lisible dans le dépôt, pas en chaîne échappée", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);

    await deposerContenu(forge, planDeBase(), "Mise à jour du site");

    const markdown = forge.fichiers().get("content/pages/accueil/presentation.md") ?? "";
    expect(markdown).toContain("## Nos gâteaux");
    expect(markdown).toContain("**gâteaux**");
    expect(markdown).toContain("- tarte\n- éclair");
    expect(markdown).not.toContain("\\n");
  });

  it("SC-12c — la fiche d'une image nouvelle est déposée avec ses six champs ; celle d'une image effacée disparaît", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const fiche = {
      id: "media-fixture-hero",
      nomOrigine: "media-fixture-hero.png",
      format: "png" as const,
      largeur: 1280,
      hauteur: 640,
      description: "Image d'accueil",
    };

    await deposerContenu(
      forge,
      planDeBase({ images: [fiche], imagesEffacees: ["media-ancienne"] }),
      "Mise à jour du site",
    );

    const fichiers = forge.fichiers();
    expect(JSON.parse(fichiers.get("content/medias/media-fixture-hero.json") ?? "null")).toEqual(fiche);
    expect(fichiers.has("content/medias/media-ancienne.json")).toBe(false);
  });
});

describe("deposerContenu — chemins autorisés", () => {
  it("SC-12d — la marque de publication est déposée et .github/ reste intact", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const plan = planDeBase();

    await deposerContenu(forge, plan, "Mise à jour du site");

    const fichiers = forge.fichiers();
    expect(JSON.parse(fichiers.get("content/publication.json") ?? "null")).toEqual({ publication: plan.marque });
    expect(fichiers.get(".github/workflows/build.yml")).toBe(DEPART[".github/workflows/build.yml"]);
  });

  it.each([
    ["sous .github/", ".github/workflows/build.yml"],
    ["par remontée de répertoire", "content/pages/../../.github/workflows/build.yml"],
    ["hors de tout préfixe", "src/core/zone.ts"],
  ])("SC-12d — un plan dont un chemin est écrit %s est refusé avant tout appel au dépôt", async (_cas, chemin) => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const plan: PlanDepot = {
      ...planDeBase(),
      ecritures: [...planDeBase().ecritures, { chemin, contenu: "name: pirate\n" }],
    };
    const avant = forge.historique().length;
    const appelsAvant = forge.appels.length;

    const resultat = await deposerContenu(forge, plan, "Mise à jour du site");

    expect(resultat).toMatchObject({ aboutie: false, raison: "chemin-refuse" });
    expect(forge.appels).toHaveLength(appelsAvant);
    expect(forge.historique()).toHaveLength(avant);
  });

  it("SC-12d — une suppression hors des préfixes est refusée de même", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const plan: PlanDepot = { ...planDeBase(), suppressions: [".github/workflows/build.yml"] };

    const resultat = await deposerContenu(forge, plan, "Mise à jour du site");

    expect(resultat).toMatchObject({ aboutie: false, raison: "chemin-refuse" });
    expect(forge.fichiers().has(".github/workflows/build.yml")).toBe(true);
  });
});

describe("deposerContenu — la branche a avancé entre lecture et écriture", () => {
  it("SC-12e — l'écriture périmée est refusée, rebâtie sur l'état courant, et l'état plus récent est conservé", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    forge.avancerAvantLaProchaineEcriture({ "content/pages/contact/presentation.md": "Texte du contact, plus récent\n" });

    const resultat = await deposerContenu(forge, planDeBase(), "Mise à jour du site");

    expect(resultat).toMatchObject({ aboutie: true, reconnue: false, essais: 2 });
    const fichiers = forge.fichiers();
    expect(fichiers.get("content/pages/contact/presentation.md")).toBe("Texte du contact, plus récent\n");
    expect(fichiers.get("content/pages/accueil/presentation.md")?.trim()).toBe(MARKDOWN_RICHE);
    expect(forge.historique()).toHaveLength(3);
    expect(forge.deplacementsForces).toBe(0);
  });

  it("SC-12e — le commit rebâti a pour parent la tête plus récente, jamais l'ancienne", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const initial = forge.historique()[0]?.sha;
    forge.avancerAvantLaProchaineEcriture({ "content/pages/contact/presentation.md": "plus récent\n" });

    await deposerContenu(forge, planDeBase(), "Mise à jour du site");

    const historique = forge.historique();
    expect(historique).toHaveLength(3);
    const [nouveau, concurrent, racine] = historique;
    expect(nouveau.parents).toEqual([concurrent.sha]);
    expect(concurrent.parents).toEqual([initial]);
    expect(racine.sha).toBe(initial);
  });

  it("SC-12e — au plus deux nouveaux essais : trois refus de suite, le dépôt échoue sans rien forcer", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    forge.refuserLesProchainesEcritures(3);
    const avant = forge.historique().length;

    const resultat = await deposerContenu(forge, planDeBase(), "Mise à jour du site");

    expect(resultat).toEqual({ aboutie: false, raison: "refusee-pas-avance-rapide" });
    expect(forge.appels.filter((a) => a === "deplacerRef")).toHaveLength(3);
    expect(forge.deplacementsForces).toBe(0);
    expect(forge.historique()).toHaveLength(avant);
  });

  it("SC-12e — deux refus puis un succès : le troisième essai (second nouvel essai) aboutit", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    forge.refuserLesProchainesEcritures(2);

    const resultat = await deposerContenu(forge, planDeBase(), "Mise à jour du site");

    expect(resultat).toMatchObject({ aboutie: true, essais: 3 });
  });
});

describe("deposerContenu — la réponse de l'écriture s'est perdue", () => {
  it("SC-12f — le nouvel essai reconnaît son propre dépôt, le compte comme fait et n'ajoute aucun second commit", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const plan = planDeBase();
    forge.perdreLaReponseDeLaProchaineEcriture();

    await deposerContenu(forge, plan, "Mise à jour du site");
    const apresPremier = forge.historique();
    const commitsApresPremier = forge.commitsCrees;
    const resultat = await deposerContenu(forge, plan, "Mise à jour du site");

    expect(resultat).toMatchObject({ aboutie: true, reconnue: true, commit: apresPremier[0]?.sha });
    expect(forge.historique()).toEqual(apresPremier);
    expect(forge.commitsCrees).toBe(commitsApresPremier);
    expect(forge.fichiers().get("content/pages/accueil/presentation.md")?.trim()).toBe(MARKDOWN_RICHE);
  });

  it("SC-12f — la reconnaissance vaut aussi pour une réponse perdue présentée comme un refus d'avance rapide", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    const plan = planDeBase();
    forge.perdreLaReponseDeLaProchaineEcriture("refusee-pas-avance-rapide");

    const resultat = await deposerContenu(forge, plan, "Mise à jour du site");

    expect(resultat).toMatchObject({ aboutie: true, reconnue: true });
    expect(forge.historique()).toHaveLength(2);
    expect(forge.deplacementsForces).toBe(0);
  });

  it("SC-12f — un dépôt réellement différent n'est pas pris pour le sien : autre contenu, nouveau commit", async () => {
    const forge = await ForgeEnMemoire.creer(DEPART);
    forge.perdreLaReponseDeLaProchaineEcriture();
    await deposerContenu(forge, planDeBase(), "Mise à jour du site");
    const longueur = forge.historique().length;

    const autre = planDeBase({
      pages: [
        {
          slug: "accueil",
          titre: "Accueil",
          rang: 0,
          emplacements: emplacementsDe("accueil"),
          publie: VIDE,
          brouillon: new Map([["presentation", { nature: "texte-riche", markdown: "Un autre texte" }]]),
        },
      ],
    });
    const resultat = await deposerContenu(forge, autre, "Mise à jour du site");

    expect(resultat).toMatchObject({ aboutie: true, reconnue: false });
    expect(forge.historique()).toHaveLength(longueur + 1);
  });
});

describe("deposerContenu — pannes du dépôt", () => {
  it.each(["acces-refuse", "injoignable", "introuvable"] as const)(
    "SC-12e — une panne « %s » est rendue telle quelle, sans écriture ni force",
    async (issue) => {
      const forge = await ForgeEnMemoire.creer(DEPART);
      const avant = forge.historique().length;
      forge.tomberEnPanne(issue);

      const resultat = await deposerContenu(forge, planDeBase(), "Mise à jour du site");

      expect(resultat).toEqual({ aboutie: false, raison: issue });
      expect(forge.deplacementsForces).toBe(0);
      expect(forge.historique()).toHaveLength(avant);
    },
  );
});
