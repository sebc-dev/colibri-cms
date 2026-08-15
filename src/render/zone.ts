/**
 * Zone `render/` — le rendu des emplacements éditables, partagé par le site
 * publié et l'aperçu (docs/archi.md § Vue d'ensemble). N'importe que `core/`,
 * conformément au sens descendant fixé par I1.
 *
 * Le baril `src/render/index.ts` — seul point d'entrée légal depuis
 * l'extérieur de cette zone (I3) — n'est pas posé par ce lot : ce fichier
 * n'en tient pas lieu, et son nom n'est pas `index.ts` à dessein.
 */
import type { Zone } from '../core/zone.ts';

export const ZONE: Zone = 'render';
