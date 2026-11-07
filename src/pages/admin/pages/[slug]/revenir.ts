/**
 * Le retour d'une page à sa version publiée (change 015, ticket 01). POST sans
 * corps : `verifierSession` sinon 401 (ADR-0007), anti-forgerie par le cookie
 * `SameSite=Strict` (ADR-0011), 404 pour une page absente de la déclaration.
 * Le brouillon de la page est supprimé ; rien n'est recopié (ADR-0019).
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { obtenirPageAvecEmplacements } from '../../../../platform/contenu/pages.ts';
import { abandonnerBrouillonPage } from '../../../../platform/brouillons/magasin.ts';

export const POST: APIRoute = async ({ request, params }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const slug = params.slug ?? '';
  if (!obtenirPageAvecEmplacements(slug)) {
    return Response.json({ ok: false, raison: 'introuvable' }, { status: 404 });
  }

  await abandonnerBrouillonPage(env.DB, slug);
  return Response.json({ ok: true });
};
