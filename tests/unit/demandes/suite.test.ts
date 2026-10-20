/**
 * Ticket 07 du change 013 — la liste fermée des suites qu'une éditrice peut choisir.
 * Couture : `SUITES_CHOISISSABLES`, `lireSuite` et `suiteDuCorps` de `src/core/demandes/suite.ts` ;
 * « à renseigner » est l'état d'une demande neuve, il ne se choisit pas.
 */
import { it, expect } from 'vitest';
import { SUITES_CHOISISSABLES, lireSuite, suiteDuCorps } from '../../../src/core/demandes/suite.ts';

it('SC-07a — les suites choisissables sont exactement sans suite, devis envoyé, commande', () => {
  expect([...SUITES_CHOISISSABLES]).toEqual(['sans-suite', 'devis-envoye', 'commande']);
});

it('SC-07a — lireSuite admet chacune des trois suites', () => {
  expect(lireSuite('sans-suite')).toBe('sans-suite');
  expect(lireSuite('devis-envoye')).toBe('devis-envoye');
  expect(lireSuite('commande')).toBe('commande');
});

it('SC-07a — lireSuite refuse à renseigner, une valeur inconnue, une autre casse, une espace en trop, une chaîne vide, un nombre, null, undefined', () => {
  for (const valeur of ['a-renseigner', 'perdue', 'Commande', 'commande ', '', 3, null, undefined]) {
    expect(lireSuite(valeur)).toBeNull();
  }
});

it('SC-07a — suiteDuCorps lit { suite } et refuse un corps qui n’en a pas la forme', () => {
  expect(suiteDuCorps({ suite: 'commande', autre: 1 })).toBe('commande');
  for (const corps of [{}, { suite: 'a-renseigner' }, null, 42, 'commande', ['commande']]) {
    expect(suiteDuCorps(corps)).toBeNull();
  }
});
