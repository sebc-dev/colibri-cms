/**
 * Change 011, ticket 11 — aucun terme de développeur sur l'écran Publier
 * (FR-117), images comprises. Oracle partiel : la relecture reste humaine.
 */
import { it, expect } from 'vitest';
import publier from '../../src/pages/admin/publier.astro?raw';
import textes from '../../src/admin/textes.ts?raw';

const TERMES_DEVELOPPEUR = [
  'commit',
  'branche',
  'build',
  'déploiement',
  'déployer',
  'repository',
  'endpoint',
  'webhook',
  'backend',
  'framework',
  'json',
  'sha',
  'blob',
  'octets',
  'base de données',
  'token',
  'api',
  'dépôt',
  'github',
  'push',
  'serveur',
  '404',
  '422',
];

function texteDeLEcran(): string {
  const lignes = textes
    .split('\n')
    .filter(
      (ligne, i, toutes) =>
        ligne.includes('PUBLIER') ||
        ligne.includes('TEXTE_IMAGES_EFFACEES_EXPLICATION') ||
        (toutes[i - 1] ?? '').includes('TEXTE_IMAGES_EFFACEES_EXPLICATION'),
    );
  return lignes.join('\n').toLowerCase();
}

function gabaritVisible(): string {
  // Le balisage sous le frontmatter, sans les attributs ni les expressions.
  const corps = publier.split('\n---\n').slice(1).join('\n');
  let texte = '';
  let profondeur = 0;
  let dansBalise = false;
  for (const caractere of corps) {
    if (caractere === '{') profondeur += 1;
    else if (caractere === '}') profondeur = Math.max(0, profondeur - 1);
    else if (caractere === '<') dansBalise = true;
    else if (caractere === '>') dansBalise = false;
    else if (profondeur === 0 && !dansBalise) texte += caractere;
  }
  return texte.toLowerCase();
}

function contientLeMot(texte: string, mot: string): boolean {
  return texte.split(/[^\p{L}\p{N}]+/u).includes(mot) || (mot.includes(' ') && texte.includes(mot));
}

it("SC-11f — les textes des deux listes d'images ne contiennent aucun terme de développeur", () => {
  const visibles = texteDeLEcran();
  expect(visibles).toContain('images dont la description change');
  expect(visibles).toContain('images qui seront définitivement effacées');
  expect(visibles).toContain('ne pourront pas être récupérées');
  for (const terme of TERMES_DEVELOPPEUR) {
    expect(contientLeMot(visibles, terme), terme).toBe(false);
  }
});

it("SC-11f — le balisage de l'écran Publier n'écrit directement aucun terme de développeur", () => {
  const visible = gabaritVisible();
  for (const terme of TERMES_DEVELOPPEUR) {
    expect(contientLeMot(visible, terme), terme).toBe(false);
  }
});

it("SC-11e — l'écran Publier n'injecte aucun balisage brut (pas de set:html)", () => {
  expect(publier).not.toContain('set:html');
  expect(publier).not.toContain('innerHTML');
});

it("SC-11f — les listes d'images sont absentes quand elles sont vides, et l'écran vide exige aussi aucune image", () => {
  expect(publier).toMatch(/imagesRedecrites\.length > 0 &&/);
  expect(publier).toMatch(/imagesEffacees\.length > 0 &&/);
});
