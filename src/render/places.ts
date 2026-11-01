/**
 * La place qu'occupe une image dans la page, en forme structurée — ticket 02
 * de 014 (ADR-0031). Le navigateur choisit la plus petite variante qui suffit
 * à cette place (`sizes`).
 *
 * À modifier ENSEMBLE avec `src/site/site.css` : la colonne `main` y est de
 * 70ch (≈ 38,5rem avec ses 1rem de marge de chaque côté) ; au-delà de ce
 * seuil l'image occupe au plus 36,5rem, en deçà tout l'écran moins la marge.
 */

/** Une place : au-delà de `seuilRem`, l'image occupe `largeurRem` ; en deçà, tout l'écran moins `retraitRem`. */
export interface PlaceImage {
  readonly seuilRem: number;
  readonly largeurRem: number;
  readonly retraitRem: number;
}

/** La place d'une image dans la colonne principale. */
export const PLACE_COLONNE: PlaceImage = { seuilRem: 38.5, largeurRem: 36.5, retraitRem: 2 };

/** La valeur de l'attribut `sizes` d'une place. */
export function sizesDe(place: PlaceImage): string {
  return `(min-width: ${String(place.seuilRem)}rem) ${String(place.largeurRem)}rem, calc(100vw - ${String(place.retraitRem)}rem)`;
}
