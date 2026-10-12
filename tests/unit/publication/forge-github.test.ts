/**
 * Change 011, ticket 16 — l'adaptateur GitHub du port `Forge`, éprouvé avec un `fetch` de
 * substitution (la frontière) : forme des requêtes, traduction des statuts, silence sur la clé.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { creerForgeGithub } from '../../../src/platform/publication/forge-github.ts';

const CLE = 'ghp_cle-secrete-de-test-0123456789';
const DEPOT = 'cliente/son-site';

function substitut(statut: number, corps: unknown = {}): { fetch: (r: Request) => Promise<Response>; vues: Request[] } {
  const vues: Request[] = [];
  return {
    vues,
    fetch: (requete) => {
      vues.push(requete);
      return Promise.resolve(Response.json(corps, { status: statut }));
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('forge GitHub', () => {
  it("SC-16a — la forme des requêtes : adresse du dépôt, en-têtes d'accès et de version, aucune identité d'Isometria", async () => {
    const { fetch, vues } = substitut(200, { sha: 'abc123' });
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const resultat = await forge.creerBlob('aGVsbG8=');

    expect(resultat).toEqual({ ok: true, valeur: { sha: 'abc123' } });
    const requete = vues[0];
    expect(requete.method).toBe('POST');
    expect(requete.url).toBe(`https://api.github.com/repos/${DEPOT}/git/blobs`);
    expect(requete.headers.get('Authorization')).toBe(`Bearer ${CLE}`);
    expect(requete.headers.get('X-GitHub-Api-Version')).toBeTruthy();
    expect(requete.headers.get('User-Agent')).toBeTruthy();
    expect(JSON.parse(await requete.text())).toEqual({ content: 'aGVsbG8=', encoding: 'base64' });
  });

  it.each([
    [401, 'acces-refuse'],
    [403, 'acces-refuse'],
    [404, 'introuvable'],
    [422, 'refusee-pas-avance-rapide'],
    [500, 'injoignable'],
  ])('SC-16a — le dépôt répond %i : issue typée %s, sans rien d\'autre', async (statut, issue) => {
    const { fetch } = substitut(statut, { message: 'refus' });
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const resultat = await forge.lireRef('refs/heads/main');

    expect(resultat).toEqual({ ok: false, issue });
  });

  it('SC-16a — un dépôt injoignable (le réseau lève) donne l\'issue injoignable', async () => {
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch: () => Promise.reject(new Error('réseau coupé')) });

    expect(await forge.lireRef('refs/heads/main')).toEqual({ ok: false, issue: 'injoignable' });
  });

  it("SC-16c — la clé ne figure ni dans l'issue rendue ni dans la console, en succès comme en échec", async () => {
    const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const bon = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch: substitut(200, { sha: 's1' }).fetch });
    const mauvais = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch: substitut(403, { message: 'non' }).fetch });
    const coupe = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch: () => Promise.reject(new Error('boom')) });

    const rendus = [await bon.creerBlob('eA=='), await mauvais.creerBlob('eA=='), await coupe.creerBlob('eA==')];

    expect(JSON.stringify(rendus)).not.toContain(CLE);
    const journal = espions.flatMap((e) => e.mock.calls).map((appel) => JSON.stringify(appel)).join('\n');
    expect(journal).not.toContain(CLE);
    expect(journal).not.toContain('Bearer');
  });
});
