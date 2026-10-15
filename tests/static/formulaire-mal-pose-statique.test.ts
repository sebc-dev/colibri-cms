/**
 * Ticket 04 du change 012 — la reconstruction refuse un formulaire introuvable
 * ou sans moyen de répondre (ADR-0027). Les constructions échouées sont
 * consignées par `scripts/batir-site-jetable.mjs` dans
 * `.wrangler/site-jetable-formulaire-*\/resultat.json` ; le site réussi est
 * le site jetable, dont « Contact » pose `devis-piege` (e-mail obligatoire).
 */
import { describe, it, expect } from 'vitest';

interface Resultat {
  readonly code: number | null;
  readonly sortie: string;
  readonly pagesProduites: string[];
}

const INCONNU = import.meta.glob<string>('/.wrangler/site-jetable-formulaire-inconnu/resultat.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const SANS_COORDONNEE = import.meta.glob<string>('/.wrangler/site-jetable-formulaire-sans-coordonnee/resultat.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const CONTACT = import.meta.glob<string>('/.wrangler/site-jetable/client/contact/index.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function lire(entrees: Record<string, string>): Resultat {
  const valeurs = Object.values(entrees);
  expect(valeurs.length, 'construction absente : lancer `node scripts/batir-site-jetable.mjs`').toBe(1);
  return JSON.parse(valeurs[0]) as Resultat;
}

describe('reconstruction avec un formulaire mal posé', () => {
  it('SC-04a — la construction échoue en nommant la page et le formulaire introuvable, et ne produit aucun site', () => {
    const resultat = lire(INCONNU);

    expect(resultat.code).not.toBe(0);
    expect(resultat.sortie).toContain('« accueil »');
    expect(resultat.sortie).toContain('« devis-fantome »');
    expect(resultat.pagesProduites, 'aucune page ne doit sortir de la construction').toEqual([]);
  });

  it('SC-04b — la construction échoue en nommant la page et le formulaire sans e-mail ni téléphone obligatoire, et ne produit aucun site', () => {
    const resultat = lire(SANS_COORDONNEE);

    expect(resultat.code).not.toBe(0);
    expect(resultat.sortie).toContain('« accueil »');
    expect(resultat.sortie).toContain('« devis-muet »');
    expect(resultat.pagesProduites, 'aucune page ne doit sortir de la construction').toEqual([]);
  });

  it('SC-04c — avec des formulaires publiés et joignables, le site est produit et la page présente son formulaire', () => {
    const corps = Object.values(CONTACT)[0] ?? '';

    expect(corps, 'site jetable absent : lancer `node scripts/batir-site-jetable.mjs`').not.toBe('');
    expect(corps).toContain('<section class="formulaire">');
  });
});
