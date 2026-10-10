/**
 * L'écriture des options d'un formulaire au brouillon (ticket 05,
 * openspec/changes/010-reglage-des-formulaires/). Même patron que la route
 * des réseaux : `verifierSession` (ADR-0007, I6), anti-forgerie par le cookie
 * `SameSite=Strict` (ADR-0011), jamais 5xx sur un corps illisible.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { lireFormulaireDeLaDeclaration } from '../../../../platform/contenu/formulaires.ts';
import { enregistrerOptions } from '../../../../platform/formulaires/magasin.ts';
import { lireCorpsJsonBorne } from '../../../../platform/reglages/corps.ts';

export const POST: APIRoute = async ({ request, params }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const declare = lireFormulaireDeLaDeclaration(params.id ?? '');
  if (declare === undefined) {
    return Response.json({ ok: false, raison: 'introuvable' }, { status: 404 });
  }

  const corps = await lireCorpsJsonBorne(request);
  if (!corps.ok) {
    return Response.json({ ok: false, raison: corps.statut === 413 ? 'corps-trop-gros' : 'forme-invalide' }, { status: corps.statut });
  }

  const resultat = await enregistrerOptions(env.DB, declare, corps.json, Date.now());
  if (!resultat.ok) {
    if (resultat.erreur === 'forme-invalide') {
      return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
    }
    return Response.json({ ok: false, refus: resultat.refus.map(({ champ, raison }) => ({ champ, raison })) }, { status: 400 });
  }
  const champs = Object.entries(resultat.contenu.champs).map(([id, options]) => ({ id, options }));
  return Response.json({ ok: true, champs });
};
