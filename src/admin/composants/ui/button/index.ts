/**
 * `Root` (le composant) vient de `./button.svelte` ; les types et
 * `buttonVariants` viennent de `./variantes.ts` — voir son en-tête pour le
 * pourquoi (tsc seul ne type pas les exports nommés d'un fichier `.svelte`).
 */
import Root from './button.svelte';
import { type ButtonProps, type ButtonSize, type ButtonVariant, buttonVariants } from './variantes.ts';

export {
  Root,
  type ButtonProps as Props,
  //
  Root as Button,
  buttonVariants,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
};
