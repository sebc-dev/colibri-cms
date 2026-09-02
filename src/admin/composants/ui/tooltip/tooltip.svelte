<!--
  Tooltip (racine) — copié par la CLI shadcn-svelte (ticket 02,
  specs/002-socle-ilots-admin/02-composant-shadcn-sous-csp.md, ADR-0009).
  Source amont : registre shadcn-svelte, style « vega », item `tooltip`.
-->
<script lang="ts" generics="T = never">
	import { Tooltip as TooltipPrimitive } from 'bits-ui';

	let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps<T> = $props();
</script>

<TooltipPrimitive.Root bind:open {...restProps} />
