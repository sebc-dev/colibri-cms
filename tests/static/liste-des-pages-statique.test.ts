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

// --- SC-02e — l'écran de liste est assemblé dans le cadre de l'administration (dernier
// critère du ticket, sans id `SC-02x` propre dans le fichier source du ticket ; numéroté
// par cohérence avec SC-02a/b/c/d, cf. brief du ticket). Le cadre (barre latérale + menu,
// ticket 01) n'est jamais rendu côté serveur — c'est un îlot Svelte monté uniquement par un
// `<script>` de module (ADR-0006), donc sa présence effective à l'écran ne s'observe pas par
// une requête HTTP sans exécuter de JavaScript (voir SC-02e dans
// tests/integration/liste-des-pages.test.ts, qui prouve ce qui EST observable ainsi : le
// contenu déposé, inerte, prêt au transport). Ce qui reste à prouver ici, sans requête, c'est
// que la chaîne d'assemblage relie effectivement les deux écrans : la route cible bien le
// point de montage et le modèle de contenu par les mêmes identifiants que ceux que
// `monterCadreAvecContenu` attend, que cette fonction monte bien le composant `Cadre` (pas un
// composant nu) en lui confiant ce contenu comme enfant, et que `Cadre` marque « Mes pages »
// active et rend ce contenu à l'intérieur de sa propre mise en page (sous sa barre latérale
// et son menu, jamais à leur place).

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

describe('SC-02e — l’écran de liste est assemblé dans le cadre de l’administration', () => {
  it('SC-02e — la route cible le même point de montage et le même modèle de contenu que ceux attendus par monterCadreAvecContenu, sans directive client:*', async () => {
    const source = (await import('../../src/pages/admin/mes-pages.astro?raw')).default;

    expect(source).toMatch(/id=["']ilot-cadre["']/);
    expect(source).toMatch(/id=["']contenu-mes-pages["']/);
    expect(source).toMatch(
      /monterCadreAvecContenu\(\s*['"]ilot-cadre['"]\s*,\s*['"]contenu-mes-pages['"]\s*\)/,
    );
    expect(source).not.toMatch(/client:(load|idle|visible|media|only)/);
  });

  it('SC-02e — monterCadreAvecContenu monte le composant Cadre (barre latérale + menu) en lui confiant le contenu transporté comme enfant', async () => {
    const source = (await import('../../src/admin/ilots-svelte-5/monter.ts?raw')).default;

    const corpsFonction = source.slice(source.indexOf('export function monterCadreAvecContenu'));
    expect(
      corpsFonction,
      'monterCadreAvecContenu devrait monter le composant Cadre en lui passant le contenu transporté comme prop children',
    ).toMatch(/mount\(\s*Cadre\s*,\s*\{[\s\S]*children\s*:\s*contenu[\s\S]*\}\s*\)/);
  });

  it('SC-02e — le cadre marque « Mes pages » active et rend le contenu transporté à l’intérieur de sa mise en page, sous la barre latérale et le menu', async () => {
    const source = (await import('../../src/admin/ilots-svelte-5/Cadre.svelte?raw')).default;

    expect(
      source,
      'la rubrique « mes-pages » devrait être marquée active dans le menu du cadre',
    ).toMatch(/id:\s*['"]mes-pages['"][^}]*active:\s*true/s);

    const indexMenu = source.indexOf('<nav>');
    const indexRenduDuContenu = source.indexOf('{@render children');
    expect(indexMenu, 'le menu du cadre (<nav>) devrait exister').toBeGreaterThanOrEqual(0);
    expect(
      indexRenduDuContenu,
      'le contenu transporté devrait se rendre après (donc à côté de, jamais à la place de) le menu du cadre',
    ).toBeGreaterThan(indexMenu);
  });
});
