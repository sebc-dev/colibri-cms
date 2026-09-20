/**
 * Soumission partagée d'une correction d'emplacement par la route générique
 * d'écriture (`src/pages/admin/pages/[slug]/emplacements/[id].ts`).
 *
 * Porte ce que chaque îlot de correction répétait : le POST JSON authentifié
 * par le seul cookie de session `SameSite=Strict` (ADR-0011), la distinction
 * des seuls statuts à corps JSON (200 accepté, 400 refus métier) de tous les
 * autres (401, 404, 5xx — corps vide, traduits par le statut via
 * `messageErreurCorrection`), la traduction du motif de refus par le
 * `textesRefus` propre à la nature de l'emplacement, et la coupure réseau.
 * Le motif `emplacement-non-declare` est commun à toutes les natures : sa
 * traduction vit ici, un îlot n'a plus à la répéter.
 *
 * Premier consommateur : `EmplacementComposition.svelte` (ticket 09). Les
 * autres îlots de correction portent encore ce bloc en ligne — leur migration
 * est un chantier séparé.
 */
import { messageErreurCorrection, MESSAGE_ECHEC, MESSAGE_RESEAU } from './message-erreur-correction.ts';

/** L'emplacement visé n'est plus déclaré dans la page — refus commun à toutes les natures. */
const MESSAGE_EMPLACEMENT_NON_DECLARE = "Cet emplacement n'existe plus dans la page : rechargez l'écran.";

interface ReponseCorrection {
  readonly ok: boolean;
  readonly raison?: string;
}

type IssueCorrection = { readonly ok: true } | { readonly ok: false; readonly message: string };

export async function soumettreCorrection(
  slug: string,
  idEmplacement: string,
  corps: unknown,
  textesRefus: Readonly<Record<string, string>>,
): Promise<IssueCorrection> {
  try {
    const reponse = await fetch(`/admin/pages/${slug}/emplacements/${idEmplacement}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    });
    if (reponse.status !== 200 && reponse.status !== 400) {
      return { ok: false, message: messageErreurCorrection(reponse.status) };
    }
    const resultat = (await reponse.json()) as ReponseCorrection;
    if (resultat.ok) return { ok: true };
    const raison = resultat.raison ?? '';
    if (raison === 'emplacement-non-declare') return { ok: false, message: MESSAGE_EMPLACEMENT_NON_DECLARE };
    return { ok: false, message: textesRefus[raison] ?? MESSAGE_ECHEC };
  } catch {
    return { ok: false, message: MESSAGE_RESEAU };
  }
}
