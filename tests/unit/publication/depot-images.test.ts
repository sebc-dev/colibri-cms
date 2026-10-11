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
 *     l'inventaire seul, en `force: true` (ou créée si absente).
 */
import { describe, it, expect } from "vitest";
import { deposerImages } from "../../../src/core/publication/depot.ts";
import { ForgeEnMemoire, REF_MEDIA, shaBlobGit } from "./forge-en-memoire.ts";

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x80, 0xff, 0x00]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0xff, 0x80]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0xfe, 0x00]);

function copie(octets: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(octets);
}

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
});
