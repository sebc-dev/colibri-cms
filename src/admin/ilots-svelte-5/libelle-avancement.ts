/**
 * Libellé d'avancement de l'envoi des images pendant une publication (change 011, ticket 17).
 * Utilitaire pur, même rôle que `libelle-compte-images.ts` ; aucun terme de développeur (FR-117).
 */
import { TEXTE_PUBLICATION_ENVOI_IMAGES } from '../textes.ts';

/** « Envoi des images : 3 sur 12 » — le compte est borné à `[0, total]`. */
export function libelleAvancement(parties: number, total: number): string {
  const sur = Math.max(0, Math.floor(total));
  const fait = Math.min(Math.max(0, Math.floor(parties)), sur);
  return `${TEXTE_PUBLICATION_ENVOI_IMAGES} : ${String(fait)} sur ${String(sur)}`;
}
