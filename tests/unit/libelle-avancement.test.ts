/** Change 011, ticket 17 — le libellé d'avancement de l'envoi des images (pur, FR-117). */
import { describe, it, expect } from 'vitest';
import { libelleAvancement } from '../../src/admin/ilots-svelte-5/libelle-avancement.ts';

describe('SC-17a — le libellé d avancement', () => {
  it('SC-17a — 3 images parties sur 12 : « Envoi des images : 3 sur 12 »', () => {
    expect(libelleAvancement(3, 12)).toBe('Envoi des images : 3 sur 12');
  });

  it('SC-17a — le compte est borné à [0, total]', () => {
    expect(libelleAvancement(-2, 12)).toBe('Envoi des images : 0 sur 12');
    expect(libelleAvancement(15, 12)).toBe('Envoi des images : 12 sur 12');
  });

  it('SC-17a — aucun terme de développeur dans le libellé', () => {
    expect(libelleAvancement(1, 2)).not.toMatch(/commit|branche|blob|passe|build|d[ée]p[ôo]t/i);
  });
});
