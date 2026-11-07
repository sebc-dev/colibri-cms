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
 * — `bouton-action` (ticket 04), `lien-video` (ticket 05) ou `texte-riche`
 * (ticket 06, openspec/changes/003-remplir-emplacements/tickets/
 * 06-corriger-texte-riche.md), ou `image` (ticket 08,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 08-poser-remplacer-image.md — poser ET remplacer une image sont le même
 * geste : la seconde pose sur un emplacement déjà corrigé remplace
 * simplement la ligne existante), ou `galerie`/`carrousel` (ticket 09,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 09-composer-galerie-carrousel.md — ajouter, réordonner ou retirer une
 * image de l'ensemble est un remplacement en bloc du tableau `mediaIds`,
 * jamais un diff incrémental, SC-09a/b). Les tickets 08 et 09 partagent la
 * même route (non co-parallélisables, même embranchement).
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
import { listerFichesMedias } from '../../../../../platform/contenu/medias.ts';
import { imagesAbsentes } from '../../../../../platform/medias/magasin.ts';
import {
  enregistrerCorrectionBoutonAction,
  enregistrerCorrectionLienVideo,
  enregistrerCorrectionTexteRiche,
  enregistrerCorrectionImage,
  enregistrerCorrectionGalerie,
  enregistrerCorrectionCarrousel,
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
  // déclaré est refusé par la fonction `core/` de la branche choisie
  // elle-même (`emplacement-non-declare`/`nature-non-corrigible`, SC-04c) —
  // le même refus vaut donc pour les six branches (lien-video,
  // texte-riche, image, galerie, carrousel, bouton-action) ; on retient
  // `enregistrerCorrectionBoutonAction` par défaut.
  const emplacementDeclare = page.emplacements.find((emplacement) => emplacement.id === id);

  // Une pose d'image ne vise que des images de la bibliothèque (spec `pages-et-emplacements`) :
  // une identité absente — sélecteur resté ouvert sur une image effacée depuis, ou requête
  // forgée — est refusée sans rien écrire, sans quoi la publication déposerait une page qui
  // pose une image manquante. Une image posée au départ, que le site empaquette, compte comme
  // présente même si aucun écran ne l'a encore inscrite, sauf si une publication l'a effacée.
  // 404 : l'îlot dit que l'écran n'est plus à jour.
  const nature = emplacementDeclare?.nature;
  if (nature === 'image' || nature === 'galerie' || nature === 'carrousel') {
    const empaquetees = new Set(listerFichesMedias().map((fiche) => fiche.id));
    if ((await imagesAbsentes(env.DB, identitesVisees(corpsBrut), empaquetees)).length > 0) {
      return Response.json({ ok: false, raison: 'image-introuvable' }, { status: 404 });
    }
  }

  let resultat: ResultatCorrection;
  if (emplacementDeclare?.nature === 'lien-video') {
    resultat = await enregistrerCorrectionLienVideo(env.DB, slug, page.emplacements, id, corpsBrut, Date.now());
  } else if (emplacementDeclare?.nature === 'texte-riche') {
    resultat = await enregistrerCorrectionTexteRiche(env.DB, slug, page.emplacements, id, corpsBrut, Date.now());
  } else if (emplacementDeclare?.nature === 'image') {
    resultat = await enregistrerCorrectionImage(env.DB, slug, page.emplacements, id, corpsBrut, Date.now());
  } else if (emplacementDeclare?.nature === 'galerie') {
    resultat = await enregistrerCorrectionGalerie(env.DB, slug, page.emplacements, id, corpsBrut, Date.now());
  } else if (emplacementDeclare?.nature === 'carrousel') {
    resultat = await enregistrerCorrectionCarrousel(env.DB, slug, page.emplacements, id, corpsBrut, Date.now());
  } else if (emplacementDeclare?.nature === 'formulaire') {
    // Un formulaire posé se règle dans Formulaires, jamais ici (ADR-0027) : rien n'est écrit.
    return Response.json({ ok: false, raison: 'nature-non-corrigible' }, { status: 400 });
  } else {
    resultat = await enregistrerCorrectionBoutonAction(env.DB, slug, page.emplacements, id, corpsBrut, Date.now());
  }

  if (!resultat.accepte) {
    return Response.json({ ok: false, raison: resultat.raison }, { status: 400 });
  }

  return Response.json({ ok: true, porteUnBrouillon: pagePorteUnBrouillon(resultat.brouillon) });
};

/** Les identités d'images qu'une pose vise : `mediaId` d'une image, `mediaIds` d'une galerie ou d'un carrousel. La forme reste jugée par `core/`. */
function identitesVisees(corps: unknown): string[] {
  if (typeof corps !== 'object' || corps === null) return [];
  const { mediaId, mediaIds } = corps as { mediaId?: unknown; mediaIds?: unknown };
  if (typeof mediaId === 'string') return [mediaId];
  if (Array.isArray(mediaIds)) return mediaIds.filter((id): id is string => typeof id === 'string');
  return [];
}
