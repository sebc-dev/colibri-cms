/**
 * Ticket 09 du change 013 — la forme du corps d'un retrait groupé, règle pure (I2).
 * Couture : `retraitDuCorps` de `src/core/demandes/retrait.ts` ; un retrait porte sur 1 à 50
 * identifiants textuels distincts (une page au plus), avec un motif unique pour toute la sélection.
 */
import { it, expect } from 'vitest';
import { retraitDuCorps } from '../../../src/core/demandes/retrait.ts';

function identifiants(nombre: number): string[] {
  return Array.from({ length: nombre }, (_, i) => `d-${String(i + 1)}`);
}

it('SC-09a — retraitDuCorps lit { ids: [trois id], motif } et garde l’ordre et le motif', () => {
  expect(retraitDuCorps({ ids: ['d-1', 'd-2', 'd-3'], motif: 'indesirable' })).toEqual({
    ids: ['d-1', 'd-2', 'd-3'],
    motif: 'indesirable',
  });
});

it('SC-09a — bornes : 1 et 50 identifiants sont admis', () => {
  expect(retraitDuCorps({ ids: identifiants(1), motif: 'ordinaire' })?.ids).toHaveLength(1);
  expect(retraitDuCorps({ ids: identifiants(50), motif: 'ordinaire' })?.ids).toHaveLength(50);
});

it('SC-09a — bornes : 0 et 51 identifiants sont refusés', () => {
  expect(retraitDuCorps({ ids: identifiants(0), motif: 'ordinaire' })).toBeNull();
  expect(retraitDuCorps({ ids: identifiants(51), motif: 'ordinaire' })).toBeNull();
});

it('SC-09a — cas limite : un identifiant répété ou un identifiant non textuel dans le lot refuse tout le corps', () => {
  expect(retraitDuCorps({ ids: ['d-1', 'd-2', 'd-1'], motif: 'ordinaire' })).toBeNull();
  expect(retraitDuCorps({ ids: ['d-1', 'd-1'], motif: 'indesirable' })).toBeNull();
  expect(retraitDuCorps({ ids: ['d-1', 3, 'd-3'], motif: 'ordinaire' })).toBeNull();
  expect(retraitDuCorps({ ids: ['d-1', null], motif: 'ordinaire' })).toBeNull();
});

it('SC-09a — le motif reste exigé pour un lot : inconnu ou absent, refusé', () => {
  expect(retraitDuCorps({ ids: ['d-1', 'd-2', 'd-3'], motif: 'autre' })).toBeNull();
  expect(retraitDuCorps({ ids: ['d-1', 'd-2', 'd-3'] })).toBeNull();
});
