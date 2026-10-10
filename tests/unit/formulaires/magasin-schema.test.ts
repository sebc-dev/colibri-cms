/**
 * Magasin des brouillons de formulaires (`src/platform/formulaires/magasin.ts`) :
 * un échec passager de la création défensive de la table n'est pas mis en
 * cache — l'appel suivant retente au lieu de rejouer l'échec jusqu'au
 * redémarrage de l'isolat. Complète SC-05f (table créée à l'identique de la
 * migration 0008).
 *
 * Couture : une D1 factice dont la première requête échoue. Ce fichier est
 * le seul à charger le module dans son isolat : le cache part vide.
 */
import { describe, it, expect } from 'vitest';
import { obtenirBrouillonsFormulaires, type DB } from '../../../src/platform/formulaires/magasin.ts';

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
          all: () =>
            Promise.resolve({
              results: [
                {
                  formulaire: 'devis-gateau',
                  contenu: '{"champs":{},"derniersNumeros":{}}',
                },
              ],
            }),
        }),
      };
    },
  };
  return { db, requetes };
}

describe('création défensive de la table des brouillons de formulaires', () => {
  it('SC-05f — retente la création après un échec, au lieu de rejouer l’échec mis en cache', async () => {
    // Arrange
    const { db, requetes } = dbDontLaPremiereRequeteEchoue();

    // Act
    await expect(obtenirBrouillonsFormulaires(db)).rejects.toThrow('D1 indisponible');
    const second = await obtenirBrouillonsFormulaires(db);

    // Assert
    expect(second.get('devis-gateau')).toEqual({ champs: {}, derniersNumeros: {} });
    const creations = requetes.filter((q) => q.includes('create table if not exists brouillons_formulaires'));
    expect(creations).toHaveLength(2);
  });
});
