/**
 * Ticket 04 — La composition d'une page publique
 * (openspec/changes/011-apercu-et-publication/tickets/04-*.md ; ADR-0024).
 * `composerPage` est pure : les fixtures sont composées en mémoire, aucun
 * `content/` n'est lu ni modifié.
 */
import { describe, it, expect } from 'vitest';
import { composerPage, type EntreeComposition } from '../../../src/core/rendu/page.ts';
import type { PageDeclaree } from '../../../src/core/pages/declaration.ts';
import type { ReglagesDeclares } from '../../../src/core/reglages/declaration.ts';

const PAGES: readonly PageDeclaree[] = [
  { slug: 'accueil', titre: 'Accueil' },
  { slug: 'tarifs', titre: 'Tarifs' },
  { slug: 'contact', titre: 'Contact' },
];

const REGLAGES: ReglagesDeclares = {
  coordonnees: [
    { id: 'tel', nature: 'telephone', nom: 'Téléphone', valeur: '01 23 45 67 89' },
    { id: 'mail', nature: 'email', valeur: 'atelier@example.org' },
    { id: 'adresse', nature: 'adresse', nom: 'Adresse', valeur: '12 rue des Tilleuls\n75000 Paris' },
  ],
  reseaux: [
    { nom: 'Instagram', lien: 'https://www.instagram.com/atelier' },
    { nom: 'Facebook', lien: 'https://www.facebook.com/atelier' },
    { nom: 'Pinterest', lien: 'https://www.pinterest.com/atelier' },
  ],
  mention: '',
};

function entree(surcharge: Partial<EntreeComposition> = {}): EntreeComposition {
  return {
    slug: 'tarifs',
    pages: PAGES,
    page: { titre: 'Tarifs', emplacements: [] },
    reglages: REGLAGES,
    ...surcharge,
  };
}

describe('composerPage — titre et navigation', () => {
  it('SC-04a — la page composée porte le titre de la page déclarée, selon la page demandée', () => {
    const tarifs = composerPage(entree());
    const contact = composerPage(
      entree({ slug: 'contact', page: { titre: 'Contact', emplacements: [] } }),
    );

    expect(tarifs.titre).toBe('Tarifs');
    expect(contact.titre).toBe('Contact');
  });

  it('SC-04b — la navigation liste toutes les pages dans l’ordre posé, chacune à son adresse, la courante marquée', () => {
    const composee = composerPage(entree({ slug: 'tarifs' }));

    expect(composee.navigation).toEqual([
      { titre: 'Accueil', adresse: '/', courante: false },
      { titre: 'Tarifs', adresse: '/tarifs', courante: true },
      { titre: 'Contact', adresse: '/contact', courante: false },
    ]);
  });

  it('SC-04b — sur chaque page, une seule entrée est marquée courante', () => {
    for (const p of PAGES) {
      const composee = composerPage(entree({ slug: p.slug, page: { titre: p.titre, emplacements: [] } }));

      expect(composee.navigation.filter((n) => n.courante).map((n) => n.titre)).toEqual([p.titre]);
      expect(composee.navigation).toHaveLength(PAGES.length);
    }
  });
});

