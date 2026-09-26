<script lang="ts" module>
	// `alertVariants`/`AlertVariant` vivent dans `./variantes.ts`, frère de ce
	// fichier — voir son en-tête pour le pourquoi (tsc seul, sans
	// svelte-check, ne type pas les exports nommés d'un `<script module>` ;
	// `index.ts` les importe donc depuis `./variantes.ts` directement, jamais
	// depuis ce fichier).
	import { alertVariants, type AlertVariant } from './variantes.ts';
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '../../../lib/utils.ts';
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	class={cn(alertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
