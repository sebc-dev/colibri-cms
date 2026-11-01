/**
 * Ticket 01 du change 014-site-public-rapide — La première image de la page
 * paraît sans attendre. `composerPage` marque `prioritaire` la première image
 * posée dans l'ordre des emplacements, et aucune autre (ADR-0024).
 */
import { describe, it, expect } from 'vitest';
import { composerPage, type ImageRendue, type ImagesConnues } from '../../../src/core/rendu/page.ts';
import type { Emplacement } from '../../../src/core/pages/declaration.ts';
import type { ReglagesDeclares } from '../../../src/core/reglages/declaration.ts';

const REGLAGES: ReglagesDeclares = { coordonnees: [], reseaux: [], mention: '' };

function image(nom: string): ImageRendue {
  return { source: `/m/${nom}.png`, largeur: 800, hauteur: 600, description: nom };
}

const IMAGES: ImagesConnues = new Map(['tete', 'a', 'b', 'c', 'd', 'e', 'f'].map((nom) => [nom, image(nom)]));

/** Les images de la page composée, dans l'ordre de lecture, avec leur marque. */
function marques(emplacements: Emplacement[], images: ImagesConnues = IMAGES): [string, boolean | undefined][] {
  const page = composerPage({
    slug: 'accueil',
    pages: [{ slug: 'accueil', titre: 'Accueil' }],
    page: { titre: 'Accueil', emplacements },
    reglages: REGLAGES,
    images,
  });
  const vues: ImageRendue[] = [];
  for (const emplacement of page.emplacements) {
    if (emplacement.nature === 'image' && emplacement.image !== null) vues.push(emplacement.image);
    if (emplacement.nature === 'galerie' || emplacement.nature === 'carrousel') vues.push(...emplacement.images);
  }
  return vues.map((v) => [v.description, v.prioritaire]);
}

describe('composerPage — la première image est prioritaire', () => {
  it('SC-01a — l’image de tête est prioritaire, les 45 photos de la galerie ne le sont pas', () => {
    const photos = Array.from({ length: 45 }, (_, i) => `photo-${String(i)}`);
    const images: ImagesConnues = new Map([['tete', image('tete')], ...photos.map((p): [string, ImageRendue] => [p, image(p)])]);

    const lues = marques(
      [
        { id: 'h', nature: 'image', rang: 0, mediaId: 'tete' },
        { id: 'g', nature: 'galerie', rang: 1, mediaIds: photos },
      ],
      images,
    );

    expect(lues).toHaveLength(46);
    expect(lues[0]).toEqual(['tete', true]);
    expect(lues.slice(1).every(([, prioritaire]) => prioritaire === false)).toBe(true);
  });

  it('SC-01b — galerie de trois images puis image : seule la première de la galerie est prioritaire', () => {
    const lues = marques([
      { id: 'g', nature: 'galerie', rang: 0, mediaIds: ['a', 'b', 'c'] },
      { id: 'i', nature: 'image', rang: 1, mediaId: 'd' },
    ]);

    expect(lues).toEqual([
      ['a', true],
      ['b', false],
      ['c', false],
      ['d', false],
    ]);
  });

  it('SC-01c — carrousel de trois images : seule la première est prioritaire', () => {
    const lues = marques([{ id: 'c', nature: 'carrousel', rang: 0, mediaIds: ['a', 'b', 'c'] }]);

    expect(lues).toEqual([
      ['a', true],
      ['b', false],
      ['c', false],
    ]);
  });

  it('SC-01d — un emplacement d’image sans image, puis une galerie : la première image de la galerie est prioritaire', () => {
    const lues = marques([
      { id: 'i', nature: 'image', rang: 0, mediaId: '' },
      { id: 'g', nature: 'galerie', rang: 1, mediaIds: ['a', 'b'] },
    ]);

    expect(lues).toEqual([
      ['a', true],
      ['b', false],
    ]);
  });

  it('SC-01d — un texte, un bouton et une galerie vide avant la première image sont ignorés', () => {
    const lues = marques([
      { id: 't', nature: 'texte-riche', rang: 0, contenu: 'Bonjour' },
      { id: 'b', nature: 'bouton-action', rang: 1, libelle: 'Devis', destination: '/contact' },
      { id: 'g', nature: 'galerie', rang: 2, mediaIds: [] },
      { id: 'i', nature: 'image', rang: 3, mediaId: 'a' },
    ]);

    expect(lues).toEqual([['a', true]]);
  });

  it('SC-01e — deux galeries de trois images : seule la première image de la première est prioritaire', () => {
    const lues = marques([
      { id: 'g1', nature: 'galerie', rang: 0, mediaIds: ['a', 'b', 'c'] },
      { id: 'g2', nature: 'galerie', rang: 1, mediaIds: ['d', 'e', 'f'] },
    ]);

    expect(lues).toEqual([
      ['a', true],
      ['b', false],
      ['c', false],
      ['d', false],
      ['e', false],
      ['f', false],
    ]);
  });

  it('SC-01e — une même image posée deux fois n’est prioritaire qu’à sa première occurrence', () => {
    const lues = marques([
      { id: 'i', nature: 'image', rang: 0, mediaId: 'a' },
      { id: 'g', nature: 'galerie', rang: 1, mediaIds: ['a', 'b'] },
    ]);

    expect(lues).toEqual([
      ['a', true],
      ['a', false],
      ['b', false],
    ]);
  });

  it('SC-01a — une page sans image se compose sans image prioritaire', () => {
    expect(marques([{ id: 't', nature: 'texte-riche', rang: 0, contenu: 'Bonjour' }])).toEqual([]);
  });
});
