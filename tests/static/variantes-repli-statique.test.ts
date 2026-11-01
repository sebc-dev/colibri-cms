/**
 * Ticket 03 du change 014-site-public-rapide — Une image impossible à réduire
 * paraît quand même, vue sur le site bâti.
 *
 * Le site jetable `site-jetable-image-irreductible` (fixture versionnée, bâti
 * par `scripts/batir-site-jetable.mjs`, sharp pour de vrai) pose sur
 * l'accueil trois images admises à l'ingestion que la construction ne sait
 * pas réduire : un PNG au corps tronqué, un WebP animé, un PNG dont l'en-tête
 * annonce plus de pixels que la limite de décodage. La construction doit
 * aboutir, présenter chaque image telle que déposée et la nommer dans son
 * compte rendu.
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

interface Resultat {
  readonly code: number | null;
  readonly sortie: string;
  readonly pagesProduites: readonly string[];
}

const RESULTAT = import.meta.glob<string>('/.wrangler/site-jetable-image-irreductible/resultat.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const PAGES = import.meta.glob<string>('/.wrangler/site-jetable-image-irreductible/client/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const FICHIERS_BATIS = import.meta.glob<string>('/.wrangler/site-jetable-image-irreductible/client/_astro/*.{png,jpg,jpeg,webp}', {
  query: '?inline',
  import: 'default',
  eager: true,
});
const ORIGINAUX = import.meta.glob<string>('/tests/static/fixtures/site-jetable-image-irreductible/medias/*', {
  query: '?inline',
  import: 'default',
  eager: true,
});

const RACINE_SITE = '/.wrangler/site-jetable-image-irreductible/client';
const RACINE_ORIGINAUX = '/tests/static/fixtures/site-jetable-image-irreductible/medias';

/** Les trois images irréductibles : identité, fichier déposé, dimensions déclarées, description, extension. */
const IMAGES = [
  { id: 'tronque', depose: 'tronque.png', largeur: 240, hauteur: 160, alt: 'Photo coupée en route', ext: 'png' },
  { id: 'anime', depose: 'anime.webp', largeur: 120, hauteur: 80, alt: 'Vignette animée', ext: 'webp' },
  { id: 'enorme', depose: 'enorme.png', largeur: 20000, hauteur: 20000, alt: 'Très grande affiche', ext: 'png' },
] as const;

function resultat(): Resultat {
  const brut = RESULTAT['/.wrangler/site-jetable-image-irreductible/resultat.json'];
  expect(brut, 'résultat absent : lancer `node scripts/batir-site-jetable.mjs`').toBeTypeOf('string');
  return JSON.parse(brut) as Resultat;
}

function accueil(): string {
  const corps = PAGES[`${RACINE_SITE}/index.html`];
  expect(
    corps,
    `page d'accueil absente (construction : code ${String(resultat().code)}) :\n${resultat().sortie.slice(-600)}`,
  ).toBeTypeOf('string');
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

function octetsDe(donnees: string | undefined, quoi: string): Uint8Array {
  expect(donnees, `${quoi} absent`).toBeTypeOf('string');
  const base64 = (donnees ?? '').slice((donnees ?? '').indexOf(',') + 1);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function enTexte(octets: Uint8Array): string {
  return Array.from(octets, (o) => String.fromCharCode(o)).join('');
}

describe('une image impossible à réduire paraît quand même', () => {
  it('SC-03a — la construction aboutit (code 0) et produit la page d’accueil', () => {
    const { code, pagesProduites } = resultat();

    expect(code).toBe(0);
    expect(pagesProduites).toContain('index.html');
  });

  it('SC-03a — le compte rendu nomme chaque image irréductible, sur une ligne « servie telle que déposée » chacune', () => {
    const lignes = resultat()
      .sortie.split('\n')
      .filter((ligne) => ligne.includes('[variantes]'));

    for (const { id } of IMAGES) {
      const siennes = lignes.filter((ligne) => ligne.includes(` ${id} `));
      expect(siennes, `lignes nommant « ${id} »`).toHaveLength(1);
      expect(siennes[0]).toMatch(new RegExp(`^\\[variantes\\] ${id} servie telle que déposée : \\S`));
    }
    expect(lignes, 'une ligne par image irréductible, pas d’autre').toHaveLength(IMAGES.length);
  });

  it('SC-03a — la page présente chaque image avec sa description et ses dimensions, sans liste de variantes', async () => {
    const lues = await images(accueil());

    expect(lues).toHaveLength(IMAGES.length);
    IMAGES.forEach((attendue, rang) => {
      const img = lues[rang];
      expect(img.get('alt')).toBe(attendue.alt);
      expect(img.get('width')).toBe(String(attendue.largeur));
      expect(img.get('height')).toBe(String(attendue.hauteur));
      const srcset = img.get('srcset');
      if (srcset !== undefined) expect(srcset.split(','), `${attendue.id} : variante unique`).toHaveLength(1);
    });
  });

  it('SC-03a — l’adresse de chaque image est la copie de l’original, nommée d’après l’image, à l’extension d’origine', async () => {
    const lues = await images(accueil());

    for (const [rang, attendue] of IMAGES.entries()) {
      const adresse = lues[rang].get('src') ?? '';
      expect(adresse).toMatch(new RegExp(`/${attendue.id}(-${String(attendue.largeur)})?\\.[A-Za-z0-9_-]+\\.${attendue.ext}$`));
      const copie = octetsDe(FICHIERS_BATIS[`${RACINE_SITE}${adresse}`], `fichier ${adresse}`);
      const original = octetsDe(ORIGINAUX[`${RACINE_ORIGINAUX}/${attendue.depose}`], attendue.depose);
      expect(Array.from(copie), `${adresse} : octets de ${attendue.depose}`).toEqual(Array.from(original));
    }
  });

  it('SC-03a — le WebP animé garde son animation dans le site bâti', async () => {
    const lues = await images(accueil());
    const adresse = lues[1].get('src') ?? '';

    const copie = octetsDe(FICHIERS_BATIS[`${RACINE_SITE}${adresse}`], `fichier ${adresse}`);

    expect(enTexte(copie.slice(0, 64))).toContain('ANIM');
  });

  it('SC-03a — aucune adresse de variante réduite n’est annoncée pour ces images', async () => {
    const corps = accueil();

    expect(corps).not.toMatch(/-(360|720|1080)\.[A-Za-z0-9_-]+\.webp/);
    const lues = await images(corps);
    expect(lues.map((img) => img.get('src'))).toHaveLength(IMAGES.length);
  });
});
