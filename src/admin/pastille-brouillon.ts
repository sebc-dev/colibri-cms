/**
 * Révèle la pastille de brouillon du fil de retour de l'`Écran : Éditeur de
 * page`, sans recharger l'écran (ticket 04, SC-04f,
 * openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md).
 *
 * Le rendu initial de la pastille (présente ou absente selon
 * `pagePorteUnBrouillon`) reste servi par `src/pages/admin/pages/[slug].astro` —
 * c'est la moitié observable par une requête HTTP réelle (motif du mode
 * `test` du ticket). Cette fonction ne fait que l'ajouter au DOM après un
 * enregistrement réussi, si elle n'y est pas déjà : partagée par les
 * tickets 04 (bouton d'action), 05 (lien de vidéo) et 06 (texte riche), qui
 * enregistrent tous une correction par la même route générique
 * (`src/pages/admin/pages/[slug]/emplacements/[id].ts`).
 */
const ID_ZONE_PASTILLE = 'zone-pastille-brouillon';
const ATTRIBUT_PASTILLE = 'data-pastille-brouillon';
const TEXTE_PASTILLE = ' • brouillon';

export function afficherPastilleDeBrouillon(): void {
  const zone = document.getElementById(ID_ZONE_PASTILLE);
  if (!zone) return;
  if (zone.querySelector(`[${ATTRIBUT_PASTILLE}]`)) return; // déjà affichée.

  const pastille = document.createElement('span');
  pastille.setAttribute(ATTRIBUT_PASTILLE, '');
  pastille.textContent = TEXTE_PASTILLE;
  zone.appendChild(pastille);
}
