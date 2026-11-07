<!--
  Change 015, ticket 01 : « Revenir à la version publiée » — l'offre et sa
  confirmation (bits-ui Dialog, habillé comme la suppression de média de
  FicheMedia.svelte, ADR-0009). Réutilisable (props `nom` + `nature`). Le nom
  est interpolé, jamais `{@html}` : toujours présenté comme du texte.
-->
<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button } from '../composants/ui/button/index.ts';
  import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogClose } from '../composants/ui/dialog/index.ts';
  import {
    TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE,
    TEXTE_BOUTON_GARDER_MODIFICATIONS,
    TEXTE_REVENIR_EN_COURS,
    TEXTE_REVENIR_PUBLICATION_EN_COURS,
    TEXTE_TITRE_CONFIRMATION_REVENIR,
    texteAvertissementRevenir,
  } from '../textes.ts';
  import { messageErreurCorrection, MESSAGE_RESEAU } from './message-erreur-correction.ts';

  interface Props {
    adresse: string;
    nom: string;
    nature: string;
    jamaisPubliee: boolean;
    avertissement?: string;
  }

  const { adresse, nom, nature, jamaisPubliee, avertissement }: Props = $props();

  let ouverte = $state(false);
  let enCours = $state(false);
  let erreur = $state<string | null>(null);
  let refuse = $state(false);
  let garder = $state<HTMLElement | null>(null);

  function focusSurGarder(evenement: Event): void {
    evenement.preventDefault();
    garder?.focus();
  }

  function ouvrir(): void {
    erreur = null;
    refuse = false;
    ouverte = true;
  }

  async function confirmer(): Promise<void> {
    if (enCours) return;
    enCours = true;
    erreur = null;
    try {
      const reponse = await fetch(adresse, { method: 'POST' });
      if (reponse.ok) {
        location.reload();
        return;
      }
      if (reponse.status === 409) {
        const corps: unknown = await reponse.json().catch(() => null);
        if (typeof corps === 'object' && corps !== null && 'raison' in corps && corps.raison === 'publication-en-cours') {
          refuse = true;
          erreur = TEXTE_REVENIR_PUBLICATION_EN_COURS;
          enCours = false;
          return;
        }
      }
      erreur = messageErreurCorrection(reponse.status);
    } catch {
      erreur = MESSAGE_RESEAU;
    }
    enCours = false;
  }
</script>

<Button type="button" variant="outline" onclick={ouvrir} class="max-md:min-h-11 max-md:min-w-11">
  {TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE}
</Button>

{#if ouverte}
  <Dialog bind:open={ouverte}>
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        onOpenAutoFocus={focusSurGarder}
        interactOutsideBehavior={enCours ? 'ignore' : 'close'}
        escapeKeydownBehavior={enCours ? 'ignore' : 'close'}
        class="bg-popover text-popover-foreground ring-foreground/10 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr] gap-4 rounded-xl p-4 text-sm ring-1 outline-none motion-safe:duration-100 motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95"
      >
        <div class="flex items-start justify-between gap-4">
          <DialogTitle class="break-words font-display text-base font-semibold">
            {TEXTE_TITRE_CONFIRMATION_REVENIR}
          </DialogTitle>
          <DialogClose disabled={enCours}>
            {#snippet child({ props })}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="max-md:min-h-11 max-md:min-w-11 shrink-0"
                {...props}
              >
                <XIcon />
                <span class="sr-only">{TEXTE_BOUTON_GARDER_MODIFICATIONS}</span>
              </Button>
            {/snippet}
          </DialogClose>
        </div>
        <div class="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <p class="break-words">{avertissement ?? texteAvertissementRevenir(nom, nature, jamaisPubliee)}</p>
          {#if erreur}
            <p role="alert" class="text-sm text-destructive">{erreur}</p>
          {/if}
          <div class="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              bind:ref={garder}
              onclick={() => (ouverte = false)}
              disabled={enCours}
              class="max-md:min-h-11 max-md:min-w-11"
            >
              {TEXTE_BOUTON_GARDER_MODIFICATIONS}
            </Button>
            {#if !refuse}
            <Button
              type="button"
              variant="destructive"
              onclick={confirmer}
              disabled={enCours}
              class="max-md:min-h-11 max-md:min-w-11"
            >
              {enCours ? TEXTE_REVENIR_EN_COURS : TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE}
            </Button>
            {/if}
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  </Dialog>
{/if}
