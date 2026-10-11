/**
 * Change 011, ticket 13 — le dépôt des images publiées sur leur branche
 * (`media`, ADR-0020/ADR-0021), éprouvé contre le dépôt simulé en mémoire.
 *
 * Contrat de `deposerImages(forge, demande, message)` (`depot.ts`) :
 *   - `demande.publiees` : l'inventaire des images déjà publiées et encore
 *     posées, `{ id, extension, empreinte }` (empreinte = identifiant du blob) ;
 *   - `demande.nouvelles` : les images à déposer, `{ id, extension, octets }` ;
 *   - rend `{ aboutie: true, commit, inventaire }` (inventaire = publiées + nouvelles,
 *     avec leur empreinte) ou `{ aboutie: false, raison }` ;
 *   - la branche `media` est réécrite en un commit sans parent, depuis
 *     l'inventaire seul, en `force: true` (ou créée si absente) ;
 *   - un identifiant hors forme ou une extension hors de celles que lit le
 *     build rend `{ aboutie: false, raison: "chemin-refuse" }`, sans appel.
 *
 * Contrat de `selectionnerImages(images, poseesParLeContenu)` (`plan.ts`, D6) :
 *   - `aDeposer` : les images posées par le nouveau contenu, sans empreinte ;
 *   - `deposees` : les images porteuses d'empreinte, publiées ou posées.
 */
import { describe, it, expect } from "vitest";
import { deposerImages, type DemandeImages } from "../../../src/core/publication/depot.ts";
import { selectionnerImages, type ImageEnBase, type SelectionImages } from "../../../src/core/publication/plan.ts";
import { ForgeEnMemoire, REF_MEDIA, shaBlobGit } from "./forge-en-memoire.ts";

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x80, 0xff, 0x00]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0xff, 0x80]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0xfe, 0x00]);
// Deux blocs d'encodage pleins (0x8000 octets) et un reste : les bornes des blocs sont traversées.
const GRANDE = Uint8Array.from({ length: 0x8000 * 2 + 3 }, (_v, i) => (i * 31) & 0xff);

const OCTETS_PAR_ID: ReadonlyMap<string, Uint8Array> = new Map([
  ["photo-x", JPEG],
  ["photo-jpeg", JPEG],
  ["photo-png", PNG],
  ["photo-webp", WEBP],
]);

function copie(octets: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(octets);
}

/** La demande de dépôt d'une sélection, les octets de chaque image à déposer tirés de `OCTETS_PAR_ID`. */
function demandeDe(selection: SelectionImages): DemandeImages {
  return {
    publiees: selection.deposees,
    nouvelles: selection.aDeposer.map((image) => {
      const octets = OCTETS_PAR_ID.get(image.id);
      if (octets === undefined) throw new Error(`aucun octet de test pour ${image.id}`);
      return { ...image, octets: copie(octets) };
    }),
  };
}

const HORS_FORME: [string, DemandeImages][] = [
  ["identifiant qui ouvre un sous-dossier", { publiees: [], nouvelles: [{ id: "a/b", extension: "png", octets: copie(PNG) }] }],
  ["identifiant en majuscules", { publiees: [], nouvelles: [{ id: "Photo", extension: "png", octets: copie(PNG) }] }],
  ["extension svg", { publiees: [], nouvelles: [{ id: "photo", extension: "svg", octets: copie(PNG) }] }],
  [
    "remontée vers .github/",
    { publiees: [], nouvelles: [{ id: "../../.github/workflows/x", extension: "yml", octets: copie(JPEG) }] },
  ],
  ["« .. » dans l'inventaire", { publiees: [{ id: "..", extension: "jpg", empreinte: "0".repeat(40) }], nouvelles: [] }],
];

