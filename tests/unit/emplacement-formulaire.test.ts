/**
 * Ticket 01 du change 012 — la 7e nature d'emplacement, « formulaire » (ADR-0027).
 * La lecture de la déclaration est pure : les fixtures sont composées en mémoire.
 */
import { describe, it, expect } from 'vitest';
import { construirePageAvecEmplacements, trierEmplacementsDeclares } from '../../src/core/pages/declaration.ts';

const TEXTE = { id: 'presentation', nature: 'texte-riche', rang: 0 };
const BOUTON = { id: 'bouton-devis', nature: 'bouton-action', rang: 1, libelle: 'Demander un devis', destination: '/contact' };
const FORMULAIRE = { id: 'formulaire-devis', nature: 'formulaire', rang: 3, formulaire: 'devis-gateau' };

describe('SC-01a — les emplacements paraissent dans l’ordre posé, le formulaire à son rang', () => {
  it('SC-01a — un emplacement de nature formulaire est admis et rangé selon le rang posé par l’intégrateur', () => {
    // Arrange : la déclaration range le formulaire avant d’autres entrées dans le fichier
    const declares = [FORMULAIRE, BOUTON, TEXTE];

    // Act
    const emplacements = trierEmplacementsDeclares(declares);

    // Assert
    expect(emplacements.map((e) => e.id)).toEqual(['presentation', 'bouton-devis', 'formulaire-devis']);
    expect(emplacements[2]).toMatchObject({ nature: 'formulaire', rang: 3, formulaire: 'devis-gateau' });
  });
});

describe('SC-01f — un emplacement de formulaire qui ne désigne aucun formulaire est ignoré', () => {
  it.each([
    ['sans champ formulaire', { id: 'formulaire-devis', nature: 'formulaire', rang: 3 }],
    ['avec un formulaire vide', { id: 'formulaire-devis', nature: 'formulaire', rang: 3, formulaire: '' }],
    ['avec un formulaire qui n’est pas du texte', { id: 'formulaire-devis', nature: 'formulaire', rang: 3, formulaire: 42 }],
  ])('SC-01f — %s : l’entrée est écartée, les autres emplacements paraissent normalement', (_cas, fautif) => {
    // Arrange
    const brut = { titre: 'Contact', rang: 2, emplacements: [TEXTE, fautif, BOUTON] };

    // Act
    const page = construirePageAvecEmplacements(brut);

    // Assert
    expect(page?.emplacements.map((e) => e.id)).toEqual(['presentation', 'bouton-devis']);
  });
});
