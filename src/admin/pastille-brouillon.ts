/**
 * Révèle la marque de brouillon du fil de retour de l'`Écran : Éditeur de
 * page`, sans recharger l'écran (ticket 04, SC-04f,
 * openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md).
 *
 * Le rendu initial de la marque (présente ou absente selon
 * `pagePorteUnBrouillon`) reste servi par `src/pages/admin/pages/[slug].astro` —
 * c'est la moitié observable par une requête HTTP réelle (motif du mode
 * `test` du ticket). Cette fonction ne fait que l'ajouter au DOM après un
 * enregistrement réussi, si elle n'y est pas déjà : partagée par les
 * tickets 04 (bouton d'action), 05 (lien de vidéo) et 06 (texte riche), qui
 * enregistrent tous une correction par la même route générique
 * (`src/pages/admin/pages/[slug]/emplacements/[id].ts`).
 *
 * Ticket 05 (openspec/changes/005-mise-en-page-administration/tickets/
 * 05-marque-de-brouillon.md, SC-05b) : la marque n'est plus fabriquée à la
 * main (`createElement` + `textContent`) mais CLONÉE depuis
 * `<template id="modele-marque-brouillon">`, rendu une fois par
 * `GabaritCadre.astro` à partir du même composant
 * `src/admin/MarqueBrouillon.astro` que les écrans — la marque révélée sans
 * recharger est ainsi rigoureusement identique à celle que rend le serveur.
 */
const ID_ZONE_PASTILLE = 'zone-pastille-brouillon';
const ID_MODELE_MARQUE_BROUILLON = 'modele-marque-brouillon';
const ATTRIBUT_PASTILLE = 'data-pastille-brouillon';

export function afficherPastilleDeBrouillon(): void {
  const zone = document.getElementById(ID_ZONE_PASTILLE);
  if (!zone) return;
  if (zone.querySelector(`[${ATTRIBUT_PASTILLE}]`)) return; // déjà affichée.

  const modele = document.getElementById(ID_MODELE_MARQUE_BROUILLON);
  if (!(modele instanceof HTMLTemplateElement)) return;

  zone.appendChild(modele.content.cloneNode(true));
}
