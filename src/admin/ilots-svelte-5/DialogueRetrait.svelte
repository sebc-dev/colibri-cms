<!--
  DialogueRetrait.svelte — le dialogue qui précède un retrait de demande (change 013, ticket 08,
  FR-073). Motif obligatoire, sans défaut : ordinaire ou indésirable (choix natif, boutons radio).
  « Retirer » reste inactif tant qu'aucun motif n'est choisi. Le focus initial est sur « Annuler »,
  piégé dans le dialogue par `bits-ui` ; Échap ferme et rend le focus au bouton qui l'a ouvert.
  Réemployé par le retrait groupé (ticket 09). Interpolation échappée seulement (I5). Aucune
  directive `client:*` (ADR-0006).
-->
<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { Button } from '../composants/ui/button/index.ts';
  import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '../composants/ui/dialog/index.ts';
  import type { MotifDeRetrait } from '../../core/demandes/retrait.ts';
  import {
    TEXTE_TITRE_RETRAIT,
    TEXTE_CORPS_RETRAIT,
    TEXTE_MOTIF_RETRAIT,
    TEXTE_MOTIF_ORDINAIRE,
    TEXTE_MOTIF_INDESIRABLE,
    TEXTE_BOUTON_RETIRER,
    TEXTE_BOUTON_ANNULER_RETRAIT,
    TEXTE_RETRAIT_EN_COURS,
  } from '../textes.ts';

  interface Props {
    ouvert: boolean;
    enCours: boolean;
    echec: string | null;
    confirmer: (motif: MotifDeRetrait) => void;
  }

  let { ouvert = $bindable(false), enCours, echec, confirmer }: Props = $props();

  let motif = $state<MotifDeRetrait | null>(null);
  let annuler = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (!ouvert) motif = null;
  });

  function focusSurAnnuler(evenement: Event): void {
    evenement.preventDefault();
    annuler?.focus();
  }
</script>

<Dialog bind:open={ouvert}>
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      onOpenAutoFocus={focusSurAnnuler}
      interactOutsideBehavior={enCours ? 'ignore' : 'close'}
      escapeKeydownBehavior={enCours ? 'ignore' : 'close'}
      class="bg-popover text-popover-foreground ring-foreground/10 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl p-4 text-sm ring-1 outline-none motion-safe:duration-100 motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95"
    >
      <DialogTitle class="break-words font-display text-base font-semibold">{TEXTE_TITRE_RETRAIT}</DialogTitle>
      <DialogDescription class="break-words">{TEXTE_CORPS_RETRAIT}</DialogDescription>
      <fieldset class="grid gap-2" disabled={enCours}>
        <legend class="mb-1 font-medium">{TEXTE_MOTIF_RETRAIT}</legend>
        <label class="flex min-h-11 items-start gap-2 md:min-h-0">
          <input type="radio" name="motif-retrait" value="ordinaire" bind:group={motif} class="mt-1" />
          <span class="break-words">{TEXTE_MOTIF_ORDINAIRE}</span>
        </label>
        <label class="flex min-h-11 items-start gap-2 md:min-h-0">
          <input type="radio" name="motif-retrait" value="indesirable" bind:group={motif} class="mt-1" />
          <span class="break-words">{TEXTE_MOTIF_INDESIRABLE}</span>
        </label>
      </fieldset>
      {#if enCours}
        <p aria-live="polite">{TEXTE_RETRAIT_EN_COURS}</p>
      {/if}
      {#if echec}
        <p role="alert" class="text-sm text-destructive">{echec}</p>
      {/if}
      <div class="flex gap-2">
        <button
          bind:this={annuler}
          type="button"
          disabled={enCours}
          onclick={() => (ouvert = false)}
          class="min-h-11 rounded-md border border-border bg-card px-3 text-ink md:min-h-9"
        >
          {TEXTE_BOUTON_ANNULER_RETRAIT}
        </button>
        <Button
          type="button"
          variant="destructive"
          disabled={motif === null || enCours}
          onclick={() => {
            if (motif !== null) confirmer(motif);
          }}
          class="max-md:min-h-11"
        >
          {TEXTE_BOUTON_RETIRER}
        </Button>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
</Dialog>
