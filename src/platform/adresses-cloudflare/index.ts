/**
 * Adaptateur de l'API des adresses de destination de Cloudflare (change 017,
 * ADR-0033). Il ne connaît ni D1 ni la session. Seul le statut HTTP peut être
 * journalisé : jamais la clé, l'en-tête d'autorisation ni le corps.
 */

export type ResultatInscription = 'inscrite' | 'deja-inscrite' | 'echec';

const DELAI_MS = 8000;

function racine(compte: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${compte}/email/routing/addresses`;
}

function entetes(cle: string, avecCorps: boolean): Record<string, string> {
  return { Authorization: `Bearer ${cle}`, ...(avecCorps ? { 'Content-Type': 'application/json' } : {}) };
}

interface PageLue {
  result: unknown;
  totalPages: number | null;
}

/** Le `result` (et `result_info.total_pages`) d'une réponse `success: true`, ou `null` (refus, 5xx, délai, corps illisible). */
async function appelerPage(url: string, init: RequestInit): Promise<PageLue | null> {
  try {
    const reponse = await fetch(url, { ...init, signal: AbortSignal.timeout(DELAI_MS) });
    if (!reponse.ok) {
      console.warn(`adresses-cloudflare : statut ${String(reponse.status)}`);
      return null;
    }
    const corps = (await reponse.json()) as {
      success?: unknown;
      result?: unknown;
      result_info?: { total_pages?: unknown } | null;
    } | null;
    if (corps === null || typeof corps !== 'object' || corps.success !== true) return null;
    const total = corps.result_info?.total_pages;
    return { result: corps.result ?? [], totalPages: typeof total === 'number' ? total : null };
  } catch {
    console.warn('adresses-cloudflare : appel sans réponse exploitable');
    return null;
  }
}

/** Le `result` d'une réponse `success: true`, ou `null` (refus, 5xx, délai, corps illisible). */
async function appeler(url: string, init: RequestInit): Promise<unknown> {
  const page = await appelerPage(url, init);
  return page === null ? null : page.result;
}

const PAR_PAGE = 50;
const PAGES_MAX = 5;

/** Toute la liste des adresses de destination (5 pages au plus), ou `null` si une page échoue. */
async function listerAdresses(cle: string, compte: string): Promise<unknown[] | null> {
  const toutes: unknown[] = [];
  for (let numero = 1; numero <= PAGES_MAX; numero += 1) {
    const page = await appelerPage(`${racine(compte)}?page=${String(numero)}&per_page=${String(PAR_PAGE)}`, {
      method: 'GET',
      headers: entetes(cle, false),
    });
    if (page === null || !Array.isArray(page.result)) return null;
    const lot: unknown[] = page.result;
    if (lot.length === 0) break;
    toutes.push(...lot);
    if (page.totalPages === null || numero >= page.totalPages) break;
  }
  return toutes;
}

/** Inscrit `adresse` parmi les adresses de destination du compte, sauf si elle y est déjà. */
export async function inscrireAdresse(cle: string, compte: string, adresse: string): Promise<ResultatInscription> {
  const liste = await appeler(racine(compte), { method: 'GET', headers: entetes(cle, false) });
  if (!Array.isArray(liste)) return 'echec';
  const voulue = adresse.toLowerCase();
  const presente = liste.some((a) => {
    const email = (a as { email?: unknown } | null)?.email;
    return typeof email === 'string' && email.toLowerCase() === voulue;
  });
  if (presente) return 'deja-inscrite';
  const creee = await appeler(racine(compte), {
    method: 'POST',
    headers: entetes(cle, true),
    body: JSON.stringify({ email: adresse }),
  });
  return creee === null ? 'echec' : 'inscrite';
}

export type EtatAdresse = 'verifiee' | 'en-attente' | 'absente' | 'echec';

/** Cloudflare tient-il `adresse` pour vérifiée (le clic sur le bouton du message a-t-il eu lieu) ? */
export interface LectureAdresse {
  etat: EtatAdresse;
  /** Instant de vérification (ms) lu dans `verified` ; `null` si absent ou non daté (ancien). */
  verifieeLe: number | null;
}

export async function lireAdresse(cle: string, compte: string, adresse: string): Promise<LectureAdresse> {
  const liste = await listerAdresses(cle, compte);
  if (liste === null) return { etat: 'echec', verifieeLe: null };
  const voulue = adresse.toLowerCase();
  const trouvee = liste.find((a) => {
    const email = (a as { email?: unknown } | null)?.email;
    return typeof email === 'string' && email.toLowerCase() === voulue;
  }) as { verified?: unknown } | undefined;
  if (trouvee === undefined) return { etat: 'absente', verifieeLe: null };
  if (typeof trouvee.verified !== 'string' || trouvee.verified === '') return { etat: 'en-attente', verifieeLe: null };
  const instant = Date.parse(trouvee.verified);
  return { etat: 'verifiee', verifieeLe: Number.isNaN(instant) ? null : instant };
}
