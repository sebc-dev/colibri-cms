/**
 * Ticket 02 du change 014-site-public-rapide — Chaque image publiée est
 * proposée en variantes réduites, vue sur le site bâti.
 *
 * Le site jetable à images (`tests/static/fixtures/site-jetable-images/`, bâti
 * par `scripts/batir-site-jetable.mjs`, sharp pour de vrai) pose sur la page
 * « Variantes » trois images de couleur unie (2 000 × 1 500, 960 × 640, 300 px
 * de large) et sur « Variantes spéciales » un PNG translucide et un JPEG
 * orienté par l'EXIF. SC-02d se prouve aussi sur le site de démo servi par le
 * worker de test.
 */
import { exports } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';
import { analyserImage } from '../../src/core/medias/ingestion.ts';

interface ElementRencontre {
  readonly attributes: Iterable<[string, string]>;
}
interface Reecrivain {
  on(selecteur: string, gestionnaires: { element?(element: ElementRencontre): void }): Reecrivain;
  transform(reponse: Response): Response;
}
declare const HTMLRewriter: new () => Reecrivain;

const PAGES = import.meta.glob<string>('/.wrangler/site-jetable-images/client/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const VARIANTES = import.meta.glob<string>('/.wrangler/site-jetable-images/client/_astro/*.webp', {
  query: '?inline',
  import: 'default',
  eager: true,
});

const RACINE_SITE = '/.wrangler/site-jetable-images/client';

function page(slug: string): string {
  const corps = PAGES[`${RACINE_SITE}/${slug}/index.html`];
  expect(corps, `page « ${slug} » absente : lancer \`node scripts/batir-site-jetable.mjs\``).toBeTypeOf('string');
  return corps;
}

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

interface Candidate {
  readonly adresse: string;
  readonly largeur: number;
}

function lireSrcset(srcset: string | undefined): Candidate[] {
  expect(srcset, 'srcset absent').toBeTypeOf('string');
  return (srcset ?? '').split(',').map((entree) => {
    const [adresse, descripteur] = entree.trim().split(/\s+/);
    expect(descripteur, `descripteur de « ${adresse} »`).toMatch(/^\d+w$/);
    return { adresse, largeur: Number.parseInt(descripteur, 10) };
  });
}

function octetsDe(adresse: string): Uint8Array {
  const donnees = VARIANTES[`${RACINE_SITE}${adresse}`];
  expect(donnees, `fichier ${adresse} absent du site bâti`).toBeTypeOf('string');
  const base64 = donnees.slice(donnees.indexOf(',') + 1);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function enTexte(octets: Uint8Array): string {
  return Array.from(octets, (o) => String.fromCharCode(o)).join('');
}

/** Les variantes annoncées par l'image n° `rang` de la page, avec leurs dimensions lues à l'en-tête. */
async function variantesDe(slug: string, rang: number) {
  const lues = await images(page(slug));
  const candidates = lireSrcset(lues[rang]?.get('srcset'));
  return candidates.map((c) => {
    const octets = octetsDe(c.adresse);
    const analyse = analyserImage({ octets });
    expect(analyse.admise, `${c.adresse} doit être une image lisible`).toBe(true);
    if (!analyse.admise) throw new Error('image illisible');
    return { ...c, octets, format: analyse.format, dimensions: analyse.dimensions };
  });
}

describe('variantes sur la page bâtie', () => {
  it('SC-02a — une image de 2 000 × 1 500 est proposée en trois WebP de 360×270, 720×540 et 1 080×810, chacune annoncée avec sa largeur', async () => {
    const lues = await images(page('variantes'));
    expect(lues).toHaveLength(3);
    expect(lues[0].get('sizes')).toBe('(min-width: 38.5rem) 36.5rem, calc(100vw - 2rem)');

    const variantes = await variantesDe('variantes', 0);

    expect(variantes.map((v) => v.largeur)).toEqual([360, 720, 1080]);
    for (const v of variantes) {
      expect(v.format).toBe('webp');
      expect(v.dimensions.largeur).toBe(v.largeur);
    }
    expect(variantes.map((v) => [v.dimensions.largeur, v.dimensions.hauteur])).toEqual([
      [360, 270],
      [720, 540],
      [1080, 810],
    ]);
  });

  it('SC-02b — une image de 960 px est proposée en 360, 720 et 960 px, aucune plus large que 960', async () => {
    const variantes = await variantesDe('variantes', 1);

    expect(variantes.map((v) => v.largeur)).toEqual([360, 720, 960]);
    expect(variantes.map((v) => [v.format, v.dimensions.largeur, v.dimensions.hauteur])).toEqual([
      ['webp', 360, 240],
      ['webp', 720, 480],
      ['webp', 960, 640],
    ]);
  });

  it('SC-02c — une image de 300 px de large est proposée en une seule variante WebP, de 300 px', async () => {
    const variantes = await variantesDe('variantes', 2);

    expect(variantes).toHaveLength(1);
    expect(variantes[0].format).toBe('webp');
    expect(variantes[0].dimensions).toEqual({ largeur: 300, hauteur: 200 });
  });

  it('SC-02a — la source par défaut de l’image est la variante de 720 px, et le texte de remplacement et les dimensions déclarées sont gardés', async () => {
    const [grande] = await images(page('variantes'));
    const candidates = lireSrcset(grande.get('srcset'));

    expect(grande.get('src')).toBe(candidates.find((c) => c.largeur === 720)?.adresse);
    expect(grande.get('alt')).toBe('Grande image');
    expect(grande.get('width')).toBe('2000');
    expect(grande.get('height')).toBe('1500');
  });

  it('SC-02a — une image translucide garde son canal alpha dans chaque variante', async () => {
    const variantes = await variantesDe('variantes-speciales', 0);

    expect(variantes.map((v) => v.largeur)).toEqual([360, 400]);
    for (const v of variantes) {
      const entete = enTexte(v.octets.slice(0, 32));
      expect(entete.slice(12, 16), `${v.adresse} : chunk étendu`).toBe('VP8X');
      expect(v.octets[20] & 0x10, `${v.adresse} : drapeau alpha`).toBe(0x10);
    }
  });

  it('SC-02a — un JPEG orienté par l’EXIF donne une variante orientée, sans métadonnées', async () => {
    const [plusPetite] = await variantesDe('variantes-speciales', 1);

    expect(plusPetite.largeur).toBe(360);
    expect(plusPetite.dimensions.largeur).toBe(360);
    expect(plusPetite.dimensions.hauteur, 'photo couchée, pivotée en portrait par son orientation').toBeGreaterThan(
      plusPetite.dimensions.largeur,
    );
    const brut = enTexte(plusPetite.octets);
    expect(brut).not.toContain('EXIF');
    expect(brut).not.toContain('XMP ');
    expect(brut).not.toContain('Auteur-de-test');
  });
});

describe('l’original n’est cité par aucune page', () => {
  it('SC-02d — sur le site bâti, aucune page ne référence un fichier déposé : chaque adresse de src et de srcset est une variante WebP', async () => {
    const entrees = Object.entries(PAGES);
    expect(entrees.length, 'site à images absent : lancer `node scripts/batir-site-jetable.mjs`').toBeGreaterThan(3);
    let vues = 0;

    for (const [chemin, corps] of entrees) {
      expect(corps, chemin).not.toMatch(/\.(png|jpe?g)\b/i);
      for (const img of await images(corps)) {
        const adresses = [img.get('src') ?? '', ...(img.has('srcset') ? lireSrcset(img.get('srcset')).map((c) => c.adresse) : [])];
        for (const adresse of adresses) {
          expect(adresse, `${chemin} : ${adresse}`).toMatch(/-\d+\.[A-Za-z0-9_-]+\.webp$/);
          vues += 1;
        }
      }
    }
    expect(vues).toBeGreaterThan(0);
  });

  it('SC-02d — sur le site de démo servi par le worker de test, aucune page ne cite l’original et chaque image n’est proposée que par ses variantes WebP', async () => {
    let vues = 0;

    for (const chemin of ['/', '/tarifs', '/contact']) {
      const reponse = await exports.default.fetch(new Request(`https://example.com${chemin}`));
      const corps = await reponse.text();

      expect(reponse.status, chemin).toBe(200);
      expect(corps, chemin).not.toMatch(/media-fixture-(hero|equipe)\.[A-Za-z0-9_-]+\.png/);
      for (const img of await images(corps)) {
        const adresses = [img.get('src') ?? '', ...lireSrcset(img.get('srcset')).map((c) => c.adresse)];
        for (const adresse of adresses) {
          expect(adresse, `${chemin} : ${adresse}`).toMatch(/media-fixture-(hero|equipe)-\d+\.[A-Za-z0-9_-]+\.webp$/);
          vues += 1;
        }
      }
    }
    expect(vues).toBeGreaterThan(0);
  });
});
