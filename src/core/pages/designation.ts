/**
 * La désignation d'un emplacement, telle que présentée à l'éditrice —
 * ticket 02 (openspec/changes/006-nom-des-emplacements/tickets/
 * 02-bibliotheque-designe-par-le-nom.md, ADR-0012, design D3).
 *
 * Zone `core` (docs/architecture.md, I1/I2) : fonction pure, zéro D1, zéro
 * HTTP, zéro dépendance framework/plateforme — elle ne lit rien elle-même,
 * elle dérive la désignation depuis des `Emplacement[]` déjà déclarés
 * (triés par rang, `core/pages/declaration.ts`) et un identifiant.
 *
 * Règle (design.md § Décisions, arbitrage humain du 2026-09-28) : rend le
 * `nom` déclaré s'il existe (ticket 01, SC-01a) ; à défaut, la nature en
 * français suivie du rang ordinal parmi les emplacements de MÊME NATURE de
 * la page, dès qu'il y en a plusieurs — le rang se comptant sur TOUTE la
 * déclaration de cette nature, nommée ou non (SC-02b). Un identifiant non
 * déclaré ne rend aucune désignation (garde défensive : une déclaration a
 * pu changer depuis l'écriture du brouillon). Jamais l'identifiant
 * technique de l'emplacement (FR-117).
 *
 * Remplace la règle de « place » posée au ticket 11 (openspec/changes/
 * 004-bibliotheque-de-medias/tickets/11-ou-posee-et-supprimer.md) —
 * `placeEmplacement` (`src/admin/ilots-svelte-5/emplacements-media.ts`)
 * s'appuie désormais sur cette fonction : même nature+rang qu'avant pour un
 * emplacement sans nom, plus le nom quand l'intégrateur en a posé un.
 */
import type { Emplacement } from './declaration.ts';

/**
 * La désignation de l'emplacement `idEmplacement` parmi les emplacements
 * déclarés d'une page (`emplacementsDeclares`, ordre de rang déjà posé) —
 * `null` si cet identifiant n'y est pas déclaré.
 */
export function designerEmplacement(
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
): string | null {
  const emplacement = emplacementsDeclares.find((candidat) => candidat.id === idEmplacement);
  if (!emplacement) return null;
  if (emplacement.nom) return emplacement.nom;

  const memeNature = emplacementsDeclares.filter((candidat) => candidat.nature === emplacement.nature);
  const rang = memeNature.findIndex((candidat) => candidat.id === idEmplacement) + 1;
  return memeNature.length > 1 ? `${ordinal(rang, emplacement.nature)} ${emplacement.nature}` : emplacement.nature;
}

/**
 * Le rang ordinal abrégé, accordé au genre de la nature : « 1er carrousel »,
 * « 1re galerie », « 1re image », puis « 2e », « 3e »… quel que soit le genre.
 */
function ordinal(rang: number, nature: Emplacement['nature']): string {
  if (rang > 1) return `${rang.toString()}e`;
  return nature === 'carrousel' ? '1er' : '1re';
}
