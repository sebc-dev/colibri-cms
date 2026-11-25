/**
 * Ticket 06 du change 020 — l'outil de livraison prépare le dépôt du client
 * depuis une version du produit. Le geste `depot` est joué pour de vrai, avec
 * git, par `scripts/batir-site-jetable.mjs` (pretest) ; il consigne dans
 * `.wrangler/depot-du-client/resultat.json` les fichiers de chaque dépôt,
 * l'état de la branche des images et l'issue d'une construction depuis chaque
 * dépôt préparé. Le test juge ce résultat.
 */
import { describe, it, expect } from 'vitest';
import { identiteDeLaFiche } from '../../src/platform/instance/depot-du-client.ts';

interface Construction {
  readonly code: number | null;
  readonly sortie: string;
  readonly pagesProduites: string[];
}
interface Etat {
  readonly fichiers: Record<string, string> | null;
  readonly images: Record<string, string> | null;
  readonly commitImages: string | null;
  readonly contenu: string | null;
  readonly entreesALaRacine: string[];
}
interface Geste {
  readonly code: number | null;
  readonly sortie: string;
}
interface Resultat {
  readonly depots: Record<string, Etat & { geste: Geste; construction: Construction }>;
  readonly rejeu: { avant: Etat; apres: Etat; geste: Geste; propre: boolean };
  readonly refus: { geste: Geste; aUnCommit: boolean; aUneBrancheMedia: boolean; entreesALaRacine: string[] };
}

