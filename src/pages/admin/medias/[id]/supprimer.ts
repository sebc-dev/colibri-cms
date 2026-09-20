/**
 * La route de suppression d'une image en brouillon — ticket 11
 * (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 11-ou-posee-et-supprimer.md, SC-11d/e).
 *
 * Gardée par `verifierSession` (ADR-0007, I6), même patron que
 * `renommer.ts`/`decrire.ts` ci-à-côté : aucune session valide, aucune
 * lecture du magasin.
 *
 * Anti-forgerie (ADR-0011) : le seul rempart est le cookie de session
 * `__Host-session`, `SameSite=Strict` — aucun jeton dédié.
 *
 * La liste préalable des emplacements concernés (SC-11c) est déjà connue de
 * l'éditrice AVANT cette requête : c'est la même liste que la fiche affiche
 * (SC-11a, composée par `src/pages/admin/medias/[id].astro`), reprise par
 * l'îlot (`FicheMedia.svelte`) dans sa confirmation — cette route n'a donc
 * rien à lister elle-même, elle n'exécute que l'ordre confirmé.
 *
 * Une seule écriture (aucun effacement de `medias_brouillon` ici, FR-037
 * délégué à « Aperçu et publication ») : `existeMediaBrouillon`
 * (`src/platform/medias/magasin.ts`) garde l'identifiant inconnu — 404 SANS
 * rien écrire, même contrat que `[id]/renommer.ts` ; puis, seulement si
 * l'image existait, `retirerMediaDesEmplacements`
 * (`src/platform/brouillons/magasin.ts`) la retire de CHAQUE emplacement
 * qui la posait, toutes pages confondues, en écrivant au brouillon de
 * chacune (jamais l'état publié) — une image posée dans aucun emplacement ne
 * touche aucune ligne (SC-11e). La ligne média reste : l'image devient
 * orpheline (`imageEffacable`, ticket 02/10) et sera effacée à la
 * publication (FR-037, hors périmètre).
 *
 * Aucun en-tête de sécurité n'est posé ici (I11) : c'est le rôle exclusif du
 * middleware `src/platform/entetes/middleware.ts` (ADR-0008/ADR-0004).
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { existeMediaBrouillon } from '../../../../platform/medias/magasin.ts';
import { retirerMediaDesEmplacements } from '../../../../platform/brouillons/magasin.ts';

export const POST: APIRoute = async ({ params, request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(null, { status: 404 });
  }

  if (!(await existeMediaBrouillon(env.DB, id))) {
    return new Response(null, { status: 404 });
  }

  await retirerMediaDesEmplacements(env.DB, id, Date.now());

  return Response.json({ ok: true }, { status: 200 });
};
