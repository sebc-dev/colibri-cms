/**
 * Ticket 04 — Les pages publiques bâties à la construction
 * (openspec/changes/011-apercu-et-publication/tickets/04-*.md).
 *
 * Couture : le site bâti par `npm test` (pretest = build) est servi par le
 * worker de test, ses fichiers statiques par la liaison ASSETS. On lit donc
 * le document réellement publié, à partir du contenu de démo (`content/`),
 * sans rien y modifier. Le contenu de démo ne porte ni <, >, & ni guillemets
 * dans les libellés de bouton ; l'échappement (SC-04d) se prouve sur
 * l'apostrophe de « Téléphone de l'atelier » et sur la source des gabarits,
 * qui n'écrivent que par interpolation.
 */
import { exports } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';

async function lire(chemin: string): Promise<{ status: number; corps: string }> {
  const reponse = await exports.default.fetch(new Request(`https://example.com${chemin}`));
  return { status: reponse.status, corps: await reponse.text() };
}

function liensDe(corps: string, bloc: string): { href: string; texte: string }[] {
  const debut = corps.indexOf(bloc);
  if (debut < 0) return [];
  const fin = corps.indexOf('</ul>', debut);
  return [...corps.slice(debut, fin).matchAll(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((m) => ({
    href: m[1],
    texte: m[2],
  }));
}

describe('pages publiques bâties', () => {
  it('SC-04a — /tarifs puis /contact renvoient chacune sa page, avec son titre et son contenu', async () => {
    const tarifs = await lire('/tarifs');
    const contact = await lire('/contact');

    expect(tarifs.status).toBe(200);
    expect(tarifs.corps).toContain('<title>Tarifs</title>');
    expect(tarifs.corps).toContain('<h1>Tarifs</h1>');
    expect(tarifs.corps).toContain('Demander un devis');
    expect(contact.status).toBe(200);
    expect(contact.corps).toContain('<title>Contact</title>');
    expect(contact.corps).toContain('<h1>Contact</h1>');
    expect(contact.corps).toContain('Voir la vidéo');
    expect(contact.corps).not.toContain('<h1>Tarifs</h1>');
  });

  it('SC-04b — sur toute page, la navigation liste les pages dans l’ordre posé et marque la courante', async () => {
    for (const [chemin, courante] of [['/', 'Accueil'], ['/tarifs', 'Tarifs'], ['/contact', 'Contact']] as const) {
      const { corps } = await lire(chemin);
      const nav = corps.slice(corps.indexOf('<nav'), corps.indexOf('</nav>'));

      const entrees = [...nav.matchAll(/<a href="([^"]*)"([^>]*)>([^<]*)<\/a>/g)].map((m) => ({
        adresse: m[1],
        titre: m[3],
        courante: m[2].includes('aria-current="page"'),
      }));
      expect(entrees).toEqual([
        { adresse: '/', titre: 'Accueil', courante: courante === 'Accueil' },
        { adresse: '/tarifs', titre: 'Tarifs', courante: courante === 'Tarifs' },
        { adresse: '/contact', titre: 'Contact', courante: courante === 'Contact' },
      ]);
    }
  });

  it('SC-04c — une adresse inconnue reçoit la page « introuvable » du site, sans le contenu d’une autre page', async () => {
    const { corps } = await lire('/page-qui-n-existe-pas');

    expect(corps).toContain('Cette page n\'existe pas.');
    expect(corps).toContain('<a href="/">');
    expect(corps).not.toContain('Demander un devis');
    expect(corps).not.toContain('Voir la vidéo');
    expect(corps).not.toContain('<h1>Tarifs</h1>');
  });

  it('SC-04d — le texte est écrit échappé dans le document publié', async () => {
    const { corps } = await lire('/tarifs');

    expect(corps).toContain('Téléphone de l&#39;atelier');
    expect(corps).not.toContain('Téléphone de l\'atelier');
  });

  it('SC-04d — aucun gabarit du site n’écrit du balisage brut (ni set:html ni @html)', async () => {
    const sources = await Promise.all([
      import('../../src/site/page.astro?raw'),
      import('../../src/site/PiedDePage.astro?raw'),
      import('../../src/render/BoutonAction.astro?raw'),
      import('../../src/render/LienVideo.astro?raw'),
    ]);

    for (const source of sources) {
      expect(source.default).not.toMatch(/set:html|set:text|\{@html|innerHTML/);
    }
  });

  it('SC-04e — le bouton « Demander un devis » paraît comme un lien menant à /contact', async () => {
    const { corps } = await lire('/tarifs');

    expect(corps).toMatch(/<a class="bouton-action" href="\/contact">Demander un devis<\/a>/);
  });

  it('SC-04f — le lien de vidéo paraît comme « Voir la vidéo » vers la vidéo, sans rien charger de l’hébergeur', async () => {
    const { corps } = await lire('/contact');

    expect(corps).toContain('<a href="https://vimeo.com/76979871" rel="noopener noreferrer">Voir la vidéo</a>');
    expect(corps).not.toMatch(/<(iframe|script|embed|object|video)\b/i);
    expect(corps).not.toMatch(/<link[^>]+href="https?:\/\//i);
  });

  it('SC-04g — le pied de page présente les coordonnées dans l’ordre déclaré, avec liens d’appel et de message', async () => {
    const { corps } = await lire('/contact');
    const pied = corps.slice(corps.indexOf('<footer'));

    const tel = pied.indexOf('href="tel:0123456789"');
    const mail = pied.indexOf('href="mailto:atelier@example.org"');
    const adresse = pied.indexOf('12 rue des Tilleuls, 75000 Paris');
    expect(tel).toBeGreaterThan(-1);
    expect(mail).toBeGreaterThan(tel);
    expect(adresse).toBeGreaterThan(mail);
    expect(pied).toContain('>01 23 45 67 89</a>');
    expect(pied).toContain('>atelier@example.org</a>');
  });

  it('SC-04h — avec trois réseaux publiés, le pied de chaque page présente les trois liens dans leur ordre', async () => {
    for (const chemin of ['/', '/tarifs', '/contact']) {
      const { corps } = await lire(chemin);

      expect(liensDe(corps, '<ul class="reseaux">')).toEqual([
        { href: 'https://www.instagram.com/atelier-exemple', texte: 'Instagram' },
        { href: 'https://www.facebook.com/atelier-exemple', texte: 'Facebook' },
        { href: 'https://www.pinterest.com/atelier-exemple', texte: 'Pinterest' },
      ]);
    }
  });

  it('SC-04i — le gabarit du pied n’écrit la section des réseaux que s’il y en a', async () => {
    const source = (await import('../../src/site/PiedDePage.astro?raw')).default;

    expect(source).toMatch(/pied\.reseaux\.length > 0 &&/);
  });
});
