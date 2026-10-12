/**
 * Change 011, ticket 16 — l'adaptateur GitHub du port `Forge`, éprouvé avec un `fetch` de
 * substitution (la frontière) : forme des requêtes, traduction des statuts, silence sur la clé.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { creerForgeGithub } from '../../../src/platform/publication/forge-github.ts';

const CLE = 'ghp_cle-secrete-de-test-0123456789';
const DEPOT = 'cliente/son-site';
const RACINE = `https://api.github.com/repos/${DEPOT}/git`;

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

/** Ce que la requête demande : méthode, adresse, et le corps JSON s'il y en a un. */
async function lue(requete: Request): Promise<{ methode: string; url: string; corps: unknown }> {
  const texte = await requete.text();
  return { methode: requete.method, url: requete.url, corps: texte === '' ? undefined : (JSON.parse(texte) as unknown) };
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

  it('SC-16a — lireRef lit la tête de la branche par un GET sur la référence, sans le préfixe refs/', async () => {
    const { fetch, vues } = substitut(200, { object: { sha: 'c1' } });
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const resultat = await forge.lireRef('refs/heads/main');

    expect(resultat).toEqual({ ok: true, valeur: { sha: 'c1' } });
    expect(vues).toHaveLength(1);
    expect(await lue(vues[0])).toEqual({ methode: 'GET', url: `${RACINE}/ref/heads/main`, corps: undefined });
  });

  it('SC-16a — lireCommit rend le commit, son arbre et ses parents', async () => {
    const { fetch, vues } = substitut(200, { sha: 'c1', tree: { sha: 't1' }, parents: [{ sha: 'p1' }] });
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const resultat = await forge.lireCommit('c1');

    expect(resultat).toEqual({ ok: true, valeur: { sha: 'c1', arbre: 't1', parents: ['p1'] } });
    expect(vues).toHaveLength(1);
    expect(await lue(vues[0])).toEqual({ methode: 'GET', url: `${RACINE}/commits/c1`, corps: undefined });
  });

  it("SC-16a — un commit lu sans arbre donne l'issue injoignable", async () => {
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch: substitut(200, { sha: 'c1', parents: [] }).fetch });

    expect(await forge.lireCommit('c1')).toEqual({ ok: false, issue: 'injoignable' });
  });

  it("SC-16a — creerArbre pose l'arbre sur sa base : texte inliné, blob existant, chemin supprimé", async () => {
    const { fetch, vues } = substitut(200, { sha: 't2' });
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const resultat = await forge.creerArbre({
      baseArbre: 't0',
      entrees: [
        { chemin: 'content/a.json', contenu: 'x' },
        { chemin: 'img/b.png', sha: 'b1' },
        { chemin: 'vieux.json', sha: null },
      ],
    });

    expect(resultat).toEqual({ ok: true, valeur: { sha: 't2' } });
    expect(vues).toHaveLength(1);
    expect(await lue(vues[0])).toEqual({
      methode: 'POST',
      url: `${RACINE}/trees`,
      corps: {
        base_tree: 't0',
        tree: [
          { path: 'content/a.json', mode: '100644', type: 'blob', content: 'x' },
          { path: 'img/b.png', mode: '100644', type: 'blob', sha: 'b1' },
          { path: 'vieux.json', mode: '100644', type: 'blob', sha: null },
        ],
      },
    });
  });

  it('SC-16a — creerArbre sans base n\'envoie pas de base_tree', async () => {
    const { fetch, vues } = substitut(200, { sha: 't3' });
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const resultat = await forge.creerArbre({ entrees: [{ chemin: 'medias/a.png', sha: 'b2' }] });

    expect(resultat).toEqual({ ok: true, valeur: { sha: 't3' } });
    const { corps } = await lue(vues[0]);
    expect(corps).not.toHaveProperty('base_tree');
    expect(corps).toEqual({ tree: [{ path: 'medias/a.png', mode: '100644', type: 'blob', sha: 'b2' }] });
  });

  it('SC-16a — creerCommit crée le commit sur son arbre et ses parents', async () => {
    const { fetch, vues } = substitut(200, { sha: 'c2' });
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const resultat = await forge.creerCommit({ message: 'Mise en ligne', arbre: 't1', parents: ['p1'] });

    expect(resultat).toEqual({ ok: true, valeur: { sha: 'c2' } });
    expect(vues).toHaveLength(1);
    expect(await lue(vues[0])).toEqual({
      methode: 'POST',
      url: `${RACINE}/commits`,
      corps: { message: 'Mise en ligne', tree: 't1', parents: ['p1'] },
    });
  });

  it('SC-16a — deplacerRef déplace la référence sans force, ou en force quand on le lui demande', async () => {
    const { fetch, vues } = substitut(200, {});
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const principale = await forge.deplacerRef('refs/heads/main', 'c2', false);
    const images = await forge.deplacerRef('refs/heads/media', 'c3', true);

    expect(principale).toEqual({ ok: true, valeur: null });
    expect(images).toEqual({ ok: true, valeur: null });
    expect(vues).toHaveLength(2);
    expect(await lue(vues[0])).toEqual({ methode: 'PATCH', url: `${RACINE}/refs/heads/main`, corps: { sha: 'c2', force: false } });
    expect(await lue(vues[1])).toEqual({ methode: 'PATCH', url: `${RACINE}/refs/heads/media`, corps: { sha: 'c3', force: true } });
  });

  it("SC-16a — un déplacement refusé (422) donne l'issue refusee-pas-avance-rapide", async () => {
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch: substitut(422, { message: 'non' }).fetch });

    expect(await forge.deplacerRef('refs/heads/main', 'c2', false)).toEqual({
      ok: false,
      issue: 'refusee-pas-avance-rapide',
    });
  });

  it('SC-16a — creerRef crée la référence sur le commit donné', async () => {
    const { fetch, vues } = substitut(200, {});
    const forge = creerForgeGithub({ depot: DEPOT, jeton: CLE, fetch });

    const resultat = await forge.creerRef('refs/heads/media', 'c3');

    expect(resultat).toEqual({ ok: true, valeur: null });
    expect(vues).toHaveLength(1);
    expect(await lue(vues[0])).toEqual({
      methode: 'POST',
      url: `${RACINE}/refs`,
      corps: { ref: 'refs/heads/media', sha: 'c3' },
    });
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
