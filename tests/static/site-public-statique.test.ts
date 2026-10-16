/**
 * Ticket 07 — Les pages publiques sont des documents statiques sous leurs
 * en-têtes (openspec/changes/011-apercu-et-publication/tickets/07-*.md).
 * Réécrit avant le ticket 05 du change 012, dans la forme que la nouvelle
 * règle garde : une page sans formulaire ne porte aucun script ; une page qui
 * en pose un ne porte que des scripts servis par le site, rien d'écrit dans la
 * page ; la politique n'admet de script et d'échange que du site lui-même.
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

/** Les directives d'une politique de sécurité de contenu, par nom. */
function directives(politique: string): Map<string, string> {
  return new Map(
    politique
      .split(';')
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .map((d): [string, string] => {
        const [nom = '', ...valeurs] = d.split(/\s+/);
        return [nom, valeurs.join(' ')];
      }),
  );
}

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

    const entete = 'Content-Security-Policy:';
    const ligne =
      regle
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith(entete))
        ?.slice(entete.length) ?? '';
    const politique = directives(ligne);
    const autres = [...politique].filter(([nom]) => nom !== 'script-src' && nom !== 'connect-src');

    expect(Object.fromEntries(autres)).toEqual({
      'default-src': "'none'",
      'img-src': "'self'",
      'style-src': "'self'",
      'font-src': "'self'",
      'base-uri': "'none'",
      'form-action': "'none'",
      'frame-ancestors': "'none'",
    });
    // Script et échange : absents, ou le site lui-même seulement (change 012, D4).
    for (const nom of ['script-src', 'connect-src']) {
      expect([undefined, "'self'"], `${nom} ${politique.get(nom) ?? ''}`).toContain(politique.get(nom));
    }
    expect(regle).toContain('X-Content-Type-Options: nosniff');
    expect(regle).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(regle).toContain('X-Frame-Options: DENY');
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

  it('SC-07b — sans formulaire, une page publique ne porte aucun <script> ; avec un formulaire, seulement des scripts servis par le site ; jamais de script écrit dans la page ni de gestionnaire en ligne', () => {
    expect(pagesPubliques.length).toBeGreaterThanOrEqual(CHEMINS_ATTENDUS.length);
    for (const [chemin, html] of pagesPubliques) {
      const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
      expect(html.match(/<script[\s>]/gi)?.length ?? 0, `${chemin} porte un <script> mal fermé`).toBe(scripts.length);
      if (!/<form\b/i.test(html)) {
        expect(scripts, `${chemin} ne pose aucun formulaire mais porte un <script>`).toEqual([]);
      }
      for (const [balise, attributs = '', corps = ''] of scripts) {
        expect(attributs, `${chemin} : ${balise}`).toMatch(/\ssrc="\/(?!\/)[^"]*"/);
        expect(corps.trim(), `${chemin} écrit un script dans la page`).toBe('');
      }
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
