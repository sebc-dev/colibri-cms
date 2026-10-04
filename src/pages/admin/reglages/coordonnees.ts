/**
 * L'écriture des coordonnées au brouillon (ticket 05,
 * openspec/changes/008-reglages-transverses/tickets/
 * 05-enregistrer-les-coordonnees.md). Gardée par `verifierSession`
 * (ADR-0007, I6) ; anti-forgerie par le seul cookie `SameSite=Strict`
 * (ADR-0011, I13), sans jeton. Jamais 5xx sur un corps illisible.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../platform/session/index.ts';
import { lireReglagesDeLaDeclaration } from '../../../platform/contenu/reglages.ts';
import { enregistrerCoordonnees } from '../../../platform/reglages/magasin.ts';
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

  const declarees = lireReglagesDeLaDeclaration().coordonnees;
  const resultat = await enregistrerCoordonnees(env.DB, declarees, corps.json, Date.now());
  if (!resultat.accepte) {
    if (resultat.raison === 'forme-invalide') {
      return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
    }
    return Response.json({ ok: false, refus: resultat.refus.map(({ champ, raison }) => ({ champ, raison })) }, { status: 400 });
  }
  return Response.json({ ok: true });
};
