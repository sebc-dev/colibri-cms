/**
 * Ticket 02 — La liste des pages
 * (openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md).
 *
 * SC-02b (l'état vide) se vérifie sans requête, à deux niveaux :
 *  - le modèle pur (`trierPagesDeclarees`, `src/core/pages/declaration.ts`,
 *    ADR-0012) rend un tableau vide quand aucun `page.json` n'est déclaré —
 *    c'est ce vide qui, dans `src/pages/admin/mes-pages.astro`, fait basculer
 *    le rendu vers le message d'état vide plutôt que vers la liste ;
 *  - la source de la route elle-même, lue en texte (`?raw`, comme
 *    `gabarits-admin.test.ts`), porte bien ce message et n'y adjoint aucune
 *    balise de création de page (`<form>`, `<button>`, `<input>`).
 *
 * Ce fichier ne sème et ne retire aucun `content/pages/<slug>/page.json` réel :
 * il compose ses propres fixtures brutes en mémoire pour nourrir
 * `trierPagesDeclarees`, la seule fonction que ce ticket confie à `core`
 * (I2 — zéro dépendance framework ni plateforme, testable sans D1 ni
 * Worker).
 */
import { describe, it, expect } from 'vitest';
import { trierPagesDeclarees, type FichierDeclarationBrut } from '../../src/core/pages/declaration.ts';

const TERMES_DEVELOPPEUR = [
  'commit',
  'branche',
  'build',
  'déploiement',
  'déployer',
  'repository',
  'dépôt git',
  'endpoint',
  'webhook',
  'backend',
  'front-end',
  'framework',
];

describe('SC-02b — une instance sans aucune page déclarée', () => {
  it('SC-02b — trierPagesDeclarees rend un tableau vide quand aucun page.json n’est déclaré', () => {
    const aucunFichier: FichierDeclarationBrut[] = [];

    const pages = trierPagesDeclarees(aucunFichier);

    expect(pages).toEqual([]);
  });

  it('SC-02b — la route affiche le message d’état vide, sans aucun geste de création, quand la liste est vide', async () => {
    const source = (await import('../../src/pages/admin/mes-pages.astro?raw')).default;

    // La branche vide de la route (pages.length === 0) doit exister — pas un
    // simple tableau vide silencieux — et porter, dans le gabarit HTML sous
    // `<Gabarit>`, un message dédié à l'attention de l'éditrice.
    const template = source.slice(source.indexOf('---', source.indexOf('---') + 3) + 3);
    expect(source).toMatch(/pages\.length\s*===\s*0/);
    const messageEtatVide = template.match(/<p>([^<]*)<\/p>/i)?.[1] ?? '';
    expect(messageEtatVide.toLowerCase(), 'aucun message d’état vide trouvé dans le gabarit rendu').toMatch(
      /aucune page|rien à (modifier|éditer)/,
    );

    // Nulle part dans le gabarit rendu, y compris dans cette branche, un
    // geste de création de page n'est offert (FR-024/025, SC-02b/SC-02c).
    expect(template).not.toMatch(/<form[\s>]/i);
    expect(template).not.toMatch(/<button[\s>]/i);
    expect(template).not.toMatch(/<input[\s>]/i);

    // Aucun terme de développeur dans ce message précisément (le reste du
    // fichier, hors gabarit rendu, n'est jamais lu par l'éditrice : c'est un
    // commentaire décisionnel d'implémentation, pas un texte visible).
    for (const terme of TERMES_DEVELOPPEUR) {
      expect(messageEtatVide.toLowerCase(), `le message d’état vide ne devrait pas contenir « ${terme} »`).not.toContain(
        terme,
      );
    }
  });
});
