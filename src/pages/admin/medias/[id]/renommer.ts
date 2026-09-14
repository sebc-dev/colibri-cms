/**
 * La route de renommage d'une image en brouillon — ticket 07
 * (openspec/changes/004-bibliotheque-de-medias/tickets/07-fiche-renommer-decrire.md,
 * SC-07a).
 *
 * Gardée par `verifierSession` (ADR-0007, I6), même patron que
 * `src/pages/admin/medias/televerser.ts`/`[id]/octets.ts` : aucune session
 * valide, aucune lecture du corps ni du magasin.
 *
 * Anti-forgerie (ADR-0011) : le seul rempart est le cookie de session
 * `__Host-session`, `SameSite=Strict` (`src/platform/session/index.ts`,
 * `verifierSession`) — aucun jeton dédié, comme les autres écritures
 * d'administration (`src/pages/admin/pages/[slug]/emplacements/[id].ts`).
 *
 * Le nouveau nom d'affichage est écrit par `renommerMediaBrouillon`
 * (`src/platform/medias/magasin.ts`) qui ne touche JAMAIS `nom_origine`
 * (SC-07a). Un identifiant inconnu rend 404 (même contrat que `[id]/
 * octets.ts`).
 *
 * Corps attendu : JSON `{ "nom": "<nom d'affichage>" }` — le ticket ne fixe
 * pas cette forme (gap noté au cadrage), retenue ici par convention avec le
 * libellé de la fiche (« Nom : », `openspec/changes/004-bibliotheque-de-
 * medias/ux.md`), en français, sans terme de développeur.
 *
 * Aucun en-tête de sécurité n'est posé ici (I11) : c'est le rôle exclusif
 * du middleware `src/platform/entetes/middleware.ts` (ADR-0008/ADR-0004).
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { renommerMediaBrouillon } from '../../../../platform/medias/magasin.ts';

interface CorpsRenommer {
  readonly nom?: unknown;
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
  const corps = corpsBrut as CorpsRenommer;

  const nom = typeof corps.nom === 'string' ? corps.nom.trim() : '';
  if (nom.length === 0) {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  const resultat = await renommerMediaBrouillon(env.DB, id, nom);
  if (!resultat.renomme) {
    return new Response(null, { status: 404 });
  }

  return Response.json({ ok: true, nomAffichage: nom }, { status: 200 });
};
