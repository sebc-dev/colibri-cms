/**
 * Variantes de `Badge` (ticket 02, openspec/changes/005-mise-en-page-
 * administration/tickets/02-identite-colibri.md, ADR-0009) — extraites du
 * bloc `<script module>` de `badge.svelte` (source amont : registre
 * shadcn-svelte, item `badge`), qui les exportait telles quelles.
 *
 * Même raison qu'au voisin `button/variantes.ts` : ce dépôt type par
 * `tsc --noEmit` seul, sans `svelte-check` — un export nommé d'un
 * `<script module>` n'est pas typable depuis `index.ts` sans ce détour.
 */
import { type VariantProps, tv } from 'tailwind-variants';

export const badgeVariants = tv({
  base: "h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium motion-safe:transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none",
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
      secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
      destructive:
        'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
      outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
      ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
      link: 'text-primary underline-offset-4 hover:underline',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
