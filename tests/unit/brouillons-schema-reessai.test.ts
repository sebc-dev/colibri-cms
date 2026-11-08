/**
 * Le garde qui recrée `brouillons_emplacements` (src/platform/brouillons/magasin.ts)
 * ne garde pas un échec en mémoire : après une création de table manquée, l'appel
 * suivant la retente, comme les magasins des réglages et des formulaires.
 * Couture : une D1 minimale dont seule la première création échoue.
 */
import { it, expect, vi } from 'vitest';

function d1QuiEchoueUneFois(): { readonly db: Parameters<typeof import('../../src/platform/brouillons/magasin.ts').listerSlugsAvecBrouillon>[0]; readonly creations: () => number } {
  let creations = 0;
  const db = {
    prepare: (requete: string) => ({
      bind: () => ({
        run: () => {
          if (requete.includes('create table')) {
            creations += 1;
            if (creations === 1) return Promise.reject(new Error('D1 indisponible'));
          }
          return Promise.resolve({});
        },
        all: () => Promise.resolve({ results: [{ page_slug: 'accueil' }] }),
      }),
    }),
  };
  return { db, creations: () => creations };
}

it('après une création de table manquée, l’appel suivant la retente et aboutit', async () => {
  // Arrange : un module neuf, dont le garde n'a encore rien mémorisé.
  vi.resetModules();
  const { listerSlugsAvecBrouillon } = await import('../../src/platform/brouillons/magasin.ts');
  const { db, creations } = d1QuiEchoueUneFois();

  // Act
  const premier = listerSlugsAvecBrouillon(db);
  await expect(premier).rejects.toThrow('D1 indisponible');
  const second = await listerSlugsAvecBrouillon(db);

  // Assert
  expect(creations()).toBe(2);
  expect([...second]).toEqual(['accueil']);
});