const RESULTAT = import.meta.glob<string>('/.wrangler/depot-du-client/resultat.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const INSTANCE_A = import.meta.glob<string>('/.wrangler/depot-du-client/instances/a.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const INSTANCE_POSEE_A = import.meta.glob<string>('/.wrangler/depot-du-client/a/arbre/instance.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const FICHES = import.meta.glob<string>('/.wrangler/depot-du-client/a/arbre/content/medias/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
// Le produit jetable porte bien ce que le dépôt du client ne doit pas porter.
const AUTOMATISATION_DU_PRODUIT = import.meta.glob<string>('/.wrangler/depot-du-client/produit/.github/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const TRAVAIL_DU_PRODUIT = import.meta.glob<string>(
  [
    '/.wrangler/depot-du-client/produit/CLAUDE.md',
    '/.wrangler/depot-du-client/produit/docs/*.md',
    '/.wrangler/depot-du-client/produit/openspec/**/*',
    '/.wrangler/depot-du-client/produit/.claude/**/*',
  ],
  { query: '?raw', import: 'default', eager: true },
);

function lire(): Resultat {
  const valeurs = Object.values(RESULTAT);
  expect(valeurs.length, 'dépôts absents : lancer `node scripts/batir-site-jetable.mjs`').toBe(1);
  return JSON.parse(valeurs[0]) as Resultat;
}

function fichiersDe(depot: Etat): string[] {
  expect(depot.fichiers, 'le dépôt doit porter un commit').not.toBeNull();
  return Object.keys(depot.fichiers ?? {});
}

describe('préparation du dépôt du client', () => {
  it('SC-06a — sur un dépôt vide, le dépôt reçoit les fichiers de la version, le fichier d\'instance fourni et un contenu de départ', () => {
    const { depots } = lire();
    const a = depots.a;
    const fichiers = fichiersDe(a);

    expect(a.geste.code).toBe(0);
    for (const attendu of ['package.json', 'astro.config.ts', 'wrangler.jsonc', 'src/core/reglages/coordonnees.ts', 'scripts/livraison.mjs']) {
      expect(fichiers, attendu).toContain(attendu);
    }
    expect(fichiers.some((chemin) => chemin.startsWith('content/pages/') && chemin.endsWith('page.json'))).toBe(true);

    const fourni = Object.values(INSTANCE_A)[0];
    const pose = Object.values(INSTANCE_POSEE_A)[0];
    expect(fourni).toBeDefined();
    expect(pose).toBe(fourni);
    expect(JSON.parse(pose) as { domain: string }).toMatchObject({ domain: 'client-a.colibri.test' });
  });

  it('SC-06b — sur un dépôt vide, la branche des images porte chaque image que le contenu de départ désigne, et la construction aboutit', () => {
    const a = lire().depots.a;
    const fiches = Object.values(FICHES);
    expect(fiches.length, 'le contenu de départ doit désigner des images').toBeGreaterThan(0);
    const images = Object.keys(a.images ?? {});

    expect(a.commitImages).not.toBeNull();
    for (const fiche of fiches) {
      const id = identiteDeLaFiche(fiche) ?? '';
      expect(id).not.toBe('');
      expect(
        images.some((chemin) => new RegExp(`^medias/${id}\\.(png|jpe?g|webp)$`).test(chemin)),
        `image « ${id} » absente de la branche des images`,
      ).toBe(true);
    }
    expect(images).toHaveLength(fiches.length);

    expect(a.construction.code).toBe(0);
    expect(a.construction.pagesProduites.length).toBeGreaterThan(0);
  });

  it('SC-06c — le dépôt préparé ne porte aucun fichier d\'automatisation de la forge', () => {
    const { depots } = lire();
    expect(Object.keys(AUTOMATISATION_DU_PRODUIT).length, 'le produit jetable doit porter .github').toBeGreaterThan(0);

    for (const depot of Object.values(depots)) {
      expect(fichiersDe(depot).filter((chemin) => chemin.startsWith('.github/') || chemin === '.github')).toEqual([]);
      expect(depot.entreesALaRacine).not.toContain('.github');
    }
  });

  it('SC-06d — le dépôt préparé ne porte ni l\'outillage de recette ni les documents de travail de l\'intégrateur', () => {
    const { depots } = lire();
    expect(Object.keys(TRAVAIL_DU_PRODUIT).length, 'le produit jetable doit porter ces documents').toBeGreaterThan(0);

    for (const depot of Object.values(depots)) {
      const fichiers = fichiersDe(depot);
      for (const exclu of ['.claude', 'openspec', 'docs', 'recette']) {
        expect(fichiers.filter((chemin) => chemin.startsWith(`${exclu}/`)), exclu).toEqual([]);
        expect(depot.entreesALaRacine).not.toContain(exclu);
      }
      expect(fichiers).not.toContain('CLAUDE.md');
      expect(depot.entreesALaRacine).not.toContain('CLAUDE.md');
    }
  });

  it('SC-06e — rejouée avec la même version sur un dépôt dont le contenu a changé, la préparation laisse le contenu du site et la branche des images inchangés', () => {
    const { depots, rejeu } = lire();

    expect(rejeu.avant.contenu, 'le contenu doit avoir changé avant le rejeu').not.toBe(depots.a.contenu);
    expect(rejeu.avant.commitImages, 'la branche des images doit avoir changé avant le rejeu').not.toBe(depots.a.commitImages);
    expect(rejeu.geste.code).toBe(0);
    expect(rejeu.apres.contenu).toBe(rejeu.avant.contenu);
    expect(rejeu.apres.commitImages).toBe(rejeu.avant.commitImages);
    expect(rejeu.apres.images).toEqual(rejeu.avant.images);
    expect(rejeu.propre, 'le rejeu ne laisse aucune modification en attente').toBe(true);
  });

  it('SC-06f — avec un fichier d\'instance que la construction refuserait, la préparation s\'arrête en nommant le champ et le dépôt n\'est pas modifié', () => {
    const { refus } = lire();

    expect(refus.geste.code).not.toBe(0);
    expect(refus.geste.sortie).toContain('champInconnu');
    expect(refus.geste.sortie).toContain("Le dépôt n'a pas été modifié");
    expect(refus.aUnCommit).toBe(false);
    expect(refus.aUneBrancheMedia).toBe(false);
    expect(refus.entreesALaRacine).toEqual([]);
  });

  it('SC-06g — deux dépôts préparés de la même version avec deux fichiers d\'instance ne diffèrent que par le fichier d\'instance et le contenu du site', () => {
    const { depots } = lire();
    const { a, b } = depots;
    const fa = a.fichiers ?? {};
    const fb = b.fichiers ?? {};
    expect(Object.keys(fa).length).toBeGreaterThan(0);

    const chemins = new Set([...Object.keys(fa), ...Object.keys(fb)]);
    const differents = [...chemins].filter((chemin) => fa[chemin] !== fb[chemin] && !chemin.startsWith('content/'));

    expect(differents).toEqual(['instance.json']);
    expect(a.entreesALaRacine).toEqual(b.entreesALaRacine);
    expect(a.images).toEqual(b.images);
  });
});
