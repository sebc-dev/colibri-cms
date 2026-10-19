/**
 * Ticket 03 du change 013 — la date et l'heure de réception d'une demande, à l'heure de l'éditrice.
 * Couture : `formaterReception(recueLe)` de `src/core/demandes/date.ts`, fuseau `Europe/Paris`, quel
 * que soit celui de la machine ; `recueLe` en millisecondes depuis l'époque.
 */
import { it, expect } from 'vitest';
import { formaterReception } from '../../../src/core/demandes/date.ts';

it('SC-03b — cas limite : en heure d’hiver, 13:30 UTC se lit « 4 mars 2026 à 14:30 »', () => {
  expect(formaterReception(Date.UTC(2026, 2, 4, 13, 30))).toBe('4 mars 2026 à 14:30');
});

it('SC-03b — cas limite : en heure d’été, 12:05 UTC se lit « 17 octobre 2026 à 14:05 »', () => {
  expect(formaterReception(Date.UTC(2026, 9, 17, 12, 5))).toBe('17 octobre 2026 à 14:05');
});

it('SC-03b — cas limite : 23:30 UTC le 31 décembre se lit le lendemain à Paris, « 1 janvier 2027 à 00:30 »', () => {
  expect(formaterReception(Date.UTC(2026, 11, 31, 23, 30))).toBe('1 janvier 2027 à 00:30');
});
