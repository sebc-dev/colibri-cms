/**
 * Ticket 11 — Voir où une image est posée, et la supprimer partout
 * (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 11-ou-posee-et-supprimer.md, SC-11a).
 *
 * Couture retenue, entièrement pure — zéro D1, zéro HTTP, zéro Worker (même
 * patron que `tests/unit/modele-emplacement-image.test.ts`, ticket 03) :
 * `placeEmplacement` (`src/admin/ilots-svelte-5/emplacements-media.ts`) ne
 * lit rien elle-même, elle dérive la « place » depuis des `Emplacement[]`
 * déjà construits. Aucune page déclarée (`content/pages/`) ne porte deux
 * emplacements de même nature (le ticket exclut toute modification de la
 * déclaration) : le rang (place > 1 emplacement de même nature) se prouve
 * donc ici, sur des tableaux `Emplacement` synthétiques, plutôt qu'en
 * modifiant une fixture versionnée.
 */
import { describe, it, expect } from 'vitest';
import { placeEmplacement } from '../../src/admin/ilots-svelte-5/emplacements-media.ts';
import type { Emplacement } from '../../src/core/pages/declaration.ts';

const EMPLACEMENT_IMAGE_HERO: Emplacement = {
  id: 'image-hero',
  nature: 'image',
  rang: 0,
  mediaId: 'media-fixture-hero',
};

const EMPLACEMENT_BOUTON: Emplacement = {
  id: 'bouton-devis',
  nature: 'bouton-action',
  rang: 1,
  libelle: 'Demander un devis',
  destination: '/contact',
};

const EMPLACEMENT_GALERIE_A: Emplacement = {
  id: 'galerie-realisations',
  nature: 'galerie',
  rang: 2,
  mediaIds: [],
};

const EMPLACEMENT_GALERIE_B: Emplacement = {
  id: 'galerie-clients',
  nature: 'galerie',
  rang: 3,
  mediaIds: [],
};

describe("SC-11a — la place d'un emplacement se dit par sa nature en français, avec un rang seulement si plusieurs emplacements de la page la partagent", () => {
  it('SC-11a — un unique emplacement image sur la page se dit par sa seule nature, sans rang ni identifiant', () => {
    // Arrange
    const emplacementsDeclares: readonly Emplacement[] = [EMPLACEMENT_IMAGE_HERO, EMPLACEMENT_BOUTON];

    // Act
    const place = placeEmplacement(emplacementsDeclares, 'image-hero');

    // Assert : jamais l'identifiant technique `image-hero`.
    expect(place).toBe('image');
  });

  it('SC-11a — deux galeries de la même page se disent par leur nature suivie de leur rang parmi les emplacements de même nature', () => {
    // Arrange : une autre nature (bouton) intercalée pour prouver que le
    // rang se compte parmi les emplacements de MÊME nature, jamais parmi
    // tous les emplacements de la page.
    const emplacementsDeclares: readonly Emplacement[] = [
      EMPLACEMENT_GALERIE_A,
      EMPLACEMENT_BOUTON,
      EMPLACEMENT_GALERIE_B,
    ];

    // Act
    const placeA = placeEmplacement(emplacementsDeclares, 'galerie-realisations');
    const placeB = placeEmplacement(emplacementsDeclares, 'galerie-clients');

    // Assert
    expect(placeA).toBe('galerie 1');
    expect(placeB).toBe('galerie 2');
  });

  it("SC-11a — un identifiant d'emplacement absent de la déclaration ne produit aucune place", () => {
    // Arrange : garde défensive (une déclaration a pu changer depuis
    // l'écriture du brouillon) — jamais une panne de la fiche.
    const emplacementsDeclares: readonly Emplacement[] = [EMPLACEMENT_IMAGE_HERO];

    // Act
    const place = placeEmplacement(emplacementsDeclares, 'emplacement-disparu');

    // Assert
    expect(place).toBeNull();
  });
});
