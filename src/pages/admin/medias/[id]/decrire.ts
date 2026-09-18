/**
 * La route d'écriture de la description d'une image en brouillon — ticket
 * 07 (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 07-fiche-renommer-decrire.md, SC-07b).
 *
 * Gardée par `verifierSession` (ADR-0007, I6), même patron que
 * `renommer.ts` ci-à-côté et `televerser.ts`/`[id]/octets.ts`.
 *
 * Anti-forgerie (ADR-0011) : le seul rempart est le cookie de session
 * `__Host-session`, `SameSite=Strict` — aucun jeton dédié.
 *
 * La description est écrite TELLE QUELLE (`decrireMediaBrouillon`,
 * `src/platform/medias/magasin.ts`) : cette route ne la rend jamais en HTML
 * (le service en page publiée, FR-039, est hors périmètre du ticket 07). Une
 * chaîne vide est admise — c'est le geste qui vide une description déjà
 * saisie. Un identifiant inconnu rend 404 (même contrat que `[id]/octets.ts`).
 *
 * Corps attendu : JSON `{ "description": "<description>" }` — le ticket ne
 * fixe pas cette forme (gap noté au cadrage), retenue ici par convention
 * avec le libellé de la fiche (« Description : »,
 * `openspec/changes/004-bibliotheque-de-medias/ux.md`).
 *
 * Aucun en-tête de sécurité n'est posé ici (I11) : c'est le rôle exclusif
 * du middleware `src/platform/entetes/middleware.ts` (ADR-0008/ADR-0004).
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { decrireMediaBrouillon } from '../../../../platform/medias/magasin.ts';

interface CorpsDecrire {
  readonly description?: unknown;
}

export const POST: APIRoute = async ({ params, request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(null, { status: 404 });
  }

  let corpsBrut: unknown;
  try {
    corpsBrut = await request.json();
  } catch {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }
  if (typeof corpsBrut !== 'object' || corpsBrut === null) {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }
  const corps = corpsBrut as CorpsDecrire;

  if (typeof corps.description !== 'string') {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  const resultat = await decrireMediaBrouillon(env.DB, id, corps.description);
  if (!resultat.decrite) {
    return new Response(null, { status: 404 });
  }

  return Response.json({ ok: true, description: corps.description }, { status: 200 });
};
