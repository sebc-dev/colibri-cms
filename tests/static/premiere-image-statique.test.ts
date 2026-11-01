/**
 * Ticket 01 du change 014-site-public-rapide — La première image de la page
 * paraît sans attendre, vue sur le HTML bâti : la page « Galerie longue » de
 * la fixture `site-jetable-images` pose une image de tête puis une galerie de
 * 45 photos.
 */
import { describe, it, expect } from 'vitest';

interface ElementRencontre {
  readonly attributes: Iterable<[string, string]>;
}
interface Reecrivain {
  on(selecteur: string, gestionnaires: { element?(element: ElementRencontre): void }): Reecrivain;
  transform(reponse: Response): Response;
}
declare const HTMLRewriter: new () => Reecrivain;

const PAGE = import.meta.glob<string>('/.wrangler/site-jetable-images/client/galerie-longue/index.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

async function images(corps: string): Promise<Map<string, string>[]> {
  const lues: Map<string, string>[] = [];
  const reponse = new HTMLRewriter()
    .on('img', {
      element(element) {
        lues.push(new Map(element.attributes));
      },
    })
    .transform(new Response(corps));
  await reponse.text();
  return lues;
}

describe('première image sur la page bâtie', () => {
  it('SC-01a — l’image de tête est prioritaire, et les 45 photos de la galerie se chargent à l’approche de l’écran', async () => {
    const entrees = Object.values(PAGE);
    expect(entrees.length, 'page absente : lancer `node scripts/batir-site-jetable.mjs`').toBe(1);

    const lues = await images(entrees[0]);

    expect(lues).toHaveLength(46);
    const [tete, ...photos] = lues;
    expect(tete.get('fetchpriority')).toBe('high');
    expect(tete.has('loading')).toBe(false);
    expect(tete.has('decoding')).toBe(false);
    expect(photos).toHaveLength(45);
    for (const photo of photos) {
      expect(photo.get('loading')).toBe('lazy');
      expect(photo.get('decoding')).toBe('async');
      expect(photo.has('fetchpriority')).toBe(false);
    }
  });
});
