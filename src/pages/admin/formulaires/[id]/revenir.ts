/**
 * Le retour d'un formulaire à sa version publiée (change 015, ticket 04). POST
 * sans corps : `verifierSession` sinon 401 (ADR-0007), anti-forgerie par le
 * cookie `SameSite=Strict` (ADR-0011), 404 hors de la déclaration (ADR-0018).
 * Les numéros d'options attribués sont retenus avant la suppression du
 * brouillon (ADR-0026) ; rien n'est recopié (ADR-0019).
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { lireFormulaireDeLaDeclaration } from '../../../../platform/contenu/formulaires.ts';
import { revenirFormulaireSiLibre } from '../../../../platform/formulaires/magasin.ts';

export const POST: APIRoute = async ({ request, params }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const declare = lireFormulaireDeLaDeclaration(params.id ?? '');
  if (declare === undefined) {
    return Response.json({ ok: false, raison: 'introuvable' }, { status: 404 });
  }

  const issue = await revenirFormulaireSiLibre(env.DB, declare.id);
  if (issue !== 'ok') {
    return Response.json({ ok: false, raison: issue }, { status: 409 });
  }
  return Response.json({ ok: true });
};
