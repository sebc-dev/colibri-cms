/**
 * Ticket 01 — La porte close (specs/001-connexion-par-code/01-porte-close.md).
 *
 * Ce fichier couvre ce que l'écran d'accueil ne peut pas prouver par une
 * requête HTTP à ce ticket : aucune session n'existe encore, donc l'accueil
 * n'est jamais atteignable — sa vacuité de fonction (C4) et l'absence de
 * terme de développeur dans son texte (C7) se lisent dans sa source, pas
 * dans une réponse. Les imports du garde de session (C5, ADR-0007) et
 * l'absence de directive `client:*` / bloc `<style>` sous `src/admin/`
 * (C6, ADR-0006/ADR-0008) sont eux aussi des traces observables dans les
 * sources, exactement comme les ADR concernés les décrivent.
 *
 * `?raw` (Vite) charge le texte du fichier au moment du bundle : aucun accès
 * disque au moment du test, ce qui reste possible même dans le bac à sable
 * `workerd` où ce fichier s'exécute (ADR-0003) — celui-ci n'expose aucun
 * accès réel au système de fichiers du dépôt.
 */
import { it, expect } from 'vitest';

const GARDE_DE_SESSION = /import\s+[^;]*from\s+['"][^'"]*platform\/session[^'"]*['"]/;
const DIRECTIVE_CLIENT = /client:(load|idle|visible|media|only)/;
const BLOC_STYLE = /<style[\s>]/i;

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

it('src/pages/admin/index.astro importe le garde de session', async () => {
  const source = (await import('../../src/pages/admin/index.astro?raw')).default;

  expect(source).toMatch(GARDE_DE_SESSION);
});

it('src/pages/admin/connexion.astro importe le garde de session', async () => {
  const source = (await import('../../src/pages/admin/connexion.astro?raw')).default;

  expect(source).toMatch(GARDE_DE_SESSION);
});

it('l’écran d’accueil ne porte aucun lien ni aucune action', async () => {
  const source = (await import('../../src/pages/admin/index.astro?raw')).default;

  expect(source).not.toMatch(/<a[\s>]|<form[\s>]|<button[\s>]|href\s*=|onclick\s*=/i);
});

it('l’écran d’accueil ne porte aucun terme de développeur dans son texte', async () => {
  const source = (await import('../../src/pages/admin/index.astro?raw')).default.toLowerCase();

  for (const terme of TERMES_DEVELOPPEUR) {
    expect(source, `l’accueil ne devrait pas contenir « ${terme} »`).not.toContain(terme);
  }
});

it('au moins un gabarit d’administration existe, et aucun ne porte de directive client:*', async () => {
  const fichiers = import.meta.glob('/src/admin/**/*.astro', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  expect(Object.keys(fichiers).length, 'aucun gabarit .astro trouvé sous src/admin/').toBeGreaterThan(0);
  for (const [chemin, source] of Object.entries(fichiers)) {
    expect(source, `${chemin} ne devrait porter aucune directive client:*`).not.toMatch(DIRECTIVE_CLIENT);
  }
});

it('au moins un gabarit d’administration existe, et aucun ne porte de bloc <style>', async () => {
  const fichiers = import.meta.glob('/src/admin/**/*.astro', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  expect(Object.keys(fichiers).length, 'aucun gabarit .astro trouvé sous src/admin/').toBeGreaterThan(0);
  for (const [chemin, source] of Object.entries(fichiers)) {
    expect(source, `${chemin} ne devrait porter aucun bloc <style>`).not.toMatch(BLOC_STYLE);
  }
});
