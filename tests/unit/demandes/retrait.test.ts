/**
 * Ticket 08 du change 013 — la forme du corps d'un retrait, règle pure (I2).
 * Couture : `retraitDuCorps` et `lireMotif` de `src/core/demandes/retrait.ts` ; un retrait porte
 * sur une ou plusieurs demandes (la règle des 1 à 50 identifiants est celle du ticket 09) et le motif est « ordinaire » ou « indésirable ».
 */
import { it, expect } from 'vitest';
import { MOTIFS_DE_RETRAIT, lireMotif, retraitDuCorps } from '../../../src/core/demandes/retrait.ts';

it('SC-08a — les motifs de retrait sont exactement ordinaire et indésirable', () => {
  expect([...MOTIFS_DE_RETRAIT]).toEqual(['ordinaire', 'indesirable']);
});

it('SC-08a — lireMotif admet les deux motifs et refuse tout le reste', () => {
  expect(lireMotif('ordinaire')).toBe('ordinaire');
  expect(lireMotif('indesirable')).toBe('indesirable');
  for (const valeur of ['Ordinaire', 'indésirable', 'ordinaire ', '', 3, null, undefined]) {
    expect(lireMotif(valeur)).toBeNull();
  }
});

it('SC-08a — retraitDuCorps lit { ids: [un id], motif }', () => {
  expect(retraitDuCorps({ ids: ['d-1'], motif: 'ordinaire' })).toEqual({ ids: ['d-1'], motif: 'ordinaire' });
  expect(retraitDuCorps({ ids: ['d-1'], motif: 'indesirable' })).toEqual({ ids: ['d-1'], motif: 'indesirable' });
});

it('SC-08a — cas limite : motif inconnu ou absent, ids vide ou non textuel, corps d’une autre forme : refusés', () => {
  const refuses: unknown[] = [
    { ids: ['d-1'], motif: 'autre' },
    { ids: ['d-1'] },
    { ids: [], motif: 'ordinaire' },
    { ids: [3], motif: 'ordinaire' },
    { ids: [null], motif: 'ordinaire' },
    { ids: ['d-1', 3], motif: 'ordinaire' },
    { ids: 'd-1', motif: 'ordinaire' },
    { motif: 'ordinaire' },
    {},
    null,
    42,
    'ordinaire',
    [['d-1'], 'ordinaire'],
  ];
  for (const corps of refuses) {
    expect(retraitDuCorps(corps)).toBeNull();
  }
});
