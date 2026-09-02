/**
 * Réexports du composant `Tooltip` (ticket 02, specs/002-socle-ilots-admin/
 * 02-composant-shadcn-sous-csp.md, ADR-0009) — source amont : registre
 * shadcn-svelte, style « vega », item `tooltip`.
 */
import Content from './tooltip-content.svelte';
import Portal from './tooltip-portal.svelte';
import Provider from './tooltip-provider.svelte';
import Trigger from './tooltip-trigger.svelte';
import Root from './tooltip.svelte';

export {
  Root,
  Trigger,
  Content,
  Provider,
  Portal,
  //
  Root as Tooltip,
  Content as TooltipContent,
  Trigger as TooltipTrigger,
  Provider as TooltipProvider,
  Portal as TooltipPortal,
};
