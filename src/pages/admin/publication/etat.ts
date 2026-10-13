/**
 * La lecture de l'état de la dernière publication (change 011, ticket 18 ; ADR-0023). Gardée (I6),
 * lecture seule : l'écran Publier l'interroge tant que la mise en ligne est en cours.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../platform/session/index.ts';
import { lireEtatDeLaPublication } from '../../../platform/publication/publier.ts';

export const GET: APIRoute = async ({ request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }
  const etat = await lireEtatDeLaPublication(env.DB, Date.now());
  return Response.json({ etat }, { headers: { 'Cache-Control': 'no-store' } });
};
