/**
 * Retirer une ou plusieurs demandes (change 013, tickets 08 et 09, ADR-0030) : 1 à 50 identifiants,
 * tout ou rien (une seule écriture). `verifierSession` en
 * tête (ADR-0007, I6), anti-forgerie par le cookie `SameSite=Strict` (ADR-0011), jamais de détail
 * technique dans une réponse d'échec.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../platform/session/index.ts';
import { lireCorpsJsonBorne } from '../../../platform/reglages/corps.ts';
import { retirerDemandes } from '../../../platform/demandes/magasin.ts';
import { retraitDuCorps } from '../../../core/demandes/retrait.ts';

export const POST: APIRoute = async ({ request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const corps = await lireCorpsJsonBorne(request);
  if (!corps.ok) {
    return Response.json({ ok: false, raison: corps.statut === 413 ? 'corps-trop-gros' : 'forme-invalide' }, { status: corps.statut });
  }
  const retrait = retraitDuCorps(corps.json);
  if (retrait === null) {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  try {
    await retirerDemandes(env.DB, retrait.ids, retrait.motif);
  } catch {
    return Response.json({ ok: false, raison: 'non-retiree' }, { status: 500 });
  }
  return Response.json({ ok: true });
};
