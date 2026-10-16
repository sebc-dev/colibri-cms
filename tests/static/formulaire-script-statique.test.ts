/**
 * Ticket 05 du change 012 — le premier script du site public
 * (openspec/changes/012-envoi-des-demandes-de-devis/tickets/05-*.md).
 *
 * Contrôles statiques sur la sortie de construction (`dist/client/`) : une
 * page sans formulaire ne porte aucun script (SC-05g) ; une page avec
 * formulaire ne porte que le module du formulaire, servi par le site, rien
 * d'écrit dans la page (SC-05h) ; la politique de sécurité n'admet de script
 * que du site (SC-05i). Le total à l'écran se prouve au navigateur :
 * `tests/parcours/formulaire-total.parcours.ts`.
 */
import { describe, it, expect } from 'vitest';

const DOCUMENTS = import.meta.glob<string>('/dist/client/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const MODULES = import.meta.glob<string>('/dist/client/_astro/*.js', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const ENTETES = import.meta.glob<string>('/dist/client/_header[s]', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const pagesPubliques = Object.entries(DOCUMENTS).filter(([chemin]) => !chemin.includes('/admin/'));
const sansFormulaire = pagesPubliques.filter(([, html]) => !/<form\b/i.test(html));
const avecFormulaire = pagesPubliques.filter(([, html]) => /<form\b/i.test(html));

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

function ressources(html: string): string[] {
  return [...html.matchAll(/<(?:link|img|source|script)\b[^>]*?\s(?:href|src|srcset)="([^"]*)"/gi)].map(
    (m) => m[1],
  );
}

function politique(): Map<string, string> {
  const source = Object.values(ENTETES)[0] ?? '';
  expect(source, 'dist/client/_headers absent : lancer `npm run build`').toBeTruthy();
  const ligne = source
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('Content-Security-Policy:'));
  expect(ligne, 'Content-Security-Policy absente de _headers').toBeDefined();
  return new Map(
    (ligne ?? '')
      .slice('Content-Security-Policy:'.length)
      .split(';')
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .map((d): [string, string] => {
        const [nom = '', ...valeurs] = d.split(/\s+/);
        return [nom, valeurs.join(' ')];
      }),
  );
}

describe('le module du formulaire sur le site public', () => {
  it('SC-05g — une page sans formulaire ne porte aucun script, et ses ressources sont toutes du site', () => {
    expect(sansFormulaire.length, 'aucune page sans formulaire dans dist/client').toBeGreaterThan(0);
    for (const [chemin, html] of sansFormulaire) {
      expect(html.match(/<script[\s>]/gi) ?? [], `${chemin} porte un <script>`).toEqual([]);
      expect(html, `${chemin} appelle un module`).not.toMatch(/rel="modulepreload"/i);
      for (const adresse of ressources(html)) {
        expect(adresse, `${chemin} charge ${adresse}`).toMatch(/^\/(?!\/)/);
      }
    }
  });

  it('SC-05h — une page avec formulaire ne porte qu’un script, le module, chargé depuis le site, rien d’écrit dans la page', () => {
    expect(avecFormulaire.length, 'aucune page avec formulaire dans dist/client').toBeGreaterThan(0);
    for (const [chemin, html] of avecFormulaire) {
      const scripts = [...html.matchAll(SCRIPT)];
      expect(scripts, `${chemin} : exactement un script`).toHaveLength(1);
      const [, attributs = '', corps = ''] = scripts[0] ?? [];
      expect(attributs, `${chemin} : le module vient du site`).toMatch(/\ssrc="\/_astro\/[^"/]+\.js"/);
      expect(attributs, `${chemin} : type module`).toMatch(/\stype="module"/);
      expect(corps.trim(), `${chemin} écrit un script dans la page`).toBe('');
      expect(html, `${chemin} porte un gestionnaire en ligne`).not.toMatch(/\son[a-z]+\s*=/i);
      expect(html, `${chemin} porte un <style> en ligne`).not.toMatch(/<style[\s>]/i);
      for (const adresse of ressources(html)) {
        expect(adresse, `${chemin} charge ${adresse}`).toMatch(/^\/(?!\/)/);
      }
    }
  });

  it('SC-05h — le fichier du module existe dans la sortie, n’écrit qu’en texte et n’évalue rien', () => {
    const html = avecFormulaire[0]?.[1] ?? '';
    const src = /<script\b[^>]*\ssrc="(\/_astro\/[^"]+\.js)"/i.exec(html)?.[1] ?? '';
    const code = MODULES[`/dist/client${src}`];
    expect(code, `${src} absent de dist/client/_astro`).toBeDefined();
    expect(code).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function/);
    expect(code).toContain('textContent');
  });

  it('SC-05i — la politique du site public n’admet script, ressource et échange que du site, aucun script écrit dans la page', () => {
    const directives = politique();

    expect(directives.get('script-src')).toBe("'self'");
    expect(directives.get('default-src')).toBe("'none'");
    expect(directives.get('form-action')).toBe("'none'");
    expect(directives.get('frame-ancestors')).toBe("'none'");
    for (const nom of ['img-src', 'style-src', 'font-src']) {
      expect(directives.get(nom), nom).toBe("'self'");
    }
    // Échange : absent (default-src 'none') ou le site seul ; l'envoi l'ouvre au ticket 07.
    expect([undefined, "'self'"]).toContain(directives.get('connect-src'));
    for (const [nom, valeur] of directives) {
      expect(valeur, `${nom} admet un script écrit dans la page`).not.toMatch(/unsafe-inline|unsafe-eval|data:|blob:/);
      expect(valeur, `${nom} admet une autre origine`).not.toMatch(/https?:|\*/);
    }
  });
});
