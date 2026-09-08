/**
 * Gestion d'erreur partagée des îlots de correction d'emplacement.
 *
 * Traduit l'échec d'un enregistrement passé par la route générique d'écriture
 * (`src/pages/admin/pages/[slug]/emplacements/[id].ts`) en un message pour
 * l'éditrice, SANS terme de développeur (FR-117). Les îlots de correction le
 * partagent — `CorrectionBoutonAction.svelte` (ticket 04) et
 * `ReglageLienVideo.svelte` (ticket 05) — et celui de texte riche (ticket 06)
 * suivra le même patron.
 *
 * Le message d'origine confondait trois issues distinctes derrière un seul
 * « vérifiez la connexion » : un accès expiré (la route répond 401, corps
 * vide), un écran devenu périmé (404, corps vide) et une vraie coupure réseau
 * (le `fetch` lève avant toute réponse). Les distinguer dit à l'éditrice quoi
 * faire — se reconnecter, recharger l'écran, ou réessayer — au lieu de la
 * renvoyer toujours vers sa connexion.
 *
 * Les refus MÉTIER (400 avec `{ ok: false, raison }`) ne passent PAS par ici :
 * chaque îlot les traduit lui-même via son propre `TEXTES_REFUS`, car le motif
 * dépend de la nature de l'emplacement (lien de vidéo, bouton d'action…).
 */

/** Accès expiré : la session n'ouvre plus l'administration (401). */
export const MESSAGE_ACCES_EXPIRE = 'Votre accès a expiré : reconnectez-vous, puis réessayez.';

/** Écran périmé : la page ou l'emplacement visé n'est plus là (404). */
export const MESSAGE_ECRAN_PERIME = "Cet écran n'est plus à jour : rechargez-le, puis réessayez.";

/** Échec inattendu au moment d'enregistrer (5xx ou statut imprévu). */
export const MESSAGE_ECHEC = "L'enregistrement a échoué. Réessayez dans un instant.";

/** Le `fetch` n'a pas abouti : rien n'a atteint l'administration. */
export const MESSAGE_RESEAU = 'La connexion a échoué : vérifiez votre accès à Internet, puis réessayez.';

/**
 * Le statut HTTP d'une réponse INATTENDUE (ni 200 accepté, ni 400 refus métier,
 * les deux seuls à porter un corps JSON) → le message à afficher. 401 et 404
 * ont chacun leur conduite à tenir ; tout autre statut retombe sur l'échec
 * générique.
 */
export function messageErreurCorrection(statut: number): string {
  if (statut === 401) return MESSAGE_ACCES_EXPIRE;
  if (statut === 404) return MESSAGE_ECRAN_PERIME;
  return MESSAGE_ECHEC;
}
