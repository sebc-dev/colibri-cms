/**
 * La route générique d'écriture d'une correction d'emplacement (ticket 04,
 * openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md).
 *
 * Une seule route sous `src/pages/admin/`, gardée par `verifierSession`
 * (ADR-0007, I6) : elle reçoit une correction pour un couple (page,
 * emplacement) et la confie à `core/`, qui l'aiguille selon la NATURE
 * DÉCLARÉE de l'emplacement (ADR-0012, lue via
 * `obtenirPageAvecEmplacements`) — jamais celle prétendue par le corps de la
 * requête. Les tickets 05 (lien de vidéo) et 06 (texte riche) réutilisent
 * cette même route telle quelle : ils n'ajoutent qu'un embranchement selon la
 * nature déclarée, plus leur logique `core/`, leur îlot et leur test — seule
 * la nature `bouton-action` est traitée ici (SC-04a/c/h).
 *
 * Anti-forgerie (ADR-0011, SC-04g) : le seul rempart est le cookie de session
 * `__Host-session`, `SameSite=Strict` (`src/platform/session/index.ts`,
 * `verifierSession`) — aucun jeton dédié, aucun repli sur un en-tête ou un
 * paramètre d'URL, rien qui assouplisse `SameSite`. Une requête sans le
 * cookie de session valide (donc toute requête forgée depuis une autre
 * origine, que le navigateur n'attache jamais à ce cookie) est rejetée avant
 * toute lecture du corps.
 *
 * Aucun Set-Cookie n'est composé ici (I13) : cette route ne touche jamais à
 * la session elle-même, seul `enteteCookieSession`
 * (`src/platform/session/index.ts`) le fait.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../../platform/session/index.ts';
import { obtenirPageAvecEmplacements } from '../../../../../platform/contenu/pages.ts';
import { enregistrerCorrectionBoutonAction } from '../../../../../platform/brouillons/magasin.ts';
import { pagePorteUnBrouillon } from '../../../../../core/pages/brouillon.ts';

export const POST: APIRoute = async ({ params, request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const { slug, id } = params;
  if (!slug || !id) {
    return new Response(null, { status: 404 });
  }

  const page = obtenirPageAvecEmplacements(slug);
  if (!page) {
    return new Response(null, { status: 404 });
  }

  // La nature déclarée décide de l'embranchement (ADR-0012) — jamais celle
  // annoncée par le corps de la requête. Seule « bouton-action » est
  // corrigible à ce ticket ; un emplacement d'une autre nature (ou non
  // déclaré) est refusé par `core/` elle-même (SC-04c), ce qui couvre aussi
  // le cas où `id` ne désigne aucun emplacement de la page.
  let corpsBrut: unknown;
  try {
    corpsBrut = await request.json();
  } catch {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  const resultat = await enregistrerCorrectionBoutonAction(
    env.DB,
    slug,
    page.emplacements,
    id,
    corpsBrut,
    Date.now(),
  );

  if (!resultat.accepte) {
    return Response.json({ ok: false, raison: resultat.raison }, { status: 400 });
  }

  return Response.json({ ok: true, porteUnBrouillon: pagePorteUnBrouillon(resultat.brouillon) });
};
