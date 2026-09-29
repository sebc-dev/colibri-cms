/**
 * Ticket 02 — La bibliothèque désigne un emplacement par son nom
 * (openspec/changes/006-nom-des-emplacements/tickets/
 * 02-bibliotheque-designe-par-le-nom.md, ADR-0012, design D3).
 *
 * Couture retenue, entièrement pure — même patron que
 * `tests/unit/emplacements-media.test.ts` (ticket 11) : `designerEmplacement`
 * (nouveau, `src/core/pages/designation.ts`) ne lit rien elle-même, elle
 * dérive la désignation depuis des `Emplacement[]` déjà déclarés (triés par
 * rang, `core/pages/declaration.ts`) et un identifiant. Zone `core`
 * (docs/architecture.md, I1/I2) : zéro dépendance framework/plateforme.
 *
 * Règle (design.md § Décisions, arbitrage humain du 2026-09-28) : rend le
 * `nom` déclaré s'il existe ; à défaut, la nature en français suivie du
 * rang ordinal — le rang se comptant parmi TOUS les emplacements de même
 * nature de la page, nommés ou non. Un identifiant non déclaré ne rend
 * aucune désignation.
 */
import { describe, it, expect } from 'vitest';
import { designerEmplacement } from '../../src/core/pages/designation.ts';
import type { Emplacement } from '../../src/core/pages/declaration.ts';

const BANDEAU_TARIFS_NOMME: Emplacement = {
  id: 'bandeau-tarifs',
  nature: 'image',
  rang: 2,
  mediaId: 'media-fixture-hero',
  nom: 'Bandeau des tarifs',
};

const IMAGE_HERO_SANS_NOM: Emplacement = {
  id: 'image-hero',
  nature: 'image',
  rang: 3,
  mediaId: 'media-fixture-hero',
};

const CARROUSEL_CLIENTS_SANS_NOM: Emplacement = {
  id: 'carrousel-clients',
  nature: 'carrousel',
  rang: 4,
  mediaIds: [],
};

describe("SC-02a — un emplacement nommé se désigne par son nom", () => {
  it('SC-02a — un emplacement image nommé « Bandeau des tarifs » se désigne par ce nom, jamais par sa nature ni son identifiant', () => {
    // Arrange
    const emplacementsDeclares: readonly Emplacement[] = [BANDEAU_TARIFS_NOMME, IMAGE_HERO_SANS_NOM];

    // Act
    const designation = designerEmplacement(emplacementsDeclares, 'bandeau-tarifs');

    // Assert : jamais l'identifiant technique `bandeau-tarifs`, jamais la nature `image`.
    expect(designation).toBe('Bandeau des tarifs');
  });

  it("SC-02a — un emplacement nommé se désigne par son nom même seul de sa nature sur la page (pas de rang à afficher)", () => {
    // Arrange : un unique emplacement `galerie`, nommé.
    const galerieNommee: Emplacement = {
      id: 'galerie-realisations',
      nature: 'galerie',
      rang: 0,
      mediaIds: [],
      nom: 'Nos réalisations',
    };
    const emplacementsDeclares: readonly Emplacement[] = [galerieNommee];

    // Act
    const designation = designerEmplacement(emplacementsDeclares, 'galerie-realisations');

    // Assert : le nom seul, aucun rang ordinal accolé.
    expect(designation).toBe('Nos réalisations');
  });
});

