/**
 * La « place » d'un emplacement, telle que présentée à l'éditrice — ticket
 * 11 (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 11-ou-posee-et-supprimer.md, SC-11a/c/f).
 *
 * Zone `admin` (docs/architecture.md, I1) : `admin/ → core/` est autorisé,
 * ce module n'importe que le type `Emplacement` de
 * `core/pages/declaration.ts`, jamais un magasin — il est PUR, sans D1 ni
 * HTTP, appelé par les routes (`src/pages/admin/medias/[id].astro`,
 * `src/pages/admin/medias/[id]/supprimer.ts`) une fois qu'elles ont déjà lu
 * les deux magasins et déterminé QUELS emplacements référencent l'image
 * (`listerEmplacementsReferencantMedia`, `src/platform/brouillons/
 * magasin.ts`) et sur QUELLE page (`obtenirPageAvecEmplacements`,
 * `src/platform/contenu/pages.ts`).
 *
 * design.md § Decisions (arbitrage humain du 2026-09-20, déjà tranché) : la
 * place se dit par la nature de l'emplacement en français (« image »,
 * « galerie », « carrousel » — déjà les mots exacts de `NatureEmplacement`),
 * suivie du rang parmi les emplacements de MÊME NATURE de la page quand il y
 * en a plusieurs — jamais l'identifiant technique de l'emplacement. Le rang
 * se compte sur la déclaration (`Emplacement[]`, déjà triée par rang posé,
 * `core/pages/declaration.ts`), un fait structurel indépendant du brouillon.
 */
import type { Emplacement } from '../../core/pages/declaration.ts';

/** Un emplacement qui pose une image, désigné par sa page et sa place (SC-11a/c) — aucun terme de développeur. */
export interface EmplacementOuPoseeMedia {
  readonly pageTitre: string;
  readonly place: string;
}

/**
 * La place de l'emplacement `idEmplacement` parmi les emplacements déclarés
 * d'une page (`emplacementsDeclares`, ordre de rang déjà posé) — `null` si
 * cet identifiant n'y est pas déclaré (garde défensive : ne devrait jamais se
 * produire pour un couple (page, emplacement) qui vient de
 * `listerEmplacementsReferencantMedia`, mais une déclaration a pu changer
 * depuis l'écriture du brouillon).
 */
export function placeEmplacement(
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
): string | null {
  const emplacement = emplacementsDeclares.find((candidat) => candidat.id === idEmplacement);
  if (!emplacement) return null;

  const memeNature = emplacementsDeclares.filter((candidat) => candidat.nature === emplacement.nature);
  const rang = memeNature.findIndex((candidat) => candidat.id === idEmplacement) + 1;
  return memeNature.length > 1 ? `${emplacement.nature} ${rang.toString()}` : emplacement.nature;
}
