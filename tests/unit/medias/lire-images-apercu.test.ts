/**
 * Magasin des médias (`src/platform/medias/magasin.ts`), `lireImagesDeLApercu` :
 * une seule requête de lecture, quel que soit le nombre d'images posées
 * (plafond de 50 requêtes D1 par invocation au palier gratuit, ADR-0019 ;
 * finding error-handling-F-1 du ticket 09 du change 011).
 *
 * Couture : une D1 factice qui consigne chaque requête préparée. Ce fichier est
 * le seul à charger le module dans son isolat : le cache du schéma part vide.
 */
import { describe, it, expect } from 'vitest';
import { lireImagesDeLApercu, type DB } from '../../../src/platform/medias/magasin.ts';

const LIGNES_EN_BASE = [
  { id: 'media-a', largeur: 10, hauteur: 20, description: 'A' },
  { id: 'media-b', largeur: 30, hauteur: 40, description: null },
];

function dbQuiConsigne(): { db: DB; requetes: string[] } {
  const requetes: string[] = [];
  const db: DB = {
    prepare(query: string) {
      requetes.push(query);
      return {
        bind: () => ({
          run: () => Promise.resolve(undefined),
          all: () => Promise.resolve({ results: query.includes('json_each') ? LIGNES_EN_BASE : [] }),
        }),
      };
    },
  };
  return { db, requetes };
}

describe("lecture des images de l'aperçu", () => {
  it('soixante images demandées : une seule requête de lecture, les inconnues omises', async () => {
    // Arrange
    const { db, requetes } = dbQuiConsigne();
    const absentes = Array.from({ length: 58 }, (_, n) => `media-absente-${String(n)}`);
    const ids = ['media-a', ...absentes.slice(0, 29), 'media-b', ...absentes.slice(29)];

    // Act
    const images = await lireImagesDeLApercu(db, ids);

    // Assert
    expect(ids).toHaveLength(60);
    expect(requetes.filter((q) => q.includes('select id, largeur, hauteur, description'))).toHaveLength(1);
    expect([...images.keys()].sort((a, b) => a.localeCompare(b))).toEqual(['media-a', 'media-b']);
    expect(images.get('media-a')).toEqual({ largeur: 10, hauteur: 20, description: 'A' });
    expect(images.get('media-b')?.description).toBe('');
  });

  it('aucune image demandée : une Map vide, sans aucune requête', async () => {
    // Arrange
    const { db, requetes } = dbQuiConsigne();

    // Act
    const images = await lireImagesDeLApercu(db, []);

    // Assert
    expect(images.size).toBe(0);
    expect(requetes).toHaveLength(0);
  });
});
