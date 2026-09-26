/**
 * `Root`/`Description`/`Title`/`Action` (les composants) viennent de leurs
 * fichiers `.svelte` frères ; les types et `alertVariants` viennent de
 * `./variantes.ts` — voir son en-tête pour le pourquoi (tsc seul ne type pas
 * les exports nommés d'un fichier `.svelte`).
 */
import Action from './alert-action.svelte';
import Description from './alert-description.svelte';
import Title from './alert-title.svelte';
import Root from './alert.svelte';
import { type AlertVariant, alertVariants } from './variantes.ts';

export {
  Root,
  Description,
  Title,
  Action,
  //
  Root as Alert,
  Description as AlertDescription,
  Title as AlertTitle,
  Action as AlertAction,
  alertVariants,
  type AlertVariant,
};
