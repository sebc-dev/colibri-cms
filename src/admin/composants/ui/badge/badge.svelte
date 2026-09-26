<script lang="ts" module>
	// `badgeVariants`/`BadgeVariant` vivent dans `./variantes.ts`, frère de ce
	// fichier — voir son en-tête pour le pourquoi (tsc seul, sans
	// svelte-check, ne type pas les exports nommés d'un `<script module>` ;
	// `index.ts` les importe donc depuis `./variantes.ts` directement, jamais
	// depuis ce fichier).
	import { badgeVariants, type BadgeVariant } from './variantes.ts';
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '../../../lib/utils.ts';
	import type { HTMLAnchorAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = "default",
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
	} = $props();
</script>

<svelte:element
	this={href ? "a" : "span"}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
