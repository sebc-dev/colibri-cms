/**
 * La route générique d'écriture d'une correction d'emplacement (ticket 04,
 * openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md ;
 * ticket 05, openspec/changes/003-remplir-emplacements/tickets/
 * 05-regler-lien-video.md).
 *
 * Une seule route sous `src/pages/admin/`, gardée par `verifierSession`
 * (ADR-0007, I6) : elle reçoit une correction pour un couple (page,
 * emplacement) et la confie à `core/`, qui l'aiguille selon la NATURE
 * DÉCLARÉE de l'emplacement (ADR-0012, lue via
 * `obtenirPageAvecEmplacements`) — jamais celle prétendue par le corps de la
 * requête. Le ticket 05 introduit ici l'EMBRANCHEMENT PAR NATURE : la nature
 * déclarée de `id` décide quelle fonction `platform/` traiter la correction
 * — `bouton-action` (ticket 04) ou `lien-video` (ticket 05). Le ticket 06
 * (texte riche) devra ajouter sa propre branche ici ; les tickets 05 et 06 ne
 * sont pas co-parallélisables (même route, même embranchement).
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
import {
  enregistrerCorrectionBoutonAction,
  enregistrerCorrectionLienVideo,
} from '../../../../../platform/brouillons/magasin.ts';
import { pagePorteUnBrouillon, type ResultatCorrection } from '../../../../../core/pages/brouillon.ts';

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

  let corpsBrut: unknown;
  try {
    corpsBrut = await request.json();
  } catch {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  // L'embranchement se fait sur la nature DÉCLARÉE de `id` (ADR-0012),
  // jamais sur celle prétendue par le corps de la requête. Un `id` non
  // déclaré, ou déclaré d'une nature qui n'a encore aucune branche ici
  // (`texte-riche`, ticket 06), est refusé par la fonction `core/` de la
  // branche choisie elle-même (`emplacement-non-declare`/
  // `nature-non-corrigible`, SC-04c) — le même refus vaut donc pour les deux
  // branches, on retient `enregistrerCorrectionBoutonAction` par défaut.
  const emplacementDeclare = page.emplacements.find((emplacement) => emplacement.id === id);

  let resultat: ResultatCorrection;
  if (emplacementDeclare?.nature === 'lien-video') {
    resultat = await enregistrerCorrectionLienVideo(env.DB, slug, page.emplacements, id, corpsBrut, Date.now());
  } else {
    resultat = await enregistrerCorrectionBoutonAction(env.DB, slug, page.emplacements, id, corpsBrut, Date.now());
  }

  if (!resultat.accepte) {
    return Response.json({ ok: false, raison: resultat.raison }, { status: 400 });
  }

  return Response.json({ ok: true, porteUnBrouillon: pagePorteUnBrouillon(resultat.brouillon) });
};
