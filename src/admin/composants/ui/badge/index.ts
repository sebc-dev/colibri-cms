/**
 * `Root` (le composant) vient de `./badge.svelte` ; les types et
 * `badgeVariants` viennent de `./variantes.ts` — voir son en-tête pour le
 * pourquoi (tsc seul ne type pas les exports nommés d'un fichier `.svelte`).
 */
import Root from './badge.svelte';
import { type BadgeVariant, badgeVariants } from './variantes.ts';

export {
  Root,
  //
  Root as Badge,
  badgeVariants,
  type BadgeVariant,
};
