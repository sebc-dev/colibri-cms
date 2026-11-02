/**
 * Ticket 04 du change 014-site-public-rapide — Une case de galerie annonce sa
 * propre place. Pour un écran de 412 px (1rem = 16 px), la place annoncée par
 * `sizes` : toute la largeur du contenu pour une image ou un carrousel, une
 * case de grille pour une galerie.
 */
import { describe, it, expect } from 'vitest';
import { sizesPour } from '../../../src/render/places.ts';

const REM = 16;

/** Évalue une longueur CSS (`rem`, `vw`, `calc(a - b)`) pour un écran donné, en pixels. */
function enPixels(longueur: string, ecran: number): number {
  const calc = /^calc\((.+)\)$/.exec(longueur.trim());
  if (calc !== null) {
    const [gauche, droite] = calc[1].split(' - ');
    return enPixels(gauche, ecran) - enPixels(droite, ecran);
  }
  const m = /^(-?[\d.]+)(rem|vw)$/.exec(longueur.trim());
  if (m === null) throw new Error(`longueur illisible : ${longueur}`);
  return m[2] === 'rem' ? Number(m[1]) * REM : (Number(m[1]) * ecran) / 100;
}

/** La place annoncée par un `sizes` pour un écran de `ecran` px : première condition vraie, sinon la dernière valeur. */
function placeAnnoncee(sizes: string, ecran: number): number {
  const parts = sizes.split(', ');
  for (const part of parts) {
    const m = /^\(min-width: ([\d.]+)rem\) (.+)$/.exec(part.trim());
    if (m === null) return enPixels(part, ecran);
    if (ecran >= Number(m[1]) * REM) return enPixels(m[2], ecran);
  }
  throw new Error(`sizes sans valeur par défaut : ${sizes}`);
}

describe('sizesPour — la place annoncée selon la nature de l’emplacement', () => {
  it('SC-04a — à 412 px, image et carrousel annoncent 380 px, la galerie moins de la moitié', () => {
    const image = placeAnnoncee(sizesPour('image'), 412);
    const carrousel = placeAnnoncee(sizesPour('carrousel'), 412);
    const galerie = placeAnnoncee(sizesPour('galerie'), 412);

    expect(image).toBe(380);
    expect(carrousel).toBe(380);
    expect(galerie).toBeLessThan(image / 2);
    expect(galerie).toBeGreaterThan(0);
  });
});
