/**
 * L'envoi d'une demande de devis (change 012, ticket 07 ; FR-057, FR-063/064, FR-097) — seul geste
 * du visiteur à traitement serveur. Sans garde de session, sans cookie lu ni posé, jamais
 * `request.formData()` (I6) : un JSON `{ formulaire, page, valeurs, totalAffiche }`. La demande est
 * vérifiée contre la déclaration empaquetée, composée en texte seul, remise à l'adresse autorisée,
 * puis confirmée — rien n'est conservé en base.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  clesToutesDeclarees,
  pagePoseLeFormulaire,
  totalAnnonceAccorde,
  verifierDemande,
} from '../../../core/formulaires/demande.ts';
import { verifierSaisie } from '../../../core/formulaires/saisie.ts';
import { composerCourriel, totalDesValeurs } from '../../../core/formulaires/courriel.ts';
import { lireFormulaireDeLaDeclaration } from '../../../platform/contenu/formulaires.ts';
import { obtenirPageAvecEmplacements } from '../../../platform/contenu/pages.ts';
import { lireAdresseAutorisee } from '../../../platform/auth/magasin.ts';
import { demanderAcheminementDeLaDemande } from '../../../platform/email/index.ts';
import { compterEtJuger } from '../../../platform/frequence/index.ts';
import type { Verdict } from '../../../core/frequence/regles.ts';
import { lireCorpsJsonBorne, type LectureCorps } from '../../../platform/reglages/corps.ts';

export const prerender = false;

function reponse(statut: number, corps: Record<string, string>): Response {
  return Response.json(corps, { status: statut });
}

/** Taille maximale d'une demande : 16 Kio. */
const TAILLE_DEMANDE_MAX = 16 * 1024;

type LectureEnvoi = LectureCorps | { readonly ok: false; readonly statut: 403 | 415 };

/**
 * Contrôles avant toute lecture du corps : origine du site, puis format JSON (jamais de multipart),
 * puis lecture bornée à la taille d'une demande.
 */
async function lireEnvoiDuSite(request: Request, origineDuSite: string): Promise<LectureEnvoi> {
  if (request.headers.get('origin') !== origineDuSite) return { ok: false, statut: 403 };
  const format = (request.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase();
  if (format !== 'application/json') return { ok: false, statut: 415 };
  return await lireCorpsJsonBorne(request, TAILLE_DEMANDE_MAX);
}

interface Envoi {
  readonly idFormulaire: string;
  readonly slug: string;
  readonly valeurs: unknown;
  readonly totalAffiche: unknown;
}

/** Les identifiants exigés du JSON reçu (formulaire, page) ; `null` si le corps n'en porte pas. */
function lireIdentifiants(recu: unknown): Envoi | null {
  if (typeof recu !== 'object' || recu === null) return null;
  const { formulaire, page, valeurs, totalAffiche } = recu as Record<string, unknown>;
  if (typeof formulaire !== 'string' || typeof page !== 'string') return null;
  return { idFormulaire: formulaire, slug: page, valeurs, totalAffiche };
}

/**
 * Le refus à rendre selon le verdict du seuil par origine : 503 quand le compteur est en panne
 * (échec passager), 429 au-delà du seuil ; `null` quand la sollicitation est traitée.
 */
function refusDuSeuil(seuil: Verdict): Response | null {
  if (seuil === 'indisponible') return reponse(503, { statut: 'indisponible' });
  if (seuil !== 'traitee') return reponse(429, { statut: 'seuil' });
  return null;
}

export const POST: APIRoute = async ({ request, url }) => {
  // Le seuil par origine (FR-062, ADR-0028) se juge en tête : toute sollicitation compte, même refusée ensuite.
  const seuil = await compterEtJuger(env.DB, 'demande', request.headers.get('cf-connecting-ip'), Date.now());
  const refus = refusDuSeuil(seuil);
  if (refus !== null) return refus;
  const corps = await lireEnvoiDuSite(request, url.origin);
  if (!corps.ok) return reponse(corps.statut, { statut: 'refusee' });
  const envoi = lireIdentifiants(corps.json);
  if (envoi === null) return reponse(400, { statut: 'refusee' });
  const { idFormulaire, slug, valeurs, totalAffiche } = envoi;

  const formulaire = lireFormulaireDeLaDeclaration(idFormulaire);
  const page = obtenirPageAvecEmplacements(slug);
  if (formulaire === undefined || page === null || !pagePoseLeFormulaire(page.emplacements, idFormulaire)) {
    return reponse(409, { statut: 'formulaire-change' });
  }
  if (typeof valeurs === 'object' && valeurs !== null && !Array.isArray(valeurs)) {
    if (!clesToutesDeclarees(formulaire, valeurs as Record<string, unknown>)) {
      return reponse(409, { statut: 'formulaire-change' });
    }
    const saisie = verifierSaisie(formulaire, valeurs as Record<string, unknown>);
    if (!saisie.ok) return Response.json({ statut: 'champs', champs: saisie.champs }, { status: 400 });
  }
  const verdict = verifierDemande(formulaire, valeurs);
  if (!verdict.ok || !totalAnnonceAccorde(formulaire, verdict.valeurs, totalAffiche)) {
    return reponse(409, { statut: 'formulaire-change' });
  }

  const destinataire = await lireAdresseAutorisee(env.DB);
  if (destinataire === null) return reponse(503, { statut: 'acheminement' });

  const total = totalDesValeurs(formulaire, verdict.valeurs);
  const { objet, texte } = composerCourriel(formulaire, page.titre, verdict.valeurs, total);
  try {
    await demanderAcheminementDeLaDemande(env.EXPEDITEUR_CODE_CONNEXION, {
      from: __ADRESSE_EXPEDITEUR__,
      to: destinataire,
      subject: objet,
      text: texte,
    });
  } catch (erreur: unknown) {
    // Trace pour l'exploitation : le seul motif rendu par la plateforme, jamais une donnée du visiteur.
    const motif = erreur instanceof Error ? erreur.message : 'inconnu';
    console.error(`[demande] acheminement refusé (${motif})`);
    return reponse(503, { statut: 'acheminement' });
  }
  return reponse(200, { statut: 'envoyee' });
};

/** Toute autre méthode que POST est refusée (405), sans lire le corps ni rien envoyer. */
export const ALL: APIRoute = () =>
  Response.json({ statut: 'refusee' }, { status: 405, headers: { Allow: 'POST' } });
