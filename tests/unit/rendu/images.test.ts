/**
 * Ticket 06 — Les images dans la composition d'une page publique
 * (openspec/changes/011-apercu-et-publication/tickets/06-*.md ; ADR-0024).
 * `composerPage` est pure : tout est composé en mémoire.
 */
import { describe, it, expect } from 'vitest';
import {
  composerPage,
  ImageManquanteError,
  type EntreeComposition,
  type ImageRendue,
  type ImagesConnues,
} from '../../../src/core/rendu/page.ts';
import type { Emplacement } from '../../../src/core/pages/declaration.ts';
import type { ReglagesDeclares } from '../../../src/core/reglages/declaration.ts';

const REGLAGES: ReglagesDeclares = { coordonnees: [], reseaux: [], mention: '' };

const GATEAU: ImageRendue = { source: '/m/gateau.png', largeur: 800, hauteur: 600, description: "Gâteau d'anniversaire à la fraise", variantes: [] };
const SANS_TEXTE: ImageRendue = { source: '/m/deco.png', largeur: 400, hauteur: 300, description: '', variantes: [] };
const TARTE: ImageRendue = { source: '/m/tarte.png', largeur: 640, hauteur: 480, description: 'Tarte', variantes: [] };

const IMAGES: ImagesConnues = new Map([
  ['gateau', GATEAU],
  ['deco', SANS_TEXTE],
  ['tarte', TARTE],
]);

function composer(emplacements: Emplacement[], images: ImagesConnues = IMAGES) {
  const entree: EntreeComposition = {
    slug: 'accueil',
    pages: [{ slug: 'accueil', titre: 'Accueil' }],
    page: { titre: 'Accueil', emplacements },
    reglages: REGLAGES,
    images,
  };
  return composerPage(entree);
}

describe('composerPage — les images', () => {
  it('SC-06a — la page « Accueil » est titrée « Accueil » et garde ses emplacements dans l’ordre posé', () => {
    const page = composer([
      { id: 'a', nature: 'image', rang: 0, mediaId: 'gateau' },
      { id: 'b', nature: 'bouton-action', rang: 1, libelle: 'Devis', destination: '/contact' },
      { id: 'c', nature: 'galerie', rang: 2, mediaIds: ['tarte'] },
    ]);

    expect(page.titre).toBe('Accueil');
    expect(page.emplacements.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('SC-06b — l’image posée porte sa description et ses dimensions', () => {
    const page = composer([{ id: 'a', nature: 'image', rang: 0, mediaId: 'gateau' }]);

    expect(page.emplacements[0]).toEqual({ id: 'a', nature: 'image', image: { ...GATEAU, prioritaire: true } });
    const emplacement = page.emplacements[0];
    const image = emplacement.nature === 'image' ? emplacement.image : undefined;
    expect(image?.description).toBe("Gâteau d'anniversaire à la fraise");
    expect(image?.largeur).toBe(800);
    expect(image?.hauteur).toBe(600);
  });

  it('SC-06c — l’image sans description garde une description vide (décorative)', () => {
    const page = composer([{ id: 'a', nature: 'image', rang: 0, mediaId: 'deco' }]);

    const emplacement = page.emplacements[0];
    expect(emplacement.nature === 'image' ? emplacement.image?.description : undefined).toBe('');
  });

  it('SC-06d — la galerie garde son ordre, le carrousel des mêmes images garde le sien (inverse)', () => {
    const page = composer([
      { id: 'g', nature: 'galerie', rang: 0, mediaIds: ['gateau', 'deco', 'tarte'] },
      { id: 'c', nature: 'carrousel', rang: 1, mediaIds: ['tarte', 'deco', 'gateau'] },
    ]);

    expect(page.emplacements).toEqual([
      { id: 'g', nature: 'galerie', images: [{ ...GATEAU, prioritaire: true }, { ...SANS_TEXTE, prioritaire: false }, { ...TARTE, prioritaire: false }] },
      { id: 'c', nature: 'carrousel', images: [{ ...TARTE, prioritaire: false }, { ...SANS_TEXTE, prioritaire: false }, { ...GATEAU, prioritaire: false }] },
    ]);
  });

  it('SC-06e — un emplacement d’image sans image et une galerie sans image ne portent aucune image', () => {
    const page = composer([
      { id: 'a', nature: 'image', rang: 0, mediaId: '' },
      { id: 'g', nature: 'galerie', rang: 1, mediaIds: [] },
    ]);

    expect(page.emplacements).toEqual([
      { id: 'a', nature: 'image', image: null },
      { id: 'g', nature: 'galerie', images: [] },
    ]);
  });

  it('SC-06f — une image absente des images publiées fait échouer, en nommant l’image et la page', () => {
    const poser = () => composer([{ id: 'a', nature: 'image', rang: 0, mediaId: 'fantome' }]);

    expect(poser).toThrow(ImageManquanteError);
    expect(poser).toThrow(/fantome/);
    expect(poser).toThrow(/accueil/);
  });

  it('SC-06f — la même absence dans une galerie échoue de même', () => {
    const poser = () => composer([{ id: 'g', nature: 'galerie', rang: 0, mediaIds: ['gateau', 'fantome'] }]);

    expect(poser).toThrow(/fantome/);
  });

  it('SC-06g — quand chaque image posée est connue, la composition aboutit et chaque emplacement présente ses images', () => {
    const page = composer([
      { id: 'a', nature: 'image', rang: 0, mediaId: 'gateau' },
      { id: 'c', nature: 'carrousel', rang: 1, mediaIds: ['deco', 'tarte'] },
    ]);

    expect(page.emplacements).toEqual([
      { id: 'a', nature: 'image', image: { ...GATEAU, prioritaire: true } },
      { id: 'c', nature: 'carrousel', images: [{ ...SANS_TEXTE, prioritaire: false }, { ...TARTE, prioritaire: false }] },
    ]);
  });
});
