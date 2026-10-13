/**
 * La relance d'une mise en ligne qui n'a pas abouti (change 011, ticket 18 ; ADR-0023). Gardée (I6),
 * `SameSite=Strict` (ADR-0011, I13) : seul POST est exporté. Dépose une marque neuve, rien d'autre.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../platform/session/index.ts';
import { obtenirForge, relancerLaMiseEnLigne } from '../../../platform/publication/publier.ts';

export const POST: APIRoute = async ({ request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }
  const issue = await relancerLaMiseEnLigne(
    env.DB,
    obtenirForge(__DEPOT_DE_PUBLICATION__, env.JETON_DEPOT),
    Date.now(),
  );
  if (!issue.ok) {
    return Response.json({ ok: false, raison: issue.raison }, { status: issue.raison === 'en-cours' ? 409 : 502 });
  }
  return Response.json({ ok: true });
};
