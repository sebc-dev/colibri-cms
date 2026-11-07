/**
 * Change 015, ticket 01 — la phrase de la confirmation dit ce que la page
 * reprend réellement : sa version publiée, ou son contenu de départ si elle n'a
 * jamais été publiée (ux.md).
 */
import { it, expect } from 'vitest';
import { texteAvertissementRevenir } from '../../src/admin/textes.ts';

it('une page déjà publiée reprend sa version publiée', () => {
  expect(texteAvertissementRevenir('Tarifs', 'La page', false)).toBe(
    'Les modifications de « Tarifs » seront perdues. La page reprend sa version publiée.',
  );
});

it('une page jamais publiée reprend son contenu de départ', () => {
  expect(texteAvertissementRevenir('Contact', 'La page', true)).toBe(
    'Les modifications de « Contact » seront perdues. La page reprend son contenu de départ.',
  );
});
