/**
 * Ticket 03 — Le modèle d'emplacement gagne l'image, la galerie et le
 * carrousel
 * (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 03-modele-emplacement-image.md), ADR-0012.
 *
 * Couture retenue, entièrement `core/` — zéro D1, zéro HTTP, zéro Worker
 * (I1/I2, ARCH-5), même patron que `tests/static/
 * corriger-bouton-action-statique.test.ts` (ticket 04, change 003) :
 * - SC-03a exerce `trierEmplacementsDeclares` (`src/core/pages/
 *   declaration.ts`) sur des entrées brutes de nature `image`, `galerie` et
 *   `carrousel`, valides et mal formées.
 * - SC-03b exerce les fonctions d'application de correction propres à ces
 *   trois natures (`src/core/pages/brouillon.ts`, même patron que
 *   `appliquerCorrectionBoutonAction`/`LienVideo`/`TexteRiche`) : une pose
 *   visant un emplacement non déclaré, ou déclaré d'une autre nature, est
 *   refusée par valeur, sans qu'aucun brouillon ne soit produit.
 *
 * Ce répertoire (`tests/unit/`) est introduit par ce ticket — aucun
 * fichier n'y précédait (voir gaps du brief) ; le style (describe/it,
 * Arrange/Act/Assert, noms de fonctions en français) suit celui déjà tenu
 * par `tests/static/`.
 */
import { describe, it, expect } from 'vitest';
import { trierEmplacementsDeclares, type Emplacement } from '../../src/core/pages/declaration.ts';
import {
  appliquerCorrectionImage,
  appliquerCorrectionGalerie,
  appliquerCorrectionCarrousel,
  BROUILLON_VIDE,
  type Brouillon,
} from '../../src/core/pages/brouillon.ts';

const EMPLACEMENT_BOUTON: Emplacement = {
  id: 'bouton-devis',
  nature: 'bouton-action',
  rang: 0,
  libelle: 'Demander un devis',
  destination: '/contact',
};

// --- SC-03a — la lecture d'une déclaration reconnaît image/galerie/carrousel,
// chacune avec son contenu courant (les identités des images référencées),
// une entrée mal formée étant écartée comme pour les autres natures ---

describe('SC-03a — image, galerie et carrousel sont reconnues avec leur contenu courant', () => {
  it('SC-03a — un emplacement image porte son mediaId, galerie et carrousel portent leurs mediaIds, dans l’ordre posé', () => {
    // Arrange : un mélange de natures, dans un ordre de déclaration qui
    // diffère du rang, pour prouver que le tri s'applique aussi ici.
    const brut: readonly unknown[] = [
      { id: 'galerie-realisations', nature: 'galerie', rang: 1, mediaIds: ['media-1', 'media-2', 'media-3'] },
      { id: 'photo-hero', nature: 'image', rang: 0, mediaId: 'media-abc' },
      { id: 'carrousel-accueil', nature: 'carrousel', rang: 2, mediaIds: ['media-x', 'media-y'] },
    ];

    // Act
    const emplacements = trierEmplacementsDeclares(brut);

    // Assert : chacune est reconnue selon sa nature, avec son contenu
    // courant — les identités stables des images référencées — et l'ordre
    // rendu suit le rang, pas l'ordre de déclaration.
    expect(emplacements).toEqual([
      { id: 'photo-hero', nature: 'image', rang: 0, mediaId: 'media-abc' },
      { id: 'galerie-realisations', nature: 'galerie', rang: 1, mediaIds: ['media-1', 'media-2', 'media-3'] },
      { id: 'carrousel-accueil', nature: 'carrousel', rang: 2, mediaIds: ['media-x', 'media-y'] },
    ]);
  });

  it('SC-03a — une entrée image/galerie/carrousel mal formée est écartée, comme pour les autres natures', () => {
    // Arrange : une entrée valide de chaque nouvelle nature, et une entrée
    // mal formée par nature (mediaId absent, mediaIds pas un tableau,
    // élément du tableau qui n'est pas une chaîne).
    const brut: readonly unknown[] = [
      { id: 'photo-hero', nature: 'image', rang: 0, mediaId: 'media-abc' },
      { id: 'photo-cassee', nature: 'image', rang: 1 },
      { id: 'galerie-realisations', nature: 'galerie', rang: 2, mediaIds: ['media-1', 'media-2'] },
      { id: 'galerie-cassee', nature: 'galerie', rang: 3, mediaIds: 'pas-un-tableau' },
      { id: 'carrousel-accueil', nature: 'carrousel', rang: 4, mediaIds: ['media-x', 'media-y'] },
      { id: 'carrousel-casse', nature: 'carrousel', rang: 5, mediaIds: ['media-x', 42] },
    ];

    // Act
    const emplacements = trierEmplacementsDeclares(brut);

    // Assert : seules les trois entrées bien formées survivent, comme
    // `construireEmplacement` écarte déjà une entrée mal formée des trois
    // natures précédentes.
    expect(emplacements.map((emplacement) => emplacement.id)).toEqual([
      'photo-hero',
      'galerie-realisations',
      'carrousel-accueil',
    ]);
  });
});