describe('composerPage — emplacements', () => {
  it('SC-04d — un libellé contenant <, >, & et guillemets reste du texte brut, sans transformation', () => {
    const libelle = `<b>Devis</b> & "co" 'x'`;
    const composee = composerPage(
      entree({
        page: {
          titre: '<i>Tarifs</i> & "plus"',
          emplacements: [
            { id: 'b', nature: 'bouton-action', rang: 0, libelle, destination: '/contact' },
          ],
        },
      }),
    );

    expect(composee.titre).toBe('<i>Tarifs</i> & "plus"');
    expect(composee.emplacements).toEqual([
      { id: 'b', nature: 'bouton-action', libelle, adresse: '/contact' },
    ]);
  });

  it('SC-04e — un bouton « Demander un devis » vers /contact garde son libellé et son adresse', () => {
    const composee = composerPage(
      entree({
        page: {
          titre: 'Tarifs',
          emplacements: [
            { id: 'b', nature: 'bouton-action', rang: 0, libelle: 'Demander un devis', destination: '/contact' },
          ],
        },
      }),
    );

    expect(composee.emplacements).toEqual([
      { id: 'b', nature: 'bouton-action', libelle: 'Demander un devis', adresse: '/contact' },
    ]);
  });

  it('SC-04e — une destination refusée devient du texte, jamais un lien', () => {
    const composee = composerPage(
      entree({
        page: {
          titre: 'Tarifs',
          emplacements: [
            { id: 'b', nature: 'bouton-action', rang: 0, libelle: 'Piège', destination: 'javascript:alert(1)' },
          ],
        },
      }),
    );

    expect(composee.emplacements[0]).toMatchObject({ libelle: 'Piège', adresse: null });
  });

  it('SC-04f — un lien de vidéo reconnu garde son adresse ; un hébergeur inconnu devient du texte', () => {
    const composee = composerPage(
      entree({
        page: {
          titre: 'Contact',
          emplacements: [
            { id: 'v1', nature: 'lien-video', rang: 0, lien: 'https://vimeo.com/76979871' },
            { id: 'v2', nature: 'lien-video', rang: 1, lien: 'https://exemple.org/video' },
          ],
        },
      }),
    );

    expect(composee.emplacements).toEqual([
      { id: 'v1', nature: 'lien-video', lien: 'https://vimeo.com/76979871', adresse: 'https://vimeo.com/76979871' },
      { id: 'v2', nature: 'lien-video', lien: 'https://exemple.org/video', adresse: null },
    ]);
  });

  it('SC-04e — le contenu publié l’emporte sur la déclaration, le brouillon voulu sur le publié', () => {
    const emplacements = [
      { id: 'b', nature: 'bouton-action', rang: 0, libelle: 'Déclaré', destination: '/' },
    ] as const;
    const publie = new Map([
      ['b', { nature: 'bouton-action' as const, libelle: 'Publié', destination: '/tarifs' }],
    ]);
    const brouillon = new Map([
      ['b', { nature: 'bouton-action' as const, libelle: 'Brouillon', destination: '/contact' }],
    ]);

    const sansRien = composerPage(entree({ page: { titre: 'T', emplacements } }));
    const avecPublie = composerPage(entree({ page: { titre: 'T', emplacements }, publie }));
    const avecBrouillon = composerPage(entree({ page: { titre: 'T', emplacements }, publie, brouillon }));

    expect(sansRien.emplacements[0]).toMatchObject({ libelle: 'Déclaré', adresse: '/' });
    expect(avecPublie.emplacements[0]).toMatchObject({ libelle: 'Publié', adresse: '/tarifs' });
    expect(avecBrouillon.emplacements[0]).toMatchObject({ libelle: 'Brouillon', adresse: '/contact' });
  });
});

describe('composerPage — pied de page', () => {
  it('SC-04g — les coordonnées suivent l’ordre déclaré : téléphone en lien d’appel, e-mail en lien de message, adresse sur ses lignes', () => {
    const { pied } = composerPage(entree());

    expect(pied.coordonnees.map((c) => c.nature)).toEqual(['telephone', 'email', 'adresse']);
    expect(pied.coordonnees[0]).toMatchObject({ nom: 'Téléphone', href: 'tel:0123456789' });
    expect(pied.coordonnees[1]).toMatchObject({ href: 'mailto:atelier@example.org' });
    expect(pied.coordonnees[1]?.nom).toBeUndefined();
    expect(pied.coordonnees[2]?.lignes).toEqual(['12 rue des Tilleuls', '75000 Paris']);
    expect(pied.coordonnees[2]?.href).toBeUndefined();
  });

  it('SC-04h — trois réseaux publiés : trois liens, dans leur ordre, chacun sous son nom', () => {
    const { pied } = composerPage(entree());

    expect(pied.reseaux).toEqual([
      { nom: 'Instagram', adresse: 'https://www.instagram.com/atelier' },
      { nom: 'Facebook', adresse: 'https://www.facebook.com/atelier' },
      { nom: 'Pinterest', adresse: 'https://www.pinterest.com/atelier' },
    ]);
  });

  it('SC-04h — le pied est le même sur chaque page', () => {
    const piedS = PAGES.map((p) => composerPage(entree({ slug: p.slug, page: { titre: p.titre, emplacements: [] } })).pied);

    expect(piedS[1]).toEqual(piedS[0]);
    expect(piedS[2]).toEqual(piedS[0]);
  });

  it('SC-04h — un réseau dont le lien n’est pas en https reste du texte', () => {
    const { pied } = composerPage(
      entree({ reglages: { ...REGLAGES, reseaux: [{ nom: 'Piège', lien: 'javascript:alert(1)' }] } }),
    );

    expect(pied.reseaux).toEqual([{ nom: 'Piège', adresse: null }]);
  });

  it('SC-04i — sans réseau social publié, le pied ne porte aucun réseau', () => {
    const { pied } = composerPage(entree({ reglages: { ...REGLAGES, reseaux: [] } }));

    expect(pied.reseaux).toEqual([]);
    expect(pied.coordonnees).toHaveLength(3);
  });
});
