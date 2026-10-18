/**
 * L'envoi d'une demande de devis (change 012, ticket 07 ; FR-057, FR-063/064, FR-097) — seul geste
 * du visiteur à traitement serveur. Sans garde de session, sans cookie lu ni posé, jamais
 * `request.formData()` (I6) : un JSON `{ formulaire, page, valeurs, totalAffiche }`. La demande est
 * vérifiée contre la déclaration empaquetée, gardée dans la liste des demandes (change 013,
 * ADR-0030) avant tout envoi, composée en texte seul, remise à l'adresse autorisée, puis confirmée.
 * Une demande refusée n'est pas gardée ; aucune valeur saisie n'est journalisée.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  clesToutesDeclarees,
  pagePoseLeFormulaire,
  totalAnnonceAccorde,
  verifierDemande,
  type ValeursDemande,
} from '../../../core/formulaires/demande.ts';
import { verifierSaisie } from '../../../core/formulaires/saisie.ts';
import type { FormulaireDeclare } from '../../../core/formulaires/declaration.ts';
import { composerCourriel, totalDesValeurs } from '../../../core/formulaires/courriel.ts';
import { lireFormulaireDeLaDeclaration } from '../../../platform/contenu/formulaires.ts';
import { obtenirPageAvecEmplacements } from '../../../platform/contenu/pages.ts';
import { lireAdresseAutorisee } from '../../../platform/auth/magasin.ts';
import { demanderAcheminementDeLaDemande } from '../../../platform/email/index.ts';
import { composerDetail, contactDeReponse, totalAGarder } from '../../../core/demandes/detail.ts';
import { garderDemande, marquerCourrielParti, type DemandeAGarder } from '../../../platform/demandes/magasin.ts';
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

/**
 * La demande à garder, telle qu'envoyée : noms du formulaire et de la page à l'envoi, total quand le
 * formulaire porte un prix, coordonnée de réponse et détail copié de la déclaration (ADR-0030).
 */
function demandeAGarder(
  formulaire: FormulaireDeclare,
  pageTitre: string,
  valeurs: ValeursDemande,
  total: number,
): DemandeAGarder {
  return {
    formulaireId: formulaire.id,
    formulaireNom: formulaire.nom,
    pageTitre,
    total: totalAGarder(formulaire, total),
    contact: contactDeReponse(formulaire, valeurs),
    detail: JSON.stringify(composerDetail(formulaire, valeurs)),
  };
}

/**
 * L'e-mail est parti : la demande gardée perd sa mention « non parti ». Un échec est consigné sans
 * donnée du visiteur ni identifiant, et laisse la mention.
 */
async function noterCourrielParti(idDemande: string): Promise<void> {
  try {
    await marquerCourrielParti(env.DB, idDemande);
  } catch (erreur: unknown) {
    console.error(`[demande] marque de remise impossible (${erreur instanceof Error ? erreur.name : 'inconnu'})`);
  }
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

  const total = totalDesValeurs(formulaire, verdict.valeurs);
  const idDemande = await garderSansBloquer(demandeAGarder(formulaire, page.titre, verdict.valeurs, total));
  const { objet, texte } = composerCourriel(formulaire, page.titre, verdict.valeurs, total);
  const parti = await acheminerSiPossible({ objet, texte });
  if (idDemande !== null && parti) await noterCourrielParti(idDemande);
  // Confirmée dès que la demande est gardée ou que son e-mail est parti (FR-066).
  return idDemande !== null || parti ? reponse(200, { statut: 'envoyee' }) : reponse(503, { statut: 'acheminement' });
};

/** Garde la demande ; un refus de la base est consigné (motif seul) et la route continue. */
async function garderSansBloquer(demande: DemandeAGarder): Promise<string | null> {
  try {
    return await garderDemande(env.DB, demande, Date.now());
  } catch (erreur: unknown) {
    const motif = erreur instanceof Error ? erreur.message : 'inconnu';
    console.error(`[demande] garde refusée (${motif})`);
    return null;
  }
}

/** Remet l'e-mail à l'adresse autorisée ; `false` sans adresse lisible ou si la plateforme refuse. */
async function acheminerSiPossible(courriel: { readonly objet: string; readonly texte: string }): Promise<boolean> {
  let destinataire: string | null;
  try {
    destinataire = await lireAdresseAutorisee(env.DB);
  } catch {
    return false;
  }
  if (destinataire === null) return false;
  try {
    await demanderAcheminementDeLaDemande(env.EXPEDITEUR_CODE_CONNEXION, {
      from: __ADRESSE_EXPEDITEUR__,
      to: destinataire,
      subject: courriel.objet,
      text: courriel.texte,
    });
    return true;
  } catch (erreur: unknown) {
    // Trace pour l'exploitation : le seul motif rendu par la plateforme, jamais une donnée du visiteur.
    const motif = erreur instanceof Error ? erreur.message : 'inconnu';
    console.error(`[demande] acheminement refusé (${motif})`);
    return false;
  }
}

/** Toute autre méthode que POST est refusée (405), sans lire le corps ni rien envoyer. */
export const ALL: APIRoute = () =>
  Response.json({ statut: 'refusee' }, { status: 405, headers: { Allow: 'POST' } });
