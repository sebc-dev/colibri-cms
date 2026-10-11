/**
 * Change 011, ticket 03 — L'effacement d'une image suit le contenu courant de
 * chaque emplacement.
 *
 * Couture : la fonction pure `referencesDuContenuCourant`
 * (`src/core/medias/references.ts`) reçoit en DONNÉES, pour chaque page, ses
 * emplacements déclarés, sa dernière version publiée et son brouillon ; elle
 * rend l'ensemble « publié » (emplacements SANS brouillon seulement) et
 * l'ensemble « brouillon », que `imageEffacable` (signature inchangée)
 * consomme. Aucune D1 ni Worker ici (I2).
 */
import { describe, it, expect } from 'vitest';
import { imageEffacable, referencesDuContenuCourant } from '../../../src/core/medias/references.ts';
import type { Emplacement } from '../../../src/core/pages/declaration.ts';
import type { Brouillon, ContenuCorrige } from '../../../src/core/pages/brouillon.ts';

const imageDeclaree = (mediaId: string): Emplacement => ({ id: 'image-hero', nature: 'image', rang: 0, mediaId });

function etat(contenus: Record<string, ContenuCorrige>): Brouillon {
  return new Map(Object.entries(contenus));
}

function effacable(idImage: string, declares: Emplacement[], publie: Brouillon, brouillon: Brouillon): boolean {
  const { publiees, brouillon: enBrouillon } = referencesDuContenuCourant([
    { slug: 'accueil', declares, publie, brouillon },
  ]);
  return imageEffacable(idImage, publiees, enBrouillon);
}

describe('SC-03c — une image que le contenu courant d’un emplacement pose n’est pas effaçable', () => {
  it('SC-03c — une image posée par le brouillon d’un emplacement n’est pas effaçable', () => {
    // Arrange
    const brouillon = etat({ 'image-hero': { nature: 'image', mediaId: 'img-b' } });

    // Act
    const resultat = effacable('img-b', [imageDeclaree('img-depart')], etat({}), brouillon);

    // Assert
    expect(resultat).toBe(false);
  });

  it('SC-03c — une image posée par le contenu courant d’une galerie n’est pas effaçable', () => {
    // Arrange
    const galerie: Emplacement = { id: 'galerie', nature: 'galerie', rang: 0, mediaIds: [] };
    const publie = etat({ galerie: { nature: 'galerie', mediaIds: ['img-x', 'img-g'] } });

    // Act
    const resultat = effacable('img-g', [galerie], publie, etat({}));

    // Assert
    expect(resultat).toBe(false);
  });
});

describe('SC-03d — une image qu’aucun emplacement ne pose est effaçable', () => {
  it('SC-03d — une image absente du brouillon, du publié et de la déclaration est effaçable', () => {
    // Arrange
    const publie = etat({ 'image-hero': { nature: 'image', mediaId: 'img-a' } });
    const brouillon = etat({ 'image-hero': { nature: 'image', mediaId: 'img-b' } });

    // Act
    const resultat = effacable('img-orpheline', [imageDeclaree('img-depart')], publie, brouillon);

    // Assert
    expect(resultat).toBe(true);
  });
});

describe('SC-03e — une image posée seulement par la version publiée d’un emplacement que son brouillon remplace est effaçable', () => {
  it('SC-03e — le brouillon remplace l’image publiée : l’image publiée est effaçable', () => {
    // Arrange
    const publie = etat({ 'image-hero': { nature: 'image', mediaId: 'img-a' } });
    const brouillon = etat({ 'image-hero': { nature: 'image', mediaId: 'img-b' } });

    // Act
    const resultat = effacable('img-a', [imageDeclaree('img-depart')], publie, brouillon);

    // Assert
    expect(resultat).toBe(true);
  });

  it('SC-03e — le brouillon remplace aussi le contenu de départ d’un emplacement jamais publié', () => {
    // Arrange
    const brouillon = etat({ 'image-hero': { nature: 'image', mediaId: 'img-b' } });

    // Act
    const resultat = effacable('img-depart', [imageDeclaree('img-depart')], etat({}), brouillon);

    // Assert
    expect(resultat).toBe(true);
  });
});

describe('SC-03f — une image posée seulement par la version publiée d’un emplacement sans brouillon n’est pas effaçable', () => {
  it('SC-03f — sans brouillon, la version publiée pose l’image : elle n’est pas effaçable', () => {
    // Arrange
    const publie = etat({ 'image-hero': { nature: 'image', mediaId: 'img-a' } });

    // Act
    const resultat = effacable('img-a', [imageDeclaree('img-depart')], publie, etat({}));

    // Assert
    expect(resultat).toBe(false);
  });

  it('SC-03f — jamais publié et sans brouillon, le contenu de départ pose l’image : elle n’est pas effaçable', () => {
    // Act
    const resultat = effacable('media-fixture-hero', [imageDeclaree('media-fixture-hero')], etat({}), etat({}));

    // Assert
    expect(resultat).toBe(false);
  });
});
