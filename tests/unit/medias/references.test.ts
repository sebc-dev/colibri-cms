/**
 * Ticket 02 — Dériver l'effaçabilité d'une image
 * (openspec/changes/004-bibliotheque-de-medias/tickets/02-deriver-effacabilite.md).
 *
 * Couture retenue pour les deux critères purs du ticket (SC-02a/b) :
 * `src/core/medias/references.ts` s'instancie sans D1 ni Worker (I2, ARCH-5)
 * — ce fichier n'exerce que la fonction pure, sur des ENSEMBLES de
 * références passés en données (design.md § Decisions, « Le comptage de
 * références prend les références en données, ne les interroge pas »),
 * jamais interrogés par elle : aucune couture HTTP ni D1 ici, cette règle
 * n'en a besoin d'aucune.
 */
import { describe, it, expect } from 'vitest';
import { imageEffacable } from '../../../src/core/medias/references.ts';

describe('SC-02a — une image référencée par au moins un emplacement, publié ou brouillon, n’est pas effaçable', () => {
  it('SC-02a — une image référencée par un emplacement PUBLIÉ seul n’est pas effaçable', () => {
    // Arrange
    const referencesPubliees = new Set(['image-1']);
    const referencesBrouillon = new Set<string>();

    // Act
    const resultat = imageEffacable('image-1', referencesPubliees, referencesBrouillon);

    // Assert
    expect(resultat).toBe(false);
  });

  it('SC-02a — une image référencée par un emplacement en BROUILLON seul n’est pas effaçable', () => {
    // Arrange
    const referencesPubliees = new Set<string>();
    const referencesBrouillon = new Set(['image-1']);

    // Act
    const resultat = imageEffacable('image-1', referencesPubliees, referencesBrouillon);

    // Assert
    expect(resultat).toBe(false);
  });

  it('SC-02a — une image référencée à la fois publiée et en brouillon n’est pas effaçable', () => {
    // Arrange
    const referencesPubliees = new Set(['image-1']);
    const referencesBrouillon = new Set(['image-1']);

    // Act
    const resultat = imageEffacable('image-1', referencesPubliees, referencesBrouillon);

    // Assert
    expect(resultat).toBe(false);
  });
});

describe('SC-02b — une image qu’aucun emplacement, ni publié ni brouillon, ne référence est effaçable', () => {
  it('SC-02b — une image absente de deux ensembles de références vides est effaçable', () => {
    // Arrange : aucune image, nulle part — l'état initial avant toute pose (design.md).
    const referencesPubliees = new Set<string>();
    const referencesBrouillon = new Set<string>();

    // Act
    const resultat = imageEffacable('image-1', referencesPubliees, referencesBrouillon);

    // Assert
    expect(resultat).toBe(true);
  });

  it('SC-02b — une image non référencée reste effaçable même quand D’AUTRES images le sont', () => {
    // Arrange : la présence de références pour d'AUTRES images ne doit rien
    // changer au sort de celle qui n'a besoin d'être trouvée nulle part.
    const referencesPubliees = new Set(['image-autre']);
    const referencesBrouillon = new Set(['image-encore-une-autre']);

    // Act
    const resultat = imageEffacable('image-1', referencesPubliees, referencesBrouillon);

    // Assert
    expect(resultat).toBe(true);
  });
});
