/**
 * Ticket 06 — Les pages publiques présentent leurs images
 * (openspec/changes/011-apercu-et-publication/tickets/06-*.md ; ADR-0024).
 *
 * Le site de démo (`content/` et `medias/`, intouchés) est servi par le
 * worker de test ; les composants et la feuille de style sont lus tels
 * qu'écrits pour ce qui ne se voit pas sur la démo (texte de remplacement
 * vide, bande sans script).
 */
import { exports } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';
import image from '../../src/render/Image.astro?raw';
import galerie from '../../src/render/Galerie.astro?raw';
import carrousel from '../../src/render/Carrousel.astro?raw';

interface ElementRencontre {
  readonly tagName: string;
  readonly attributes: Iterable<[string, string]>;
}
interface Reecrivain {
  on(selecteur: string, gestionnaires: { element?(element: ElementRencontre): void }): Reecrivain;
  transform(reponse: Response): Response;
}
declare const HTMLRewriter: new () => Reecrivain;

function decoder(brut: string): string {
  const entites: Readonly<Record<string, string>> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
  };
  return brut.replace(/&(?:lt|gt|amp|quot|#39);/g, (entite) => entites[entite] ?? entite);
}

async function relever(corps: string, selecteur: string): Promise<[string, string][][]> {
  const lus: [string, string][][] = [];
  const reponse = new HTMLRewriter()
    .on(selecteur, {
      element(element) {
        lus.push([...element.attributes]);
      },
    })
    .transform(new Response(corps));
  await reponse.text();
  return lus;
}

const RESULTAT_ECHEC = import.meta.glob<string>('/.wrangler/site-jetable-image-manquante/resultat.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const PAGE_IMAGES = import.meta.glob<string>('/.wrangler/site-jetable-images/client/index.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

async function accueil(): Promise<{ status: number; corps: string }> {
  const reponse = await exports.default.fetch(new Request('https://example.com/'));
  return { status: reponse.status, corps: await reponse.text() };
}

describe('images sur les pages publiques bâties', () => {
  it('SC-06a — « / » répond avec la page « Accueil » et le contenu de ses emplacements dans l’ordre posé', async () => {
    const { status, corps } = await accueil();

    expect(status).toBe(200);
    expect(corps).toMatch(/<title>[^<]*Accueil[^<]*<\/title>/);
    const texte = corps.indexOf('Bienvenue à la pâtisserie');
    const bouton = corps.indexOf('Demander un devis');
    const img = corps.indexOf('<img');
    expect(texte).toBeGreaterThan(-1);
    expect(bouton).toBeGreaterThan(texte);
    expect(img).toBeGreaterThan(bouton);
  });

  it('SC-06b — l’image posée paraît avec sa description en texte de remplacement et ses dimensions', async () => {
    const { corps } = await accueil();
    const balise = /<img\b[^>]*>/.exec(corps)?.[0] ?? '';

    expect(balise).toContain("alt=\"Image d'accueil du site de démonstration\"");
    expect(balise).toMatch(/width="1280"/);
    expect(balise).toMatch(/height="640"/);
    expect(balise).toMatch(/src="[^"]*media-fixture-hero[^"]*"/);
  });

  it('SC-06c — sans description, le composant écrit un texte de remplacement vide et marque l’image décorative', () => {
    expect(image).toContain('alt={image.description}');
    expect(image).toContain("role={image.description === '' ? 'presentation' : undefined}");
  });

  it('SC-06d — la galerie est une grille, le carrousel une bande à défilement et accroche, sans script', async () => {
    const { corps } = await accueil();
    const href = /<link rel="stylesheet" href="([^"]+)"/.exec(corps)?.[1] ?? '';
    const feuille = await (await exports.default.fetch(new Request(`https://example.com${href}`))).text();

    expect(galerie).toContain('class="galerie"');
    expect(carrousel).toContain('class="carrousel"');
    expect(feuille).toMatch(/\.galerie\s*\{[^}]*display:\s*grid/);
    expect(feuille).toMatch(/\.carrousel\s*\{[^}]*overflow-x:\s*scroll/);
    expect(feuille).toMatch(/\.carrousel\s*\{[^}]*scroll-snap-type:\s*x mandatory/);
    expect(carrousel).not.toMatch(/<script/i);
    expect(galerie).not.toMatch(/<script/i);
    expect(image).not.toMatch(/<script/i);
  });

  it('SC-06e — la galerie vide de la démo ne dessine rien, et une seule image paraît', async () => {
    const { corps } = await accueil();

    expect(corps).not.toContain('class="galerie"');
    expect(corps.match(/<img\b/g)?.length).toBe(1);
  });

  it('SC-06g — chaque image posée trouve ses octets : la page de démo est produite avec son image', async () => {
    const { status, corps } = await accueil();

    expect(status).toBe(200);
    expect(corps).toMatch(/<img\b[^>]*src="[^"]+"/);
  });

  it('SC-06f — la construction du site échoue en nommant l’image et la page, et ne produit aucun site', () => {
    const entrees = Object.values(RESULTAT_ECHEC);
    expect(entrees.length, 'construction absente : lancer `node scripts/batir-site-jetable.mjs`').toBe(1);
    const resultat = JSON.parse(entrees[0]) as { code: number | null; sortie: string; pagesProduites: string[] };

    expect(resultat.code).not.toBe(0);
    expect(resultat.sortie).toContain('« sans-octets »');
    expect(resultat.sortie).toContain('« accueil »');
    expect(resultat.pagesProduites, 'aucune page du site ne doit sortir de la construction').toEqual([]);
  });

  it('Sécurité (mitigation 3) — une description d’image porteuse de balisage reste du texte dans le texte de remplacement', async () => {
    const entrees = Object.values(PAGE_IMAGES);
    expect(entrees.length, 'site à images absent : lancer `node scripts/batir-site-jetable.mjs`').toBe(1);
    const corps = entrees[0];
    const piege = '"><img src=x onerror=alert(1)><script>alert(1)</script>';

    const images = await relever(corps, 'img');
    expect(images).toHaveLength(1);
    expect(await relever(corps, 'script')).toHaveLength(0);
    expect(images[0].map(([nom]) => nom)).toEqual(['src', 'width', 'height', 'alt', 'loading', 'decoding']);
    expect(decoder(new Map(images[0]).get('alt') ?? '')).toBe(piege);
    expect(corps).toContain('alt="&quot;>');
  });
});
