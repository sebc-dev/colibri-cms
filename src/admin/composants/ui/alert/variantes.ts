/**
 * Variantes de `Alert` (ticket 02, openspec/changes/005-mise-en-page-
 * administration/tickets/02-identite-colibri.md, ADR-0009) — extraites du
 * bloc `<script module>` de `alert.svelte` (source amont : registre
 * shadcn-svelte, item `alert`), qui les exportait telles quelles.
 *
 * Même raison qu'au voisin `button/variantes.ts` : ce dépôt type par
 * `tsc --noEmit` seul, sans `svelte-check` — un export nommé d'un
 * `<script module>` n'est pas typable depuis `index.ts` sans ce détour.
 */
import { type VariantProps, tv } from 'tailwind-variants';

export const alertVariants = tv({
  base: "grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 group/alert relative w-full",
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      destructive: 'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;
