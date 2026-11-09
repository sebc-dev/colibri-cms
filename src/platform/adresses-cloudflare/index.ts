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

/** Le `result` d'une réponse `success: true`, ou `null` (refus, 5xx, délai, corps illisible). */
async function appeler(url: string, init: RequestInit): Promise<unknown> {
  try {
    const reponse = await fetch(url, { ...init, signal: AbortSignal.timeout(DELAI_MS) });
    if (!reponse.ok) {
      console.warn(`adresses-cloudflare : statut ${String(reponse.status)}`);
      return null;
    }
    const corps = (await reponse.json()) as { success?: unknown; result?: unknown } | null;
    if (corps === null || typeof corps !== 'object' || corps.success !== true) return null;
    return corps.result ?? [];
  } catch {
    console.warn('adresses-cloudflare : appel sans réponse exploitable');
    return null;
  }
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