describe("dépôt des images sur la branche des images", () => {
  it("SC-13a — une JPEG, une PNG et une WebP publiées pour la première fois sont déposées octet pour octet", async () => {
    const forge = await ForgeEnMemoire.creer({ "content/pages/accueil/page.json": "{}\n" });

    const resultat = await deposerImages(
      forge,
      {
        publiees: [],
        nouvelles: [
          { id: "photo-jpeg", extension: "jpg", octets: copie(JPEG) },
          { id: "photo-png", extension: "png", octets: copie(PNG) },
          { id: "photo-webp", extension: "webp", octets: copie(WEBP) },
        ],
      },
      "Images publiées",
    );

    expect(resultat.aboutie).toBe(true);
    expect(forge.octets("medias/photo-jpeg.jpg", REF_MEDIA)).toEqual(JPEG);
    expect(forge.octets("medias/photo-png.png", REF_MEDIA)).toEqual(PNG);
    expect(forge.octets("medias/photo-webp.webp", REF_MEDIA)).toEqual(WEBP);
    expect(forge.chemins(REF_MEDIA)).toEqual([
      "medias/photo-jpeg.jpg",
      "medias/photo-png.png",
      "medias/photo-webp.webp",
    ]);
    if (resultat.aboutie) {
      const empreinte = resultat.inventaire.find((i) => i.id === "photo-png")?.empreinte;
      expect(empreinte).toBe(await shaBlobGit(copie(PNG)));
    }
  });

  it("SC-13b — réécrire la branche des images garde les octets d'une image encore posée par le dernier contenu", async () => {
    const forge = await ForgeEnMemoire.creer({ "content/pages/accueil/page.json": "{}\n" });
    const premier = await deposerImages(
      forge,
      { publiees: [], nouvelles: [{ id: "photo-jpeg", extension: "jpg", octets: copie(JPEG) }] },
      "Première publication",
    );
    expect(premier.aboutie).toBe(true);
    if (!premier.aboutie) return;

    const second = await deposerImages(
      forge,
      {
        publiees: premier.inventaire,
        nouvelles: [{ id: "photo-png", extension: "png", octets: copie(PNG) }],
      },
      "Seconde publication",
    );

    expect(second.aboutie).toBe(true);
    expect(forge.octets("medias/photo-jpeg.jpg", REF_MEDIA)).toEqual(JPEG);
    expect(forge.octets("medias/photo-png.png", REF_MEDIA)).toEqual(PNG);
    expect(forge.deplacementsForces).toBeGreaterThanOrEqual(1);
    expect(forge.historique(REF_MEDIA)).toHaveLength(1);
    expect(forge.historique(REF_MEDIA)[0]?.parents).toEqual([]);
  });

  it.each(HORS_FORME)(
    "un identifiant ou une extension d'image hors forme est refusé avant tout appel au dépôt : %s",
    async (_cas, demande) => {
      const forge = await ForgeEnMemoire.creer({ "content/pages/accueil/page.json": "{}\n" });

      const resultat = await deposerImages(forge, demande, "Images publiées");

      expect(resultat).toEqual({ aboutie: false, raison: "chemin-refuse" });
      expect(forge.appels).toEqual([]);
      expect(forge.chemins(REF_MEDIA)).toEqual([]);
    },
  );

  it("une image plus grande qu'un bloc d'encodage est déposée octet pour octet", async () => {
    const forge = await ForgeEnMemoire.creer({ "content/pages/accueil/page.json": "{}\n" });

    const resultat = await deposerImages(
      forge,
      { publiees: [], nouvelles: [{ id: "grande", extension: "png", octets: copie(GRANDE) }] },
      "Images publiées",
    );

    expect(resultat.aboutie).toBe(true);
    expect(forge.octets("medias/grande.png", REF_MEDIA)).toEqual(GRANDE);
    if (resultat.aboutie) {
      expect(resultat.inventaire).toEqual([
        { id: "grande", extension: "png", empreinte: await shaBlobGit(copie(GRANDE)) },
      ]);
    }
  });
});

