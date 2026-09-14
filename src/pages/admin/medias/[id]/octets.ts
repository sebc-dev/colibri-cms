/**
 * La route de service des octets d'un média en brouillon — ticket 04
 * (openspec/changes/004-bibliotheque-de-medias/tickets/04-reserve-persister-servir.md,
 * SC-04b/SC-04c/SC-04d).
 *
 * Gardée par `verifierSession` (ADR-0007, I6) : aucune session valide,
 * aucun octet — la garde s'applique avant toute autre lecture (SC-04c).
 *
 * Le `Content-Type` posé est TOUJOURS celui déduit à l'ingestion
 * (`format`, relu depuis `src/platform/medias/magasin.ts`, lui-même issu de
 * `analyserImage`, ticket 01) — jamais un type annoncé au téléversement, qui
 * n'est de toute façon pas conservé (SC-04d).
 *
 * La protection contre la réinterprétation du contenu (`X-Content-Type-
 * Options: nosniff`) n'est PAS posée ici (I11) : c'est le rôle exclusif du
 * middleware `src/platform/entetes/middleware.ts` (ADR-0008/ADR-0004), qui
 * couvre déjà toute réponse sous `/admin/` — cette route en bénéficie du
 * seul fait de son placement.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { obtenirMediaBrouillon } from '../../../../platform/medias/magasin.ts';
import { TYPE_MIME_PAR_FORMAT } from '../../../../core/medias/ingestion.ts';

export const GET: APIRoute = async ({ params, request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(null, { status: 404 });
  }

  const media = await obtenirMediaBrouillon(env.DB, id);
  if (!media) {
    return new Response(null, { status: 404 });
  }

  return new Response(media.octets, {
    status: 200,
    headers: { 'Content-Type': TYPE_MIME_PAR_FORMAT[media.format] },
  });
};
