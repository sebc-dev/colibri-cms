/**
 * Magasin des brouillons de réglages (`src/platform/reglages/magasin.ts`) :
 * un échec passager de la création défensive de la table n'est pas mis en
 * cache — l'appel suivant retente au lieu de rejouer l'échec jusqu'au
 * redémarrage de l'isolat (finding error-handling-F-1, PR #178).
 *
 * Couture : une D1 factice dont la première requête échoue. Ce fichier est
 * le seul à charger le module dans son isolat : le cache part vide.
 */
import { describe, it, expect } from 'vitest';
import { obtenirBrouillonsReglages, type DB } from '../../../src/platform/reglages/magasin.ts';

function dbDontLaPremiereRequeteEchoue(): { db: DB; requetes: string[] } {
  const requetes: string[] = [];
  let appels = 0;
  const db: DB = {
    prepare(query: string) {
      requetes.push(query);
      appels += 1;
      const echoue = appels === 1;
      return {
        bind: () => ({
          run: () => (echoue ? Promise.reject(new Error('D1 indisponible')) : Promise.resolve(undefined)),
          all: () => Promise.resolve({ results: [{ reglage: 'coordonnees', contenu: '{"telephone":"01 23 45 67 89"}' }] }),
        }),
        run: () => Promise.resolve(undefined),
        all: () => Promise.resolve({ results: [] }),
      };
    },
  };
  return { db, requetes };
}

describe('création défensive de la table des brouillons de réglages', () => {
  it('retente la création après un échec, au lieu de rejouer l’échec mis en cache', async () => {
    // Arrange
    const { db, requetes } = dbDontLaPremiereRequeteEchoue();

    // Act
    const premier = obtenirBrouillonsReglages(db);
    await expect(premier).rejects.toThrow('D1 indisponible');
    const second = await obtenirBrouillonsReglages(db);

    // Assert
    expect(second).toEqual({ coordonnees: { telephone: '01 23 45 67 89' } });
    const creations = requetes.filter((q) => q.includes('create table if not exists brouillons_reglages'));
    expect(creations).toHaveLength(2);
  });
});
