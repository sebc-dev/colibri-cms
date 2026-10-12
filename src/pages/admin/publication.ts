/**
 * La confirmation de la publication (change 011, ticket 15) : vérifie que le récapitulatif
 * confirmé est encore exact (sinon 409, rien ne part), prend le verrou et garde l'instantané.
 * `verifierSession` (ADR-0007, I6), anti-forgerie par le cookie `SameSite=Strict` (ADR-0011, I13).
 * Aucune écriture en GET : seul POST est exporté.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../platform/session/index.ts';
import { lireCorpsJsonBorne } from '../../platform/reglages/corps.ts';
import { confirmerPublication } from '../../platform/publication/publier.ts';

export const POST: APIRoute = async ({ request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const corps = await lireCorpsJsonBorne(request);
  if (!corps.ok) {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: corps.statut });
  }
  const empreinte = (corps.json as { empreinte?: unknown } | null)?.empreinte;

  const issue = await confirmerPublication(env.DB, empreinte, Date.now());
  if (!issue.ok) {
    return Response.json({ ok: false, raison: issue.raison }, { status: 409 });
  }
  return Response.json({ ok: true, jeton: issue.jeton });
};
