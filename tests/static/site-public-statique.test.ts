/**
 * Ticket 07 — Les pages publiques sont des documents statiques, sans script,
 * sous leurs en-têtes (openspec/changes/011-apercu-et-publication/tickets/07-*.md).
 *
 * Contrôles statiques sur la sortie de construction (`dist/client/`, `dist/server/`).
 * Les en-têtes effectivement servis et l'absence de cookie se prouvent au
 * navigateur : `tests/parcours/site-public.parcours.ts` (`npm run parcours`).
 */
import { describe, it, expect } from 'vitest';

const DOCUMENTS = import.meta.glob<string>('/dist/client/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const ENTETES = import.meta.glob<string>('/dist/client/_header[s]', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const CONFIG_WORKER = import.meta.glob<string>('/dist/server/wrangler.jso[n]', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const CHEMINS_ATTENDUS = [
  '/dist/client/index.html',
  '/dist/client/tarifs/index.html',
  '/dist/client/contact/index.html',
  '/dist/client/404.html',
];

const pagesPubliques = Object.entries(DOCUMENTS).filter(([chemin]) => !chemin.includes('/admin/'));

function reglePortee(source: string, motif: string): string {
  const lignes = source.split('\n');
  const debut = lignes.findIndex((l) => l.trim() === motif);
  expect(debut, `règle ${motif} absente de _headers`).toBeGreaterThanOrEqual(0);
  const corps: string[] = [];
  for (const ligne of lignes.slice(debut + 1)) {
    if (!/^\s/.test(ligne) && ligne.trim() !== '') break;
    corps.push(ligne);
  }
  return corps.join('\n');
}

describe('site public statique, sous ses en-têtes', () => {
  it('SC-07a — _headers porte la règle /* avec la politique du site public, posée sur les documents statiques', () => {
    const source = Object.values(ENTETES)[0];
    expect(source, 'dist/client/_headers absent : lancer `npm run build`').toBeTruthy();

    const regle = reglePortee(source, '/*');

    expect(regle).toContain(
      "Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    expect(regle).toContain('X-Content-Type-Options: nosniff');
    expect(regle).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(regle).toContain('X-Frame-Options: DENY');
    expect(regle).not.toMatch(/script-src/);
  });

  it('SC-07a — un document statique par page déclarée plus la page introuvable, et aucun run_worker_first global', () => {
    for (const chemin of CHEMINS_ATTENDUS) {
      expect(Object.keys(DOCUMENTS), `${chemin} absent de la sortie bâtie`).toContain(chemin);
    }
    const config = JSON.parse(Object.values(CONFIG_WORKER)[0]) as {
      assets?: { run_worker_first?: unknown };
    };
    const rwf = config.assets?.run_worker_first;
    expect(rwf === undefined || rwf === false || (Array.isArray(rwf) && !rwf.includes('/*'))).toBe(true);
    expect(rwf).not.toBe(true);
  });

  it('SC-07b — aucune page publique ne porte de <script>, ni de gestionnaire en ligne', () => {
    expect(pagesPubliques.length).toBeGreaterThanOrEqual(CHEMINS_ATTENDUS.length);
    for (const [chemin, html] of pagesPubliques) {
      expect(html, `${chemin} porte un <script>`).not.toMatch(/<script[\s>]/i);
      expect(html, `${chemin} porte un gestionnaire en ligne`).not.toMatch(/\son[a-z]+\s*=/i);
      expect(html, `${chemin} porte un <style> en ligne`).not.toMatch(/<style[\s>]/i);
    }
  });

  it('SC-07b — chaque ressource chargée (feuille de style, image) est servie par le site lui-même', () => {
    for (const [chemin, html] of pagesPubliques) {
      const ressources = [
        ...html.matchAll(/<(?:link|img|source)\b[^>]*?\s(?:href|src|srcset)="([^"]*)"/gi),
      ].map((m) => m[1]);
      for (const adresse of ressources) {
        expect(adresse, `${chemin} charge ${adresse}`).toMatch(/^\/(?!\/)/);
      }
      expect(html, `${chemin} charge une ressource d'une autre origine`).not.toMatch(
        /<(?:link|img|source|iframe|video|audio|embed|object)\b[^>]*\s(?:src|srcset)="(?:https?:)?\/\//i,
      );
      expect(html).not.toMatch(/<link\b[^>]*rel="stylesheet"[^>]*href="(?:https?:)?\/\//i);
    }
  });

  it('SC-07d — aucun lien ni aucune ressource d’une page publique ne pointe vers l’aperçu', () => {
    for (const [chemin, html] of pagesPubliques) {
      expect(html, `${chemin} mène à l'aperçu`).not.toMatch(/\/admin\/apercu/i);
      expect(html, `${chemin} mène à l'administration`).not.toMatch(/(?:href|src|action)="[^"]*\/admin\b/i);
    }
  });
});
