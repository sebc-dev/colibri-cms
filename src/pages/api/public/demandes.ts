/**
 * L'envoi d'une demande de devis (change 012, ticket 07 ; FR-057, FR-063/064, FR-097) — seul geste
 * du visiteur à traitement serveur. Sans garde de session, sans cookie lu ni posé, jamais
 * `request.formData()` (I6) : un JSON `{ formulaire, page, valeurs, totalAffiche }`. La demande est
 * vérifiée contre la déclaration empaquetée, composée en texte seul, remise à l'adresse autorisée,
 * puis confirmée — rien n'est conservé en base.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierDemande } from '../../../core/formulaires/demande.ts';
import { composerCourriel, totalDesValeurs } from '../../../core/formulaires/courriel.ts';
import { lireFormulaireDeLaDeclaration } from '../../../platform/contenu/formulaires.ts';
import { obtenirPageAvecEmplacements } from '../../../platform/contenu/pages.ts';
import { lireAdresseAutorisee } from '../../../platform/auth/magasin.ts';
import { demanderAcheminementDeLaDemande } from '../../../platform/email/index.ts';
import { lireCorpsJsonBorne } from '../../../platform/reglages/corps.ts';

export const prerender = false;

function reponse(statut: number, corps: Record<string, string>): Response {
  return Response.json(corps, { status: statut });
}

export const POST: APIRoute = async ({ request }) => {
  const corps = await lireCorpsJsonBorne(request);
  if (!corps.ok) return reponse(corps.statut, { statut: 'refusee' });
  const recu = corps.json;
  if (typeof recu !== 'object' || recu === null) return reponse(400, { statut: 'refusee' });
  const { formulaire: idFormulaire, page: slug, valeurs } = recu as Record<string, unknown>;
  if (typeof idFormulaire !== 'string' || typeof slug !== 'string') return reponse(400, { statut: 'refusee' });

  const formulaire = lireFormulaireDeLaDeclaration(idFormulaire);
  const page = obtenirPageAvecEmplacements(slug);
  if (formulaire === undefined || page === null) return reponse(400, { statut: 'refusee' });
  const verdict = verifierDemande(formulaire, valeurs);
  if (!verdict.ok) return reponse(400, { statut: 'refusee' });

  const destinataire = await lireAdresseAutorisee(env.DB);
  if (destinataire === null) return reponse(503, { statut: 'echec' });

  const total = totalDesValeurs(formulaire, verdict.valeurs);
  const { objet, texte } = composerCourriel(formulaire, page.titre, verdict.valeurs, total);
  try {
    await demanderAcheminementDeLaDemande(env.EXPEDITEUR_CODE_CONNEXION, {
      from: __ADRESSE_EXPEDITEUR__,
      to: destinataire,
      subject: objet,
      text: texte,
    });
  } catch {
    return reponse(502, { statut: 'echec' });
  }
  return reponse(200, { statut: 'envoyee' });
};
