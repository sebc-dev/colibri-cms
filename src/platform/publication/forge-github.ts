/**
 * L'adaptateur GitHub du port `Forge` (change 011, ticket 16 ; ADR-0021) : l'API REST *git data*,
 * un `fetch` reçu en paramètre. La clé d'écriture n'est lue que par cette fabrique : elle ne
 * quitte jamais l'en-tête `Authorization`, n'est ni journalisée ni mise dans une issue.
 *
 * Zone `platform`.
 */
import type {
  CommitLu,
  EntreeArbre,
  Forge,
  IssueForge,
  ResultatForge,
} from '../../core/publication/forge.ts';

export type Fetch = (requete: Request) => Promise<Response>;

const API = 'https://api.github.com';
const FORME_DEPOT = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** `true` si la valeur a la forme `propriétaire/dépôt`. */
export function depotValide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && FORME_DEPOT.test(valeur);
}

function issueDuStatut(statut: number): IssueForge {
  if (statut === 401 || statut === 403) return 'acces-refuse';
  if (statut === 404) return 'introuvable';
  if (statut === 409 || statut === 422) return 'refusee-pas-avance-rapide';
  return 'injoignable';
}

function sha(valeur: unknown): string | null {
  return typeof valeur === 'string' && valeur !== '' ? valeur : null;
}

export function creerForgeGithub(options: { depot: string; jeton: string; fetch: Fetch }): Forge {
  const base = `${API}/repos/${options.depot}/git`;

  async function appeler(
    methode: string,
    chemin: string,
    corps?: unknown,
  ): Promise<ResultatForge<unknown>> {
    let reponse: Response;
    try {
      reponse = await options.fetch(
        new Request(`${base}${chemin}`, {
          method: methode,
          headers: {
            Authorization: `Bearer ${options.jeton}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'colibri-cms',
            ...(corps === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
        }),
      );
    } catch {
      return { ok: false, issue: 'injoignable' };
    }
    if (!reponse.ok) return { ok: false, issue: issueDuStatut(reponse.status) };
    try {
      return { ok: true, valeur: (await reponse.json()) as unknown };
    } catch {
      return { ok: false, issue: 'injoignable' };
    }
  }

  async function lireSha(
    resultat: Promise<ResultatForge<unknown>>,
    extraire: (json: Record<string, unknown>) => unknown,
  ): Promise<ResultatForge<{ readonly sha: string }>> {
    const r = await resultat;
    if (!r.ok) return r;
    const lu = sha(extraire((r.valeur ?? {}) as Record<string, unknown>));
    return lu === null ? { ok: false, issue: 'injoignable' } : { ok: true, valeur: { sha: lu } };
  }

  const sansCorps = async (r: Promise<ResultatForge<unknown>>): Promise<ResultatForge<null>> => {
    const lu = await r;
    return lu.ok ? { ok: true, valeur: null } : lu;
  };

  const sansPrefixe = (ref: string): string => ref.replace(/^refs\//, '');

  return {
    lireRef: (ref) =>
      lireSha(appeler('GET', `/ref/${sansPrefixe(ref)}`), (j) => (j.object as { sha?: unknown } | undefined)?.sha),

    async lireCommit(commit): Promise<ResultatForge<CommitLu>> {
      const r = await appeler('GET', `/commits/${commit}`);
      if (!r.ok) return r;
      const j = (r.valeur ?? {}) as { sha?: unknown; tree?: { sha?: unknown }; parents?: { sha?: unknown }[] };
      const arbre = sha(j.tree?.sha);
      const propre = sha(j.sha);
      if (arbre === null || propre === null || !Array.isArray(j.parents)) {
        return { ok: false, issue: 'injoignable' };
      }
      const parents = j.parents.map((p) => sha(p.sha));
      if (parents.some((p) => p === null)) return { ok: false, issue: 'injoignable' };
      return { ok: true, valeur: { sha: propre, arbre, parents: parents as string[] } };
    },

    creerBlob: (base64) =>
      lireSha(appeler('POST', '/blobs', { content: base64, encoding: 'base64' }), (j) => j.sha),

    creerArbre: (demande) =>
      lireSha(
        appeler('POST', '/trees', {
          ...(demande.baseArbre === undefined ? {} : { base_tree: demande.baseArbre }),
          tree: demande.entrees.map((e: EntreeArbre) =>
            'contenu' in e
              ? { path: e.chemin, mode: '100644', type: 'blob', content: e.contenu }
              : { path: e.chemin, mode: '100644', type: 'blob', sha: e.sha },
          ),
        }),
        (j) => j.sha,
      ),

    creerCommit: (demande) =>
      lireSha(
        appeler('POST', '/commits', {
          message: demande.message,
          tree: demande.arbre,
          parents: demande.parents,
        }),
        (j) => j.sha,
      ),

    deplacerRef: (ref, commit, force) =>
      sansCorps(appeler('PATCH', `/refs/${sansPrefixe(ref)}`, { sha: commit, force })),

    creerRef: (ref, commit) => sansCorps(appeler('POST', '/refs', { ref, sha: commit })),
  };
}
