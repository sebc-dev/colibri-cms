/**
 * Double de l'API des adresses de destination de Cloudflare (change 017, ticket 02, ADR-0033).
 *
 * `globalThis.fetch` est remplacé, limité à l'hôte `api.cloudflare.com` : tout autre appel passe au
 * `fetch` d'origine. Le double tient en mémoire la liste des adresses du compte avec leur champ
 * `verified` (nul tant que le clic n'a pas eu lieu), note chaque appel reçu, et peut être mis en
 * panne (`success: false`, 5xx, délai dépassé, corps illisible). Patron du double de la forge
 * GitHub de `revenir-et-publication.test.ts`. Resservi aux tickets 03 à 08.
 */

export const COMPTE_DE_TEST = '0123456789abcdef0123456789abcdef';
export const CLE_DE_TEST = 'jeton-adresses-de-test';

export type ModePanne = 'success-false' | 'cinq-cent-deux' | 'delai' | 'illisible';

export interface Panne {
  mode: ModePanne;
  /** Méthode touchée ; sans elle, la panne touche toutes les méthodes. */
  methode?: 'GET' | 'POST';
}

export interface AppelRecu {
  methode: string;
  chemin: string;
  /** La chaîne de requête (`?page=2&per_page=50`), vide sans paramètre. */
  recherche: string;
  autorisation: string | null;
}

export interface AdresseDuDouble {
  tag: string;
  email: string;
  /** Nul tant que le message de Cloudflare n'a pas été cliqué. */
  verified: string | null;
}

export interface DoubleApiAdresses {
  appels: AppelRecu[];
  adresses: AdresseDuDouble[];
  panne: Panne | null;
  /** Inscrit d'avance une adresse du compte (en attente de vérification par défaut). */
  inscrire(email: string, verifiee?: boolean): void;
  /**
   * Fait passer l'adresse à vérifiée, comme le clic sur le bouton du message. `verifieLe` choisit
   * le champ `verified` (par défaut `2026-01-01T00:00:00Z`, un instant ancien).
   */
  verifier(email: string, verifieLe?: string): void;
  restaurer(): void;
}

function reponseJson(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json' } });
}

function appliquerPanne(mode: ModePanne): Response {
  switch (mode) {
    case 'success-false':
      return reponseJson({ success: false, errors: [{ code: 10000, message: 'refusé' }], result: null }, 403);
    case 'cinq-cent-deux':
      return new Response('bad gateway', { status: 502 });
    case 'illisible':
      return new Response('<html>pas du json</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    case 'delai':
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  }
}

export function installerDoubleApiAdresses(): DoubleApiAdresses {
  const fetchOrigine = globalThis.fetch;
  const racine = `/client/v4/accounts/${COMPTE_DE_TEST}/email/routing/addresses`;
  let numero = 0;

  const double: DoubleApiAdresses = {
    appels: [],
    adresses: [],
    panne: null,
    inscrire(email, verifiee = false) {
      numero += 1;
      double.adresses.push({
        tag: `tag-${String(numero)}`,
        email,
        verified: verifiee ? '2026-01-01T00:00:00Z' : null,
      });
    },
    verifier(email, verifieLe = '2026-01-01T00:00:00Z') {
      const trouvee = double.adresses.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (trouvee) trouvee.verified = verifieLe;
    },
    restaurer() {
      globalThis.fetch = fetchOrigine;
    },
  };

  globalThis.fetch = async (entree: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requete = new Request(entree, init);
    const url = new URL(requete.url);
    if (url.hostname !== 'api.cloudflare.com') return fetchOrigine(entree, init);

    const methode = requete.method.toUpperCase();
    double.appels.push({
      methode,
      chemin: url.pathname,
      recherche: url.search,
      autorisation: requete.headers.get('authorization'),
    });

    if (double.panne && (double.panne.methode === undefined || double.panne.methode === methode)) {
      return appliquerPanne(double.panne.mode);
    }

    const autorise = requete.headers.get('authorization') === `Bearer ${CLE_DE_TEST}`;
    if (!autorise || !url.pathname.startsWith(racine)) {
      return reponseJson({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }, 403);
    }

    if (methode === 'GET') {
      const toutes = double.adresses.map((a) => ({ ...a }));
      // Sans `page`, toute la liste en une réponse (forme lue par le ticket 02) ; avec `page`, la
      // tranche demandée et `total_pages`, comme l'API paginée de Cloudflare.
      if (!url.searchParams.has('page')) {
        return reponseJson({
          success: true,
          errors: [],
          result: toutes,
          result_info: { page: 1, per_page: 50, count: toutes.length, total_count: toutes.length },
        });
      }
      const page = Number(url.searchParams.get('page'));
      const parPage = Number(url.searchParams.get('per_page') ?? '20');
      const tranche = toutes.slice((page - 1) * parPage, page * parPage);
      return reponseJson({
        success: true,
        errors: [],
        result: tranche,
        result_info: {
          page,
          per_page: parPage,
          count: tranche.length,
          total_count: toutes.length,
          total_pages: Math.max(1, Math.ceil(toutes.length / parPage)),
        },
      });
    }
    if (methode === 'POST') {
      const corps = (await requete.json()) as { email?: unknown };
      if (typeof corps.email !== 'string') return reponseJson({ success: false, errors: [] }, 400);
      double.inscrire(corps.email);
      const creee = double.adresses[double.adresses.length - 1];
      return reponseJson({ success: true, errors: [], result: creee });
    }
    return reponseJson({ success: false, errors: [] }, 405);
  };

  return double;
}