// --- SC-03b — une pose visant un emplacement non déclaré, ou déclaré d'une
// autre nature, est refusée sans qu'aucun brouillon ne soit écrit ---

const EMPLACEMENT_IMAGE: Emplacement = { id: 'photo-hero', nature: 'image', rang: 1, mediaId: 'media-abc' } as Emplacement;
const EMPLACEMENT_GALERIE: Emplacement = {
  id: 'galerie-realisations',
  nature: 'galerie',
  rang: 2,
  mediaIds: ['media-1', 'media-2'],
} as Emplacement;
const EMPLACEMENT_CARROUSEL: Emplacement = {
  id: 'carrousel-accueil',
  nature: 'carrousel',
  rang: 3,
  mediaIds: ['media-x', 'media-y'],
} as Emplacement;

const EMPLACEMENTS_DECLARES: readonly Emplacement[] = [
  EMPLACEMENT_BOUTON,
  EMPLACEMENT_IMAGE,
  EMPLACEMENT_GALERIE,
  EMPLACEMENT_CARROUSEL,
];

describe('SC-03b — une pose mal ciblée est refusée sans écriture, pour image, galerie et carrousel', () => {
  it('SC-03b — poser une image sur un emplacement non déclaré est refusée sans produire de brouillon', () => {
    // Arrange
    const brouillonDepart: Brouillon = BROUILLON_VIDE;

    // Act
    const resultat = appliquerCorrectionImage(EMPLACEMENTS_DECLARES, brouillonDepart, 'emplacement-fantome', {
      mediaId: 'media-nouveau',
    });

    // Assert : refusée par valeur, jamais par exception, rien n'est écrit.
    expect(resultat).toEqual({ accepte: false, raison: 'emplacement-non-declare' });
    expect(brouillonDepart.size).toBe(0);
  });

  it('SC-03b — poser une image sur un emplacement déclaré d’une autre nature (bouton d’action) est refusée sans produire de brouillon', () => {
    // Arrange
    const brouillonDepart: Brouillon = BROUILLON_VIDE;

    // Act
    const resultat = appliquerCorrectionImage(EMPLACEMENTS_DECLARES, brouillonDepart, 'bouton-devis', {
      mediaId: 'media-nouveau',
    });

    // Assert
    expect(resultat).toEqual({ accepte: false, raison: 'nature-non-corrigible' });
    expect(brouillonDepart.size).toBe(0);
  });

  it('SC-03b — composer une galerie sur un emplacement non déclaré est refusée sans produire de brouillon', () => {
    // Arrange
    const brouillonDepart: Brouillon = BROUILLON_VIDE;

    // Act
    const resultat = appliquerCorrectionGalerie(EMPLACEMENTS_DECLARES, brouillonDepart, 'emplacement-fantome', {
      mediaIds: ['media-1', 'media-2'],
    });

    // Assert
    expect(resultat).toEqual({ accepte: false, raison: 'emplacement-non-declare' });
    expect(brouillonDepart.size).toBe(0);
  });

  it('SC-03b — composer une galerie sur un emplacement déclaré d’une autre nature (image) est refusée sans produire de brouillon', () => {
    // Arrange
    const brouillonDepart: Brouillon = BROUILLON_VIDE;

    // Act
    const resultat = appliquerCorrectionGalerie(EMPLACEMENTS_DECLARES, brouillonDepart, 'photo-hero', {
      mediaIds: ['media-1', 'media-2'],
    });

    // Assert
    expect(resultat).toEqual({ accepte: false, raison: 'nature-non-corrigible' });
    expect(brouillonDepart.size).toBe(0);
  });

  it('SC-03b — réordonner/composer un carrousel sur un emplacement non déclaré est refusée sans produire de brouillon', () => {
    // Arrange
    const brouillonDepart: Brouillon = BROUILLON_VIDE;

    // Act
    const resultat = appliquerCorrectionCarrousel(EMPLACEMENTS_DECLARES, brouillonDepart, 'emplacement-fantome', {
      mediaIds: ['media-x', 'media-y'],
    });

    // Assert
    expect(resultat).toEqual({ accepte: false, raison: 'emplacement-non-declare' });
    expect(brouillonDepart.size).toBe(0);
  });

  it('SC-03b — réordonner/composer un carrousel sur un emplacement déclaré d’une autre nature (galerie) est refusée sans produire de brouillon', () => {
    // Arrange
    const brouillonDepart: Brouillon = BROUILLON_VIDE;

    // Act
    const resultat = appliquerCorrectionCarrousel(EMPLACEMENTS_DECLARES, brouillonDepart, 'galerie-realisations', {
      mediaIds: ['media-x', 'media-y'],
    });

    // Assert
    expect(resultat).toEqual({ accepte: false, raison: 'nature-non-corrigible' });
    expect(brouillonDepart.size).toBe(0);
  });
});
