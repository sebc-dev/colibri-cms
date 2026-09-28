<!--
  SurCoucheChoixImage.svelte — sur-couche de choix d'une image partagée par
  EmplacementImage et EmplacementComposition (ticket 09 du change
  005-mise-en-page-administration).
-->
<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button } from '../composants/ui/button/index.ts';
  import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogClose } from '../composants/ui/dialog/index.ts';
  import VignetteMedia from './VignetteMedia.svelte';
  import type { MediaListe } from '../../platform/medias/magasin.ts';

  interface Props {
    ouvert: boolean;
    titre: string;
    medias: readonly MediaListe[];
    messageVide: string;
    libelleChoix: (nomOrigine: string) => string;
    onChoisir: (id: string) => void;
    enCours: boolean;
    messageErreur: string | null;
  }

  let {
    ouvert = $bindable(false),
    titre,
    medias,
    messageVide,
    libelleChoix,
    onChoisir,
    enCours,
    messageErreur,
  }: Props = $props();
</script>

<Dialog bind:open={ouvert}>
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      class="bg-popover text-popover-foreground ring-foreground/10 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_auto_1fr] gap-4 rounded-xl p-4 text-sm ring-1 outline-none motion-safe:duration-100 motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95"
    >
      <div class="flex items-start justify-between gap-4">
        <DialogTitle class="break-words font-display text-base font-semibold text-ink">
          {titre}
        </DialogTitle>
        <DialogClose>
          {#snippet child({ props })}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="max-md:min-h-11 max-md:min-w-11 shrink-0"
              {...props}
            >
              <XIcon />
              <span class="sr-only">Fermer</span>
            </Button>
          {/snippet}
        </DialogClose>
      </div>
      {#if messageErreur}
        <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageErreur}</p>
      {/if}
      <div class="flex min-h-0 flex-col gap-3 overflow-y-auto">
        {#if medias.length === 0}
          <p class="text-sm text-ink-muted">{messageVide}</p>
        {:else}
          <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {#each medias as media (media.id)}
              <li>
                <button
                  type="button"
                  onclick={() => onChoisir(media.id)}
                  disabled={enCours}
                  aria-label={libelleChoix(media.nomOrigine)}
                  class="block min-h-11 w-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <VignetteMedia id={media.id} alt={media.nomOrigine} />
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
</Dialog>
