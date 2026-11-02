/**
 * La place qu'occupe une image dans la page, en forme structurée — tickets 02
 * et 04 de 014 (ADR-0031). Le navigateur choisit la plus petite variante qui
 * suffit à cette place (`sizes`), selon la nature de l'emplacement.
 *
 * À modifier ENSEMBLE avec `src/site/site.css` : la colonne `main` y est de
 * 70ch (≈ 38,5rem avec ses 1rem de marge de chaque côté) ; la galerie y est
 * une grille `repeat(auto-fill, minmax(10rem, 1fr))` d'écart 0,75rem. Mieux
 * vaut surestimer la place que la sous-estimer.
 */

/** La nature d'un emplacement d'image. */
export type NatureEmplacement = 'image' | 'galerie' | 'carrousel';

/**
 * Un palier : à partir de `seuilRem` (absent = valeur par défaut), l'image
 * occupe `largeurRem`, ou bien `partEcran` % de l'écran moins `retraitRem`.
 */
export interface PalierPlace {
  readonly seuilRem?: number;
  readonly largeurRem?: number;
  readonly partEcran?: number;
  readonly retraitRem?: number;
}

/** La place d'une image : des paliers, du plus large au plus étroit. */
export type PlaceImage = readonly PalierPlace[];

/** La place d'une image dans la colonne principale (image, carrousel). */
export const PLACE_COLONNE: PlaceImage = [
  { seuilRem: 38.5, largeurRem: 36.5 },
  { partEcran: 100, retraitRem: 2 },
];

/** La place d'une case de la grille de la galerie. */
export const PLACE_CASE_GALERIE: PlaceImage = [
  { seuilRem: 38.5, largeurRem: 11.7 },
  { seuilRem: 33.5, partEcran: 33.34, retraitRem: 1.17 },
  { seuilRem: 22.75, partEcran: 50, retraitRem: 1.375 },
  { partEcran: 100, retraitRem: 2 },
];

function longueur(palier: PalierPlace): string {
  if (palier.largeurRem !== undefined) return `${String(palier.largeurRem)}rem`;
  return `calc(${String(palier.partEcran ?? 100)}vw - ${String(palier.retraitRem ?? 0)}rem)`;
}

/** La valeur de l'attribut `sizes` d'une place. */
export function sizesDe(place: PlaceImage): string {
  return place
    .map((p) => (p.seuilRem === undefined ? longueur(p) : `(min-width: ${String(p.seuilRem)}rem) ${longueur(p)}`))
    .join(', ');
}

/** La valeur de `sizes` selon la nature de l'emplacement. */
export function sizesPour(nature: NatureEmplacement): string {
  return sizesDe(nature === 'galerie' ? PLACE_CASE_GALERIE : PLACE_COLONNE);
}