describe("la sélection des images, depuis l'inventaire en base (D6)", () => {
  it("la sélection : à déposer = posées sans empreinte ; gardées = déposées publiées ou posées", () => {
    const images: ImageEnBase[] = [
      // posée, jamais déposée
      { id: "p1", format: "jpeg", publiee: false, empreinteDepot: null },
      // publiée, que cette publication efface : elle ne quitte la base qu'à la finalisation (D5)
      { id: "p2", format: "png", publiee: true, empreinteDepot: "2".repeat(40) },
      // publiée et toujours posée
      { id: "p3", format: "webp", publiee: true, empreinteDepot: "3".repeat(40) },
      // déposée par une passe antérieure, pas encore publiée, posée
      { id: "p4", format: "jpeg", publiee: false, empreinteDepot: "4".repeat(40) },
      // ni posée ni déposée
      { id: "p5", format: "png", publiee: false, empreinteDepot: null },
    ];

    const selection = selectionnerImages(images, new Set(["p1", "p3", "p4"]));

    expect(selection.aDeposer).toEqual([{ id: "p1", extension: "jpeg" }]);
    expect(selection.deposees).toEqual([
      { id: "p2", extension: "png", empreinte: "2".repeat(40) },
      { id: "p3", extension: "webp", empreinte: "3".repeat(40) },
      { id: "p4", extension: "jpeg", empreinte: "4".repeat(40) },
    ]);
  });

  it("SC-13b — une image que le dernier contenu déposé pose encore garde ses octets quand le nouveau contenu ne la pose plus", async () => {
    const forge = await ForgeEnMemoire.creer({ "content/pages/accueil/page.json": "{}\n" });
    const premiere = selectionnerImages(
      [{ id: "photo-x", format: "jpeg", publiee: false, empreinteDepot: null }],
      new Set(["photo-x"]),
    );
    const m1 = await deposerImages(forge, demandeDe(premiere), "Première publication");
    expect(m1.aboutie).toBe(true);
    if (!m1.aboutie) return;
    const empreinte = m1.inventaire.find((i) => i.id === "photo-x")?.empreinte ?? null;
    expect(empreinte).toBe(await shaBlobGit(copie(JPEG)));

    // En base : photo-x publiée, avec l'empreinte rendue ; le nouveau contenu ne la pose plus.
    const seconde = selectionnerImages(
      [{ id: "photo-x", format: "jpeg", publiee: true, empreinteDepot: empreinte }],
      new Set(),
    );
    const m2 = await deposerImages(forge, demandeDe(seconde), "Seconde publication");

    expect(m2.aboutie).toBe(true);
    expect(forge.octets("medias/photo-x.jpeg", REF_MEDIA)).toEqual(JPEG);
  });

  it("la réécriture part de l'inventaire seul : une image absente de D1 quitte la branche des images", async () => {
    const forge = await ForgeEnMemoire.creer({ "content/pages/accueil/page.json": "{}\n" });
    const premiere = selectionnerImages(
      [
        { id: "photo-jpeg", format: "jpeg", publiee: false, empreinteDepot: null },
        { id: "photo-png", format: "png", publiee: false, empreinteDepot: null },
      ],
      new Set(["photo-jpeg", "photo-png"]),
    );
    const m1 = await deposerImages(forge, demandeDe(premiere), "Première publication");
    expect(m1.aboutie).toBe(true);
    if (!m1.aboutie) return;
    expect(forge.chemins(REF_MEDIA)).toEqual(["medias/photo-jpeg.jpeg", "medias/photo-png.png"]);
    const empreinteJpeg = m1.inventaire.find((i) => i.id === "photo-jpeg")?.empreinte ?? null;

    // En base : photo-png effacée (absente), photo-jpeg publiée ; photo-webp nouvellement posée.
    const seconde = selectionnerImages(
      [
        { id: "photo-jpeg", format: "jpeg", publiee: true, empreinteDepot: empreinteJpeg },
        { id: "photo-webp", format: "webp", publiee: false, empreinteDepot: null },
      ],
      new Set(["photo-jpeg", "photo-webp"]),
    );
    const avant = forge.appels.length;
    const m2 = await deposerImages(forge, demandeDe(seconde), "Seconde publication");

    expect(m2.aboutie).toBe(true);
    expect(forge.chemins(REF_MEDIA)).toEqual(["medias/photo-jpeg.jpeg", "medias/photo-webp.webp"]);
    expect(forge.octets("medias/photo-png.png", REF_MEDIA)).toBeUndefined();
    expect(forge.historique(REF_MEDIA)).toHaveLength(1);
    expect(forge.historique(REF_MEDIA)[0]?.parents).toEqual([]);
    expect(forge.appels.slice(avant)).not.toContain("lireCommit");
  });
});
