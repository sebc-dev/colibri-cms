/**
 * L'écriture de la mention d'information au brouillon (ticket 08,
 * openspec/changes/008-reglages-transverses/tickets/
 * 08-corriger-la-mention.md). Même patron que la route des
 * coordonnées : `verifierSession` (ADR-0007, I6), anti-forgerie par le
 * cookie `SameSite=Strict` (ADR-0011), jamais 5xx sur un corps illisible.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../platform/session/index.ts';
import { enregistrerMention } from '../../../platform/reglages/magasin.ts';
import { lireCorpsJsonBorne } from '../../../platform/reglages/corps.ts';

export const POST: APIRoute = async ({ request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const corps = await lireCorpsJsonBorne(request);
  if (!corps.ok) {
    return Response.json({ ok: false, raison: corps.statut === 413 ? 'corps-trop-gros' : 'forme-invalide' }, { status: corps.statut });
  }

  const resultat = await enregistrerMention(env.DB, corps.json, Date.now());
  if (!resultat.accepte) {
    if (resultat.raison === 'forme-invalide') {
      return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
    }
    return Response.json({ ok: false, refus: resultat.refus.map(({ champ, raison }) => ({ champ, raison })) }, { status: 400 });
  }
  return Response.json({ ok: true });
};
