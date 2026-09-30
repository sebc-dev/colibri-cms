/**
 * Recherche de la bibliothèque (spec vivante `bibliotheque-de-medias`
 * § Recherche d'une image) : une image correspond par son nom d'affichage ou
 * par sa description. Relevé KO en recette (CT-10.13, 11.2, 13.1) : la
 * grille ne cherchait que dans le nom d'origine du fichier.
 *
 * Couture retenue, entièrement pure : `filtrerMedias`
 * (`src/admin/ilots-svelte-5/recherche-medias.ts`) ne lit rien elle-même.
 */
import { describe, it, expect } from 'vitest';
import { filtrerMedias } from '../../src/admin/ilots-svelte-5/recherche-medias.ts';
import type { MediaListe } from '../../src/platform/medias/magasin.ts';

const BANDEAU: MediaListe = {
  id: 'm1',
  nomAffichage: 'Bandeau de la page Accueil',
  description: 'La vitrine vue de la rue',
  effacable: false,
};
const PORTRAIT: MediaListe = { id: 'm2', nomAffichage: 'IMG_0042.jpg', description: '', effacable: false };
const MEDIAS = [BANDEAU, PORTRAIT];

describe('filtrerMedias', () => {
  it("retient une image par son nom d'affichage, sans égard à la casse", () => {
    expect(filtrerMedias(MEDIAS, 'bandeau')).toEqual([BANDEAU]);
  });

  it('retient une image par sa description', () => {
    expect(filtrerMedias(MEDIAS, 'VITRINE')).toEqual([BANDEAU]);
  });

  it("ne retient rien quand ni nom ni description ne correspondent", () => {
    expect(filtrerMedias(MEDIAS, 'jardin')).toEqual([]);
  });

  it('rend toutes les images quand la recherche est vide ou blanche', () => {
    expect(filtrerMedias(MEDIAS, '   ')).toEqual(MEDIAS);
  });
});
