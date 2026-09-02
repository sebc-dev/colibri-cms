<!--
  TooltipProvider — copié par la CLI shadcn-svelte (ticket 02,
  specs/002-socle-ilots-admin/02-composant-shadcn-sous-csp.md, ADR-0009).
  Source amont : registre shadcn-svelte, style « vega », item `tooltip`.
-->
<script lang="ts">
	import { Tooltip as TooltipPrimitive } from 'bits-ui';

	let { delayDuration = 0, ...restProps }: TooltipPrimitive.ProviderProps = $props();
</script>

<TooltipPrimitive.Provider {delayDuration} {...restProps} />
