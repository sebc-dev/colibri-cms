/**
 * Le retour d'un réglage à sa version publiée (change 015, ticket 03). POST
 * sans corps : `verifierSession` sinon 401 (ADR-0007), anti-forgerie par le
 * cookie `SameSite=Strict` (ADR-0011), 404 hors de la liste fermée des
 * réglages (ADR-0017). Le brouillon est supprimé ; rien n'est recopié (ADR-0019).
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { revenirReglageSiLibre, type NomReglage } from '../../../../platform/reglages/magasin.ts';

const REGLAGES: readonly NomReglage[] = ['coordonnees', 'reseaux', 'mention'];

export const POST: APIRoute = async ({ request, params }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const reglage = REGLAGES.find((r) => r === params.reglage);
  if (reglage === undefined) {
    return Response.json({ ok: false, raison: 'introuvable' }, { status: 404 });
  }

  const issue = await revenirReglageSiLibre(env.DB, reglage);
  if (issue === 'publication-en-cours') {
    return Response.json({ ok: false, raison: 'publication-en-cours' }, { status: 409 });
  }
  return Response.json({ ok: true });
};