describe(
  'SC-02b — à défaut de nom, la désignation est la nature en français, suivie du rang parmi TOUS les emplacements de même nature, nommés ou non',
  () => {
    it('SC-02b — un unique emplacement galerie sans nom se désigne par sa seule nature, sans rang', () => {
      // Arrange
      const emplacementsDeclares: readonly Emplacement[] = [
        { id: 'galerie-realisations', nature: 'galerie', rang: 0, mediaIds: [] },
      ];

      // Act
      const designation = designerEmplacement(emplacementsDeclares, 'galerie-realisations');

      // Assert
      expect(designation).toBe('galerie');
    });

    it(
      "SC-02b — parmi deux galeries de la page, l'une nommée et l'autre sans nom, la seconde porte le rang 2 (compté parmi TOUTES les galeries, nommée comprise), jamais 1",
      () => {
        // Arrange : la première galerie de la page est NOMMÉE — si le rang
        // ne comptait que les emplacements SANS nom, la seconde se
        // désignerait « 1re galerie » ; le design exige qu'elle reste
        // « 2e galerie » (le rang se compte sur TOUTE la déclaration).
        const galerieNommee: Emplacement = {
          id: 'galerie-nommee',
          nature: 'galerie',
          rang: 0,
          mediaIds: [],
          nom: 'Nos réalisations',
        };
        const galerieSansNom: Emplacement = { id: 'galerie-sans-nom', nature: 'galerie', rang: 1, mediaIds: [] };
        const emplacementsDeclares: readonly Emplacement[] = [galerieNommee, galerieSansNom];

        // Act
        const designation = designerEmplacement(emplacementsDeclares, 'galerie-sans-nom');

        // Assert
        expect(designation).toBe('2e galerie');
      },
    );

    it("SC-02b — un identifiant absent de la déclaration ne rend aucune désignation (cas limite : page modifiée depuis l'écriture du brouillon)", () => {
      // Arrange : garde défensive, même principe que `placeEmplacement`
      // (`tests/unit/emplacements-media.test.ts`, SC-11a).
      const emplacementsDeclares: readonly Emplacement[] = [IMAGE_HERO_SANS_NOM];

      // Act
      const designation = designerEmplacement(emplacementsDeclares, 'emplacement-disparu');

      // Assert
      expect(designation).toBeNull();
    });
  },
);

describe(
  'SC-02c — sur une même page, un emplacement nommé et un emplacement sans nom se désignent chacun selon sa propre règle',
  () => {
    it(
      "SC-02c — appelée pour deux emplacements distincts de la même déclaration, la fonction rend le nom pour l'un et la nature pour l'autre, sans confusion entre les deux",
      () => {
        // Arrange
        const emplacementsDeclares: readonly Emplacement[] = [BANDEAU_TARIFS_NOMME, CARROUSEL_CLIENTS_SANS_NOM];

        // Act
        const designationNommee = designerEmplacement(emplacementsDeclares, 'bandeau-tarifs');
        const designationSansNom = designerEmplacement(emplacementsDeclares, 'carrousel-clients');

        // Assert
        expect(designationNommee).toBe('Bandeau des tarifs');
        expect(designationSansNom).toBe('carrousel');
      },
    );
  },
);

describe(
  "SC-02d — la désignation d'un emplacement nommé est la même, qu'elle alimente la fiche ou la confirmation de suppression (une seule règle, aucune logique séparée)",
  () => {
    it(
      "SC-02d — deux appels successifs pour le même emplacement nommé, depuis la même déclaration, rendent exactement la même désignation",
      () => {
        // Arrange : même liste que ce que composerait `[id].astro`, reprise
        // telle quelle par la fiche ET la confirmation de suppression
        // (design.md § Décisions).
        const emplacementsDeclares: readonly Emplacement[] = [BANDEAU_TARIFS_NOMME, IMAGE_HERO_SANS_NOM];

        // Act : le premier appel représente la fiche, le second la
        // confirmation de suppression — aucune fonction séparée pour l'une
        // ou l'autre.
        const designationPourLaFiche = designerEmplacement(emplacementsDeclares, 'bandeau-tarifs');
        const designationPourLaConfirmation = designerEmplacement(emplacementsDeclares, 'bandeau-tarifs');

        // Assert
        expect(designationPourLaFiche).toBe('Bandeau des tarifs');
        expect(designationPourLaConfirmation).toBe(designationPourLaFiche);
      },
    );
  },
);
