/**
 * Ticket 04 du change 014-site-public-rapide — Une case de galerie annonce sa
 * propre place, vu sur le HTML bâti : la page « Places » de la fixture
 * `site-jetable-images` pose la même image dans un emplacement d'image, une
 * galerie et un carrousel.
 */
import { describe, it, expect } from 'vitest';
import { sizesPour } from '../../src/render/places.ts';

interface ElementRencontre {
  readonly attributes: Iterable<[string, string]>;
}
interface Reecrivain {
  on(selecteur: string, gestionnaires: { element?(element: ElementRencontre): void }): Reecrivain;
  transform(reponse: Response): Response;
}
declare const HTMLRewriter: new () => Reecrivain;

const PAGE = import.meta.glob<string>('/.wrangler/site-jetable-images/client/places/index.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

async function images(corps: string): Promise<Map<string, string>[]> {
  const lues: Map<string, string>[] = [];
  await new HTMLRewriter()
    .on('img', {
      element(element) {
        lues.push(new Map(element.attributes));
      },
    })
    .transform(new Response(corps))
    .text();
  return lues;
}

describe('places sur la page bâtie', () => {
  it('SC-04a — image et carrousel annoncent le contenu entier, la galerie une case de sa grille', async () => {
    const entrees = Object.values(PAGE);
    expect(entrees.length, 'page absente : lancer `node scripts/batir-site-jetable.mjs`').toBe(1);

    const lues = await images(entrees[0]);

    expect(lues).toHaveLength(3);
    const [image, galerie, carrousel] = lues.map((l) => l.get('sizes'));
    expect(image).toBe(sizesPour('image'));
    expect(galerie).toBe(sizesPour('galerie'));
    expect(carrousel).toBe(sizesPour('carrousel'));
    expect(image).toBe(carrousel);
    expect(galerie).not.toBe(image);
  });
});
