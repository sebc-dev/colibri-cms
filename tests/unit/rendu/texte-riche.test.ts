/**
 * Ticket 05 — Le texte riche dans la page composée
 * (openspec/changes/011-apercu-et-publication/tickets/05-*.md ; ADR-0024).
 * `composerPage` est pure : le texte riche y entre analysé en arbre
 * (`document`), chaque lien revérifié ; un lien refusé devient du texte.
 */
import { describe, it, expect } from 'vitest';
import { composerPage, type EntreeComposition } from '../../../src/core/rendu/page.ts';
import type { NoeudDocument } from '../../../src/core/pages/texte-riche.ts';
import { analyserMarkdownRestreint, serialiserMarkdownRestreint } from '../../../src/core/pages/texte-riche.ts';
import type { ReglagesDeclares } from '../../../src/core/reglages/declaration.ts';

const REGLAGES: ReglagesDeclares = { coordonnees: [], reseaux: [], mention: '' };

function entree(contenu: string, surcharge: Partial<EntreeComposition> = {}): EntreeComposition {
  return {
    slug: 'accueil',
    pages: [{ slug: 'accueil', titre: 'Accueil' }],
    page: {
      titre: 'Accueil',
      emplacements: [{ id: 'presentation', nature: 'texte-riche', rang: 0, contenu }],
    },
    reglages: REGLAGES,
    ...surcharge,
  };
}

function documentDe(composee: ReturnType<typeof composerPage>): NoeudDocument {
  const emplacement = composee.emplacements.at(0);
  if (emplacement?.nature !== 'texte-riche') {
    throw new Error('emplacement de texte riche sans document');
  }
  return emplacement.document;
}

function textes(noeud: NoeudDocument): NoeudDocument[] {
  if (noeud.type === 'text') return [noeud];
  return (noeud.content ?? []).flatMap(textes);
}

function liensDe(noeud: NoeudDocument): string[] {
  return textes(noeud).flatMap((t) =>
    (t.marks ?? []).filter((m) => m.type === 'link').map((m) => String(m.attrs?.href)),
  );
}

describe('composerPage — texte riche', () => {
  it('SC-05a — le texte de l’emplacement figure dans la page composée, dans l’ordre', () => {
    const composee = composerPage(entree('Bonjour **toi**'));

    expect(composee.emplacements).toHaveLength(1);
    expect(textes(documentDe(composee)).map((t) => t.text).join('')).toBe('Bonjour toi');
  });

  it('SC-05a — le texte publié l’emporte sur le texte déclaré', () => {
    const publie = new Map([['presentation', { nature: 'texte-riche' as const, markdown: 'Publié' }]]);

    const composee = composerPage(entree('Déclaré', { publie }));

    expect(textes(documentDe(composee)).map((t) => t.text).join('')).toBe('Publié');
  });

  it('SC-05b — titre, gras, italique et liste à puces sont portés par l’arbre', () => {
    const composee = composerPage(
      entree('## Titre\n\nUn **gras** et _italique_.\n\n- une\n- deux'),
    );
    const doc = documentDe(composee);

    expect(doc.content?.map((n) => n.type)).toEqual(['heading', 'paragraph', 'bulletList']);
    const marques = textes(doc).flatMap((t) => (t.marks ?? []).map((m) => m.type));
    expect(marques).toContain('bold');
    expect(marques).toContain('italic');
    expect(doc.content?.[2]?.content).toHaveLength(2);
  });

  it('SC-05c — https, mailto et relatif restent des liens', () => {
    const composee = composerPage(
      entree('[a](https://example.org/a) [b](mailto:x@example.org) [c](/contact)'),
    );

    expect(liensDe(documentDe(composee))).toEqual([
      'https://example.org/a',
      'mailto:x@example.org',
      '/contact',
    ]);
  });

  it('SC-05c — javascript: et data: ne sont plus des liens : le texte seul reste', () => {
    const composee = composerPage(
      entree('[piège](javascript:void0) et [donnée](data:text/html;base64,AAAA)'),
    );
    const doc = documentDe(composee);

    expect(liensDe(doc)).toEqual([]);
    const texte = textes(doc).map((t) => t.text).join('');
    expect(texte).toBe('piège et donnée');
  });

  it('SC-05c — un lien refusé injecté par un brouillon voulu est revérifié', () => {
    const brouillon = new Map([
      ['presentation', { nature: 'texte-riche' as const, markdown: '[x](javascript:void0)' }],
    ]);

    const composee = composerPage(entree('', { brouillon }));

    const doc = documentDe(composee);
    expect(liensDe(doc)).toEqual([]);
    expect(textes(doc).map((t) => t.text).join('')).toBe('x');
  });

  it('SC-05d — du balisage écrit reste du texte dans l’arbre, aucun nœud de balise', () => {
    const composee = composerPage(entree('<script>alert(1)</script> <img src=x onerror=alert(1)>'));
    const doc = documentDe(composee);

    expect(textes(doc).map((t) => t.text).join('')).toContain('<script>alert(1)</script>');
    expect(JSON.stringify(doc)).not.toMatch(/"type":"(script|img|html)"/);
  });

  it('SC-05a — un texte aux soulignés multiples paraît tel quel, sans italique parasite', () => {
    // Un seul antislash réel avant chaque souligné : la forme qu'écrit la
    // sérialisation du texte riche.
    const composee = composerPage(
      entree('Instagram : @patisserie\\_de\\_marie et jean\\_dupont\\_paris@exemple.fr'),
    );
    const noeuds = textes(documentDe(composee));

    expect(noeuds.map((t) => t.text).join('')).toBe(
      'Instagram : @patisserie_de_marie et jean_dupont_paris@exemple.fr',
    );
    expect(noeuds.flatMap((t) => t.marks ?? [])).toEqual([]);
  });
});

describe('Markdown restreint — aller-retour d’un délimiteur écrit dans le texte', () => {
  /** Sérialise un paragraphe d'un seul nœud, l'analyse, et rend le contenu du paragraphe relu. */
  function relu(noeud: NoeudDocument): readonly NoeudDocument[] | undefined {
    const markdown = serialiserMarkdownRestreint({
      type: 'doc',
      content: [{ type: 'paragraph', content: [noeud] }],
    });
    return analyserMarkdownRestreint(markdown).content?.[0]?.content;
  }

  it('SC-05b — une marque dont le texte porte son propre délimiteur reste intacte', () => {
    const gras: NoeudDocument = { type: 'text', text: 'offre*', marks: [{ type: 'bold' }] };
    const italique: NoeudDocument = { type: 'text', text: 'mon_mot', marks: [{ type: 'italic' }] };
    const sansMarque: NoeudDocument = { type: 'text', text: '@patisserie_de_marie' };

    expect(relu(gras)).toStrictEqual([gras]);
    expect(relu(italique)).toStrictEqual([italique]);
    expect(relu(sansMarque)).toStrictEqual([sansMarque]);
  });
});
