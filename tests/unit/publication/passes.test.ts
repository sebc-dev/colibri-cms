/**
 * Change 011, ticket 17 — les bornes d'une passe de dépôt d'images (ADR-0023) :
 * 40 images et 10 Mo (base64 compris) par passe, la première image entrant toujours.
 */
import { describe, it, expect } from 'vitest';
import {
  IMAGES_PAR_PASSE,
  OCTETS_PAR_PASSE,
  deposerUnePasse,
  tailleBase64,
  tientDansLaPasse,
  type ImageADeposer,
} from '../../../src/core/publication/passes.ts';
import { ForgeEnMemoire } from './forge-en-memoire.ts';

function images(n: number): ImageADeposer[] {
  return Array.from({ length: n }, (_v, i) => ({ id: `image-${String(i)}`, extension: 'png' }));
}

/** Des octets propres à chaque image : deux images ne partagent jamais leur blob. */
function lecteur(taille: number): (id: string) => Promise<Uint8Array | null> {
  return (id) => Promise.resolve(Uint8Array.from({ length: taille }, (_v, i) => (i + id.length * 7 + id.charCodeAt(id.length - 1)) & 0xff));
}

describe('SC-17a — les bornes d une passe', () => {
  it.each([
    [0, 0],
    [1, 1],
    [40, 40],
    [41, 40],
  ])('SC-17a — %i image(s) à déposer : %i dans la première passe', async (total, attendu) => {
    const forge = await ForgeEnMemoire.creer({});

    const passe = await deposerUnePasse(forge, images(total), lecteur(10));

    expect(passe.aboutie).toBe(true);
    if (!passe.aboutie) return;
    expect(passe.deposees).toHaveLength(attendu);
    expect(passe.restantes).toHaveLength(total - attendu);
    expect(IMAGES_PAR_PASSE).toBe(40);
  });

  it('SC-17a — 10 Mo pile (base64 compris) tiennent, un octet de plus non', () => {
    const octetsPile = Math.floor((OCTETS_PAR_PASSE / 4) * 3); // 3 * (10 Mo / 4) octets bruts -> exactement 10 Mo en base64
    expect(tailleBase64(octetsPile)).toBe(OCTETS_PAR_PASSE);

    expect(tientDansLaPasse({ nombre: 1, octets: 0 }, octetsPile)).toBe(true);
    expect(tientDansLaPasse({ nombre: 1, octets: 1 }, octetsPile)).toBe(false);
    expect(tientDansLaPasse({ nombre: 1, octets: OCTETS_PAR_PASSE - 4 }, 3)).toBe(true);
    expect(tientDansLaPasse({ nombre: 1, octets: OCTETS_PAR_PASSE - 3 }, 3)).toBe(false);
  });

  it('SC-17a — la première image entre toujours, même plus grosse que la passe', () => {
    expect(tientDansLaPasse({ nombre: 0, octets: 0 }, OCTETS_PAR_PASSE * 2)).toBe(true);
  });

  it('SC-17a — des images de 2 Mo : quatre par passe (base64 compris), les suivantes attendent', async () => {
    const forge = await ForgeEnMemoire.creer({});

    const passe = await deposerUnePasse(forge, images(6), lecteur(2 * 1024 * 1024));

    expect(passe.aboutie).toBe(true);
    if (!passe.aboutie) return;
    expect(passe.deposees).toHaveLength(3);
    expect(passe.restantes.map((i) => i.id)).toEqual(['image-3', 'image-4', 'image-5']);
  });

  it('SC-17a — une image sans octets arrête la passe', async () => {
    const forge = await ForgeEnMemoire.creer({});

    const passe = await deposerUnePasse(forge, images(2), () => Promise.resolve(null));

    expect(passe).toEqual({ aboutie: false, raison: 'octets-manquants' });
  });
});
