/**
 * Ticket 05 — Le texte riche sur les pages publiques bâties
 * (openspec/changes/011-apercu-et-publication/tickets/05-*.md).
 *
 * - le site de démo (`content/`, intouché), servi par le worker de test ;
 * - le site jetable (`tests/static/fixtures/site-jetable/content/`), bâti par
 *   `scripts/batir-site-jetable.mjs`, qui apporte titre, gras, italique,
 *   liste, liens de toute sorte et balisage écrit comme texte.
 */
import { exports } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';

const SITE_JETABLE = import.meta.glob<string>('/.wrangler/site-jetable/client/**/index.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const RACINE_JETABLE = '/.wrangler/site-jetable/client';

function accueilJetable(): string {
  const entree = Object.entries(SITE_JETABLE).find(
    ([chemin]) => chemin === `${RACINE_JETABLE}/index.html`,
  );
  expect(entree, 'site jetable absent : lancer `node scripts/batir-site-jetable.mjs`').toBeDefined();
  return entree?.[1] ?? '';
}

describe('texte riche sur les pages publiques', () => {
  it('SC-05a — le texte de l’emplacement figure dans la réponse de la page de démo', async () => {
    const reponse = await exports.default.fetch(new Request('https://example.com/'));
    const corps = await reponse.text();

    expect(reponse.status).toBe(200);
    expect(corps).toContain('Bienvenue à la pâtisserie : des gâteaux faits maison pour tous vos événements.');
  });

  it('SC-05a — le texte du contenu jetable figure dans le document bâti', () => {
    expect(accueilJetable()).toContain('seconde puce');
  });

  it('SC-05b — titre, paragraphe (gras, italique) et liste à puces paraissent mis en forme', () => {
    const corps = accueilJetable();

    expect(corps).toMatch(/<h2[^>]*>Titre riche<\/h2>/);
    expect(corps).toMatch(/<p[^>]*>Un paragraphe avec <strong>gras<\/strong> et <em>italique<\/em> ici\.<\/p>/);
    expect(corps).toMatch(/<ul[^>]*>\s*<li[^>]*>(<p>)?première puce(<\/p>)?<\/li>\s*<li[^>]*>(<p>)?seconde puce(<\/p>)?<\/li>\s*<\/ul>/);
  });

  it('SC-05c — https, mailto et relatif paraissent comme liens, l’externe avec rel noopener noreferrer', () => {
    const corps = accueilJetable();

    expect(corps).toMatch(/<a href="https:\/\/example\.org\/a"[^>]*rel="noopener noreferrer"[^>]*>web<\/a>/);
    expect(corps).toMatch(/<a href="mailto:atelier@example\.org"[^>]*>courrier<\/a>/);
    expect(corps).toMatch(/<a href="\/contact"[^>]*>local<\/a>/);
  });

  it('SC-05c — javascript: et data: ne paraissent que par leur texte, sans lien', () => {
    const corps = accueilJetable();

    expect(corps).toContain('piege');
    expect(corps).not.toContain('javascript:');
    expect(corps).toContain('donnee');
    expect(corps).not.toMatch(/href="\s*(javascript|data):/i);
    expect(corps).not.toMatch(/<a [^>]*>(piege|donnee)<\/a>/);
  });

  it('SC-05d — script et img écrits comme texte sont affichés comme texte, aucune balise créée', () => {
    const corps = accueilJetable();

    expect(corps).toContain('&lt;script&gt;boom(5)&lt;/script&gt;');
    expect(corps).toContain('&lt;img src=y onerror=boom(6)&gt;');
    expect(corps).not.toContain('<script>boom(5)');
    expect(corps).not.toMatch(/<img[^>]*onerror/i);
  });

  it('SC-05d — un guillemet dans l’adresse d’un lien ne sort pas de l’attribut', () => {
    const corps = accueilJetable();

    // Le contenu jetable porte `[evasion](https://example.org/"onmouseover="boom7)`,
    // sans `<` ni `>` : seul l'échappement d'attribut le neutralise. Chaque
    // guillemet de l'adresse paraît en `&quot;`, l'attribut href reste entier.
    // Écrit brut, `href="…/"onmouseover="boom7"` serait lu par le navigateur
    // comme un second attribut, même sans espace avant lui.
    expect(corps).toContain(
      '<a href="https://example.org/&quot;onmouseover=&quot;boom7" rel="noopener noreferrer">evasion</a>',
    );
    expect(corps).not.toMatch(/<a\b[^>]*["\s]onmouseover=/i);
  });

  it('SC-05d — aucun gabarit de rendu du texte riche n’écrit du balisage brut', async () => {
    const sources = await Promise.all([
      import('../../src/render/markdown/TexteRiche.astro?raw'),
      import('../../src/render/markdown/Noeud.astro?raw'),
    ]);

    for (const source of sources) {
      expect(source.default).not.toMatch(/set:html|set:text|\{@html|innerHTML/);
    }
  });
});
