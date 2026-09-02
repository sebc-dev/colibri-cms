<!--
  Button — premier composant copié par la CLI shadcn-svelte dans la zone
  `admin` (ticket 02, specs/002-socle-ilots-admin/02-composant-shadcn-sous-csp.md,
  ADR-0009). Source amont : registre shadcn-svelte, style « vega », item
  `button` — copié par `npx shadcn-svelte add button`, puis l'import de
  `lib/utils` réécrit en chemin relatif (le reste du dépôt n'utilise aucun
  alias, voir `src/admin/zone.ts`, `src/admin/ilots-svelte-5/monter.ts`) :
  `components.json` déclare un alias `$admin/*` qui ne sert qu'au calcul
  interne de la CLI (voir `shadcn-svelte.alias.json`), jamais à `tsc` ni à
  Vite/Astro.
-->
<script lang="ts" module>
	// `buttonVariants`/`ButtonProps`/`ButtonVariant`/`ButtonSize` vivent dans
	// `./variantes.ts`, frère de ce fichier — voir son en-tête pour le
	// pourquoi (tsc seul, sans svelte-check, ne type pas les exports nommés
	// d'un `<script module>` ; `index.ts` les importe donc depuis
	// `./variantes.ts` directement, jamais depuis ce fichier).
	import { buttonVariants, type ButtonProps } from './variantes.ts';
	import { cn } from '../../../lib/utils.ts';
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
