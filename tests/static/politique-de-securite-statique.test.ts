/**
 * Ticket 02 — La politique de sécurité sur les trois formes de réponse
 * (specs/001-connexion-par-code/02-politique-de-securite.md).
 *
 * Complément statique à `tests/integration/politique-de-securite.test.ts` :
 * deux propriétés du ticket ne se prouvent pas par une réponse HTTP.
 *
 * c5 — la forme de l'inscription du middleware (ADR-0008) : `addMiddleware`
 * doit être appelé, avec un entrypoint donné sous la forme
 * `new URL(chemin, import.meta.url)` — une chaîne relative y est résolue
 * comme un module nu et échoue à l'exécution (mesuré, ADR-0008). C'est une
 * propriété de la source de `astro.config.ts`, pas du comportement d'une
 * requête : `?raw` (Vite) en charge le texte sans exécuter la configuration.
 *
 * c6 (volet complémentaire) — `tests/static/gabarits-admin.test.ts` (ticket
 * 01) couvre déjà l'absence de bloc `<style>` sous `src/admin/**`, mais pas
 * sous `src/pages/admin/*.astro` : ce ticket étend explicitement le
 * périmètre à ces gabarits de route, sans dupliquer l'assertion déjà posée
 * sur `src/admin/**` (glob disjoint).
 */
import { it, expect } from 'vitest';

const BLOC_STYLE = /<style[\s>]/i;

it('astro.config.ts inscrit le middleware des en-têtes par le hook addMiddleware', async () => {
  const source = (await import('../../astro.config.ts?raw')).default;

  expect(source).toMatch(/addMiddleware\s*\(/);
});

it('astro.config.ts donne l’entrypoint du middleware des en-têtes sous la forme new URL(…, import.meta.url), jamais une chaîne relative', async () => {
  const source = (await import('../../astro.config.ts?raw')).default;

  // La forme qui fonctionne (ADR-0008, mesuré) : une chaîne relative nue
  // comme entrypoint est résolue comme un module nu et échoue au démarrage.
  expect(source).toMatch(/entrypoint:\s*new URL\(\s*['"][^'"]*entetes\/middleware\.ts['"]\s*,\s*import\.meta\.url\s*\)/);
});

it('aucun gabarit de route servi sous /admin/ (src/pages/admin/*.astro) ne porte de bloc <style>', async () => {
  const fichiers = import.meta.glob('/src/pages/admin/*.astro', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  expect(Object.keys(fichiers).length, 'aucun gabarit .astro trouvé sous src/pages/admin/').toBeGreaterThan(0);
  for (const [chemin, source] of Object.entries(fichiers)) {
    expect(source, `${chemin} ne devrait porter aucun bloc <style>`).not.toMatch(BLOC_STYLE);
  }
});
